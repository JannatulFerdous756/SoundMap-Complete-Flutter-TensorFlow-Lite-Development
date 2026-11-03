import 'dart:async';
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
    return '${minutes.toString().padLeft(2, '0')}:${remainingSeconds.toString().padLeft(2, '0')}';
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
            _errorMessage = 'Audio input failed: $error';
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
      if (mounted) setState(() => _errorMessage = 'Could not stop scanner: $error');
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
        title: const Row(
          children: [
            Icon(Icons.graphic_eq, color: Color(0xFF36C7B0)),
            SizedBox(width: 10),
            Text('SoundMap', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Understand your environment.',
                style: TextStyle(fontSize: 25, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Scan environmental sounds around you.',
                style: TextStyle(color: Colors.grey.shade400),
              ),
              const SizedBox(height: 28),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: const Color(0xFF151F31),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFF29364B)),
                ),
                child: Column(
                  children: [
                    Icon(
                      _isScanning ? Icons.graphic_eq : Icons.multitrack_audio,
                      size: 46,
                      color: const Color(0xFF36C7B0),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _isScanning ? 'SCANNING' : 'SOUND SCANNER',
                      style: const TextStyle(
                        letterSpacing: 2,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF36C7B0),
                      ),
                    ),
                    const SizedBox(height: 26),
                    Text(
                      '${_dbfs.toStringAsFixed(1)} dBFS',
                      style: const TextStyle(fontSize: 39, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    Text('Relative audio signal level', style: TextStyle(color: Colors.grey.shade400)),
                    const SizedBox(height: 22),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: LinearProgressIndicator(
                        value: meterValue,
                        minHeight: 12,
                        backgroundColor: const Color(0xFF29364B),
                        color: const Color(0xFF36C7B0),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0B1220),
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.circle, size: 9, color: _isScanning ? const Color(0xFF36C7B0) : Colors.grey),
                          const SizedBox(width: 8),
                          Text(_status),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: FilledButton.icon(
                        onPressed: _isBusy ? null : (_isScanning ? _stopScan : _startScan),
                        icon: Icon(_isScanning ? Icons.stop_circle_outlined : Icons.mic),
                        label: Text(_isBusy ? 'Please wait...' : (_isScanning ? 'Stop scan' : 'Start scan')),
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF36C7B0),
                          foregroundColor: const Color(0xFF07131B),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: _infoCard(icon: Icons.timer_outlined, title: 'Duration', value: _durationText),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _infoCard(icon: Icons.shield_outlined, title: 'Privacy', value: 'On-device'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoCard({required IconData icon, required String title, required String value}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF151F31),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: const Color(0xFF36C7B0)),
          const SizedBox(height: 12),
          Text(title, style: TextStyle(color: Colors.grey.shade400)),
          const SizedBox(height: 5),
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
