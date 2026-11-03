import React, { useState } from 'react';
import {
  History,
  Trash2,
  Download,
  MapPin,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  Volume2,
  Radio,
  Mic,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { ScanSession, AudioMetrics, YamnetPrediction, SoundObservation } from '../types';

interface ScanHistoryViewProps {
  sessions: ScanSession[];
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
  onPinObservation: (obs: Partial<SoundObservation>) => void;
  onOpenAiAnalysis: (metrics: AudioMetrics, predictions: YamnetPrediction[], duration: number) => void;
  onSelectSessionToSimulate?: (session: ScanSession) => void;
}

export const ScanHistoryView: React.FC<ScanHistoryViewProps> = ({
  sessions,
  onDeleteSession,
  onClearAll,
  onPinObservation,
  onOpenAiAnalysis,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'peak' | 'duration'>('recent');
  const [pinnedSessionId, setPinnedSessionId] = useState<string | null>(null);

  // Filtered & Sorted Sessions
  const filteredSessions = sessions
    .filter((s) => {
      const matchesSearch =
        s.primarySound.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
      return matchesSearch && matchesCat;
    })
    .sort((a, b) => {
      if (sortBy === 'peak') return b.peakDbfs - a.peakDbfs;
      if (sortBy === 'duration') return b.durationSeconds - a.durationSeconds;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  // Analytics summary from history
  const totalScans = sessions.length;
  const maxPeakDbfs = sessions.length > 0 ? Math.max(...sessions.map((s) => s.peakDbfs)) : -60;
  const maxPeakSpl = maxPeakDbfs + 94;
  const totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalTimeFormatted = `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;

  // Sound prevalence
  const soundCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    soundCounts[s.primarySound] = (soundCounts[s.primarySound] || 0) + 1;
  });
  const mostFrequentSound = Object.entries(soundCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  const exportAllAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `soundmap_scan_history_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const exportAllAsCsv = () => {
    const headers = ['ID', 'Timestamp', 'DurationSeconds', 'Peak_dBFS', 'Peak_dBA_SPL', 'Avg_dBA_SPL', 'PrimarySound', 'Confidence', 'Category', 'Source'];
    const rows = sessions.map((s) => [
      s.id,
      s.timestamp,
      s.durationSeconds,
      s.peakDbfs,
      s.peakDbSpl,
      s.avgDbSpl,
      `"${s.primarySound.replace(/"/g, '""')}"`,
      s.confidence,
      s.category,
      s.source,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csvContent);
    a.download = `soundmap_scan_history_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handlePin = (session: ScanSession) => {
    onPinObservation({
      dbfs: session.peakDbfs,
      dbSpl: session.peakDbSpl,
      primarySound: session.primarySound,
      confidence: session.confidence,
      category: session.category as any,
      address: `Scan Session from ${new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    });
    setPinnedSessionId(session.id);
    setTimeout(() => setPinnedSessionId(null), 3000);
  };

  const handleAiDiagnose = (session: ScanSession) => {
    const reconstructedMetrics: AudioMetrics = {
      dbfs: session.peakDbfs,
      dbSpl: session.peakDbSpl,
      peakDbfs: session.peakDbfs,
      leq: session.avgDbSpl,
      rms: Math.pow(10, session.peakDbfs / 20),
      spectralCentroid: 1450,
      spectralRolloff: 3400,
      zeroCrossingRate: 0.04,
      dominantBand: session.category === 'traffic' ? 'Low Frequency Rumble' : 'Mid Frequency Band',
    };
    const reconstructedPredictions: YamnetPrediction[] = session.topSounds.map((ts) => ({
      label: ts.label,
      category: session.category,
      confidence: ts.confidence,
      description: 'Historical scan detection',
    }));
    onOpenAiAnalysis(reconstructedMetrics, reconstructedPredictions, session.durationSeconds);
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Header and Quick Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-[#36C7B0]" />
            Scan History & Previous Sessions
          </h2>
          <p className="text-sm text-slate-400">
            Audit logs of previous environmental audio recordings, peak decibel thresholds, and recognized acoustic events.
          </p>
        </div>

        {sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportAllAsCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151F31] hover:bg-[#29364B] text-slate-300 text-xs font-medium rounded-xl border border-[#29364B] transition-colors"
              title="Export as CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#36C7B0]" />
              CSV
            </button>
            <button
              onClick={exportAllAsJson}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151F31] hover:bg-[#29364B] text-slate-300 text-xs font-medium rounded-xl border border-[#29364B] transition-colors"
              title="Export as JSON"
            >
              <Download className="w-3.5 h-3.5 text-[#36C7B0]" />
              JSON
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all scan history logs?')) {
                  onClearAll();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-[#151F31] rounded-2xl border border-[#29364B] space-y-1">
          <div className="text-[11px] text-slate-400">Total Sessions</div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">{totalScans}</div>
          <div className="text-[10px] text-slate-500">Stored on-device</div>
        </div>

        <div className="p-4 bg-[#151F31] rounded-2xl border border-[#29364B] space-y-1">
          <div className="text-[11px] text-slate-400">Max Peak Recorded</div>
          <div className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
            {maxPeakDbfs.toFixed(1)} <span className="text-xs font-normal text-slate-400">dBFS</span>
          </div>
          <div className="text-[10px] text-slate-400">~{maxPeakSpl.toFixed(1)} dBA SPL</div>
        </div>

        <div className="p-4 bg-[#151F31] rounded-2xl border border-[#29364B] space-y-1">
          <div className="text-[11px] text-slate-400">Most Prevalent Sound</div>
          <div className="text-sm font-bold text-[#36C7B0] truncate" title={mostFrequentSound}>
            {mostFrequentSound}
          </div>
          <div className="text-[10px] text-slate-500">Top acoustic event</div>
        </div>

        <div className="p-4 bg-[#151F31] rounded-2xl border border-[#29364B] space-y-1">
          <div className="text-[11px] text-slate-400">Total Scanned Time</div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">{totalTimeFormatted}</div>
          <div className="text-[10px] text-slate-500">Cumulative capture</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-3 bg-[#151F31] rounded-2xl border border-[#29364B] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search scans by sound name or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#0B1220] border border-[#29364B] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#36C7B0]"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-slate-400 shrink-0">Category:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'traffic', label: 'Traffic' },
            { id: 'nature', label: 'Nature' },
            { id: 'construction', label: 'Construction' },
            { id: 'siren', label: 'Siren' },
            { id: 'speech', label: 'Speech' },
            { id: 'hvac', label: 'HVAC' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#36C7B0] text-[#07131B] border-[#36C7B0] font-semibold'
                  : 'bg-[#0B1220] text-slate-400 border-[#29364B] hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort By */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1 bg-[#0B1220] border border-[#29364B] rounded-lg text-slate-300 focus:outline-none focus:border-[#36C7B0]"
          >
            <option value="recent">Most Recent</option>
            <option value="peak">Highest Peak dB</option>
            <option value="duration">Longest Duration</option>
          </select>
        </div>
      </div>

      {/* Session Cards List */}
      {filteredSessions.length === 0 ? (
        <div className="p-12 text-center bg-[#151F31]/60 rounded-3xl border border-[#29364B] space-y-3">
          <div className="p-4 bg-[#0B1220] w-fit mx-auto rounded-2xl border border-[#29364B] text-slate-500">
            <Volume2 className="w-8 h-8" />
          </div>
          <div className="text-base font-semibold text-slate-300">No matching scan sessions found</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {sessions.length === 0
              ? 'Start a scan using Live Microphone or Sound Simulator. Sessions are saved automatically upon stopping.'
              : 'Try adjusting your search query or category filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            // Determine severity color
            let badgeBg = 'bg-teal-500/10 border-teal-500/30 text-teal-300';
            let splColor = 'text-teal-400';
            if (session.peakDbSpl >= 80) {
              badgeBg = 'bg-rose-500/10 border-rose-500/30 text-rose-300';
              splColor = 'text-rose-400';
            } else if (session.peakDbSpl >= 65) {
              badgeBg = 'bg-amber-500/10 border-amber-500/30 text-amber-300';
              splColor = 'text-amber-400';
            } else if (session.peakDbSpl < 50) {
              badgeBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
              splColor = 'text-emerald-400';
            }

            const formattedTime = new Date(session.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const formattedDate = new Date(session.timestamp).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={session.id}
                className="p-5 bg-[#151F31] rounded-3xl border border-[#29364B] hover:border-[#36C7B0]/60 transition-all space-y-3 shadow-md"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white flex items-center gap-1.5">
                        {session.primarySound}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#36C7B0]">
                        {(session.confidence * 100).toFixed(0)}%
                      </span>
                      <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${badgeBg}`}>
                        {session.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{formattedDate} at {formattedTime}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {session.durationFormatted} ({session.durationSeconds}s)
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        {session.source === 'mic' ? (
                          <>
                            <Mic className="w-3 h-3 text-[#36C7B0]" />
                            Live Microphone
                          </>
                        ) : (
                          <>
                            <Radio className="w-3 h-3 text-cyan-400" />
                            Simulator ({session.simPreset || 'Custom'})
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Decibel Metric Pills */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-mono">PEAK LEVEL</div>
                      <div className={`text-base font-bold font-mono tabular-nums ${splColor}`}>
                        {session.peakDbfs.toFixed(1)} <span className="text-xs font-normal">dBFS</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">~{session.peakDbSpl.toFixed(1)} dBA</div>
                    </div>

                    <div className="text-right border-l border-[#29364B] pl-3">
                      <div className="text-[10px] text-slate-400 font-mono">AVG LEQ</div>
                      <div className="text-base font-bold font-mono text-slate-200 tabular-nums">
                        {session.avgDbSpl.toFixed(1)} <span className="text-xs font-normal text-slate-400">dBA</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secondary Detected Sounds Tags */}
                {session.topSounds && session.topSounds.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
                    <span className="text-[11px] text-slate-500">Co-occurring acoustic signatures:</span>
                    {session.topSounds.slice(1, 4).map((ts, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-[#0B1220] rounded-lg border border-[#29364B] text-[11px] text-slate-300"
                      >
                        {ts.label} ({(ts.confidence * 100).toFixed(0)}%)
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="pt-3 border-t border-[#29364B]/70 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePin(session)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1220] hover:bg-[#29364B] text-slate-200 hover:text-white text-xs font-medium rounded-xl border border-[#29364B] transition-colors"
                      title="Pin this historical scan to the live map"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#36C7B0]" />
                      Pin to Map
                    </button>

                    {pinnedSessionId === session.id && (
                      <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Pinned!
                      </span>
                    )}

                    <button
                      onClick={() => handleAiDiagnose(session)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#36C7B0]/15 hover:bg-[#36C7B0]/25 text-[#36C7B0] text-xs font-medium rounded-xl border border-[#36C7B0]/30 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Gemini Acoustic Review
                    </button>
                  </div>

                  <button
                    onClick={() => onDeleteSession(session.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete session log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
