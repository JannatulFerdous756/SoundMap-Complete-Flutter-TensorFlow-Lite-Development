import React from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  ShieldAlert,
  Clock,
  Sparkles,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  // Simulated 24-hour urban noise curve data (hours 0 to 23)
  const hourlyData = [
    { hour: '00:00', db: 42, period: 'Night' },
    { hour: '02:00', db: 39, period: 'Night' },
    { hour: '04:00', db: 41, period: 'Night' },
    { hour: '06:00', db: 52, period: 'Day' },
    { hour: '08:00', db: 78, period: 'Morning Rush' },
    { hour: '10:00', db: 68, period: 'Day' },
    { hour: '12:00', db: 71, period: 'Midday' },
    { hour: '14:00', db: 66, period: 'Day' },
    { hour: '16:00', db: 72, period: 'Day' },
    { hour: '18:00', db: 79, period: 'Evening Rush' },
    { hour: '20:00', db: 63, period: 'Evening' },
    { hour: '22:00', db: 48, period: 'Night' },
  ];

  // Soundscape distribution breakdown
  const categoryBreakdown = [
    { label: 'Traffic & Road Transit', percentage: 42, color: 'bg-amber-400', textColor: 'text-amber-400' },
    { label: 'Birds & Natural Foliage', percentage: 24, color: 'bg-emerald-400', textColor: 'text-emerald-400' },
    { label: 'Human Speech & Activity', percentage: 18, color: 'bg-[#36C7B0]', textColor: 'text-[#36C7B0]' },
    { label: 'Construction & Machinery', percentage: 10, color: 'bg-rose-400', textColor: 'text-rose-400' },
    { label: 'HVAC & Mechanical Hum', percentage: 6, color: 'bg-cyan-400', textColor: 'text-cyan-400' },
  ];

  // WHO thresholds
  const WHO_DAY_THRESHOLD = 55;
  const WHO_NIGHT_THRESHOLD = 45;

  return (
    <div className="w-full space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#36C7B0]" />
          Acoustic Analytics & Trend Intelligence
        </h2>
        <p className="text-sm text-slate-400">
          Diurnal noise curves, acoustic soundscape classification distributions, and exposure safety limits.
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-[#151F31] rounded-3xl border border-[#29364B] space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Neighborhood Serenity Index</span>
            <Sparkles className="w-4 h-4 text-[#36C7B0]" />
          </div>
          <div className="text-3xl font-bold font-mono text-[#36C7B0]">74 / 100</div>
          <div className="text-xs text-emerald-400 font-medium">B+ Moderate Serenity Zone</div>
        </div>

        <div className="p-5 bg-[#151F31] rounded-3xl border border-[#29364B] space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>24h Day-Night Leq (Ldn)</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">62.4 <span className="text-sm font-normal text-slate-400">dBA</span></div>
          <div className="text-xs text-amber-400 font-medium">+1.4 dBA vs. 30-day average</div>
        </div>

        <div className="p-5 bg-[#151F31] rounded-3xl border border-[#29364B] space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Peak Noise Window</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white">08:00 – 09:30</div>
          <div className="text-xs text-rose-400 font-medium">Avg Peak: 79.2 dBA (Morning Transit)</div>
        </div>

        <div className="p-5 bg-[#151F31] rounded-3xl border border-[#29364B] space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>WHO Compliance Rate</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">68%</div>
          <div className="text-xs text-slate-400">Hours within WHO safe guideline</div>
        </div>
      </div>

      {/* 24-Hour Diurnal Noise Curve */}
      <div className="p-6 bg-[#151F31] rounded-3xl border border-[#29364B] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white">24-Hour Diurnal Ambient Noise Profile (Leq)</h3>
            <p className="text-xs text-slate-400">
              Hourly equivalent continuous sound levels compared against WHO Community Noise Standards
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 bg-[#36C7B0] rounded-sm" /> Observed Leq
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-0.5 bg-amber-400 border-dashed" /> WHO Daytime (55 dBA)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-0.5 bg-cyan-400 border-dashed" /> WHO Nighttime (45 dBA)
            </span>
          </div>
        </div>

        {/* Bar/Curve Visualizer */}
        <div className="relative h-64 w-full flex items-end gap-2 md:gap-4 pt-8 pb-4 border-b border-[#29364B]">
          {/* Reference Guideline Lines */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-amber-400/50 pointer-events-none"
            style={{ bottom: `${(WHO_DAY_THRESHOLD / 100) * 100}%` }}
          >
            <span className="text-[10px] text-amber-400 font-mono absolute -top-4 right-0">
              WHO Daytime Max (55 dBA)
            </span>
          </div>

          <div
            className="absolute left-0 right-0 border-t border-dashed border-cyan-400/50 pointer-events-none"
            style={{ bottom: `${(WHO_NIGHT_THRESHOLD / 100) * 100}%` }}
          >
            <span className="text-[10px] text-cyan-400 font-mono absolute -top-4 right-0">
              WHO Night Sleep Sanctuary (45 dBA)
            </span>
          </div>

          {/* Hourly Columns */}
          {hourlyData.map((d) => {
            const heightPercent = (d.db / 100) * 100;
            const isExceeding = d.db > (d.hour >= '06:00' && d.hour <= '22:00' ? WHO_DAY_THRESHOLD : WHO_NIGHT_THRESHOLD);

            return (
              <div key={d.hour} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                  {d.db}dB
                </div>
                <div
                  className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                    isExceeding
                      ? 'bg-gradient-to-t from-[#36C7B0]/60 to-rose-400 group-hover:to-rose-300'
                      : 'bg-gradient-to-t from-emerald-500/50 to-[#36C7B0] group-hover:to-emerald-300'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-[10px] font-mono text-slate-400 mt-2 truncate">
                  {d.hour}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Acoustic Category Distribution & Exposure Limits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="p-6 bg-[#151F31] rounded-3xl border border-[#29364B] space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-[#36C7B0]" />
            <h3 className="text-base font-bold text-white">Soundscape Acoustic Composition</h3>
          </div>
          <p className="text-xs text-slate-400">
            Percentage share of environmental audio classified across all community sensors.
          </p>

          <div className="space-y-3 pt-2">
            {categoryBreakdown.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{item.label}</span>
                  <span className={`font-mono font-bold ${item.textColor}`}>{item.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-[#0B1220] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acoustic Exposure Health Gauge */}
        <div className="p-6 bg-[#151F31] rounded-3xl border border-[#29364B] space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Daily Noise Exposure Limits (NIOSH / OSHA)</h3>
          </div>
          <p className="text-xs text-slate-400">
            Recommended maximum continuous exposure duration before auditory fatigue and stress occur.
          </p>

          <div className="space-y-2.5 pt-1 text-xs">
            <div className="p-3 bg-[#0B1220] rounded-2xl border border-[#29364B] flex items-center justify-between">
              <div>
                <div className="font-semibold text-emerald-400">&lt; 70 dBA (Conversational Ambient)</div>
                <div className="text-slate-400 text-[11px]">Normal conversational noise</div>
              </div>
              <div className="font-mono text-slate-200">24 Hours (Safe)</div>
            </div>

            <div className="p-3 bg-[#0B1220] rounded-2xl border border-[#29364B] flex items-center justify-between">
              <div>
                <div className="font-semibold text-teal-400">75 - 80 dBA (Heavy City Traffic)</div>
                <div className="text-slate-400 text-[11px]">Busy intersections and diesel buses</div>
              </div>
              <div className="font-mono text-slate-200">8 Hours Max</div>
            </div>

            <div className="p-3 bg-[#0B1220] rounded-2xl border border-[#29364B] flex items-center justify-between">
              <div>
                <div className="font-semibold text-amber-400">85 dBA (OSHA Action Level)</div>
                <div className="text-slate-400 text-[11px]">Pneumatic tools, lawnmower</div>
              </div>
              <div className="font-mono text-amber-300 font-bold">4 Hours Max</div>
            </div>

            <div className="p-3 bg-[#0B1220] rounded-2xl border border-[#29364B] flex items-center justify-between">
              <div>
                <div className="font-semibold text-rose-400">&gt; 90 dBA (Severe Construction / Sirens)</div>
                <div className="text-slate-400 text-[11px]">Jackhammer at 5m, close siren</div>
              </div>
              <div className="font-mono text-rose-300 font-bold">&lt; 30 Minutes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
