import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { QueryProvider } from '@/lib/query/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { DashboardPreferencesProvider } from '@/contexts/DashboardPreferencesContext';
import { UpdatesProvider } from '@/contexts/UpdatesProvider';
import { GlobalUpdateBanner } from '@/components/GlobalUpdateBanner';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DashWakeWordListener from '@/components/ai/DashWakeWordListener';
import ThemedStatusBar from '@/components/ui/ThemedStatusBar';
import ToastProvider from '@/components/ui/ToastProvider';
import { DashVoiceFloatingButton } from '@/components/ai/DashVoiceFloatingButton';

// Initialize performance monitoring and global error handling first
import { initPerformanceMonitoring } from '@/lib/perf';
import { installGlobalErrorHandler } from '@/lib/global-errors';
import { initMonitoring } from '@/lib/monitoring';

// Initialize critical systems (guarded to avoid double init in dev / fast refresh)
const __globalAny: any = (global as any);
if (!__globalAny.__EDUDASH_BOOTSTRAPPED__) {
  initPerformanceMonitoring();
  installGlobalErrorHandler();
  initMonitoring();
  __globalAny.__EDUDASH_BOOTSTRAPPED__ = true;
}

// Initialize lazy loading for ultra-fast navigation
import { ChunkPreloader } from '@/lib/lazy-loading';
try {
  ChunkPreloader.preloadCriticalChunks();
} catch {
  // Non-critical; ignore in environments where preloader isn't available
}

// Initialize i18n BEFORE any components render
import '@/lib/i18n';
import ErrorBoundary from '@/components/ErrorBoundary';

// Add polyfill for web environments
if (Platform.OS === 'web') {
  // Polyfill DeviceEventEmitter for web
  if (typeof global !== 'undefined' && !(global as any).DeviceEventEmitter) {
    try {
      const EventEmitter = require('eventemitter3');
      (global as any).DeviceEventEmitter = new EventEmitter();
    } catch {
      // Fallback if eventemitter3 is not available
      console.warn('EventEmitter3 not available, using basic polyfill');
      (global as any).DeviceEventEmitter = {
        addListener: () => ({ remove: () => {} }),
        emit: () => {},
        removeAllListeners: () => {}
      };
    }
  }
}

