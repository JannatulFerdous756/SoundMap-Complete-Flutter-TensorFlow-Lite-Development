import React, { useEffect, useRef } from 'react';
import { globalAudioEngine } from '../services/audioEngine';

interface AcousticVisualizerProps {
  isScanning: boolean;
  dbfs: number;
  mode?: 'waveform' | 'spectrum';
}

export const AcousticVisualizer: React.FC<AcousticVisualizerProps> = ({ isScanning, dbfs, mode = 'waveform' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Subtle background grid
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const analyser = globalAudioEngine.getAnalyserNode();

      if (!isScanning) {
        // Idle flat line with subtle breathe
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      if (analyser && mode === 'waveform') {
        const timeData = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(timeData);

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#36C7B0';
        ctx.shadowColor = '#36C7B0';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        const sliceWidth = width / timeData.length;
        let x = 0;

        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i];
          const y = (height / 2) + v * (height / 2) * 1.4;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      } else if (analyser && mode === 'spectrum') {
        const freqData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData);

        const barCount = 36;
        const step = Math.floor(freqData.length / barCount);
        const barWidth = (width / barCount) - 2;

        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += freqData[i * step + j] || 0;
          }
          const avg = sum / step;
          const barHeight = (avg / 255) * (height - 6);

          const x = i * (barWidth + 2);
          const y = height - barHeight;

          // Gradient color: Teal to Cyan
          const grad = ctx.createLinearGradient(0, height, 0, 0);
          grad.addColorStop(0, '#10B981');
          grad.addColorStop(0.6, '#36C7B0');
          grad.addColorStop(1, '#38BDF8');

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      } else {
        // Simulated dynamic waveform based on dBFS
        const amp = Math.max(0.05, (dbfs + 60) / 60);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#36C7B0';
        ctx.shadowColor = '#36C7B0';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        const now = Date.now() / 200;
        for (let x = 0; x < width; x += 2) {
          const normX = x / width;
          const y =
            height / 2 +
            Math.sin(normX * 18 + now) * 22 * amp +
            Math.cos(normX * 35 + now * 1.5) * 10 * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isScanning, dbfs, mode]);

  return (
    <div className="relative w-full h-16 rounded-xl overflow-hidden bg-[#0B1220] border border-[#29364B]/60 p-1">
      <canvas
        ref={canvasRef}
        width={360}
        height={64}
        className="w-full h-full block"
      />
    </div>
  );
};
