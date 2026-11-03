import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  CheckCircle2,
  Share2,
  Terminal,
  FileCode,
  Copy,
  Check,
  X,
  ExternalLink,
  Layers,
  Sparkles,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToFlutterHub: () => void;
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  onNavigateToFlutterHub,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'pwa' | 'flutter'>('pwa');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCommand = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const flutterReadmeContent = `# SoundMap - Flutter + TensorFlow Lite Application

## Quick Setup Instructions

1. Create a fresh Flutter project:
   flutter create --org com.soundmap soundmap
   cd soundmap

2. Install dependencies:
   flutter pub add record tflite_flutter flutter_map latlong2 geolocator cloud_firestore firebase_core fl_chart

3. Add Microphone Permission to AndroidManifest.xml:
   android/app/src/main/AndroidManifest.xml
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

4. Add Microphone Permission to iOS Info.plist:
   ios/Runner/Info.plist
   <key>NSMicrophoneUsageDescription</key>
   <string>SoundMap uses your microphone to analyze environmental sounds while you scan.</string>

5. Copy the provided main.dart and sound_classifier.dart into lib/
6. Connect physical Android phone with USB debugging enabled.
7. Run the application:
   flutter run

8. Build Production APK:
   flutter build apk --release
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[#151F31] rounded-3xl border border-[#29364B] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#29364B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#0B1220] rounded-xl border border-[#29364B] text-[#36C7B0]">
              <Download className="w-5 h-5 text-[#36C7B0]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Download & Install SoundMap</h3>
              <p className="text-xs text-slate-400">Choose your preferred way to install or run SoundMap</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#29364B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1.5 bg-[#0B1220] rounded-2xl border border-[#29364B] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('pwa')}
              className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'pwa'
                  ? 'bg-[#36C7B0] text-[#07131B] shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              1. Install on Phone / Desktop (PWA)
            </button>
            <button
              onClick={() => setActiveTab('flutter')}
              className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'flutter'
                  ? 'bg-[#36C7B0] text-[#07131B] shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-4 h-4" />
              2. Flutter Mobile Source Code
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'pwa' ? (
            <div className="space-y-4 text-xs md:text-sm">
              <div className="p-4 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <Globe className="w-4 h-4 text-[#36C7B0]" />
                  Instant Progressive Web App (PWA)
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  SoundMap is a fully compliant Progressive Web App. You can install it straight to your Android phone,
                  iPhone, or desktop computer without going through Google Play or Apple App Store. It runs fullscreen with
                  full microphone audio support and on-device storage.
                </p>
              </div>

              {/* Install Trigger Button */}
              {isInstalled ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold">SoundMap is already installed!</div>
                    <div className="text-emerald-400/80">You are currently running the standalone app on this device.</div>
                  </div>
                </div>
              ) : isInstallable ? (
                <div className="p-4 bg-[#151F31] rounded-2xl border border-[#36C7B0]/60 space-y-3">
                  <div className="text-xs text-slate-300">
                    Your browser supports 1-click installation:
                  </div>
                  <button
                    onClick={async () => {
                      await install();
                    }}
                    className="w-full py-3 bg-[#36C7B0] hover:bg-[#2fb29d] text-[#07131B] font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#36C7B0]/20 transition-all active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    Install SoundMap Now
                  </button>
                </div>
              ) : null}

              {/* Step-by-Step Instructions by Platform */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  How to install by device:
                </h4>

                {/* Android / Chrome */}
                <div className="p-3.5 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-1.5">
                  <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                    <Smartphone className="w-3.5 h-3.5 text-[#36C7B0]" />
                    Android (Chrome, Brave, Samsung Internet)
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1 pl-1">
                    <li>Open this URL in Google Chrome on your phone.</li>
                    <li>Tap the <strong>three dots (⋮)</strong> in the top-right corner.</li>
                    <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.</li>
                    <li>SoundMap will appear on your home screen with its app icon!</li>
                  </ol>
                </div>

                {/* iPhone / iPad (Safari) */}
                <div className="p-3.5 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-1.5">
                  <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                    <Share2 className="w-3.5 h-3.5 text-[#36C7B0]" />
                    iPhone & iPad (Safari)
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1 pl-1">
                    <li>Open this URL in <strong>Safari</strong> on your iPhone.</li>
                    <li>Tap the <strong>Share</strong> button (box with an arrow pointing up) at the bottom toolbar.</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top-right corner.</li>
                  </ol>
                </div>

                {/* Desktop (Mac, Windows, Linux) */}
                <div className="p-3.5 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-1.5">
                  <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                    <Laptop className="w-3.5 h-3.5 text-[#36C7B0]" />
                    Desktop (Chrome, Edge, Brave)
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1 pl-1">
                    <li>Look at the address bar in your browser.</li>
                    <li>Click the <strong>Install icon</strong> (computer monitor with a down arrow) on the right side of the address bar.</li>
                    <li>Click <strong>Install</strong> to launch SoundMap in its own dedicated window.</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs md:text-sm">
              <div className="p-4 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <FileCode className="w-4 h-4 text-[#36C7B0]" />
                    Flutter + TensorFlow Lite Native Project
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToFlutterHub();
                    }}
                    className="text-xs text-[#36C7B0] hover:underline font-medium"
                  >
                    Open Full Flutter Hub →
                  </button>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  You can compile SoundMap into a true native Android APK or iOS app using Flutter. All source files
                  (audio capture, YAMNet classifier, OpenStreetMap integration, and permissions) are pre-engineered.
                </p>
              </div>

              {/* Quick CLI Setup Commands */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#36C7B0]" />
                    Run in your terminal (VS Code / Android Studio):
                  </span>
                  <button
                    onClick={() =>
                      copyCommand(
                        `flutter create --org com.soundmap soundmap\ncd soundmap\nflutter pub add record tflite_flutter flutter_map latlong2 geolocator\nflutter run`,
                        'cli'
                      )
                    }
                    className="flex items-center gap-1 text-[#36C7B0] hover:underline"
                  >
                    {copiedCmd === 'cli' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedCmd === 'cli' ? 'Copied' : 'Copy Commands'}
                  </button>
                </div>

                <div className="p-3 bg-[#0B1220] rounded-xl border border-[#29364B] font-mono text-[11px] text-slate-300 overflow-x-auto space-y-1">
                  <div><span className="text-slate-500"># 1. Create project</span></div>
                  <div>flutter create --org com.soundmap soundmap</div>
                  <div>cd soundmap</div>
                  <div className="pt-1"><span className="text-slate-500"># 2. Add dependencies</span></div>
                  <div>flutter pub add record tflite_flutter flutter_map latlong2 geolocator</div>
                  <div className="pt-1"><span className="text-slate-500"># 3. Build & Run</span></div>
                  <div>flutter run</div>
                  <div>flutter build apk --release</div>
                </div>
              </div>

              {/* Download Full Project ZIP */}
              <div className="p-4 bg-[#151F31] rounded-2xl border border-[#36C7B0]/60 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="space-y-0.5">
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-[#36C7B0]" />
                    Complete Source Code (.ZIP Archive)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Includes full React web application + Flutter mobile project & YAMNet scripts
                  </div>
                </div>
                <a
                  href="/soundmap_full_project.zip"
                  download="soundmap_full_project.zip"
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#36C7B0] hover:bg-[#2fb29d] text-[#07131B] text-xs font-bold rounded-xl transition-all shadow-md shadow-[#36C7B0]/20 active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" />
                  Download Complete .ZIP (100 KB)
                </a>
              </div>

              {/* Download Starter Bundle */}
              <div className="p-4 bg-[#0B1220] rounded-2xl border border-[#29364B] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white text-xs">Setup Instructions & README</div>
                  <div className="text-[11px] text-slate-400">Step-by-step milestone checklist and build script</div>
                </div>
                <button
                  onClick={() => downloadFile('SOUNDMAP_SETUP_README.md', flutterReadmeContent)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#151F31] hover:bg-[#29364B] text-slate-200 text-xs font-medium rounded-xl border border-[#29364B] transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-[#36C7B0]" />
                  README.md
                </button>
              </div>

              <div className="text-[11px] text-slate-400 text-center">
                Want to view or copy <code className="text-[#36C7B0]">main.dart</code> and{' '}
                <code className="text-[#36C7B0]">sound_classifier.dart</code>? Visit the{' '}
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToFlutterHub();
                  }}
                  className="text-[#36C7B0] underline font-medium"
                >
                  Flutter Hub
                </button>{' '}
                tab.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#29364B] bg-[#0B1220] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#36C7B0]" />
            <span>Open Source · Zero Tracking · On-Device Audio</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#151F31] hover:bg-[#29364B] text-slate-200 rounded-xl border border-[#29364B]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
