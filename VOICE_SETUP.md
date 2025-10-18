# Voice Features Setup Guide

This guide will help you set up and troubleshoot voice features in EduDash Pro.

## Quick Status Check

Voice features require different setup depending on your platform:

- **Web**: Works out of the box (uses Web Audio API + Deepgram)
- **iOS/Android**: Requires native module setup (uses Picovoice VoiceProcessor + Deepgram)

## Common Issues and Solutions

### 1. "Voice not available" Error

**Symptoms:**
```
ERROR  [claudeProvider] ❌ Picovoice setup failed: [TypeError: Cannot read property 'FRAME_EMITTER_KEY' of null]
ERROR  [RealtimeVoice] ❌ All voice providers failed
```

**Cause:** Native modules are not installed or linked properly.

**Solutions:**

#### Option A: Install Dependencies (if just cloned repo)
```bash
npm install --legacy-peer-deps
```

#### Option B: Rebuild Native Modules (if dependencies installed but still failing)
```bash
# Clean prebuild
npx expo prebuild --clean

# Rebuild for your platform
npx expo run:android  # For Android
npx expo run:ios      # For iOS
```

#### Option C: Use Web Version (no setup required)
```bash
npm run web
```
The web version works immediately without native setup.

### 2. "Native module cannot be null" Error

**Cause:** The Picovoice native module is not linked in your dev client.

**Solution:** Rebuild the dev client:
```bash
npx expo prebuild --clean
npx expo run:android  # or run:ios
```

### 3. "Cannot find module '@picovoice/react-native-voice-processor'" Error

**Cause:** Dependencies not installed.

**Solution:**
```bash
npm install --legacy-peer-deps
```

### 4. Require Cycle Warnings

**Fixed!** ✅ The circular dependency issues in service files have been resolved.

## Architecture

### Voice Input Flow

1. **Web Platform:**
   - MediaRecorder API → Deepgram WebSocket → Real-time transcription
   - No native modules required

2. **Native Platform (iOS/Android):**
   - Picovoice VoiceProcessor → Audio frames → Deepgram WebSocket → Real-time transcription
   - Requires native module linking

### Voice Output (TTS)

1. **South African Languages (af, zu, xh, nso):**
   - Azure TTS via Edge Function (high-quality voices)

2. **Other Languages:**
   - Device TTS (expo-speech)

## Testing Voice Features

### On Web
```bash
npm run web
```
- Click the microphone button
- Allow microphone access
- Start speaking

### On Native
```bash
# First time or after adding native modules
npx expo prebuild --clean
npx expo run:android

# Then test
# 1. Tap microphone button in chat
# 2. Allow microphone permission
# 3. Start speaking
```

## Debugging

### Check Voice Availability
The app automatically checks voice availability on startup and logs detailed information:

```
[DashVoiceMode] ✅ Voice features available!
```
or
```
[DashVoiceMode] ⚠️ Voice features not available
[DashVoiceMode] 💡 Solution: Rebuild the app with native modules
```

### Enable Verbose Logging
All voice-related logs are prefixed:
- `[claudeProvider]` - Deepgram streaming
- `[RealtimeVoice]` - Voice provider selection
- `[DashVoiceMode]` - Voice UI component
- `[VoiceModal]` - Voice recording modal

### Manual Testing Script
```bash
# Check if Picovoice is installed
ls node_modules/@picovoice/react-native-voice-processor/

# Check package versions
npm list @picovoice/react-native-voice-processor
npm list @react-native-voice/voice

# Verify native linking (Android)
grep -r "VoiceProcessor" android/app/src/main/

# Verify native linking (iOS)
grep -r "VoiceProcessor" ios/
```

## Production Deployment

### Required Environment Variables
```bash
# Deepgram API key (for transcription)
EXPO_PUBLIC_DEEPGRAM_API_KEY=your_key_here

# Azure TTS credentials (for SA languages)
EXPO_PUBLIC_AZURE_SPEECH_KEY=your_key_here
EXPO_PUBLIC_AZURE_SPEECH_REGION=your_region_here

# Optional: OpenAI Realtime (premium tier only)
EXPO_PUBLIC_OPENAI_API_KEY=your_key_here
```

### Build Commands
```bash
# Android APK (for testing)
npm run build:android:apk

# Android AAB (for Play Store)
npm run build:android:aab

# iOS (for App Store)
npx eas build --platform ios --profile production
```

## Cost Optimization

Voice features use cost-effective providers:
- **Deepgram**: ~$0.43/hour (vs $18/hour for OpenAI Realtime)
- **Azure TTS**: ~$0.016/hour
- **Total**: ~$0.50/hour (97% savings vs OpenAI-only solution)

## Support

If you're still experiencing issues:
1. Check the logs for specific error messages
2. Follow the recommended solution in the error logs
3. Ensure all environment variables are set
4. Try the web version first to isolate native module issues

## Recent Fixes (2025-10-18)

✅ Fixed require cycles in:
- `services/DashContextAnalyzer.ts`
- `services/DashTaskAutomation.ts`
- `services/DashDecisionEngine.ts`
- `services/DashProactiveEngine.ts`

✅ Added comprehensive null checking for Picovoice module

✅ Improved error messages with actionable solutions

✅ Added voice availability detection and user-friendly error display
