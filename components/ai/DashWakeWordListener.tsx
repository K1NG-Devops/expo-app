import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { WakeWordModelLoader } from '@/lib/services/WakeWordModelLoader';

/**
 * DashWakeWordListener
 *
 * Foreground-only wake-word listener (in-app) with graceful fallback when
 * native wake-word packages are not installed. When enabled and the app is
 * active, it listens for a wake phrase (e.g., "Hello Dash") and navigates to
 * the Dash Assistant screen.
 *
 * Notes:
 * - Background wake word is NOT supported here. This only runs in-app.
 * - Implementation attempts to load '@picovoice/porcupine-react-native' if available.
 *   If not installed, it silently disables listening and logs a message.
 */
export default function DashWakeWordListener() {
  const [enabled, setEnabled] = useState<boolean>(false);
  const appStateRef = useRef<string>('active');

  // Porcupine refs (if available)
  const porcupineManagerRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const loadToggle = async () => {
      try {
        const value = await AsyncStorage.getItem('@dash_ai_in_app_wake_word');
        if (mounted) setEnabled(value === 'true');
      } catch {}
    };

    loadToggle();

    const sub = AppState.addEventListener('change', async (next) => {
      appStateRef.current = next;
      if (next === 'active') {
        await loadToggle();
        if (enabled) startListening().catch(() => {});
      } else {
        stopListening().catch(() => {});
      }
    });

    // Start if already active and enabled
    if (appStateRef.current === 'active' && enabled) {
      startListening().catch(() => {});
    }

    return () => {
      mounted = false;
      sub.remove();
      stopListening().catch(() => {});
      release().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // React to settings changes
    if (appStateRef.current === 'active') {
      if (enabled) startListening().catch(() => {});
      else stopListening().catch(() => {});
    }
  }, [enabled]);

  const ensurePorcupine = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      console.debug('[DashWakeWord] Wake word not supported on web platform');
      return false;
    }
    if (porcupineManagerRef.current) return true;

    try {
      // Check if native module is available first
      const { NativeModules } = require('react-native');
      if (!NativeModules.PvPorcupine) {
        console.warn('[DashWakeWord] Native Porcupine module not linked. Wake word disabled.');
        console.warn('[DashWakeWord] To enable: rebuild the app with Porcupine native module linked');
        return false;
      }

      // Dynamic import to avoid hard dependency
      const PorcupineModule = require('@picovoice/porcupine-react-native');
      
      // Debug: Log module structure
      console.log('[DashWakeWord] Porcupine module keys:', Object.keys(PorcupineModule));
      console.log('[DashWakeWord] Module structure:', {
        hasPorcupineManager: 'PorcupineManager' in PorcupineModule,
        hasDefault: 'default' in PorcupineModule,
        type: typeof PorcupineModule
      });
      
      // The correct export is PorcupineModule.PorcupineManager (not a nested default)
      const { PorcupineManager } = PorcupineModule;
      
      if (!PorcupineManager) {
        console.error('[DashWakeWord] PorcupineManager not found in module exports');
        console.error('[DashWakeWord] Available exports:', Object.keys(PorcupineModule));
        return false;
      }
      
      console.log('[DashWakeWord] PorcupineManager type:', typeof PorcupineManager);
      console.log('[DashWakeWord] PorcupineManager methods:', Object.getOwnPropertyNames(PorcupineManager));
      
      // Check if fromKeywordPaths exists
      if (typeof PorcupineManager.fromKeywordPaths !== 'function') {
        console.error('[DashWakeWord] PorcupineManager.fromKeywordPaths is not a function:', typeof PorcupineManager.fromKeywordPaths);
        console.error('[DashWakeWord] Available static methods:', Object.getOwnPropertyNames(PorcupineManager).filter(name => typeof (PorcupineManager as any)[name] === 'function'));
        return false;
      }
      
      const accessKey = process.env.EXPO_PUBLIC_PICOVOICE_ACCESS_KEY || '';

      if (!accessKey) {
        console.debug('[DashWakeWord] No Picovoice access key provided; wake word disabled');
        return false;
      }

      // Load custom Hello Dash wake word model
      let modelPath: string;
      try {
        modelPath = await WakeWordModelLoader.loadHelloDashModel();
        console.log('[DashWakeWord] Hello Dash model loaded:', modelPath);
      } catch (modelError) {
        console.warn('[DashWakeWord] Failed to load Hello Dash model:', modelError);
        return false;
      }

      // Define callbacks
      const detectionCallback = (keywordIndex: number) => {
        console.log(`[DashWakeWord] Wake word "Hello Dash" detected! Index: ${keywordIndex}`);
        try {
          // Navigate to Dash Assistant when wake word is detected
          router.push('/screens/dash-assistant');
        } catch (navError) {
          console.error('[DashWakeWord] Navigation failed:', navError);
        }
      };

      const processErrorCallback = (error: any) => {
        console.error('[DashWakeWord] Processing error:', error);
        console.error('[DashWakeWord] Error type:', typeof error);
        console.error('[DashWakeWord] Error details:', JSON.stringify(error, null, 2));
      };

      // Create PorcupineManager using fromKeywordPaths for custom model
      try {
        console.log('[DashWakeWord] Attempting to create PorcupineManager with:');
        console.log('  - Access key:', accessKey ? `${accessKey.substring(0, 10)}...` : 'MISSING');
        console.log('  - Model path:', modelPath);
        console.log('  - Sensitivity:', 0.65);
        
        // Use the correct Picovoice API for version 3.x
        // API: PorcupineManager.fromKeywordPaths(accessKey, keywordPaths, detectionCallback, processErrorCallback, modelPath, sensitivities)
        porcupineManagerRef.current = await PorcupineManager.fromKeywordPaths(
          accessKey,
          [modelPath], // Array of keyword model paths
          detectionCallback, // Called when wake word detected
          processErrorCallback, // Called on processing errors
          undefined, // Use default Porcupine model (language model)
          [0.65] // Sensitivity for the keyword (0-1, higher = more sensitive)
        );
        
        console.log('[DashWakeWord] PorcupineManager created successfully');
        console.log('[DashWakeWord] Manager instance:', {
          hasStart: typeof porcupineManagerRef.current?.start === 'function',
          hasStop: typeof porcupineManagerRef.current?.stop === 'function',
          hasDelete: typeof porcupineManagerRef.current?.delete === 'function'
        });
        
        return true;
      } catch (initError) {
        console.error('[DashWakeWord] PorcupineManager initialization failed:', initError);
        // Log more details about the error
        if (initError && typeof initError === 'object') {
          console.error('[DashWakeWord] Error details:', {
            message: initError.message,
            code: initError.code,
            stack: initError.stack?.split('\n').slice(0, 3).join('\n')
          });
        }
        return false;
      }
    } catch (e) {
      console.debug('[DashWakeWord] Wake word engine not available or failed to init:', e);
      return false;
    }
  };

  const startListening = async () => {
    if (isListeningRef.current) return;
    if (!enabled) return;

    // Request microphone permission on Android
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Dash needs access to your microphone for wake word detection',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('[DashWakeWord] Microphone permission denied');
          return;
        }
      } catch (err) {
        console.warn('[DashWakeWord] Permission request error:', err);
        return;
      }
    }

    const ok = await ensurePorcupine();
    if (!ok) return;

    if (!porcupineManagerRef.current) {
      console.debug('[DashWakeWord] PorcupineManager not initialized');
      return;
    }

    try {
      // Start audio capture and wake word detection
      await porcupineManagerRef.current.start();
      
      isListeningRef.current = true;
      console.log('[DashWakeWord] Wake word listening started successfully');
      console.log('[DashWakeWord] Listening for "Hello Dash"...');
    } catch (e) {
      console.error('[DashWakeWord] Failed to start listening:', e);
      isListeningRef.current = false;
    }
  };

  const stopListening = async () => {
    if (!isListeningRef.current) return;
    try {
      if (porcupineManagerRef.current) {
        await porcupineManagerRef.current.stop();
      }
      isListeningRef.current = false;
      console.log('[DashWakeWord] Stopped listening');
    } catch (e) {
      console.debug('[DashWakeWord] Error stopping listening:', e);
    }
  };

  const release = async () => {
    try {
      if (porcupineManagerRef.current) {
        await porcupineManagerRef.current.stop();
        await porcupineManagerRef.current.delete();
        porcupineManagerRef.current = null;
      }
    } catch (e) {
      console.debug('[DashWakeWord] Cleanup error:', e);
    }
  };

  return null; // Invisible background helper
}