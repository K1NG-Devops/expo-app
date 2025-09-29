# Wake Word Detection Solutions for EduDash Pro

## Current Implementation: Picovoice Porcupine

### ✅ **Status: FIXED**
The wake word detection now uses the correct Porcupine React Native v3.x API.

### **Implementation Details**
- **Package**: `@picovoice/porcupine-react-native` v3.0.4
- **Custom Wake Word**: "Hello Dash" (trained model)
- **Model Files**:
  - Android: `assets/wake-words/hello-dash_en_android_v3_0_0.ppn`
  - iOS/Other: `assets/wake-words/Hello-Dash_en_linux_v3_0_0.ppn`

### **API Usage (v3.x)**
```typescript
import { PorcupineManager } from '@picovoice/porcupine-react-native';

// For custom wake word models
const manager = await PorcupineManager.fromKeywordPaths(
  accessKey,
  [modelPath],      // Path to custom .ppn file
  detectionCallback,
  errorCallback,
  undefined,        // Use default model
  [0.65]           // Sensitivity (0-1)
);

await manager.start();  // Start listening
await manager.stop();   // Stop listening
manager.delete();       // Clean up
```

### **Key Features**
- ✅ On-device processing (privacy-friendly)
- ✅ Low latency (~1-2ms)
- ✅ Low CPU usage
- ✅ Works offline
- ✅ Custom wake word support
- ✅ Cross-platform (Android, iOS)

### **Permissions Required**
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
```

---

## Alternative Solutions

### Option 1: Built-in Porcupine Keywords

If custom model has issues, use built-in keywords as fallback:

```typescript
import { PorcupineManager, BuiltInKeyword } from '@picovoice/porcupine-react-native';

const manager = await PorcupineManager.fromBuiltInKeywords(
  accessKey,
  [BuiltInKeyword.JARVIS, BuiltInKeyword.COMPUTER],
  detectionCallback,
  errorCallback,
  undefined,
  [0.5, 0.5]
);
```

**Built-in Keywords**:
- `JARVIS` - Similar to AI assistant wake word
- `COMPUTER` - Star Trek style
- `PICOVOICE` - Default
- `PORCUPINE` - Brand name
- `BUMBLEBEE`, `ALEXA`, `HEY_GOOGLE`, `HEY_SIRI`, etc.

---

### Option 2: React Native Voice

**Package**: `@react-native-voice/voice`

```bash
npm install @react-native-voice/voice
```

**Pros**:
- Uses platform's built-in speech recognition
- No API keys required
- Free
- Continuous listening support

**Cons**:
- Requires internet (uses cloud services)
- Less accurate for wake words
- Higher latency
- Privacy concerns (sends audio to cloud)

**Implementation**:
```typescript
import Voice from '@react-native-voice/voice';

Voice.onSpeechResults = (e) => {
  const results = e.value || [];
  if (results.some(text => text.toLowerCase().includes('hello dash'))) {
    // Wake word detected
  }
};

await Voice.start('en-US');
```

---

### Option 3: Expo Speech Recognition (Web Only)

**Package**: `expo-speech-recognition`

```bash
npx expo install expo-speech-recognition
```

**Pros**:
- Native Expo integration
- Simple API
- No API keys

**Cons**:
- **Web only** (not available for native apps yet)
- Requires internet
- Limited browser support

---

### Option 4: Snowboy (Discontinued)

⚠️ **Not Recommended** - Project archived in 2020

---

### Option 5: Custom TensorFlow Lite Model

Build your own wake word detector using TensorFlow Lite.

**Packages**:
- `react-native-tensorflow-lite`
- Custom trained model

**Pros**:
- Full control
- On-device processing
- No API costs

**Cons**:
- Requires ML expertise
- Complex implementation
- Need to train models
- High development time

---

## Recommended Approach

### **Primary**: Picovoice Porcupine (Current)
- Best balance of features, performance, and ease of use
- Custom "Hello Dash" wake word
- On-device, privacy-friendly

### **Fallback 1**: Built-in Porcupine Keywords
- If custom model fails, use "JARVIS" or "COMPUTER"
- Same API, just different initialization

### **Fallback 2**: Manual Button Only
- Voice recording button in Dash Assistant
- Most reliable, always works
- No wake word needed

---

## Testing Wake Word Detection

### 1. Enable in Settings
```typescript
// In Dash AI Settings screen
await AsyncStorage.setItem('@dash_ai_in_app_wake_word', 'true');
```

### 2. Check Permissions
```bash
# Android - check if permission granted
adb shell dumpsys package com.edudashpro | grep RECORD_AUDIO
```

### 3. Monitor Logs
```bash
# Look for wake word detection logs
npx expo start --dev-client
# Say "Hello Dash" and watch for:
# [DashWakeWord] Wake word "Hello Dash" detected! Index: 0
```

### 4. Test Sensitivity
Adjust sensitivity in the code:
```typescript
[0.5]  // Lower = fewer false positives, more misses
[0.65] // Balanced (current)
[0.8]  // Higher = more detections, more false positives
```

---

## Troubleshooting

### Issue: Wake word not detecting

**Solutions**:
1. Check microphone permissions
2. Verify Picovoice access key is valid
3. Ensure model file loaded correctly
4. Try increasing sensitivity
5. Test in quiet environment
6. Check if app is in foreground

### Issue: Too many false detections

**Solutions**:
1. Lower sensitivity value
2. Train new custom model with more samples
3. Use different wake phrase

### Issue: High battery drain

**Solutions**:
1. Only enable when app is in foreground
2. Add on/off toggle in settings
3. Use lower sensitivity
4. Implement sleep/wake cycles

---

## Cost Comparison

| Solution | Cost | Privacy | Accuracy | Latency |
|----------|------|---------|----------|---------|
| Porcupine | Free tier: 3 devices<br>$0.55/device/month | ⭐⭐⭐⭐⭐ On-device | ⭐⭐⭐⭐⭐ | <10ms |
| RN Voice | Free | ⭐⭐ Cloud-based | ⭐⭐⭐ | 500-2000ms |
| Custom TFLite | Free (dev time) | ⭐⭐⭐⭐⭐ On-device | ⭐⭐⭐ | 10-50ms |

---

## Future Enhancements

1. **Multi-language Support**
   - Train wake word models for different languages
   - Afrikaans: "Hallo Dash"
   - Zulu: "Sawubona Dash"

2. **Background Detection** (Android)
   - Use foreground service for always-on detection
   - Requires additional permissions and battery optimization

3. **Voice Profiles**
   - Train model to recognize specific users
   - Enhanced security

4. **Context-Aware Activation**
   - Only listen during specific app screens
   - Auto-disable during calls or media playback

---

## References

- [Picovoice Console](https://console.picovoice.ai/)
- [Porcupine React Native Docs](https://picovoice.ai/docs/quick-start/porcupine-react-native/)
- [Custom Wake Word Training](https://picovoice.ai/console/)