# Voice Mode Setup & Configuration Guide

## ✅ Implemented Features

### 1. **Voice Activity Detection (VAD)**
- **Server-side VAD** with 700ms silence threshold
- Automatically detects when you stop speaking
- Triggers AI response after 700ms of silence
- Uses OpenAI Realtime API with `gpt-4o-mini-transcribe` model

### 2. **Speech Interruption**
- **Detects when you start speaking while Dash is responding**
- Automatically stops Dash's speech (both device TTS and Edge Function audio)
- Resets the conversation state to listen for your new input
- Prevents talking over each other

### 3. **Continuous Conversation Flow**
- After Dash finishes speaking, automatically resets to listen for next input
- No need to manually restart voice mode between exchanges
- Natural back-and-forth conversation experience

## 🔧 Environment Variables to Check

### Required Settings in `.env`:

```bash
# ✅ MUST BE TRUE for voice mode to work
EXPO_PUBLIC_DASH_STREAMING=true

# Optional: Override WebSocket URL (otherwise auto-fetched from Edge Function)
EXPO_PUBLIC_DASH_STREAM_URL=

# Optional: WebRTC streaming (experimental)
EXPO_PUBLIC_ENABLE_WEBRTC_STREAMING=false

# AI Features
EXPO_PUBLIC_AI_ENABLED=true
EXPO_PUBLIC_ENABLE_AI_FEATURES=true
EXPO_PUBLIC_AI_STREAMING_ENABLED=true
```

### Your Current Config:
✅ `EXPO_PUBLIC_DASH_STREAMING=true` (confirmed in your .env)

## 📱 Settings to Check

### **Option 1: Dash AI Settings** (Recommended)
Navigate to: **Dash AI Settings Enhanced** screen

Check these settings:
- ✅ **Voice Enabled**: ON
- ✅ **Voice Language**: Set to your preferred language (en-ZA, af, zu, xh, nso)
- ✅ **Voice Type**: Select voice gender/style
- ✅ **Voice Rate**: 0.8-1.2 (1.0 is normal speed)
- ✅ **Auto Read Responses**: ON if you want Dash to speak automatically
- ✅ **Streaming Preference**: Toggle in advanced settings (line 91-93 of dash-ai-settings-enhanced.tsx)

### **Option 2: Device Settings**
Check your device audio settings:
- ✅ **Microphone Permission**: Granted for EduDash Pro
- ✅ **Speaker/Volume**: Not muted, volume at audible level
- ✅ **Bluetooth**: If using Bluetooth headset, ensure it's connected
- ✅ **Do Not Disturb**: Not blocking audio playback

## 🎤 How Voice Mode Works Now

### Voice Detection Flow:
```
1. You start speaking
   ↓
2. Partial transcription shows in real-time
   ↓
3. You stop speaking (700ms silence detected)
   ↓
4. Final transcript sent to AI
   ↓
5. Dash generates response
   ↓
6. Dash speaks response
   ↓
7. Auto-resets to listen for your next input
```

### Interruption Flow:
```
1. Dash is speaking
   ↓
2. You start speaking (partial transcript detected)
   ↓
3. Dash immediately stops speaking
   ↓
4. System ready for your new input
   ↓
5. You finish speaking
   ↓
6. AI processes your new message
```

## 🔍 Troubleshooting

### No Audio from Dash?

1. **Check Edge Function TTS**:
   ```bash
   # Check Supabase Edge Function logs
   supabase functions logs tts-proxy
   ```

2. **Check device volume**:
   - Not muted
   - Volume slider at 50%+
   - Try speaking a test phrase

3. **Check console logs**:
   Look for:
   - `[DashVoiceMode] ✅ TTS started`
   - `[DashVoiceMode] ✅ TTS completed`
   - `[DashVoiceMode] ❌ TTS error:` (if errors)

4. **Check audio permissions**:
   ```bash
   # Android
   adb shell dumpsys package com.edudashpro | grep RECORD_AUDIO
   ```

### Voice Not Detected?

1. **Check mic permissions**: Settings → Apps → EduDash Pro → Permissions → Microphone
2. **Check VAD sensitivity**: Try speaking louder or closer to mic
3. **Check network**: OpenAI Realtime requires stable connection
4. **Check console logs**:
   - `[DashVoiceMode] Status: streaming` (good)
   - `[DashVoiceMode] Status: error` (bad)

### Dash Not Stopping When I Interrupt?

1. **Check partial transcription**: Should see text appear immediately when you speak
2. **Check logs**: Look for `[DashVoiceMode] 🛑 User interrupted - stopping TTS`
3. **Try speaking louder**: Partial transcription triggers interruption

## 📊 Technical Details

### VAD Parameters:
- **Model**: `gpt-4o-mini-transcribe` (optimized for realtime)
- **Silence Duration**: 700ms (configurable via `vadSilenceMs`)
- **Language**: Auto-detected based on user preferences
- **Sample Rate**: 24kHz (optimal for speech)

### Audio Quality:
- **Recording**: 16kHz mono, 32kbps AAC (voice-optimized)
- **Playback**: Varies by TTS provider (Edge Function or device TTS)
- **Latency**: <500ms for realtime transcription

### Network Requirements:
- **WebSocket Connection**: Required for realtime streaming
- **Bandwidth**: ~50-100 Kbps for audio streaming
- **Latency**: <200ms recommended for smooth conversation

## 🎯 Next Steps

1. ✅ **Test Voice Mode**:
   - Open Dash AI chat
   - Tap voice/microphone button
   - Speak a question
   - Wait for Dash to respond
   - Try interrupting mid-response

2. ✅ **Adjust Settings**:
   - Go to Dash AI Settings Enhanced
   - Toggle streaming preference
   - Adjust voice rate/pitch to your preference

3. ✅ **Check Logs**:
   - Run app in dev mode
   - Watch console for voice events
   - Report any errors

## 📝 Files Modified

- `components/ai/DashVoiceMode.tsx`: Added interrupt detection + auto-reset
- `hooks/useRealtimeVoice.ts`: Added mute controls + state management
- `lib/voice/webrtcProvider.ts`: Added mute/unmute functionality

## 🐛 Known Issues

- **Interruption delay**: ~100-200ms delay between speaking and stopping Dash (network latency)
- **Multiple interruptions**: Rapid interruptions may cause transcript loss
- **Background noise**: May trigger false voice detection (adjust VAD sensitivity)

## 📞 Support

If you encounter issues:
1. Check console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test with different voice settings (rate, pitch, volume)
4. Try device TTS fallback if Edge Function TTS fails
