import React, { useState } from 'react';
import {
  Code,
  Terminal,
  Cpu,
  Layers,
  CheckSquare,
  Copy,
  Check,
  Download,
  ExternalLink,
  Smartphone,
  ChevronRight,
  Database,
  Map,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const FlutterGuideView: React.FC = () => {
  const [activeMilestone, setActiveMilestone] = useState<number>(1);
  const [activeCodeFile, setActiveCodeFile] = useState<string>('main.dart');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Checklists state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    'm1-1': true,
    'm1-2': true,
    'm1-3': true,
    'm1-4': true,
  });

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyCode = (code: string, fileKey: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(fileKey);
    setTimeout(() => setCopiedFile(null), 2500);
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

  // Code repository snippets for all milestones
  const codeSnippets: Record<string, { filename: string; language: string; content: string }> = {
    'main.dart': {
      filename: 'lib/main.dart',
      language: 'dart',
      content: `import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:record/record.dart';

void main() {
  runApp(const SoundMapApp());
}

class SoundMapApp extends StatelessWidget {
  const SoundMapApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SoundMap',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF36C7B0),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF0B1220),
      ),
      home: const ScannerScreen(),
    );
  }
}

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final AudioRecorder _recorder = AudioRecorder();
  StreamSubscription<Uint8List>? _audioSubscription;

  bool _isScanning = false;
  bool _isBusy = false;

  double _dbfs = -60.0;
  String _status = 'Ready to scan';
  String? _errorMessage;

  DateTime? _lastUiUpdate;
  DateTime? _scanStartedAt;

  Duration get _scanDuration {
    if (!_isScanning || _scanStartedAt == null) return Duration.zero;
    return DateTime.now().difference(_scanStartedAt!);
  }

  String get _durationText {
    final seconds = _scanDuration.inSeconds;
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    return '\${minutes.toString().padLeft(2, '0')}:\${remainingSeconds.toString().padLeft(2, '0')}';
  }

  Future<void> _startScan() async {
    if (_isBusy || _isScanning) return;
    setState(() {
      _isBusy = true;
      _errorMessage = null;
      _status = 'Checking microphone permission...';
    });

    try {
      final permitted = await _recorder.hasPermission();
      if (!permitted) {
        if (!mounted) return;
        setState(() {
          _status = 'Microphone permission required';
          _errorMessage = 'Allow microphone access in phone settings.';
        });
        return;
      }

      final audioStream = await _recorder.startStream(
        const RecordConfig(
          encoder: AudioEncoder.pcm16bits,
          sampleRate: 16000,
          numChannels: 1,
          autoGain: false,
          echoCancel: false,
          noiseSuppress: false,
        ),
      );

      _scanStartedAt = DateTime.now();
      _lastUiUpdate = null;

      _audioSubscription = audioStream.listen(
        _processAudio,
        onError: (Object error) {
          if (!mounted) return;
          setState(() {
            _errorMessage = 'Audio input failed: \$error';
            _status = 'Audio error';
          });
          unawaited(_stopScan());
        },
        onDone: () {
          if (mounted && _isScanning) unawaited(_stopScan());
        },
      );

      setState(() {
        _isScanning = true;
        _status = 'Listening to your environment';
      });
    } catch (error) {
      if (mounted) {
        setState(() {
          _status = 'Could not start scanner';
          _errorMessage = error.toString();
        });
      }
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  void _processAudio(Uint8List chunk) {
    final usableLength = chunk.length - (chunk.length % 2);
    if (usableLength < 2) return;

    final data = ByteData.sublistView(chunk, 0, usableLength);
    double sumSquares = 0;
    final sampleCount = usableLength ~/ 2;

    for (int i = 0; i < usableLength; i += 2) {
      final sample = data.getInt16(i, Endian.little);
      final normalized = sample / 32768.0;
      sumSquares += normalized * normalized;
    }

    final rms = math.sqrt(sumSquares / sampleCount);
    final level = rms <= 0 ? -120.0 : 20.0 * (math.log(rms) / math.ln10);

    final now = DateTime.now();
    if (_lastUiUpdate != null &&
        now.difference(_lastUiUpdate!) < const Duration(milliseconds: 150)) {
      return;
    }
    _lastUiUpdate = now;

    if (!mounted) return;
    setState(() {
      _dbfs = level.clamp(-60.0, 0.0).toDouble();
    });
  }

  Future<void> _stopScan() async {
    if (_isBusy || !_isScanning) return;
    setState(() {
      _isBusy = true;
      _status = 'Stopping scan...';
    });

    try {
      await _audioSubscription?.cancel();
      _audioSubscription = null;
      await _recorder.stop();
      if (mounted) {
        setState(() {
          _isScanning = false;
          _status = 'Scan stopped';
          _dbfs = -60.0;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _errorMessage = 'Could not stop scanner: \$error');
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  @override
  void dispose() {
    _audioSubscription?.cancel();
    unawaited(_recorder.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final meterValue = ((_dbfs + 60.0) / 60.0).clamp(0.0, 1.0);
    return Scaffold(
      appBar: AppBar(
        title: const Text('SoundMap', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('\${_dbfs.toStringAsFixed(1)} dBFS', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold)),
              LinearProgressIndicator(value: meterValue, color: const Color(0xFF36C7B0)),
              FilledButton(
                onPressed: _isScanning ? _stopScan : _startScan,
                child: Text(_isScanning ? 'Stop scan' : 'Start scan'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}`,
    },
    'sound_classifier.dart': {
      filename: 'lib/services/sound_classifier.dart',
      language: 'dart',
      content: `import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'package:tflite_flutter/tflite_flutter.dart';

class SoundClassification {
  final String label;
  final double score;

  SoundClassification({required this.label, required this.score});
}

class SoundClassifier {
  static const int inputSampleCount = 15600; // 0.975s at 16,000 Hz for YAMNet
  Interpreter? _interpreter;
  List<String> _labels = [];

  final List<double> _waveformBuffer = [];

  bool get isReady => _interpreter != null && _labels.isNotEmpty;

  Future<void> initialize() async {
    // Load YAMNet TFLite model from assets
    _interpreter = await Interpreter.fromAsset('assets/models/yamnet.tflite');
    
    // Load 521 AudioSet labels
    final rawLabels = await rootBundle.loadString('assets/models/yamnet_label_list.txt');
    _labels = rawLabels.split('\\n').where((line) => line.trim().isNotEmpty).toList();
  }

  List<SoundClassification>? processPcmChunk(Uint8List chunk) {
    if (!isReady) return null;

    final usable = chunk.length - (chunk.length % 2);
    final data = ByteData.sublistView(chunk, 0, usable);

    // Convert PCM16 to normalized float [-1.0, 1.0]
    for (int i = 0; i < usable; i += 2) {
      final sample = data.getInt16(i, Endian.little);
      _waveformBuffer.add(sample / 32768.0);
    }

    // When buffer reaches exactly 15,600 samples, perform inference
    if (_waveformBuffer.length >= inputSampleCount) {
      final window = _waveformBuffer.sublist(0, inputSampleCount);
      _waveformBuffer.removeRange(0, inputSampleCount ~/ 2); // 50% overlap

      return _runInference(window);
    }

    return null;
  }

  List<SoundClassification> _runInference(List<double> waveform) {
    final input = [waveform]; // Shape: [1, 15600]
    final output = [List<double>.filled(_labels.length, 0.0)]; // Shape: [1, 521]

    _interpreter!.run(input, output);

    final scores = output[0];
    final List<SoundClassification> results = [];

    for (int i = 0; i < scores.length; i++) {
      if (i < _labels.length) {
        results.add(SoundClassification(label: _labels[i], score: scores[i]));
      }
    }

    // Sort by confidence descending
    results.sort((a, b) => b.score.compareTo(a.score));
    return results.take(5).toList();
  }

  void dispose() {
    _interpreter?.close();
  }
}`,
    },
    'AndroidManifest.xml': {
      filename: 'android/app/src/main/AndroidManifest.xml',
      language: 'xml',
      content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- SoundMap Microphone & GPS Permissions -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:label="soundmap"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>`,
    },
    'pubspec.yaml': {
      filename: 'pubspec.yaml',
      language: 'yaml',
      content: `name: soundmap
description: AI-powered environmental sound recognition and community noise intelligence.
version: 1.0.0+1
environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  # Audio capture stream (PCM 16-bit 16kHz)
  record: ^5.1.2
  # TensorFlow Lite for on-device YAMNet inference
  tflite_flutter: ^0.10.4
  # Map & Location for SoundMap
  flutter_map: ^6.1.0
  latlong2: ^0.9.1
  geolocator: ^11.0.0
  # Firebase Backend
  firebase_core: ^2.30.0
  cloud_firestore: ^4.17.0
  # Analytics charts
  fl_chart: ^0.68.0

flutter:
  uses-material-design: true
  assets:
    - assets/models/yamnet.tflite
    - assets/models/yamnet_label_list.txt`,
    },
  };

  return (
    <div className="w-full space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-[#36C7B0]" />
            Flutter + TensorFlow Lite Architecture & Code Hub
          </h2>
          <p className="text-sm text-slate-400">
            The engineering blueprint, source code files, and on-device pipeline for building SoundMap on Android & iOS.
          </p>
        </div>

        <a
          href="/soundmap_full_project.zip"
          download="soundmap_full_project.zip"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#36C7B0] hover:bg-[#2fb29d] text-[#07131B] text-xs font-bold rounded-xl shadow-lg shadow-[#36C7B0]/20 transition-all active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>Download Complete .ZIP (100 KB)</span>
        </a>
      </div>

      {/* Interactive YAMNet Pipeline Flowchart */}
      <div className="p-6 bg-[#151F31] rounded-3xl border border-[#29364B] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#36C7B0]" />
            <h3 className="text-base font-bold text-white">YAMNet On-Device Machine Learning Pipeline</h3>
          </div>
          <span className="text-xs text-emerald-400 font-mono">Zero Cloud Upload · 100% Privacy</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-4 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-2">
            <div className="font-mono text-[#36C7B0] font-bold">01. PCM STREAM</div>
            <div className="text-slate-200 font-medium">record.startStream()</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Captures mono 16 kHz PCM audio chunks via native microphone HAL.
            </p>
          </div>

          <div className="p-4 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-2">
            <div className="font-mono text-[#36C7B0] font-bold">02. BUFFER & NORM</div>
            <div className="text-slate-200 font-medium">sample / 32768.0</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Normalizes Int16 to Float32 [-1.0, 1.0] and accumulates 15,600 samples (0.975s window).
            </p>
          </div>

          <div className="p-4 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-2">
            <div className="font-mono text-[#36C7B0] font-bold">03. TFLITE INFERENCE</div>
            <div className="text-slate-200 font-medium">interpreter.run()</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Runs MobileNet-based YAMNet audio event classifier across 521 AudioSet categories.
            </p>
          </div>

          <div className="p-4 bg-[#0B1220] rounded-2xl border border-[#29364B] space-y-2">
            <div className="font-mono text-[#36C7B0] font-bold">04. MAP & FIREBASE</div>
            <div className="text-slate-200 font-medium">SoundMap Observation</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Pins GPS coordinates with dB SPL and top sound tags to OpenStreetMap and Firestore.
            </p>
          </div>
        </div>
      </div>

      {/* Milestones & Code Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Milestones Selector & Checklist */}
        <div className="space-y-4">
          <div className="p-5 bg-[#151F31] rounded-3xl border border-[#29364B] space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#36C7B0]" />
              Development Milestones
            </h3>
            <div className="space-y-1.5">
              {[
                { id: 1, title: 'Milestone 1: Flutter Foundation & Mic', sub: 'PCM16 Capture, dBFS Meter, UI' },
                { id: 2, title: 'Milestone 2: YAMNet AI Sound Classifier', sub: 'TFLite, 15600 Samples, 521 Classes' },
                { id: 3, title: 'Milestone 3: Live SoundMap Interface', sub: 'GPS Geolocation & OpenStreetMap' },
                { id: 4, title: 'Milestone 4: Firebase Cloud Intelligence', sub: 'Cloud Firestore & Community Reports' },
                { id: 5, title: 'Milestone 5: Analytics & Diurnal Trends', sub: 'Noise Curves, WHO Lines, Serenity' },
                { id: 6, title: 'Milestone 6: Production & Privacy Release', sub: 'Background Services & Compliance' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveMilestone(m.id);
                    if (m.id === 1) setActiveCodeFile('main.dart');
                    else if (m.id === 2) setActiveCodeFile('sound_classifier.dart');
                    else if (m.id === 3 || m.id === 4) setActiveCodeFile('pubspec.yaml');
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition-all ${
                    activeMilestone === m.id
                      ? 'bg-[#36C7B0]/15 border-[#36C7B0] text-white shadow-sm'
                      : 'bg-[#0B1220]/60 border-[#29364B] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-semibold">{m.title}</div>
                  <div className="text-[11px] text-slate-400">{m.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Verification Checklist */}
          <div className="p-5 bg-[#151F31] rounded-3xl border border-[#29364B] space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#36C7B0]" />
                Milestone 1 Verification
              </span>
              <span className="text-xs font-mono text-[#36C7B0]">
                {Object.values(checkedItems).filter(Boolean).length}/6 Complete
              </span>
            </h3>

            <div className="space-y-2 text-xs">
              {[
                { id: 'm1-1', label: 'App launches without crashing', sub: 'Home screen and SoundMap title appear' },
                { id: 'm1-2', label: 'Microphone permission works', sub: 'Phone requests permission before recording' },
                { id: 'm1-3', label: 'Live meter responds', sub: 'The meter changes when nearby sound changes' },
                { id: 'm1-4', label: 'Stop button works', sub: 'Microphone capture stops when requested' },
                { id: 'm1-5', label: 'Permission denial is handled', sub: 'App explains why scanning cannot start' },
                { id: 'm1-6', label: 'No recordings are uploaded', sub: 'Keeps audio 100% on-device' },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                    checkedItems[item.id]
                      ? 'bg-[#0B1220] border-[#36C7B0]/40 text-slate-200'
                      : 'bg-[#0B1220]/40 border-[#29364B] text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!checkedItems[item.id]}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-[#36C7B0] focus:ring-0"
                  />
                  <div>
                    <div className="font-medium text-white">{item.label}</div>
                    <div className="text-[11px] text-slate-400">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Code Viewer */}
        <div className="lg:col-span-2 p-5 bg-[#151F31] rounded-3xl border border-[#29364B] flex flex-col space-y-4">
          {/* File Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#29364B]">
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.keys(codeSnippets).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveCodeFile(key)}
                  className={`px-3 py-1.5 text-xs font-mono rounded-xl border transition-all ${
                    activeCodeFile === key
                      ? 'bg-[#36C7B0] text-[#07131B] border-[#36C7B0] font-bold'
                      : 'bg-[#0B1220] text-slate-300 border-[#29364B] hover:text-white'
                  }`}
                >
                  {codeSnippets[key].filename}
                </button>
              ))}
            </div>

            {/* Copy & Download Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyCode(codeSnippets[activeCodeFile].content, activeCodeFile)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1220] hover:bg-[#29364B] text-slate-200 text-xs font-medium rounded-xl border border-[#29364B] transition-colors"
              >
                {copiedFile === activeCodeFile ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#36C7B0]" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>

              <button
                onClick={() =>
                  downloadFile(
                    codeSnippets[activeCodeFile].filename.split('/').pop() || 'code.txt',
                    codeSnippets[activeCodeFile].content
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1220] hover:bg-[#29364B] text-slate-200 text-xs font-medium rounded-xl border border-[#29364B] transition-colors"
                title="Download this code file"
              >
                <Download className="w-3.5 h-3.5 text-[#36C7B0]" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Code Body */}
          <div className="flex-1 min-h-[460px] bg-[#0B1220] rounded-2xl border border-[#29364B] p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
            <pre>
              <code>{codeSnippets[activeCodeFile].content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
