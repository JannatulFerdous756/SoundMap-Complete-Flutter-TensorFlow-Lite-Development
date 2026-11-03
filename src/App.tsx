import React, { useState, useEffect } from 'react';
import {
  Activity,
  Map,
  FileText,
  BarChart2,
  Smartphone,
  Sparkles,
  Volume2,
  HelpCircle,
  ExternalLink,
  Laptop,
  Download,
} from 'lucide-react';
import { SoundObservation, CommunityReport, AudioMetrics, YamnetPrediction } from './types';
import { SoundScanner } from './components/SoundScanner';
import { SoundMapView } from './components/SoundMapView';
import { CommunityReportsView } from './components/CommunityReportsView';
import { AnalyticsView } from './components/AnalyticsView';
import { FlutterGuideView } from './components/FlutterGuideView';
import { AcousticAnalysisModal } from './components/AcousticAnalysisModal';
import { DownloadAppModal } from './components/DownloadAppModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'map' | 'reports' | 'analytics' | 'flutter'>('scanner');
  const [isMobileFrameView, setIsMobileFrameView] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);

  // Observations & Community Reports
  const [observations, setObservations] = useState<SoundObservation[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);

  // Active metrics passed to map
  const [activeMetrics, setActiveMetrics] = useState<{
    dbSpl: number;
    dbfs: number;
    primarySound: string;
    confidence: number;
  }>({
    dbSpl: 64.0,
    dbfs: -30.0,
    primarySound: 'Traffic & City Bus',
    confidence: 0.92,
  });

  // AI Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [modalMetrics, setModalMetrics] = useState<AudioMetrics>({
    dbfs: -30.0,
    dbSpl: 64.0,
    peakDbfs: -24.0,
    leq: 63.5,
    rms: 0.03,
    spectralCentroid: 1450,
    spectralRolloff: 3400,
    zeroCrossingRate: 0.045,
    dominantBand: 'Mid Frequency',
  });
  const [modalPredictions, setModalPredictions] = useState<YamnetPrediction[]>([
    { label: 'Traffic & City Bus', category: 'traffic', confidence: 0.92, description: 'Internal combustion engine rumble' },
  ]);
  const [modalDuration, setModalDuration] = useState(12);

  // Fetch initial seed data
  useEffect(() => {
    fetch('/api/observations')
      .then((res) => res.json())
      .then((data) => {
        if (data.observations) setObservations(data.observations);
      })
      .catch((err) => console.warn('Could not load observations from server:', err));

    fetch('/api/reports')
      .then((res) => res.json())
      .then((data) => {
        if (data.reports) setReports(data.reports);
      })
      .catch((err) => console.warn('Could not load reports from server:', err));
  }, []);

  const handlePinObservation = async (obs: Partial<SoundObservation>) => {
    const newObs: SoundObservation = {
      id: `obs-${Date.now()}`,
      latitude: obs.latitude || 37.7749 + (Math.random() - 0.5) * 0.04,
      longitude: obs.longitude || -122.4194 + (Math.random() - 0.5) * 0.04,
      address: obs.address || 'Civic Center, San Francisco',
      dbfs: obs.dbfs || -30.0,
      dbSpl: obs.dbSpl || 64.0,
      primarySound: obs.primarySound || 'Environmental Sound',
      confidence: obs.confidence || 0.88,
      category: obs.category || 'ambient',
      timestamp: new Date().toISOString(),
      reportedBy: 'Citizen Scanner',
    };

    setObservations((prev) => [newObs, ...prev]);

    // Send to backend
    try {
      await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newObs),
      });
    } catch (e) {
      console.warn('Backend sync error:', e);
    }
  };

  const handleAddReport = async (reportData: Partial<CommunityReport>) => {
    const newRep: CommunityReport = {
      id: `rep-${Date.now()}`,
      title: reportData.title || 'Noise Disturbance',
      category: reportData.category || 'General Disturbance',
      severity: reportData.severity || 'moderate',
      decibel: reportData.decibel || 68,
      locationName: reportData.locationName || 'Pinned Location',
      latitude: reportData.latitude || 37.7749,
      longitude: reportData.longitude || -122.4194,
      description: reportData.description || '',
      createdAt: new Date().toISOString(),
      upvotes: 1,
      status: 'active',
    };

    setReports((prev) => [newRep, ...prev]);

    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRep),
      });
    } catch (e) {
      console.warn('Backend report sync error:', e);
    }
  };

  const handleUpvoteReport = async (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r))
    );

    try {
      await fetch(`/api/reports/${id}/upvote`, { method: 'POST' });
    } catch (e) {
      console.warn('Backend upvote sync error:', e);
    }
  };

  const handleOpenAiAnalysis = (
    metrics: AudioMetrics,
    predictions: YamnetPrediction[],
    duration: number
  ) => {
    setModalMetrics(metrics);
    setModalPredictions(predictions);
    setModalDuration(duration);
    setIsAiModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-100 flex flex-col">
      {/* Top Bar Contract: 1-line Brand wordmark, 4-5 whitespace-nowrap nav links, 1 primary action */}
      <header className="sticky top-0 z-40 bg-[#0B1220]/95 backdrop-blur-md border-b border-[#29364B] px-4 md:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="p-1.5 bg-[#151F31] rounded-xl border border-[#29364B] text-[#36C7B0]">
              <Activity className="w-5 h-5 text-[#36C7B0]" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              SoundMap
            </span>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'scanner' ? 'text-[#36C7B0] font-semibold' : ''
              }`}
            >
              Sound Scanner
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'map' ? 'text-[#36C7B0] font-semibold' : ''
              }`}
            >
              Live Sound Map
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'reports' ? 'text-[#36C7B0] font-semibold' : ''
              }`}
            >
              Community Reports
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'analytics' ? 'text-[#36C7B0] font-semibold' : ''
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('flutter')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'flutter' ? 'text-[#36C7B0] font-semibold' : ''
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-[#36C7B0]" />
              Flutter Hub
            </button>
          </nav>

          {/* Zone 3: Primary Action & Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsDownloadModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#07131B] bg-[#36C7B0] hover:bg-[#2fb29d] rounded-xl transition-all shadow-md shadow-[#36C7B0]/20 whitespace-nowrap shrink-0 active:scale-[0.98]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download App</span>
            </button>

            <button
              onClick={() => setIsMobileFrameView(!isMobileFrameView)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#151F31] border border-[#29364B] rounded-xl transition-colors whitespace-nowrap shrink-0"
              title="Toggle Flutter Mobile Simulation Frame"
            >
              {isMobileFrameView ? (
                <>
                  <Laptop className="w-3.5 h-3.5 text-[#36C7B0]" />
                  <span>Desktop View</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-[#36C7B0]" />
                  <span>Mobile Frame</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Sub-Navigation */}
        <div className="flex md:hidden items-center gap-2 overflow-x-auto pt-2 pb-0.5 text-xs border-t border-[#29364B]/50 mt-2">
          {[
            { id: 'scanner', label: 'Scanner' },
            { id: 'map', label: 'SoundMap' },
            { id: 'reports', label: 'Reports' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'flutter', label: 'Flutter Hub' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#36C7B0] text-[#07131B] font-semibold'
                  : 'bg-[#151F31] text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 flex justify-center">
        {isMobileFrameView ? (
          // Mobile Phone Preview Mockup Frame
          <div className="w-[390px] h-[810px] bg-[#0B1220] border-4 border-[#29364B] rounded-[44px] shadow-2xl overflow-hidden flex flex-col relative my-auto">
            {/* Notch / Dynamic Island */}
            <div className="w-full h-8 bg-[#0B1220] flex items-center justify-center relative shrink-0">
              <div className="w-24 h-4 bg-black rounded-full" />
              <div className="absolute right-6 text-[10px] text-slate-400 font-mono">100%</div>
            </div>

            {/* Scrollable Mobile Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === 'scanner' && (
                <SoundScanner
                  onPinObservation={handlePinObservation}
                  onOpenAiAnalysis={handleOpenAiAnalysis}
                />
              )}
              {activeTab === 'map' && (
                <SoundMapView
                  observations={observations}
                  onAddObservation={handlePinObservation}
                  activeMetrics={activeMetrics}
                />
              )}
              {activeTab === 'reports' && (
                <CommunityReportsView
                  reports={reports}
                  onAddReport={handleAddReport}
                  onUpvoteReport={handleUpvoteReport}
                  currentDecibel={activeMetrics.dbSpl}
                />
              )}
              {activeTab === 'analytics' && <AnalyticsView />}
              {activeTab === 'flutter' && <FlutterGuideView />}
            </div>

            {/* Mobile Bottom Tab Bar (as in Flutter spec) */}
            <div className="h-16 bg-[#151F31]/95 backdrop-blur-md border-t border-[#29364B] grid grid-cols-5 items-center px-2 shrink-0">
              {[
                { id: 'scanner', label: 'Scan', icon: Activity },
                { id: 'map', label: 'Map', icon: Map },
                { id: 'reports', label: 'Reports', icon: FileText },
                { id: 'analytics', label: 'Trends', icon: BarChart2 },
                { id: 'flutter', label: 'Flutter', icon: Smartphone },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className="flex flex-col items-center justify-center py-1 transition-colors"
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#36C7B0]' : 'text-slate-400'}`} />
                    <span
                      className={`text-[10px] font-medium tracking-tight mt-1 ${
                        isActive ? 'text-[#36C7B0]' : 'text-slate-400'
                      }`}
                    >
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          // Full Desktop Responsive Layout (1440px baseline)
          <div className="w-full max-w-7xl animate-fade-in">
            {activeTab === 'scanner' && (
              <SoundScanner
                onPinObservation={handlePinObservation}
                onOpenAiAnalysis={handleOpenAiAnalysis}
              />
            )}
            {activeTab === 'map' && (
              <SoundMapView
                observations={observations}
                onAddObservation={handlePinObservation}
                activeMetrics={activeMetrics}
              />
            )}
            {activeTab === 'reports' && (
              <CommunityReportsView
                reports={reports}
                onAddReport={handleAddReport}
                onUpvoteReport={handleUpvoteReport}
                currentDecibel={activeMetrics.dbSpl}
              />
            )}
            {activeTab === 'analytics' && <AnalyticsView />}
            {activeTab === 'flutter' && <FlutterGuideView />}
          </div>
        )}
      </main>

      {/* Gemini AI Acoustic Diagnostics Modal */}
      <AcousticAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        metrics={modalMetrics}
        predictions={modalPredictions}
        durationSeconds={modalDuration}
      />

      {/* Download App & PWA Install Modal */}
      <DownloadAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onNavigateToFlutterHub={() => setActiveTab('flutter')}
      />
    </div>
  );
}
