import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  ThumbsUp,
  Plus,
  Download,
  CheckCircle2,
  Clock,
  MapPin,
  Volume2,
  Filter,
} from 'lucide-react';
import { CommunityReport } from '../types';

interface CommunityReportsViewProps {
  reports: CommunityReport[];
  onAddReport: (report: Partial<CommunityReport>) => void;
  onUpvoteReport: (id: string) => void;
  currentDecibel?: number;
}

export const CommunityReportsView: React.FC<CommunityReportsViewProps> = ({
  reports,
  onAddReport,
  onUpvoteReport,
  currentDecibel,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // New report form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Construction Noise');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [decibel, setDecibel] = useState<number>(currentDecibel || 72);
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');

  const filteredReports = reports.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    onAddReport({
      title: title.trim(),
      category,
      severity,
      decibel: Number(decibel),
      locationName: locationName.trim() || 'Civic District, San Francisco',
      description: description.trim(),
      latitude: 37.7749 + (Math.random() - 0.5) * 0.03,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.03,
    });

    setTitle('');
    setLocationName('');
    setDescription('');
    setIsModalOpen(false);
  };

  const exportAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reports, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `soundmap_community_reports_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-[#36C7B0]" />
            Community Noise Disturbance Intelligence
          </h2>
          <p className="text-sm text-slate-400">
            Citizen-verified noise incident records, municipal threshold violations, and neighborhood logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportAsJson}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#151F31] hover:bg-[#29364B] text-slate-300 text-xs font-medium rounded-xl border border-[#29364B] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#36C7B0]" />
            Export JSON
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#36C7B0] hover:bg-[#2fb29d] text-[#07131B] text-xs font-semibold rounded-xl shadow-lg shadow-[#36C7B0]/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            File Noise Report
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[#151F31] rounded-2xl border border-[#29364B] w-fit">
        {[
          { id: 'all', label: `All Reports (${reports.length})` },
          { id: 'active', label: 'Active Issues' },
          { id: 'investigating', label: 'Under Investigation' },
          { id: 'resolved', label: 'Resolved' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
              filterStatus === tab.id
                ? 'bg-[#36C7B0] text-[#07131B] font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReports.map((report) => {
          let severityColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
          if (report.severity === 'severe') severityColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
          if (report.severity === 'mild') severityColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

          let statusBadge = (
            <span className="text-[10px] uppercase font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Active
            </span>
          );
          if (report.status === 'investigating') {
            statusBadge = (
              <span className="text-[10px] uppercase font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                Investigating
              </span>
            );
          } else if (report.status === 'resolved') {
            statusBadge = (
              <span className="text-[10px] uppercase font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Resolved
              </span>
            );
          }

          return (
            <div
              key={report.id}
              className="p-5 bg-[#151F31] rounded-3xl border border-[#29364B] flex flex-col justify-between space-y-4 hover:border-[#36C7B0]/50 transition-all shadow-md"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${severityColor}`}>
                      {report.severity}
                    </span>
                    <span className="text-xs text-slate-400">· {report.category}</span>
                  </div>
                  {statusBadge}
                </div>

                <h3 className="text-base font-bold text-white leading-snug">{report.title}</h3>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {report.description}
                </p>
              </div>

              {/* Bottom Meta & Upvote Row */}
              <div className="pt-3 border-t border-[#29364B] flex items-center justify-between text-xs text-slate-400">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-[#36C7B0]" />
                    <span className="font-medium truncate max-w-[180px]">{report.locationName}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    <span>{report.decibel} dBA</span>
                    <span>·</span>
                    <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => onUpvoteReport(report.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1220] hover:bg-[#29364B] text-slate-200 hover:text-white rounded-xl border border-[#29364B] transition-colors"
                  title="Confirm disturbance / I hear this too"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-[#36C7B0]" />
                  <span className="font-semibold text-xs text-[#36C7B0]">{report.upvotes}</span>
                  <span className="hidden sm:inline text-[11px]">Confirm</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg p-6 bg-[#151F31] rounded-3xl border border-[#29364B] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#29364B]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#36C7B0]" />
                <h3 className="text-base font-bold text-white">File Noise Disturbance Report</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Incident Summary / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Unmuffled Exhaust Drag Racing at 2 AM"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#29364B] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#36C7B0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Disturbance Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B1220] border border-[#29364B] rounded-xl text-slate-100 focus:outline-none focus:border-[#36C7B0]"
                  >
                    <option value="Construction Noise">Construction Noise</option>
                    <option value="Traffic & Exhaust">Traffic & Exhaust</option>
                    <option value="HVAC & Machinery">HVAC & Machinery</option>
                    <option value="Domestic Animals">Domestic Animals</option>
                    <option value="Loud Music / Party">Loud Music / Party</option>
                    <option value="Industrial Operations">Industrial Operations</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Severity Level</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#0B1220] border border-[#29364B] rounded-xl text-slate-100 focus:outline-none focus:border-[#36C7B0]"
                  >
                    <option value="mild">Mild Nuisance (&lt;65 dBA)</option>
                    <option value="moderate">Moderate Disturbance (65-80 dBA)</option>
                    <option value="severe">Severe / Hazardous (&gt;80 dBA)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Decibel Reading (dBA)</label>
                  <input
                    type="number"
                    min="30"
                    max="130"
                    value={decibel}
                    onChange={(e) => setDecibel(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-[#0B1220] border border-[#29364B] rounded-xl text-slate-100 focus:outline-none focus:border-[#36C7B0] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Location / Cross Street</label>
                  <input
                    type="text"
                    placeholder="e.g. 4th & Mission St"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#0B1220] border border-[#29364B] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#36C7B0]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Detailed Acoustic Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain the recurring nature of the sound, frequency (e.g. 60Hz hum vs sudden bangs), and impact on residents..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0B1220] border border-[#29364B] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#36C7B0] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#29364B]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#0B1220] text-slate-300 hover:text-white rounded-xl border border-[#29364B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#36C7B0] hover:bg-[#2fb29d] text-[#07131B] font-semibold rounded-xl"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
