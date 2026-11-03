import 'dart:typed_data';
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
    _labels = rawLabels.split('\n').where((line) => line.trim().isNotEmpty).toList();
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
}