export default function RootLayout() {
  const pathname = usePathname();
  const isAuthRoute = typeof pathname === 'string' && (
    pathname.startsWith('/(auth)') ||
    pathname === '/sign-in' ||
    pathname === '/(auth)/sign-in' ||
    pathname.includes('auth-callback')
  );
  // Hide development navigation header on web
  useEffect(() => {
    // Track OTA/app launch (non-blocking)
    try {
      const { trackAppLaunch } = require('@/lib/otaObservability');
      trackAppLaunch();
    } catch {
      // Optional telemetry; ignore failures to avoid impacting UX
    }

    // Pre-warm audio recorder on mobile for faster FAB voice interaction
    if (Platform.OS !== 'web') {
      try {
        // Initialize audio manager early
        import('@/lib/voice/audio').then(({ audioManager }) => {
          audioManager.initialize().catch((err) => {
            if (__DEV__) {
              console.log('[App] Audio manager pre-warm failed:', err);
            }
          });
        }).catch(() => {});

        // Pre-warm Dash AI recorder
        import('@/services/DashAIAssistant').then(({ DashAIAssistant }) => {
          const dash = DashAIAssistant.getInstance();
          dash.preWarmRecorder().catch((err) => {
            if (__DEV__) {
              console.log('[App] Dash recorder pre-warm failed:', err);
            }
          });
        }).catch(() => {});
      } catch (e) {
        // Non-critical; ignore
      }
    }

    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        /* Hide all Expo development navigation and headers */
        .__expo-nav,
        .expo-web-dev-navigation,
        .expo-dev-navigation,
        .expo-router-dev-navigation,
        [data-expo-web-navigation],
        .expo-web-navigation,
        .expo-dev-header,
        .expo-web-header,
        .expo-router-header,
        .expo-dev-nav,
        .expo-navigation-header {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          min-height: 0 !important;
          max-height: 0 !important;
          opacity: 0 !important;
        }
        
        /* Hide any white fixed headers */
        [style*="background-color: white"][style*="position: fixed"],
        [style*="background-color: rgb(255, 255, 255)"][style*="position: fixed"],
        [style*="background: white"][style*="position: fixed"],
        [style*="background: rgb(255, 255, 255)"][style*="position: fixed"] {
          display: none !important;
        }
        
        /* Hide development screens navigation */
        .expo-router-screens-nav,
        [data-expo-screens-nav],
        .screens-navigation,
        .dev-screens-header {
          display: none !important;
          visibility: hidden !important;
        }
        
        /* Hide specific white header elements */
        .css-view-g5y9jx.r-borderBottomWidth-qklmqi.r-flex-13awgt0.r-pointerEvents-105ug2t,
        [style*="background-color: rgb(255, 255, 255)"][style*="border-bottom-color: rgb(216, 216, 216)"],
        [class*="css-view"][class*="r-borderBottomWidth"][class*="r-flex"][style*="background-color: rgb(255, 255, 255)"],
        [class*="css-view"][style*="background-color: rgb(255, 255, 255); border-bottom-color: rgb(216, 216, 216)"] {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
          min-height: 0 !important;
          max-height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          border: none !important;
          opacity: 0 !important;
        }
        
        /* Target React Native Web generated header classes */
        [class*="r-borderBottomWidth"][class*="r-flex"][style*="background-color: rgb(255, 255, 255)"],
        [class*="r-borderBottomWidth-qklmqi"][class*="r-flex-13awgt0"] {
          display: none !important;
        }
        
        /* Target the specific header with back button and "screens" text */
        [style*="background-color: rgb(255, 255, 255)"]:has([aria-label="Go back"]),
        [style*="background-color: white"]:has(button),
        div:has(> button[aria-label="Go back"]) {
          display: none !important;
          height: 0 !important;
        }
        
        /* Force full height and width for main content */
        html, body {
          width: 100vw !important;
          max-width: 100vw !important;
          height: 100vh !important;
          min-height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow-x: hidden !important;
        }
        #root,
        .expo-root,
        .expo-app-container {
          width: 100vw !important;
          max-width: 100vw !important;
          height: 100vh !important;
          min-height: 100vh !important;
          overflow-x: hidden !important;
        }
      `;
      document.head.appendChild(style);

      // Add MutationObserver to dynamically hide elements
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const element = node as Element;
              
              // Check for development headers
              if (element.classList?.contains('expo-dev-navigation') ||
                  element.classList?.contains('expo-router-header') ||
                  element.getAttribute('style')?.includes('background-color: rgb(255, 255, 255)')) {
                (element as HTMLElement).style.display = 'none';
              }
              
              // Check child elements
              const devHeaders = element.querySelectorAll?.('.expo-dev-navigation, .expo-router-header, [class*="r-borderBottomWidth"][style*="background-color: rgb(255, 255, 255)"]');
              devHeaders?.forEach((header) => {
                (header as HTMLElement).style.display = 'none';
              });
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      return () => observer.disconnect();
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <UpdatesProvider>
            <ThemeProvider>
              <ToastProvider>
                <DashboardPreferencesProvider>
                  {/* Global themed status bar for consistent visibility across screens */}
                  <ThemedStatusBar />
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <Stack
                    screenOptions={{
                      headerShown: false,
                      presentation: 'card',
                      animationTypeForReplace: 'push',
                    }}
                  >
                    {/* Let Expo Router auto-discover screens */}
                  </Stack>
                  
                  {/* OTA Update Banner */}
                  <GlobalUpdateBanner />
                  
                  {/* Voice-Enabled Dash Floating Button (Global Access) */}
                  {(!isAuthRoute && 
                    !(pathname || '').includes('dash-assistant') && 
                    !(pathname || '').toLowerCase().includes('landing') &&
                    pathname !== '/landing' &&
                    pathname !== 'landing') && (
                    <DashVoiceFloatingButton showWelcomeMessage={true} />
                  )}
                  
                  {/* Platform-specific components */}
                  {Platform.OS !== 'web' ? <DashWakeWordListener /> : null}
                  </GestureHandlerRootView>
            </DashboardPreferencesProvider>
              </ToastProvider>
          </ThemeProvider>
        </UpdatesProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

