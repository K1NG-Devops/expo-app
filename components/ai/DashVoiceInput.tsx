/**
 * DashVoiceInput - Real-Time Speech Recognition Component
 * 
 * Provides live voice-to-text input using @react-native-voice/voice
 * with support for South African languages and visual feedback.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Alert,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechRecognizedEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

interface DashVoiceInputProps {
  onTextRecognized: (text: string) => void;
  onListeningChange?: (isListening: boolean) => void;
  language?: string; // 'en-ZA', 'af-ZA', 'zu-ZA', etc.
  autoSend?: boolean;
  disabled?: boolean;
}

export const DashVoiceInput: React.FC<DashVoiceInputProps> = ({
  onTextRecognized,
  onListeningChange,
  language = 'en-ZA',
  autoSend = false,
  disabled = false,
}) => {
  const { theme, isDark } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [partialResults, setPartialResults] = useState<string[]>([]);
  const [finalResult, setFinalResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);

  const waveAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Initialize Voice
  useEffect(() => {
    // Check if Voice module is available
    if (!Voice || typeof Voice.isAvailable !== 'function') {
      console.warn('[DashVoiceInput] Voice module not available');
      setIsAvailable(false);
      return;
    }

    try {
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechPartialResults = onSpeechPartialResults;
      Voice.onSpeechError = onSpeechError;
      Voice.onSpeechRecognized = onSpeechRecognized;

      // Check if speech recognition is available
      Voice.isAvailable()
        .then((available: number) => {
          setIsAvailable(available === 1);
          if (available !== 1) {
            console.warn('[DashVoiceInput] Speech recognition not available');
          }
        })
        .catch((e: any) => {
          console.error('[DashVoiceInput] Error checking availability:', e);
          setIsAvailable(false);
        });
    } catch (initError) {
      console.error('[DashVoiceInput] Voice initialization error:', initError);
      setIsAvailable(false);
      return;
    }

    return () => {
      if (Voice && typeof Voice.destroy === 'function') {
        Voice.destroy().then(Voice.removeAllListeners).catch(() => { /* Intentional: error handled */ });
      }
    };
  }, []);

  // Notify parent of listening state changes
  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  // Animate microphone when listening
  useEffect(() => {
    if (isListening) {
      startWaveAnimation();
      startPulseAnimation();
    } else {
      stopAnimations();
    }
  }, [isListening]);

  const startWaveAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnimation, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopAnimations = () => {
    waveAnimation.stopAnimation();
    pulseAnimation.stopAnimation();
    waveAnimation.setValue(1);
    pulseAnimation.setValue(1);
  };

  const onSpeechStart = (e: SpeechStartEvent) => {
    console.log('[DashVoiceInput] Speech started');
    setIsListening(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onSpeechEnd = (e: SpeechEndEvent) => {
    console.log('[DashVoiceInput] Speech ended');
    setIsListening(false);
  };

  const onSpeechResults = (e: SpeechResultsEvent) => {
    console.log('[DashVoiceInput] Speech results:', e.value);
    if (e.value && e.value.length > 0) {
      const text = e.value[0];
      setFinalResult(text);
      onTextRecognized(text);

      if (autoSend) {
        // Auto-send the message after a brief delay
        setTimeout(() => {
          setFinalResult('');
          setPartialResults([]);
        }, 300);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const onSpeechPartialResults = (e: SpeechResultsEvent) => {
    console.log('[DashVoiceInput] Partial results:', e.value);
    if (e.value && e.value.length > 0) {
      setPartialResults(e.value);
      // Update text input in real-time
      onTextRecognized(e.value[0]);
    }
  };

  const onSpeechError = (e: SpeechErrorEvent) => {
    console.error('[DashVoiceInput] Speech error:', e.error);
    setError(e.error?.message || 'Speech recognition error');
    setIsListening(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    // Show error to user
    if (e.error?.message && !e.error.message.includes('No match')) {
      Alert.alert(
        'Speech Recognition Error',
        e.error.message,
        [{ text: 'OK' }]
      );
    }
  };

  const onSpeechRecognized = (e: SpeechRecognizedEvent) => {
    console.log('[DashVoiceInput] Speech recognized');
  };

  const startListening = async () => {
    if (!isAvailable) {
      Alert.alert(
        'Not Available',
        'Speech recognition is not available on this device.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setError(null);
      setPartialResults([]);
      setFinalResult('');

      await Voice.start(language);
      console.log('[DashVoiceInput] Started listening with language:', language);
    } catch (e: any) {
      console.error('[DashVoiceInput] Error starting:', e);
      Alert.alert(
        'Error',
        'Failed to start speech recognition. Please check your microphone permissions.',
        [{ text: 'OK' }]
      );
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      console.log('[DashVoiceInput] Stopped listening');
    } catch (e: any) {
      console.error('[DashVoiceInput] Error stopping:', e);
    }
  };

  const cancelListening = async () => {
    try {
      await Voice.cancel();
      setPartialResults([]);
      setFinalResult('');
      onTextRecognized('');
      console.log('[DashVoiceInput] Cancelled listening');
    } catch (e: any) {
      console.error('[DashVoiceInput] Error cancelling:', e);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <View style={styles.container}>
      {/* Microphone Button */}
      <TouchableOpacity
        style={[
          styles.micButton,
          {
            backgroundColor: isListening
              ? theme.error
              : theme.primary,
          },
          disabled && styles.disabled,
        ]}
        onPress={toggleListening}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[
            styles.micIconContainer,
            {
              transform: [{ scale: isListening ? waveAnimation : 1 }],
            },
          ]}
        >
          <Ionicons
            name={isListening ? 'mic' : 'mic-outline'}
            size={28}
            color="#fff"
          />
        </Animated.View>

        {/* Pulse effect when listening */}
        {isListening && (
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                backgroundColor: theme.error,
                transform: [{ scale: pulseAnimation }],
              },
            ]}
          />
        )}
      </TouchableOpacity>

      {/* Cancel button when listening */}
      {isListening && (
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: theme.surface }]}
          onPress={cancelListening}
        >
          <Ionicons name="close" size={20} color={theme.error} />
        </TouchableOpacity>
      )}

      {/* Partial results display (optional) */}
      {partialResults.length > 0 && !autoSend && (
        <View
          style={[
            styles.partialResultsContainer,
            { backgroundColor: theme.surface },
          ]}
        >
          <Text style={[styles.partialText, { color: theme.textSecondary }]}>
            {partialResults[0]}
          </Text>
        </View>
      )}

      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error }]}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabled: {
    opacity: 0.5,
  },
  micIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    opacity: 0.3,
  },
  cancelButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  partialResultsContainer: {
    position: 'absolute',
    bottom: 70,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 300,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  partialText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 70,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  errorText: {
    fontSize: 12,
  },
});
