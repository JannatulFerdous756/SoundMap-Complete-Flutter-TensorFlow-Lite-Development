import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, AlertTriangle, CheckCircle, ListChecks, X } from 'lucide-react';
import { AcousticAnalysisResult, AudioMetrics, YamnetPrediction } from '../types';

interface AcousticAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: AudioMetrics;
  predictions: YamnetPrediction[];
  durationSeconds: number;
}

export const AcousticAnalysisModal: React.FC<AcousticAnalysisModalProps> = ({
  isOpen,
  onClose,
  metrics,
  predictions,
  durationSeconds,
}) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AcousticAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const runAnalysis = async () => {
      try {
        const res = await fetch('/api/analyze-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dbfs: metrics.dbfs,
            dbSpl: metrics.dbSpl,
            topPredictions: predictions,
            durationSeconds,
            spectralFeatures: {
              centroid: `${metrics.spectralCentroid} Hz`,
              rolloff: `${metrics.spectralRolloff} Hz`,
              dominantBand: metrics.dominantBand,
              zeroCrossingRate: metrics.zeroCrossingRate,
            },
          }),
        });

        if (!res.ok) throw new Error('Acoustic evaluation request failed');
        const data = await res.json();
        if (isMounted) {
          setResult(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    runAnalysis();

    return () => {
      isMounted = false;
    };
  }, [isOpen, metrics, predictions, durationSeconds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl p-6 bg-[#151F31] rounded-3xl border border-[#29364B] shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#29364B]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#36C7B0]" />
            <h3 className="text-lg font-bold text-white">Gemini AI Acoustic Environmental Analysis</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-10 h-10 border-3 border-[#36C7B0] border-t-transparent rounded-full animate-spin" />
            <div className="text-sm font-medium text-slate-300">
              Synthesizing acoustic spectral fingerprints with Gemini...
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              Cross-referencing {metrics.dbSpl} dBA audio metrics with World Health Organization (WHO) and EPA residential noise thresholds.
            </p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300">
            {error}
          </div>
        ) : result ? (
          <div className="space-y-4 text-xs md:text-sm">
            {/* Acoustic Summary */}
            <div className="p-4 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#36C7B0]">
                Acoustic Field Diagnostics
              </span>
              <p className="text-slate-200 leading-relaxed font-medium">{result.acousticSummary}</p>
            </div>

            {/* WHO Guideline & Ordinance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-1.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  WHO Guideline Evaluation
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">{result.whoGuidelineEvaluation}</p>
              </div>

              <div className="p-4 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-1.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Municipal Ordinance Status
                </span>
                <div className="text-sm font-bold text-white">{result.ordinanceStatus}</div>
                <p className="text-slate-400 text-xs leading-relaxed">{result.healthImpact}</p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="p-4 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#36C7B0] flex items-center gap-1.5">
                <ListChecks className="w-3.5 h-3.5" />
                Actionable Next Steps
              </span>
              <ul className="space-y-1.5">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle className="w-3.5 h-3.5 text-[#36C7B0] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-2 border-t border-[#29364B]">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#36C7B0] hover:bg-[#2fb29d] text-[#07131B] text-xs font-semibold rounded-xl"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
