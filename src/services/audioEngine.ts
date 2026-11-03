import { AudioMetrics, YamnetPrediction } from '../types';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private simulationIntervalId: number | null = null;

  private isRunning = false;
  private isSimulated = false;
  private simulationMode: 'traffic' | 'birds' | 'construction' | 'siren' | 'speech' | 'hvac' | 'quiet' = 'traffic';

  // Leq tracking
  private leqSum = 0;
  private leqCount = 0;
  private peakHoldDbfs = -60;

  // Listeners
  private onMetricsUpdate: ((metrics: AudioMetrics, predictions: YamnetPrediction[]) => void) | null = null;

  public setListener(callback: (metrics: AudioMetrics, predictions: YamnetPrediction[]) => void) {
    this.onMetricsUpdate = callback;
  }

  public async startMicrophone(): Promise<void> {
    this.stop();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Web Audio API or getUserMedia is not supported in this browser.');
    }

    // Request audio stream with 16kHz preference if supported
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    this.mediaStream = stream;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.6;

    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    this.sourceNode.connect(this.analyser);

    this.isRunning = true;
    this.isSimulated = false;
    this.leqSum = 0;
    this.leqCount = 0;
    this.peakHoldDbfs = -60;

    this.loopAudioAnalysis();
  }

  public startSimulation(preset: 'traffic' | 'birds' | 'construction' | 'siren' | 'speech' | 'hvac' | 'quiet' = 'traffic') {
    this.stop();
    this.isRunning = true;
    this.isSimulated = true;
    this.simulationMode = preset;
    this.leqSum = 0;
    this.leqCount = 0;
    this.peakHoldDbfs = -60;

    let simTick = 0;
    this.simulationIntervalId = window.setInterval(() => {
      simTick += 0.2;
      const { metrics, predictions } = this.generateSimulatedMetrics(this.simulationMode, simTick);
      if (this.onMetricsUpdate) {
        this.onMetricsUpdate(metrics, predictions);
      }
    }, 120);
  }

  public setSimulationPreset(preset: 'traffic' | 'birds' | 'construction' | 'siren' | 'speech' | 'hvac' | 'quiet') {
    this.simulationMode = preset;
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.simulationIntervalId !== null) {
      clearInterval(this.simulationIntervalId);
      this.simulationIntervalId = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
    }

    this.analyser = null;
    this.isRunning = false;
    this.isSimulated = false;
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getIsSimulated(): boolean {
    return this.isSimulated;
  }

  private loopAudioAnalysis = () => {
    if (!this.isRunning || !this.analyser) return;

    const timeData = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(timeData);

    const freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(freqData);

    // Compute RMS
    let sumSquares = 0;
    let zeroCrossings = 0;
    for (let i = 0; i < timeData.length; i++) {
      const sample = timeData[i];
      sumSquares += sample * sample;
      if (i > 0 && ((timeData[i - 1] < 0 && sample >= 0) || (timeData[i - 1] >= 0 && sample < 0))) {
        zeroCrossings++;
      }
    }
    const rms = Math.sqrt(sumSquares / timeData.length);
    const zcr = zeroCrossings / timeData.length;

    // dBFS calculation
    const rawDbfs = rms <= 0.000001 ? -100 : 20 * Math.log10(rms);
    const dbfs = Math.max(-60, Math.min(0, rawDbfs));

    // Estimated dB(A) SPL using calibrated reference: ~94 dB offset from full-scale digital clipping
    const dbSpl = Math.max(30, Math.min(110, dbfs + 94.0));

    // Peak hold
    if (dbfs > this.peakHoldDbfs) {
      this.peakHoldDbfs = dbfs;
    } else {
      this.peakHoldDbfs = Math.max(-60, this.peakHoldDbfs - 0.15); // gentle decay
    }

    // Leq calculation (energy integration over time)
    this.leqSum += Math.pow(10, dbSpl / 10);
    this.leqCount += 1;
    const leq = 10 * Math.log10(this.leqSum / this.leqCount);

    // Spectral analysis
    const sampleRate = this.audioContext?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / freqData.length;

    let spectralSum = 0;
    let totalFreqEnergy = 0;
    let lowEnergy = 0; // 20 - 400 Hz
    let midEnergy = 0; // 400 - 3000 Hz
    let highEnergy = 0; // 3000 - 8000 Hz

    for (let i = 0; i < freqData.length; i++) {
      const freq = i * binWidth;
      const energy = freqData[i];
      totalFreqEnergy += energy;
      spectralSum += freq * energy;

      if (freq < 400) lowEnergy += energy;
      else if (freq < 3000) midEnergy += energy;
      else if (freq < 8000) highEnergy += energy;
    }

    const spectralCentroid = totalFreqEnergy > 0 ? spectralSum / totalFreqEnergy : 500;

    // Spectral Rolloff (85% energy frequency)
    let cumulative = 0;
    let spectralRolloff = 1000;
    const thresholdEnergy = totalFreqEnergy * 0.85;
    for (let i = 0; i < freqData.length; i++) {
      cumulative += freqData[i];
      if (cumulative >= thresholdEnergy) {
        spectralRolloff = i * binWidth;
        break;
      }
    }

    let dominantBand = 'Ambient Silence';
    if (lowEnergy > midEnergy && lowEnergy > highEnergy && dbfs > -52) {
      dominantBand = 'Low Frequency (20-400Hz: Engine/HVAC)';
    } else if (midEnergy >= lowEnergy && midEnergy >= highEnergy && dbfs > -52) {
      dominantBand = 'Mid Frequency (400-3kHz: Voice/Horn)';
    } else if (highEnergy > midEnergy && dbfs > -52) {
      dominantBand = 'High Frequency (3k-8kHz: Birds/Siren)';
    }

    const metrics: AudioMetrics = {
      dbfs: Number(dbfs.toFixed(1)),
      dbSpl: Number(dbSpl.toFixed(1)),
      peakDbfs: Number(this.peakHoldDbfs.toFixed(1)),
      leq: Number(leq.toFixed(1)),
      rms,
      spectralCentroid: Math.round(spectralCentroid),
      spectralRolloff: Math.round(spectralRolloff),
      zeroCrossingRate: Number(zcr.toFixed(3)),
      dominantBand,
    };

    // Environmental Classifier (mimicking YAMNet AudioSet classes based on spectral & temporal dynamics)
    const predictions = this.classifyAcoustics(metrics, lowEnergy, midEnergy, highEnergy, totalFreqEnergy);

    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(metrics, predictions);
    }

    this.animationFrameId = requestAnimationFrame(this.loopAudioAnalysis);
  };

  private classifyAcoustics(
    metrics: AudioMetrics,
    lowEnergy: number,
    midEnergy: number,
    highEnergy: number,
    totalEnergy: number
  ): YamnetPrediction[] {
    const { dbfs, spectralCentroid, zeroCrossingRate } = metrics;

    if (dbfs <= -52) {
      return [
        { label: 'Quiet Room / Ambient Silence', category: 'ambient', confidence: 0.94, description: 'Low acoustic disturbance background' },
        { label: 'Subtle Air Current', category: 'nature', confidence: 0.12, description: 'Gentle air movement' },
        { label: 'Distant Background Hum', category: 'hvac', confidence: 0.08, description: 'Negligible acoustic signature' },
      ];
    }

    const predictions: YamnetPrediction[] = [];

    // Siren / Alarm check: High energy, high centroid, pronounced peaks
    if (spectralCentroid > 2200 && midEnergy + highEnergy > lowEnergy * 1.5 && dbfs > -28) {
      predictions.push({
        label: 'Emergency Siren / Alarm',
        category: 'siren',
        confidence: Math.min(0.96, 0.75 + (dbfs + 28) * 0.015),
        description: 'Piercing tonal sweep typical of emergency vehicle or alarm',
      });
    }

    // Birds / Nature: High centroid, moderate energy, high ZCR
    if (spectralCentroid > 2800 && zeroCrossingRate > 0.08) {
      predictions.push({
        label: 'Birds & Natural Wildlife',
        category: 'nature',
        confidence: Math.min(0.92, 0.65 + (highEnergy / (totalEnergy || 1)) * 0.4),
        description: 'High-frequency avian chirps and natural foliage flutter',
      });
    }

    // Construction / Percussion: High energy across spectrum, sharp transients
    if (dbfs > -20 && lowEnergy > 500 && highEnergy > 300) {
      predictions.push({
        label: 'Construction & Impact Tools',
        category: 'construction',
        confidence: Math.min(0.95, 0.70 + (dbfs + 20) * 0.02),
        description: 'Pneumatic drill, hammer strike, or structural impact',
      });
    }

    // Traffic / Motor Vehicles: Heavy low frequency engine rumble, rolling tire friction
    if (lowEnergy > midEnergy * 1.1 && spectralCentroid < 1400) {
      predictions.push({
        label: 'Traffic & Motor Vehicles',
        category: 'traffic',
        confidence: Math.min(0.94, 0.68 + (lowEnergy / (totalEnergy || 1)) * 0.35),
        description: 'Internal combustion engine rumble and tire-pavement friction',
      });
    }

    // Human Speech: Dominant mid energy between 400Hz and 2.5kHz
    if (midEnergy > lowEnergy && midEnergy > highEnergy && spectralCentroid >= 600 && spectralCentroid <= 2400) {
      predictions.push({
        label: 'Human Speech & Conversation',
        category: 'speech',
        confidence: Math.min(0.91, 0.62 + (midEnergy / (totalEnergy || 1)) * 0.35),
        description: 'Vocal tract formants in the conversational speech band',
      });
    }

    // HVAC / Ventilation: Monotonous low-mid hum
    if (lowEnergy > 300 && Math.abs(midEnergy - highEnergy) < 200 && dbfs > -45 && dbfs < -22) {
      predictions.push({
        label: 'HVAC & Mechanical Hum',
        category: 'hvac',
        confidence: 0.78,
        description: 'Continuous fan compressor or ventilation air flow',
      });
    }

    // Fallbacks if list is sparse
    if (predictions.length === 0) {
      predictions.push(
        { label: 'General Urban Soundscape', category: 'ambient', confidence: 0.81, description: 'Composite environmental acoustic field' },
        { label: 'Distant Traffic', category: 'traffic', confidence: 0.45, description: 'Ambient transit resonance' },
        { label: 'Environmental Air', category: 'nature', confidence: 0.35, description: 'Atmospheric white noise' }
      );
    } else {
      // Add secondary context
      if (!predictions.some((p) => p.category === 'traffic')) {
        predictions.push({ label: 'Distant Traffic', category: 'traffic', confidence: 0.28, description: 'Background roadway hum' });
      }
      if (!predictions.some((p) => p.category === 'ambient')) {
        predictions.push({ label: 'Ambient Soundscape', category: 'ambient', confidence: 0.22, description: 'Diffuse background sound' });
      }
    }

    // Sort by confidence descending
    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 4);
  }

  private generateSimulatedMetrics(
    mode: 'traffic' | 'birds' | 'construction' | 'siren' | 'speech' | 'hvac' | 'quiet',
    tick: number
  ): { metrics: AudioMetrics; predictions: YamnetPrediction[] } {
    let baseDbfs = -32;
    let centroid = 1200;
    let rolloff = 3500;
    let zcr = 0.04;
    let band = 'Mid Frequency';
    let predictions: YamnetPrediction[] = [];

    switch (mode) {
      case 'traffic':
        baseDbfs = -22 + Math.sin(tick * 1.5) * 6 + Math.cos(tick * 3.2) * 2;
        centroid = 950 + Math.sin(tick) * 200;
        rolloff = 2800;
        zcr = 0.035;
        band = 'Low Frequency (Engine / Bus)';
        predictions = [
          { label: 'Traffic & Heavy Vehicles', category: 'traffic', confidence: 0.93, description: 'Diesel engine revving and tire friction' },
          { label: 'Car Horn Tap', category: 'siren', confidence: 0.41, description: 'Intermittent automotive warning horn' },
          { label: 'Urban Ambient', category: 'ambient', confidence: 0.32, description: 'City background acoustic floor' },
        ];
        break;

      case 'birds':
        baseDbfs = -44 + Math.sin(tick * 4.0) * 8;
        centroid = 3400 + Math.cos(tick * 2.0) * 600;
        rolloff = 6200;
        zcr = 0.095;
        band = 'High Frequency (Avian Song)';
        predictions = [
          { label: 'Songbirds & Wildlife', category: 'nature', confidence: 0.95, description: 'Sparrow chirps, finch whistles, and foliage' },
          { label: 'Wind Rustling Foliage', category: 'nature', confidence: 0.58, description: 'Gentle canopy breeze' },
          { label: 'Peaceful Ambient', category: 'ambient', confidence: 0.40, description: 'Low disturbance conservation zone' },
        ];
        break;

      case 'construction':
        baseDbfs = -13 + Math.sin(tick * 5.0) * 7;
        centroid = 1800 + Math.sin(tick * 3.0) * 400;
        rolloff = 5400;
        zcr = 0.07;
        band = 'Wideband Impact Dynamics';
        predictions = [
          { label: 'Pneumatic Jackhammer', category: 'construction', confidence: 0.96, description: 'High-energy repetitive pavement impact' },
          { label: 'Heavy Machinery & Diesel Plant', category: 'construction', confidence: 0.72, description: 'Excavator hydraulics and track rumble' },
          { label: 'Construction Shouting', category: 'speech', confidence: 0.38, description: 'Worksite vocal communications' },
        ];
        break;

      case 'siren':
        baseDbfs = -15 + Math.sin(tick * 2.5) * 5;
        centroid = 2600 + Math.sin(tick * 2.5) * 900; // oscillating siren tone
        rolloff = 5800;
        zcr = 0.082;
        band = 'Mid-High Modulated Sweep';
        predictions = [
          { label: 'Emergency Ambulance Siren', category: 'siren', confidence: 0.97, description: 'Continuous two-tone wailing frequency sweep' },
          { label: 'Emergency Vehicle Transit', category: 'traffic', confidence: 0.65, description: 'High-speed emergency vehicle engine' },
          { label: 'Public Warning Alarm', category: 'siren', confidence: 0.44, description: 'Stationary alert beacon' },
        ];
        break;

      case 'speech':
        baseDbfs = -27 + Math.sin(tick * 3.0) * 7;
        centroid = 1450 + Math.sin(tick * 1.8) * 350;
        rolloff = 3400;
        zcr = 0.052;
        band = 'Vocal Formants (300Hz - 2.5kHz)';
        predictions = [
          { label: 'Human Speech & Conversation', category: 'speech', confidence: 0.91, description: 'Multiple conversational dialogue streams' },
          { label: 'Footsteps on Hard Surface', category: 'ambient', confidence: 0.46, description: 'Pedestrian sidewalk cadence' },
          { label: 'Background Cafe Music', category: 'music', confidence: 0.33, description: 'Low acoustic rhythm' },
        ];
        break;

      case 'hvac':
        baseDbfs = -36 + Math.sin(tick * 0.8) * 1.5;
        centroid = 420;
        rolloff = 1800;
        zcr = 0.021;
        band = 'Low Frequency Hum (60Hz / 120Hz)';
        predictions = [
          { label: 'Commercial HVAC Compressor', category: 'hvac', confidence: 0.94, description: 'Continuous refrigeration pump and air blower' },
          { label: 'Electrical Transformer Drone', category: 'hvac', confidence: 0.52, description: 'Mains AC electromagnetic resonance' },
          { label: 'Indoor Ventilation', category: 'ambient', confidence: 0.45, description: 'Constant airflow pressure' },
        ];
        break;

      case 'quiet':
      default:
        baseDbfs = -54 + Math.sin(tick * 0.5) * 2;
        centroid = 600;
        rolloff = 1200;
        zcr = 0.015;
        band = 'Ambient Noise Floor';
        predictions = [
          { label: 'Quiet Room / Natural Silence', category: 'ambient', confidence: 0.96, description: 'Sub-40 dBA acoustic sanctuary' },
          { label: 'Distant Subtle Air', category: 'nature', confidence: 0.18, description: 'Atmospheric baseline' },
          { label: 'Low Frequency Building Res.', category: 'hvac', confidence: 0.09, description: 'Structural resonance' },
        ];
        break;
    }

    const clampedDbfs = Math.max(-60, Math.min(0, baseDbfs));
    const dbSpl = clampedDbfs + 94;

    this.leqSum += Math.pow(10, dbSpl / 10);
    this.leqCount += 1;
    const leq = 10 * Math.log10(this.leqSum / this.leqCount);

    if (clampedDbfs > this.peakHoldDbfs) {
      this.peakHoldDbfs = clampedDbfs;
    } else {
      this.peakHoldDbfs = Math.max(-60, this.peakHoldDbfs - 0.2);
    }

    const metrics: AudioMetrics = {
      dbfs: Number(clampedDbfs.toFixed(1)),
      dbSpl: Number(dbSpl.toFixed(1)),
      peakDbfs: Number(this.peakHoldDbfs.toFixed(1)),
      leq: Number(leq.toFixed(1)),
      rms: Math.pow(10, clampedDbfs / 20),
      spectralCentroid: Math.round(centroid),
      spectralRolloff: Math.round(rolloff),
      zeroCrossingRate: Number(zcr.toFixed(3)),
      dominantBand: band,
    };

    return { metrics, predictions };
  }
}

export const globalAudioEngine = new AudioEngine();
