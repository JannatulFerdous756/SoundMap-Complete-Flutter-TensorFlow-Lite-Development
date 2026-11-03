import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Activity,
  ShieldCheck,
  Clock,
  Sparkles,
  MapPin,
  Volume2,
  Sliders,
  AlertCircle,
  HelpCircle,
  Radio,
  ChevronRight,
  Zap,
  History,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { globalAudioEngine } from '../services/audioEngine';
import { AudioMetrics, YamnetPrediction, SoundObservation, ScanSession } from '../types';
import { AcousticVisualizer } from './AcousticVisualizer';
import { ScanHistoryView } from './ScanHistoryView';

interface SoundScannerProps {
  onPinObservation: (obs: Partial<SoundObservation>) => void;
  onOpenAiAnalysis: (metrics: AudioMetrics, predictions: YamnetPrediction[], duration: number) => void;
}

const SEED_SESSIONS: ScanSession[] = [
  {
    id: 'scan-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    durationSeconds: 42,
    durationFormatted: '00:42',
    peakDbfs: -14.2,
    peakDbSpl: 79.8,
    avgDbfs: -24.5,
    avgDbSpl: 69.5,
    primarySound: 'Traffic & Heavy Vehicles',
    confidence: 0.94,
    category: 'traffic',
    topSounds: [
      { label: 'Traffic & Heavy Vehicles', confidence: 0.94 },
      { label: 'Car Horn Tap', confidence: 0.42 },
      { label: 'Urban Ambient', confidence: 0.31 },
    ],
    source: 'sim',
    simPreset: 'Heavy Traffic',
    notes: 'Market Street midday transit corridor observation',
  },
  {
    id: 'scan-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
    durationSeconds: 65,
    durationFormatted: '01:05',
    peakDbfs: -38.4,
    peakDbSpl: 55.6,
    avgDbfs: -46.2,
    avgDbSpl: 47.8,
    primarySound: 'Songbirds & Natural Wildlife',
    confidence: 0.95,
    category: 'nature',
    topSounds: [
      { label: 'Songbirds & Natural Wildlife', confidence: 0.95 },
      { label: 'Wind Rustling Foliage', confidence: 0.54 },
      { label: 'Peaceful Ambient', confidence: 0.38 },
    ],
    source: 'mic',
    notes: 'Presidio urban sanctuary quiet canopy',
  },
  {
    id: 'scan-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    durationSeconds: 28,
    durationFormatted: '00:28',
    peakDbfs: -8.8,
    peakDbSpl: 85.2,
    avgDbfs: -16.4,
    avgDbSpl: 77.6,
    primarySound: 'Pneumatic Jackhammer',
    confidence: 0.96,
    category: 'construction',
    topSounds: [
      { label: 'Pneumatic Jackhammer', confidence: 0.96 },
      { label: 'Heavy Machinery Plant', confidence: 0.71 },
    ],
    source: 'sim',
    simPreset: 'Construction',
    notes: 'Exceeds WHO 55 dBA daytime guideline',
  },
];

