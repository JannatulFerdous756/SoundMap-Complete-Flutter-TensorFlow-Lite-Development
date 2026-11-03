# SoundMap – Flutter + TensorFlow Lite Application

## Listen. Understand. Map.
AI-powered environmental sound recognition and community noise intelligence.

### Included in this project:
- **`lib/main.dart`**: Complete Milestone 1 audio scanner with real-time PCM 16-bit 16kHz microphone stream, dBFS meter, progress indicator, and on-device privacy guarantee.
- **`lib/services/sound_classifier.dart`**: Milestone 2 YAMNet AudioSet AI classifier (Float32 normalization, 15,600 samples buffer windowing, TFLite interpreter inference, 521 class predictions).
- **`android/app/src/main/AndroidManifest.xml`**: Preconfigured permissions for microphone (`RECORD_AUDIO`) and GPS location (`ACCESS_FINE_LOCATION`).
- **`ios/Runner/Info.plist`**: iOS microphone and location usage permission keys.
- **`pubspec.yaml`**: Pre-configured dependencies (`record`, `tflite_flutter`, `flutter_map`, `latlong2`, `geolocator`, `cloud_firestore`, `fl_chart`).

### How to Run:
```bash
# 1. Install dependencies
flutter pub get

# 2. Run on connected Android / iOS device
flutter run

# 3. Build Production Android APK
flutter build apk --release
```
Output APK path: `build/app/outputs/flutter-apk/app-release.apk`
