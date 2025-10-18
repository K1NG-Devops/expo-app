/**
 * Voice UI Controller
 * 
 * Centralized coordinator for all voice interactions:
 * - Single open() entry point used by FAB, DashAssistant mic, etc.
 * - Smart routing to recording modal vs streaming orb based on capabilities
 * - Exposes isOpen state so FAB can hide itself
 * - Handles fallbacks if streaming fails mid-session
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { getVoiceCapabilities, isIndigenousSA, type VoiceCapabilities } from '@/lib/voice/capabilities';
import VoiceRecordingModalNew from '@/components/ai/VoiceRecordingModalNew';
import { DashVoiceMode } from '@/components/ai/DashVoiceMode';
import { toast } from '@/components/ui/ToastProvider';
import type { DashAIAssistant, DashMessage } from '@/services/DashAIAssistant';

type VoiceMode = 'recording' | 'streaming';

interface VoiceUIState {
  isOpen: boolean;
  mode: VoiceMode;
  language?: string;
  transcript?: string;
  capabilities?: VoiceCapabilities;
}

interface VoiceUIContextValue extends VoiceUIState {
  open: (options?: VoiceOpenOptions) => Promise<void>;
  close: () => void;
  onTranscriptReady?: (transcript: string) => void;
}

interface VoiceOpenOptions {
  language?: string;
  tier?: string;
  forceMode?: VoiceMode;
  onTranscriptReady?: (transcript: string) => void;
}

const VoiceUIContext = createContext<VoiceUIContextValue | null>(null);

export function useVoiceUI() {
  const context = useContext(VoiceUIContext);
  if (!context) {
    throw new Error('useVoiceUI must be used within VoiceUIProvider');
  }
  return context;
}

interface VoiceUIProviderProps {
  children: React.ReactNode;
  dashInstance: DashAIAssistant | null;
}

export function VoiceUIProvider({ children, dashInstance }: VoiceUIProviderProps) {
  const [state, setState] = useState<VoiceUIState>({
    isOpen: false,
    mode: 'recording',
  });

  const onTranscriptReadyRef = useRef<((transcript: string) => void) | undefined>();
  const streamingAttemptedRef = useRef(false);

  const open = useCallback(async (options: VoiceOpenOptions = {}) => {
    const { language = 'en', tier = 'free', forceMode, onTranscriptReady } = options;

    // Store callback
    onTranscriptReadyRef.current = onTranscriptReady;

    // Reset streaming attempted flag
    streamingAttemptedRef.current = false;

    // Get capabilities to decide which UI to show
    const capabilities = await getVoiceCapabilities({ language, tier });

    if (__DEV__) {
      console.log('[VoiceUIController] Opening with capabilities:', {
        language,
        preferred: capabilities.preferred,
        streamingAvailable: capabilities.streamingAvailable,
        isIndigenous: capabilities.isIndigenousSA,
        forceMode,
      });
    }

    // Determine mode
    let mode: VoiceMode;
    
    if (forceMode) {
      mode = forceMode;
    } else if (capabilities.isIndigenousSA) {
      // Indigenous SA languages ALWAYS use recording (Azure Speech)
      mode = 'recording';
      if (__DEV__) console.log('[VoiceUIController] 🌍 Indigenous language detected - using recording modal');
    } else if (capabilities.streamingAvailable) {
      // Non-indigenous + deps + premium = try streaming first
      mode = 'streaming';
      streamingAttemptedRef.current = true;
      if (__DEV__) console.log('[VoiceUIController] 🎙️ Streaming available - opening voice mode');
    } else {
      // Fallback to recording
      mode = 'recording';
      if (__DEV__) {
        console.log('[VoiceUIController] 📝 Using recording modal. Reasons:', capabilities.streamingReasons);
      }
    }

    setState({
      isOpen: true,
      mode,
      language,
      capabilities,
    });
  }, []);

  const close = useCallback(() => {
    if (__DEV__) console.log('[VoiceUIController] Closing voice UI');
    setState({
      isOpen: false,
      mode: 'recording',
    });
    onTranscriptReadyRef.current = undefined;
  }, []);

  // Fallback from streaming to recording if streaming fails
  const fallbackToRecording = useCallback((reason: string) => {
    if (!state.isOpen || state.mode !== 'streaming') return;

    if (__DEV__) console.warn('[VoiceUIController] Falling back to recording:', reason);
    
    // Only show toast if streaming was actually attempted
    if (streamingAttemptedRef.current) {
      try {
        toast.warning?.('Streaming not supported on this device — switched to recording.');
      } catch {
        // Toast unavailable
      }
    }

    setState(prev => ({
      ...prev,
      mode: 'recording',
    }));
  }, [state.isOpen, state.mode]);

  // Handle transcript from either modal
  const handleTranscriptReady = useCallback((transcript: string) => {
    if (__DEV__) console.log('[VoiceUIController] Transcript ready:', transcript.substring(0, 50));
    
    // Call stored callback
    if (onTranscriptReadyRef.current) {
      onTranscriptReadyRef.current(transcript);
    }

    // Close modal after callback
    close();
  }, [close]);

  // Handle message sent from modals
  const handleMessageSent = useCallback((message: DashMessage) => {
    if (__DEV__) console.log('[VoiceUIController] Message sent:', message.id);
    // Message already processed by modal; just log
  }, []);

  const contextValue: VoiceUIContextValue = {
    ...state,
    open,
    close,
    onTranscriptReady: onTranscriptReadyRef.current,
  };

  return (
    <VoiceUIContext.Provider value={contextValue}>
      {children}
      
      {/* Recording Modal (animated with orb) */}
      {state.isOpen && state.mode === 'recording' && (
        <VoiceRecordingModalNew
          visible={true}
          onClose={close}
          dashInstance={dashInstance}
          onMessageSent={handleMessageSent}
          language={state.language}
        />
      )}

      {/* Streaming Mode (ChatGPT-style orb) */}
      {state.isOpen && state.mode === 'streaming' && (
        <DashVoiceMode
          visible={true}
          onClose={close}
          dashInstance={dashInstance}
          onMessageSent={handleMessageSent}
          forcedLanguage={state.language}
        />
      )}
    </VoiceUIContext.Provider>
  );
}