export const SoundScanner: React.FC<SoundScannerProps> = ({ onPinObservation, onOpenAiAnalysis }) => {
  const [scannerSubTab, setScannerSubTab] = useState<'scanner' | 'history'>('scanner');

  const [isScanning, setIsScanning] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [audioSource, setAudioSource] = useState<'mic' | 'sim'>('mic');
  const [simPreset, setSimPreset] = useState<'traffic' | 'birds' | 'construction' | 'siren' | 'speech' | 'hvac' | 'quiet'>('traffic');
  const [displayUnit, setDisplayUnit] = useState<'dbfs' | 'dbspl'>('dbfs');
  const [visualizerMode, setVisualizerMode] = useState<'waveform' | 'spectrum'>('waveform');

  const [dbfs, setDbfs] = useState<number>(-60.0);
  const [metrics, setMetrics] = useState<AudioMetrics>({
    dbfs: -60.0,
    dbSpl: 34.0,
    peakDbfs: -60.0,
    leq: 34.0,
    rms: 0,
    spectralCentroid: 450,
    spectralRolloff: 1200,
    zeroCrossingRate: 0.02,
    dominantBand: 'Ambient Silence',
  });

  const [predictions, setPredictions] = useState<YamnetPrediction[]>([
    { label: 'Ambient Urban Soundscape', category: 'ambient', confidence: 0.88, description: 'Quiet baseline acoustic presence' },
    { label: 'Distant Traffic', category: 'traffic', confidence: 0.35, description: 'Far vehicular background' },
  ]);

  const [status, setStatus] = useState<string>('Ready to scan');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pinnedSuccess, setPinnedSuccess] = useState<boolean>(false);
  const [lastSavedSession, setLastSavedSession] = useState<ScanSession | null>(null);

  const scanStartRef = useRef<number | null>(null);
  const sessionPeakRef = useRef<number>(-60.0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Scan Sessions (History)
  const [scanSessions, setScanSessions] = useState<ScanSession[]>(() => {
    try {
      const stored = localStorage.getItem('soundmap_scan_sessions');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return SEED_SESSIONS;
  });

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('soundmap_scan_sessions', JSON.stringify(scanSessions));
    } catch (e) {
      console.warn('Could not persist scan sessions:', e);
    }
  }, [scanSessions]);

  // Subscribe to audio engine updates
  useEffect(() => {
    globalAudioEngine.setListener((newMetrics, newPredictions) => {
      setDbfs(newMetrics.dbfs);
      setMetrics(newMetrics);
      if (newMetrics.dbfs > sessionPeakRef.current) {
        sessionPeakRef.current = newMetrics.dbfs;
      }
      if (newPredictions && newPredictions.length > 0) {
        setPredictions(newPredictions);
      }
    });

    return () => {
      globalAudioEngine.stop();
    };
  }, []);

  // Duration timer
  useEffect(() => {
    let timer: number;
    if (isScanning) {
      if (!scanStartRef.current) scanStartRef.current = Date.now();
      timer = window.setInterval(() => {
        if (scanStartRef.current) {
          const secs = Math.floor((Date.now() - scanStartRef.current) / 1000);
          setElapsedSeconds(secs);
        }
      }, 500);
    } else {
      scanStartRef.current = null;
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isScanning]);

  const durationText = React.useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  const handleStartScan = async () => {
    if (isBusy || isScanning) return;
    setIsBusy(true);
    setErrorMessage(null);
    setPinnedSuccess(false);
    sessionPeakRef.current = -60.0;

    try {
      if (audioSource === 'mic') {
        setStatus('Checking microphone permission...');
        await globalAudioEngine.startMicrophone();
        setStatus('Listening to your environment');
      } else {
        setStatus(`Simulating: ${simPreset.toUpperCase()}`);
        globalAudioEngine.startSimulation(simPreset);
      }
      setIsScanning(true);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      setStatus('Could not start scanner');
      setErrorMessage(
        errStr.includes('NotAllowedError') || errStr.includes('Permission')
          ? 'Microphone permission denied. Allow microphone access in your browser or switch to "Sound Simulator" mode.'
          : `Audio initialization failed: ${errStr}`
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleStopScan = () => {
    if (isBusy || !isScanning) return;
    setIsBusy(true);
    setStatus('Stopping scan...');

    try {
      const finalDuration = Math.max(1, elapsedSeconds);
      const finalPeak = sessionPeakRef.current > -60 ? sessionPeakRef.current : dbfs;
      const primary = predictions[0] || { label: 'Environmental Sound', category: 'ambient', confidence: 0.85 };

      // Save to Scan History
      const newSession: ScanSession = {
        id: `scan-${Date.now()}`,
        timestamp: new Date().toISOString(),
        durationSeconds: finalDuration,
        durationFormatted: `${Math.floor(finalDuration / 60).toString().padStart(2, '0')}:${(finalDuration % 60).toString().padStart(2, '0')}`,
        peakDbfs: Number(finalPeak.toFixed(1)),
        peakDbSpl: Number((finalPeak + 94).toFixed(1)),
        avgDbfs: Number((metrics.leq - 94).toFixed(1)),
        avgDbSpl: Number(metrics.leq.toFixed(1)),
        primarySound: primary.label,
        confidence: primary.confidence,
        category: primary.category,
        topSounds: predictions.map((p) => ({ label: p.label, confidence: p.confidence })),
        source: audioSource,
        simPreset: audioSource === 'sim' ? simPreset : undefined,
      };

      setScanSessions((prev) => [newSession, ...prev]);
      setLastSavedSession(newSession);

      globalAudioEngine.stop();
      setIsScanning(false);
      setStatus('Scan stopped & saved to history');
      setDbfs(-60.0);
    } catch (err: unknown) {
      setErrorMessage(`Could not stop scanner: ${err}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSimPresetChange = (preset: typeof simPreset) => {
    setSimPreset(preset);
    if (isScanning && audioSource === 'sim') {
      globalAudioEngine.setSimulationPreset(preset);
      setStatus(`Simulating: ${preset.toUpperCase()}`);
    }
  };

  const handlePinObservation = () => {
    const primary = predictions[0] || { label: 'Environmental Sound', category: 'ambient', confidence: 0.85 };
    onPinObservation({
      dbfs,
      dbSpl: metrics.dbSpl,
      primarySound: primary.label,
      confidence: primary.confidence,
      category: (primary.category as any) || 'ambient',
    });
    setPinnedSuccess(true);
    setTimeout(() => setPinnedSuccess(false), 3500);
  };

  const handleDeleteSession = (id: string) => {
    setScanSessions((prev) => prev.filter((s) => s.id !== id));
    if (lastSavedSession?.id === id) setLastSavedSession(null);
  };

  const handleClearAllSessions = () => {
    setScanSessions([]);
    setLastSavedSession(null);
    localStorage.removeItem('soundmap_scan_sessions');
  };

  // Normalized meter value (0.0 to 1.0) for linear progress indicator
  const meterValue = Math.max(0, Math.min(1, (dbfs + 60.0) / 60.0));

  // Determine noise severity badge
  const noiseSeverity = React.useMemo(() => {
    const spl = metrics.dbSpl;
    if (spl < 50) return { label: 'Quiet / Peaceful', color: 'text-emerald-400' };
    if (spl < 65) return { label: 'Moderate Ambient', color: 'text-teal-400' };
    if (spl < 80) return { label: 'Loud Urban / Traffic', color: 'text-amber-400' };
    return { label: 'Hazardous / Extreme Noise', color: 'text-rose-400' };
  }, [metrics.dbSpl]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-[#36C7B0]" />
            Understand your environment.
          </h1>
          <p className="text-sm md:text-base text-slate-400">
            Scan environmental sounds around you using on-device acoustic recognition.
          </p>
        </div>

        {/* Segmented View Switch: Live Scanner vs Scan History */}
        <div className="flex items-center gap-1 bg-[#151F31] p-1.5 rounded-2xl border border-[#29364B]">
          <button
            onClick={() => setScannerSubTab('scanner')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              scannerSubTab === 'scanner'
                ? 'bg-[#36C7B0] text-[#07131B] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Live Scanner
          </button>
          <button
            onClick={() => setScannerSubTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              scannerSubTab === 'history'
                ? 'bg-[#36C7B0] text-[#07131B] shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Scan History ({scanSessions.length})
          </button>
        </div>
      </div>

      {/* Conditionally Render Scan History View or Live Scanner */}
      {scannerSubTab === 'history' ? (
        <ScanHistoryView
          sessions={scanSessions}
          onDeleteSession={handleDeleteSession}
          onClearAll={handleClearAllSessions}
          onPinObservation={onPinObservation}
          onOpenAiAnalysis={onOpenAiAnalysis}
        />
      ) : (
        <>
          {/* Recent Saved Session Toast Banner */}
          {lastSavedSession && (
            <div className="p-3.5 bg-[#151F31] rounded-2xl border border-[#36C7B0]/50 flex items-center justify-between gap-3 text-xs animate-fade-in shadow-lg">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-200">
                  <span className="font-semibold text-white">Scan Session Saved:</span> {lastSavedSession.primarySound}{' '}
                  (Peak: <span className="font-mono text-[#36C7B0] font-bold">{lastSavedSession.peakDbfs.toFixed(1)} dBFS</span> /{' '}
                  <span className="font-mono text-slate-300">{lastSavedSession.peakDbSpl.toFixed(1)} dBA</span>)
                </span>
              </div>
              <button
                onClick={() => setScannerSubTab('history')}
                className="text-[#36C7B0] hover:underline font-semibold flex items-center gap-1 shrink-0"
              >
                View History <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Mode Controls Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-[#151F31]/80 rounded-2xl border border-[#29364B]">
            {/* Source Toggle */}
            <div className="flex items-center gap-1 bg-[#0B1220] p-1 rounded-xl">
              <button
                onClick={() => {
                  if (isScanning) handleStopScan();
                  setAudioSource('mic');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  audioSource === 'mic'
                    ? 'bg-[#36C7B0] text-[#07131B] font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                Live Microphone
              </button>
              <button
                onClick={() => {
                  if (isScanning) handleStopScan();
                  setAudioSource('sim');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  audioSource === 'sim'
                    ? 'bg-[#36C7B0] text-[#07131B] font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                Sound Simulator
              </button>
            </div>

            {/* Display Unit Toggle */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Scale:</span>
              <div className="flex items-center gap-1 bg-[#0B1220] p-1 rounded-xl">
                <button
                  onClick={() => setDisplayUnit('dbfs')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                    displayUnit === 'dbfs' ? 'bg-[#29364B] text-[#36C7B0] font-semibold' : 'text-slate-400'
                  }`}
                >
                  dBFS (Digital)
                </button>
                <button
                  onClick={() => setDisplayUnit('dbspl')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                    displayUnit === 'dbspl' ? 'bg-[#29364B] text-[#36C7B0] font-semibold' : 'text-slate-400'
                  }`}
                >
                  dBA SPL (Acoustic)
                </button>
              </div>
            </div>

            {/* Visualizer Type */}
            <div className="flex items-center gap-1 bg-[#0B1220] p-1 rounded-xl">
              <button
                onClick={() => setVisualizerMode('waveform')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  visualizerMode === 'waveform' ? 'bg-[#29364B] text-slate-200' : 'text-slate-400'
                }`}
                title="Oscilloscope Waveform"
              >
                Waveform
              </button>
              <button
                onClick={() => setVisualizerMode('spectrum')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  visualizerMode === 'spectrum' ? 'bg-[#29364B] text-slate-200' : 'text-slate-400'
                }`}
                title="Frequency Spectrum Bins"
              >
                Spectrum
              </button>
            </div>
          </div>

          {/* Simulator Preset Selection (if in simulator mode) */}
          {audioSource === 'sim' && (
            <div className="p-3 bg-[#151F31]/60 rounded-2xl border border-[#29364B]/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#36C7B0]" />
                  Select Environmental Acoustic Preset:
                </span>
                <span>Simulates realistic 16kHz PCM waveform characteristics</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'traffic', label: 'Heavy Traffic & Horns' },
                  { id: 'birds', label: 'Park Birds & Canopy' },
                  { id: 'construction', label: 'Jackhammer & Machinery' },
                  { id: 'siren', label: 'Emergency Siren' },
                  { id: 'speech', label: 'Conversational Babble' },
                  { id: 'hvac', label: 'Commercial HVAC Hum' },
                  { id: 'quiet', label: 'Night Quiet Room' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSimPresetChange(p.id as any)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                      simPreset === p.id
                        ? 'bg-[#36C7B0]/20 border-[#36C7B0] text-[#36C7B0]'
                        : 'bg-[#0B1220]/70 border-[#29364B] text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Scanner Card (Faithful to the Flutter UI architecture) */}
          <div className="w-full p-6 md:p-8 bg-[#151F31] rounded-3xl border border-[#29364B] shadow-2xl relative overflow-hidden">
            {/* Subtle decorative glow when scanning */}
            {isScanning && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-[#36C7B0]/10 blur-3xl pointer-events-none rounded-full" />
            )}

            <div className="flex flex-col items-center text-center space-y-5">
              {/* Main Scanner Icon */}
              <div className="p-4 rounded-2xl bg-[#0B1220]/80 border border-[#29364B] shadow-inner text-[#36C7B0]">
                {isScanning ? (
                  <Activity className="w-11 h-11 animate-pulse text-[#36C7B0]" />
                ) : (
                  <Volume2 className="w-11 h-11 text-[#36C7B0]" />
                )}
              </div>

              {/* Section Tag */}
              <div className="text-xs font-bold tracking-[0.2em] text-[#36C7B0] uppercase">
                {isScanning ? 'SCANNING ACTIVE' : 'SOUND SCANNER'}
              </div>

              {/* Big Decibel Reading */}
              <div className="space-y-1">
                <div className="text-4xl md:text-5xl font-bold tracking-tight text-white font-mono tabular-nums">
                  {displayUnit === 'dbfs' ? `${dbfs.toFixed(1)} dBFS` : `${metrics.dbSpl.toFixed(1)} dBA`}
                </div>
                <div className="text-xs md:text-sm text-slate-400 flex items-center justify-center gap-2">
                  <span>{displayUnit === 'dbfs' ? 'Relative audio signal level' : 'Estimated Sound Pressure Level (SPL)'}</span>
                  <span>·</span>
                  <span className={noiseSeverity.color}>{noiseSeverity.label}</span>
                </div>
              </div>

              {/* Linear Progress Meter */}
              <div className="w-full max-w-md space-y-2">
                <div className="w-full h-3 bg-[#29364B] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-[#36C7B0] to-rose-400 rounded-full transition-all duration-150 ease-out shadow-sm"
                    style={{ width: `${(meterValue * 100).toFixed(1)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1">
                  <span>-60 dBFS</span>
                  <span>-30 dBFS</span>
                  <span>0 dBFS (Peak)</span>
                </div>
              </div>

              {/* Live Waveform / Spectrum Canvas */}
              <div className="w-full max-w-md">
                <AcousticVisualizer isScanning={isScanning} dbfs={dbfs} mode={visualizerMode} />
              </div>

              {/* Status Capsule */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1220] rounded-full border border-[#29364B]/60 text-xs text-slate-200">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isScanning ? 'bg-[#36C7B0] ring-4 ring-[#36C7B0]/20' : 'bg-slate-500'
                  }`}
                />
                <span className="font-medium">{status}</span>
              </div>

              {/* Main Action Button */}
              <div className="w-full max-w-md pt-2">
                <button
                  onClick={isBusy ? undefined : isScanning ? handleStopScan : handleStartScan}
                  disabled={isBusy}
                  className={`w-full h-13 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-[0.98] ${
                    isBusy
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : isScanning
                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                      : 'bg-[#36C7B0] text-[#07131B] hover:bg-[#2fb29d] shadow-[#36C7B0]/20'
                  }`}
                >
                  {isBusy ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Please wait...
                    </>
                  ) : isScanning ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      Stop scan
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      Start scan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Milestone 2: AI Sound Recognition Panel (YAMNet Classification) */}
          <div className="p-5 md:p-6 bg-[#151F31] rounded-3xl border border-[#29364B] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#36C7B0]" />
                <h2 className="text-base font-semibold text-white">YAMNet Sound Recognition</h2>
                <span className="text-xs text-slate-400">· 521 AudioSet Classes</span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Centroid: <span className="text-slate-200">{metrics.spectralCentroid} Hz</span>
              </div>
            </div>

            {/* Prediction Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {predictions.map((pred, idx) => (
                <div
                  key={pred.label + idx}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    idx === 0
                      ? 'bg-[#0B1220] border-[#36C7B0]/50 shadow-sm'
                      : 'bg-[#0B1220]/60 border-[#29364B]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="text-[#36C7B0] font-mono text-[10px]">#0{idx + 1}</span>
                      {pred.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#36C7B0] tabular-nums">
                      {(pred.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">{pred.description}</p>
                  <div className="w-full h-1.5 bg-[#29364B] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#36C7B0] rounded-full transition-all duration-300"
                      style={{ width: `${(pred.confidence * 100).toFixed(0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Actions Row: Pin to Map & Deep AI Diagnostic */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#29364B]/60">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePinObservation}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#29364B]/80 hover:bg-[#29364B] text-slate-200 hover:text-white text-xs font-medium rounded-xl border border-[#29364B] transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#36C7B0]" />
                  Pin Reading to SoundMap
                </button>
                {pinnedSuccess && (
                  <span className="text-xs text-emerald-400 font-medium animate-fade-in">
                    Observation pinned to map!
                  </span>
                )}
              </div>

              <button
                onClick={() => onOpenAiAnalysis(metrics, predictions, elapsedSeconds || 10)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#36C7B0]/15 hover:bg-[#36C7B0]/25 text-[#36C7B0] text-xs font-medium rounded-xl border border-[#36C7B0]/30 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask Gemini Acoustic Expert
              </button>
            </div>
          </div>

          {/* Info Cards Row (Duration & Privacy as in Flutter code) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-[#151F31] rounded-2xl border border-[#29364B] space-y-2">
              <Clock className="w-5 h-5 text-[#36C7B0]" />
              <div className="text-xs text-slate-400">Duration</div>
              <div className="text-xl font-bold font-mono text-white tabular-nums">{durationText}</div>
            </div>

            <div className="p-4 bg-[#151F31] rounded-2xl border border-[#29364B] space-y-2">
              <ShieldCheck className="w-5 h-5 text-[#36C7B0]" />
              <div className="text-xs text-slate-400">Privacy</div>
              <div className="text-xl font-bold text-white">On-device</div>
            </div>

            <div className="p-4 bg-[#151F31] rounded-2xl border border-[#29364B] space-y-2">
              <Sliders className="w-5 h-5 text-[#36C7B0]" />
              <div className="text-xs text-slate-400">Leq Continuous (dBA)</div>
              <div className="text-xl font-bold font-mono text-white tabular-nums">
                {metrics.leq.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Recent Scans Strip in Live Scanner */}
          <div className="p-5 bg-[#151F31] rounded-3xl border border-[#29364B] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#36C7B0]" />
                <h3 className="text-sm font-bold text-white">Recent Scan Sessions</h3>
              </div>
              <button
                onClick={() => setScannerSubTab('history')}
                className="text-xs font-semibold text-[#36C7B0] hover:underline flex items-center gap-1"
              >
                View Full History ({scanSessions.length}) <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {scanSessions.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  onClick={() => setScannerSubTab('history')}
                  className="p-3 bg-[#0B1220] rounded-2xl border border-[#29364B] hover:border-[#36C7B0]/60 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white truncate max-w-[140px]">
                      {session.primarySound}
                    </span>
                    <span className="font-mono text-xs font-bold text-rose-400">
                      {session.peakDbfs.toFixed(1)} <span className="text-[10px] text-slate-400">dBFS</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-mono">{session.durationFormatted}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Informational Disclaimer Card */}
          <div className="p-4 bg-[#172437] rounded-2xl border border-[#29364B]/60 flex items-start gap-3 text-xs md:text-sm text-slate-300 leading-relaxed">
            <HelpCircle className="w-5 h-5 text-[#36C7B0] shrink-0 mt-0.5" />
            <p>
              This scanner captures real-time microphone audio frames at 16,000 Hz and computes digital signal levels (dBFS)
              alongside an estimated A-weighted sound pressure level (dBA SPL). Acoustic event classification runs entirely
              client-side in adherence with on-device privacy. Completed scan sessions are saved automatically to your on-device
              Scan History.
            </p>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-xs md:text-sm text-rose-300">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Footer Tag */}
          <div className="text-center text-[11px] tracking-widest text-slate-500 uppercase font-mono">
            SOUNDMAP · EARLY ACCESS BUILD · YAMNET ACCELERATED
          </div>
        </>
      )}
    </div>
  );
};
