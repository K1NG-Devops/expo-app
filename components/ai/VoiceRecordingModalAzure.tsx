/**
 * Azure-Powered Voice Recording Modal - Society 5.0 Design
 * 
 * Features:
 * - HolographicOrb visual with real-time audio waveform
 * - Azure Speech SDK for speech recognition (works on web + mobile)
 * - Future-ready for Expo Speech Recognition
 * - Unified provider abstraction for easy switching
 * - Ultra-concise AI responses
 * - Smooth animations and haptic feedback
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { DashAIAssistant, DashMessage } from '@/services/DashAIAssistant';
import { HolographicOrb } from '@/components/ui/HolographicOrb';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { getDefaultVoiceProvider, type VoiceSession } from '@/lib/voice/unifiedProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ORB_SIZE = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.4;

interface VoiceRecordingModalAzureProps {
  visible: boolean;
  onClose: () => void;
  dashInstance: DashAIAssistant | null;
  onMessageSent?: (message: DashMessage) => void;
  language?: string;
  showStartOver?: boolean; // Default false to match screenshot
}

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export const VoiceRecordingModalAzure: React.FC<VoiceRecordingModalAzureProps> = ({
  visible,
  onClose,
  dashInstance,
  onMessageSent,
  language = 'en',
  showStartOver = false, // Hide by default (matches screenshot)
}) => {
  const { theme, isDark } = useTheme();
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const processedRef = useRef(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const sessionRef = useRef<VoiceSession | null>(null);
  const [providerId, setProviderId] = useState<string>('azure');

  // Initialize voice session when modal opens
  useEffect(() => {
    if (!visible) return;
    
    let cancelled = false;
    
    (async () => {
      try {
        if (__DEV__) console.log('[VoiceModalAzure] 🎙️ Initializing voice session...');
        
        const provider = await getDefaultVoiceProvider(language);
        if (cancelled) return;
        
        setProviderId(provider.id);
        if (__DEV__) console.log('[VoiceModalAzure] Provider selected:', provider.id);
        
        const session = provider.createSession();
        sessionRef.current = session;
        
        const ok = await session.start({
          language,
          onPartial: (text) => {
            if (!cancelled) {
              setTranscript(text);
              setState('listening');
              try { Haptics.selectionAsync(); } catch {}
            }
          },
          onFinal: async (text) => {
            if (cancelled || processedRef.current) return;
            
            processedRef.current = true;
            setTranscript(text);
            if (__DEV__) console.log('[VoiceModalAzure] ✅ Final transcript:', text);
            
            await handleTranscript(text);
          },
        });
        
        if (cancelled) return;
        
        setIsAvailable(ok);
        if (!ok) {
          setErrorMsg('Voice recognition unavailable');
          setState('error');
          if (__DEV__) console.warn('[VoiceModalAzure] ⚠️ Voice session failed to start');
        } else {
          setState('listening');
          if (__DEV__) console.log('[VoiceModalAzure] ✅ Voice session ready');
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[VoiceModalAzure] ❌ Initialization error:', e);
          setIsAvailable(false);
          setErrorMsg('Voice initialization failed');
          setState('error');
        }
      }
    })();
    
    return () => {
      cancelled = true;
      if (__DEV__) console.log('[VoiceModalAzure] 🧹 Cleanup: stopping session...');
      sessionRef.current?.stop().catch(() => {});
    };
  }, [visible, language]);

  // Fade in/out animation
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setState('idle');
      setTranscript('');
      setResponse('');
      setErrorMsg('');
      processedRef.current = false;
    } else {
      fadeAnim.setValue(0);
      // Stop any active session when closing
      sessionRef.current?.stop().catch(() => {});
    }
  }, [visible]);

  const handleTranscript = useCallback(async (text: string) => {
    if (!dashInstance || processedRef.current) return;
    
    try {
      setState('thinking');
      if (__DEV__) console.log('[VoiceModalAzure] 🤖 Sending to AI:', text);
      
      const aiResponse = await dashInstance.sendMessage(text);
      if (__DEV__) console.log('[VoiceModalAzure] ✅ Got response:', aiResponse.id);
      
      setResponse(aiResponse.content);
      setState('speaking');
      
      // Notify parent
      onMessageSent?.(aiResponse);
      
      // Speak response
      if (aiResponse.content) {
        await dashInstance.speakResponse(aiResponse, {
          onDone: () => {
            if (__DEV__) console.log('[VoiceModalAzure] 🔊 TTS complete');
            setState('idle');
            // Auto-close after speaking
            setTimeout(() => onClose(), 500);
          },
          onError: (err) => {
            console.error('[VoiceModalAzure] ❌ TTS error:', err);
            setState('error');
            setErrorMsg('Speech playback failed');
          },
        });
      } else {
        // No response to speak, close immediately
        setTimeout(() => onClose(), 1000);
      }
    } catch (error) {
      console.error('[VoiceModalAzure] ❌ Error:', error);
      setState('error');
      setErrorMsg('Failed to process request');
      processedRef.current = false;
    }
  }, [dashInstance, onMessageSent, onClose]);

  const restartRecording = async () => {
    try {
      if (__DEV__) console.log('[VoiceModalAzure] 🔄 Restarting recording...');
      
      // Stop current session
      await sessionRef.current?.stop();
      
      // Reset state
      setTranscript('');
      setErrorMsg('');
      setState('idle');
      processedRef.current = false;
      
      // Wait a bit before restarting
      setTimeout(async () => {
        const provider = await getDefaultVoiceProvider(language);
        const session = provider.createSession();
        sessionRef.current = session;
        
        const ok = await session.start({
          language,
          onPartial: (text) => {
            setTranscript(text);
            setState('listening');
          },
          onFinal: async (text) => {
            if (processedRef.current) return;
            processedRef.current = true;
            setTranscript(text);
            await handleTranscript(text);
          },
        });
        
        if (ok) {
          setState('listening');
        } else {
          setErrorMsg('Failed to restart');
          setState('error');
        }
      }, 100);
      
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    } catch (e) {
      console.error('[VoiceModalAzure] ❌ Restart error:', e);
      setErrorMsg('Failed to restart recording');
      setState('error');
    }
  };

  const handleSend = async () => {
    if (!transcript.trim() || processedRef.current) return;
    
    try {
      // Stop listening first
      await sessionRef.current?.stop();
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setState('thinking');
      await handleTranscript(transcript);
    } catch (e) {
      console.error('[VoiceModalAzure] ❌ Manual send error:', e);
    }
  };

  const handleClose = async () => {
    if (state === 'thinking' || state === 'speaking') {
      // Don't close while processing
      return;
    }
    
    // Stop listening if active
    await sessionRef.current?.stop();
    
    setState('idle');
    onClose();
  };

  const getStateText = () => {
    switch (state) {
      case 'idle':
        return 'Ready to listen...';
      case 'listening':
        return transcript || 'Listening...';
      case 'thinking':
        return 'Processing...';
      case 'speaking':
        return response || 'Speaking...';
      case 'error':
        return errorMsg || 'Error occurred';
      default:
        return '';
    }
  };

  const getOrbProps = () => {
    switch (state) {
      case 'listening':
        return { isListening: true };
      case 'thinking':
        return { isThinking: true };
      case 'speaking':
        return { isSpeaking: true };
      default:
        return {};
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View 
          style={[
            styles.overlay,
            { opacity: fadeAnim }
          ]}
        >
          <LinearGradient
            colors={isDark 
              ? ['rgba(10,10,20,0.95)', 'rgba(20,10,40,0.98)']
              : ['rgba(240,240,255,0.95)', 'rgba(220,230,255,0.98)']
            }
            style={StyleSheet.absoluteFill}
          />

        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          disabled={state === 'thinking' || state === 'speaking'}
        >
          <View style={[
            styles.closeButtonInner,
            { backgroundColor: theme.surfaceVariant }
          ]}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Main content */}
        <View style={styles.content}>
          {/* Voice Not Available Warning */}
          {!isAvailable && (
            <View style={[styles.warningContainer, { backgroundColor: theme.error + '20', borderColor: theme.error }]}>
              <Ionicons name="warning" size={24} color={theme.error} />
              <Text style={[styles.warningText, { color: theme.error }]}>
                Voice recognition unavailable. Provider: {providerId}
              </Text>
            </View>
          )}

          {/* Holographic Orb */}
          <View style={styles.orbContainer}>
            <HolographicOrb
              size={ORB_SIZE}
              {...getOrbProps()}
            />
          </View>

          {/* Status text or editable transcript */}
          <View style={styles.textContainer}>
            {state === 'listening' && transcript ? (
              <TextInput
                style={[
                  styles.transcriptInput,
                  { 
                    color: theme.text,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderColor: theme.border,
                  }
                ]}
                value={transcript}
                onChangeText={setTranscript}
                multiline
                placeholder="Your speech will appear here..."
                placeholderTextColor={theme.textSecondary}
                autoCorrect
                autoCapitalize="sentences"
              />
            ) : (
              <Text 
                style={[
                  styles.statusText,
                  { color: theme.text }
                ]}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                {getStateText()}
              </Text>
            )}
          </View>

          {/* Error state action button */}
          {state === 'error' && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setState('idle');
                setErrorMsg('');
                setTranscript('');
                restartRecording();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}

          {/* Action buttons during listening */}
          {state === 'listening' && (
            <View style={styles.buttonRow}>
              {/* Send button (appears when there's transcript) */}
              {transcript.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.sendButton, { backgroundColor: theme.primary }]}
                  onPress={handleSend}
                  activeOpacity={0.8}
                >
                  <Ionicons name="send" size={20} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              )}
              
              {/* Restart button (optional - hidden by default) */}
              {showStartOver && (
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: theme.warning || theme.error }]}
                  onPress={restartRecording}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.cancelButtonText}>Start Over</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  orbContainer: {
    marginBottom: 40,
  },
  textContainer: {
    paddingHorizontal: 20,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 26,
  },
  transcriptInput: {
    width: '100%',
    minHeight: 80,
    maxHeight: 200,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    maxWidth: '90%',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VoiceRecordingModalAzure;
