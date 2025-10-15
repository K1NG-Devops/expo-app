# Voice Service Client Integration Guide

This guide shows you how to integrate voice features (Text-to-Speech and Voice Recording) into your EduDash Pro components.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Concepts](#core-concepts)
3. [Using React Hooks](#using-react-hooks)
4. [Component Examples](#component-examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Basic TTS Example

```typescript
import { useTextToSpeech } from '@/lib/voice';

function MyComponent() {
  const { speak, isPlaying, stop } = useTextToSpeech();

  const handleSpeak = async () => {
    await speak('Sawubona! Welcome to EduDash Pro', 'zu');
  };

  return (
    <TouchableOpacity onPress={handleSpeak} disabled={isPlaying}>
      <Text>{isPlaying ? 'Speaking...' : 'Speak'}</Text>
    </TouchableOpacity>
  );
}
```

### Basic Recording Example

```typescript
import { useVoiceRecording } from '@/lib/voice';

function RecordingComponent() {
  const { 
    recordingState, 
    startRecording, 
    stopRecording 
  } = useVoiceRecording();

  return (
    <>
      <TouchableOpacity 
        onPress={recordingState.isRecording ? stopRecording : startRecording}
      >
        <Text>
          {recordingState.isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>
      {recordingState.duration > 0 && (
        <Text>Duration: {Math.floor(recordingState.duration / 1000)}s</Text>
      )}
    </>
  );
}
```

---

## Core Concepts

### Supported Languages

EduDash Pro supports four South African languages:

| Code | Language | English Name | Provider |
|------|----------|--------------|----------|
| `af` | Afrikaans | Afrikaans | Azure |
| `zu` | isiZulu | Zulu | Azure |
| `xh` | isiXhosa | Xhosa | Google Cloud |
| `nso` | Sepedi | Northern Sotho | OpenAI |

### Voice Service Architecture

```
┌─────────────────┐
│  React Native   │
│   Components    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Voice Hooks    │  ← useTextToSpeech, useVoiceRecording, etc.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Voice Service   │  ← Core client logic
│    Client       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TTS Proxy      │  ← Supabase Edge Function
│ Edge Function   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Azure / Google  │  ← AI Voice Providers
│    / OpenAI     │
└─────────────────┘
```

---

## Using React Hooks

### 1. `useTextToSpeech`

For synthesizing and playing speech from text.

```typescript
const {
  speak,           // Function to synthesize and play text
  stop,            // Stop current playback
  pause,           // Pause playback
  resume,          // Resume paused playback
  isPlaying,       // Boolean - is audio currently playing
  isSynthesizing,  // Boolean - is synthesis in progress
  playbackState,   // Detailed playback state (duration, position)
  error,           // Any errors during synthesis
} = useTextToSpeech();

// Basic usage
await speak('Hello world', 'af'); // Speak in Afrikaans

// With custom voice
await speak('Sawubona', 'zu', 'zu-ZA-ThandoNeural');
```

### 2. `useVoiceRecording`

For recording audio from the microphone.

```typescript
const {
  recordingState,     // { isRecording, duration, uri?, error? }
  hasPermission,      // Boolean - mic permission granted
  requestPermission,  // Request mic permission
  startRecording,     // Start recording
  stopRecording,      // Stop and save recording
  cancelRecording,    // Cancel without saving
} = useVoiceRecording();

// Request permission first
if (hasPermission === false) {
  await requestPermission();
}

// Start recording
await startRecording();

// Stop and get URI
const audioUri = await stopRecording();
console.log('Saved to:', audioUri);
```

### 3. `useVoicePreferences`

For managing user voice preferences.

```typescript
const {
  preferences,      // Current voice preferences object
  isLoading,        // Loading state
  savePreferences,  // Save new preferences
  isSaving,         // Saving state
  testVoice,        // Test a voice with sample text
  refetch,          // Refresh preferences
} = useVoicePreferences();

// Save new language preference
await savePreferences({
  language: 'zu',
  voice_id: 'zu-ZA-ThandoNeural',
});

// Test a voice
await testVoice('af');
```

### 4. `useVoiceInteraction` (Combined Hook)

Combines recording, TTS, and preferences for complete voice interaction.

```typescript
const {
  // Recording
  recordingState,
  startRecording,
  stopRecording,
  cancelRecording,
  hasPermission,
  requestPermission,
  
  // TTS
  speak,              // Uses user's preferred language
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  isSpeaking,
  isSynthesizing,
  playbackState,
  
  // Preferences
  preferredLanguage,  // User's preferred language
  preferences,
} = useVoiceInteraction();

// Speak using user's preferred language
await speak('This will use their preferred language');

// Override language
await speak('Molo!', 'xh');
```

---

## Component Examples

### Example 1: Voice Note Button

```typescript
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTextToSpeech } from '@/lib/voice';

interface VoiceNoteButtonProps {
  text: string;
  language?: SupportedLanguage;
}

export function VoiceNoteButton({ text, language = 'af' }: VoiceNoteButtonProps) {
  const { speak, isPlaying, isSynthesizing, stop } = useTextToSpeech();

  const handlePress = async () => {
    if (isPlaying) {
      await stop();
    } else {
      try {
        await speak(text, language);
      } catch (error) {
        console.error('TTS failed:', error);
        Alert.alert('Error', 'Failed to play voice note');
      }
    }
  };

  return (
    <TouchableOpacity 
      onPress={handlePress}
      disabled={isSynthesizing}
      style={styles.button}
    >
      {isSynthesizing ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <Ionicons 
          name={isPlaying ? 'stop-circle' : 'play-circle'} 
          size={24} 
          color="#007AFF" 
        />
      )}
    </TouchableOpacity>
  );
}
```

### Example 2: Voice Message Composer

```typescript
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceRecording } from '@/lib/voice';

interface VoiceMessageComposerProps {
  onRecordingComplete: (audioUri: string) => void;
}

export function VoiceMessageComposer({ onRecordingComplete }: VoiceMessageComposerProps) {
  const {
    recordingState,
    hasPermission,
    requestPermission,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecording();

  const handleStartRecording = async () => {
    if (hasPermission === false) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone permission is needed');
        return;
      }
    }

    try {
      await startRecording();
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      const uri = await stopRecording();
      if (uri) {
        onRecordingComplete(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save recording');
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {recordingState.isRecording ? (
        <>
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>
              {formatDuration(recordingState.duration)}
            </Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleStopRecording} style={styles.stopButton}>
              <Ionicons name="stop-circle" size={32} color="#34C759" />
              <Text>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelRecording} style={styles.cancelButton}>
              <Ionicons name="close-circle" size={32} color="#FF3B30" />
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <TouchableOpacity onPress={handleStartRecording} style={styles.recordButton}>
          <Ionicons name="mic" size={32} color="#FFF" />
          <Text style={styles.recordButtonText}>Record Message</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### Example 3: AI Assistant with Voice

```typescript
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceInteraction } from '@/lib/voice';

export function VoiceAssistant() {
  const [inputText, setInputText] = useState('');
  const [response, setResponse] = useState('');
  
  const {
    speak,
    isSpeaking,
    stopSpeaking,
    startRecording,
    stopRecording,
    recordingState,
    preferredLanguage,
  } = useVoiceInteraction();

  const handleSubmit = async () => {
    // Call your AI service
    const aiResponse = await callAIService(inputText, preferredLanguage);
    setResponse(aiResponse);
    
    // Speak the response
    await speak(aiResponse);
  };

  const handleVoiceInput = async () => {
    if (recordingState.isRecording) {
      const audioUri = await stopRecording();
      // Transcribe audio (you'd call transcription service here)
      const transcribedText = await transcribeAudio(audioUri, preferredLanguage);
      setInputText(transcribedText);
    } else {
      await startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={inputText}
        onChangeText={setInputText}
        placeholder="Ask me anything..."
        style={styles.input}
      />
      
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={handleVoiceInput} style={styles.micButton}>
          <Ionicons 
            name={recordingState.isRecording ? 'stop' : 'mic'} 
            size={24} 
            color="#FFF" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
          <Text style={styles.submitText}>Ask</Text>
        </TouchableOpacity>
      </View>

      {response && (
        <View style={styles.responseCard}>
          <Text style={styles.responseText}>{response}</Text>
          <TouchableOpacity 
            onPress={isSpeaking ? stopSpeaking : () => speak(response)}
            style={styles.speakerButton}
          >
            <Ionicons 
              name={isSpeaking ? 'volume-mute' : 'volume-high'} 
              size={20} 
              color="#007AFF" 
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
```

---

## Best Practices

### 1. **Always Request Permissions**

```typescript
// Check permission before recording
if (hasPermission === false) {
  const granted = await requestPermission();
  if (!granted) {
    // Show user-friendly message
    Alert.alert(
      'Microphone Permission Required',
      'To use voice features, please enable microphone access in settings'
    );
    return;
  }
}
```

### 2. **Handle Errors Gracefully**

```typescript
try {
  await speak(text, language);
} catch (error) {
  if (error.code === 'AUTH_REQUIRED') {
    // Redirect to login
  } else if (error.code === 'TTS_FAILED') {
    // Show fallback text
    Alert.alert('Voice Unavailable', 'Showing text instead');
  } else {
    // Generic error
    Alert.alert('Error', 'Something went wrong');
  }
}
```

### 3. **Cleanup on Unmount**

```typescript
useEffect(() => {
  return () => {
    // Hooks handle cleanup automatically, but if using AudioManager directly:
    audioManager.cleanup();
  };
}, []);
```

### 4. **Use User Preferences**

```typescript
const { preferences } = useVoicePreferences();

// Always use user's preferred language when possible
await speak(message, preferences?.language || 'af');
```

### 5. **Provide Visual Feedback**

```typescript
// Show loading states
{isSynthesizing && <ActivityIndicator />}

// Show progress
{playbackState.duration > 0 && (
  <ProgressBar 
    progress={playbackState.position / playbackState.duration} 
  />
)}

// Show recording status
{recordingState.isRecording && <RecordingIndicator />}
```

---

## Troubleshooting

### Issue: "User must be authenticated"

**Solution**: Ensure user is logged in before using voice features.

```typescript
const { user } = useAuth();

if (!user) {
  return <Text>Please log in to use voice features</Text>;
}
```

### Issue: "Microphone permission denied"

**Solution**: Guide users to settings.

```typescript
import { Linking } from 'react-native';

if (hasPermission === false) {
  Alert.alert(
    'Permission Required',
    'Please enable microphone access in Settings',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
}
```

### Issue: Audio doesn't play

**Solution**: Check audio mode and playback state.

```typescript
import { Audio } from 'expo-av';

// Ensure audio mode is set correctly
await Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
});
```

### Issue: Voice synthesis is slow

**Solution**: Check cache and network.

```typescript
// Check if response was cached
const response = await voiceService.synthesize({
  text,
  language,
});

if (response.cache_hit) {
  console.log('Served from cache');
} else {
  console.log('Fresh synthesis took:', response.duration_ms, 'ms');
}
```

---

## Additional Resources

- [Voice Demo Screen](../../app/screens/voice-demo.tsx) - Full working example
- [TTS Proxy Documentation](../deployment/TTS_PROXY_DEPLOYMENT.md)
- [Azure Voice Setup](./AZURE_VOICES_SETUP.md)
- [API Reference](./API_REFERENCE.md)

## Need Help?

Check the demo screen at `app/screens/voice-demo.tsx` for a comprehensive working example of all voice features!
