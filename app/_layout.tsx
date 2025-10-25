import 'react-native-get-random-values';
import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, usePathname } from 'expo-router';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import ToastProvider from '@/components/ui/ToastProvider';
import { QueryProvider } from '@/lib/query/queryClient';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DashboardPreferencesProvider } from '@/contexts/DashboardPreferencesContext';
import { UpdatesProvider } from '@/contexts/UpdatesProvider';
import { TermsProvider } from '@/contexts/TerminologyContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DashWakeWordListener from '@/components/ai/DashWakeWordListener';
// VOICETODO: Voice orb functionality completely archived for production build
import type { IDashAIAssistant } from '@/services/dash-ai/DashAICompat';
import { DashChatButton } from '@/components/ui/DashChatButton';

// Inner component with access to AuthContext and VoiceUI
function LayoutContent() {
  const pathname = usePathname();
  const { loading: authLoading } = useAuth();
  const { isDark } = useTheme();
  const [showFAB, setShowFAB] = useState(false);
  const [statusBarKey, setStatusBarKey] = useState(0);
  
  // Force StatusBar re-render when theme changes
  useEffect(() => {
    setStatusBarKey(prev => prev + 1);
  }, [isDark]);
  
  // Enhanced FAB hiding logic (restore preview behavior)
  const shouldHideFAB = useMemo(() => {
    if (!pathname || typeof pathname !== 'string') return false;
    
    // Auth routes
    if (pathname.startsWith('/(auth)') ||
        pathname === '/sign-in' ||
        pathname === '/(auth)/sign-in' ||
        pathname.includes('auth-callback')) {
      return true;
    }
    
    // Registration routes (hide Dash Orb during sign-up)
    if (pathname.includes('registration') ||
        pathname.includes('register') ||
        pathname.includes('sign-up') ||
        pathname.includes('signup') ||
        pathname.includes('verify-your-email') ||
        pathname.includes('profiles-gate')) {
      return true;
    }
    
    // Landing routes (preview parity)
    if (pathname === '/' ||
        pathname === '/landing' ||
        pathname.startsWith('/landing') ||
        pathname.includes('welcome') ||
        pathname.includes('onboarding')) {
      return true;
    }
    
    // Dash Assistant routes/modal (preview parity)
    if (pathname.includes('dash-assistant') ||
        pathname.includes('/screens/dash-assistant') ||
        pathname.startsWith('/ai/dash') ||
        pathname.startsWith('/ai/assistant')) {
      return true;
    }
    
    // VOICETODO: Voice UI check removed (archived)
    
    return false;
  }, [pathname]);
  
  const isAuthRoute = typeof pathname === 'string' && (
    pathname.startsWith('/(auth)') ||
    pathname === '/sign-in' ||
    pathname === '/(auth)/sign-in' ||
    pathname === '/landing' ||
    pathname === '/' ||
    pathname.includes('auth-callback')
  );
  
  // Show FAB after auth loads and brief delay
  useEffect(() => {
    if (!authLoading && !isAuthRoute) {
      const timer = setTimeout(() => setShowFAB(true), 800);
      return () => clearTimeout(timer);
    } else {
      setShowFAB(false);
    }
  }, [authLoading, isAuthRoute]);
  
  return (
    <View style={styles.container}>
      <StatusBar key={statusBarKey} style={isDark ? 'light' : 'dark'} animated />
      {Platform.OS !== 'web' && <DashWakeWordListener />}
      <Stack
        screenOptions={{
          headerShown: false,
          presentation: 'card',
          animationTypeForReplace: 'push',
        }}
      >
        {/* Let Expo Router auto-discover screens */}
      </Stack>
      
      {/* Dash Chat FAB - temporarily hidden per user request */}
      {/* {showFAB && !shouldHideFAB && (
        <DashChatButton />
      )} */}
    </View>
  );
}

export default function RootLayout() {
  const [dashInstance, setDashInstance] = useState<IDashAIAssistant | null>(null);
  
  // Initialize Dash AI Assistant at root level and sync context
  useEffect(() => {
    (async () => {
      try {
        const module = await import('@/services/dash-ai/DashAICompat');
        const DashClass = (module as any).DashAIAssistant || (module as any).default;
        const dash: IDashAIAssistant | null = DashClass?.getInstance?.() || null;
        if (dash) {
          await dash.initialize();
          setDashInstance(dash);
          // Best-effort: sync Dash user context (language, traits)
          try {
            const { getCurrentLanguage } = await import('@/lib/i18n');
            const { syncDashContext } = await import('@/lib/agent/dashContextSync');
            const { getAgenticCapabilities } = await import('@/lib/utils/agentic-mode');
            const { getCurrentProfile } = await import('@/lib/sessionManager');
            const profile = await getCurrentProfile().catch(() => null as any);
            const role = profile?.role as string | undefined;
            const caps = getAgenticCapabilities(role);
            await syncDashContext({ language: getCurrentLanguage(), traits: { agentic: caps, role: role || null } });
          } catch (syncErr) {
            if (__DEV__) console.warn('[RootLayout] dash-context-sync skipped:', syncErr);
          }
        }
      } catch (e) {
        console.error('[RootLayout] Failed to initialize Dash:', e);
      }
    })();
  }, []);
  
  // Hide development navigation header on web
  useEffect(() => {
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
        
        /* Hide any element containing "screens" text in navigation context */
        *:has-text("screens"),
        [role="navigation"]:has-text("screens"),
        header:has-text("screens") {
          display: none !important;
        }
        
        /* More targeted Expo Router header hiding */
        .expo-router-header:not([data-settings-screen]),
        [data-expo-router-header]:not([data-settings-screen]) {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
        }
        
        /* Force full height for main content */
        #root,
        .expo-root,
        .expo-app-container {
          height: 100vh !important;
          min-height: 100vh !important;
        }
        
        /* Protect settings screen from being hidden */
        .settings-screen,
        [data-settings-screen="true"] {
          display: flex !important;
          visibility: visible !important;
          height: auto !important;
          opacity: 1 !important;
        }
        
        /* Allow natural display for settings content */
        .settings-screen *,
        [data-settings-screen="true"] * {
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Hide back/forward buttons in development */
        .expo-dev-buttons,
        .expo-router-buttons,
        [data-expo-dev-buttons] {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
      
      // Also try to hide elements after they're rendered
      const hideElements = () => {
        const selectors = [
          '.__expo-nav',
          '.expo-web-dev-navigation',
          '.expo-dev-navigation',
          '.expo-router-dev-navigation',
          '[data-expo-web-navigation]',
          '.expo-web-navigation',
          '.expo-dev-header',
          '.expo-web-header',
          '.expo-router-header',
          '.expo-dev-nav',
          '.expo-navigation-header',
          '.expo-router-screens-nav',
          '[data-expo-screens-nav]',
          '.screens-navigation',
          '.dev-screens-header',
          '[data-expo-router-header]',
          '.react-navigation-header',
          '[data-react-navigation-header]'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            (el as HTMLElement).style.display = 'none';
            (el as HTMLElement).style.visibility = 'hidden';
            (el as HTMLElement).style.height = '0';
          });
        });
        
        // More careful hiding - only hide elements that are clearly navigation headers
        const allDivs = document.querySelectorAll('div');
        allDivs.forEach(div => {
          // Skip elements that are inside the main app content
          if (div.closest('[data-settings-screen]') || div.closest('.settings-screen')) {
            return;
          }
          
          const style = window.getComputedStyle(div);
          const hasWhiteBackground = style.backgroundColor === 'rgb(255, 255, 255)' || style.backgroundColor === 'white';
          // const hasBackButton = div.querySelector('button[aria-label="Go back"]') || div.querySelector('button[aria-label*="back"]'); // TODO: Use this for more precise hiding
          const hasScreensText = div.textContent?.trim() === 'screens'; // More specific match
          
          // Only hide if it's clearly a navigation header (not app content)
          if (hasWhiteBackground && hasScreensText && div.children.length < 3) {
            (div as HTMLElement).style.display = 'none';
            (div as HTMLElement).style.visibility = 'hidden';
            (div as HTMLElement).style.height = '0';
          }
        });
        
        // Hide any element containing "screens" text in navigation context
        const elementsWithScreensText = document.querySelectorAll('*');
        elementsWithScreensText.forEach(el => {
          if (el.textContent?.trim() === 'screens' && el.closest('header, nav, [role="navigation"]')) {
            const parent = el.closest('div, header, nav') as HTMLElement;
            if (parent) {
              parent.style.display = 'none';
              parent.style.visibility = 'hidden';
              parent.style.height = '0';
            }
          }
        });
      };
      
      // Run immediately and on DOM changes
      hideElements();
      const observer = new MutationObserver(hideElements);
      observer.observe(document.body, { childList: true, subtree: true });
      
      // Additional aggressive hiding after a delay
      setTimeout(() => {
        hideElements();
        // Try to find and remove the header with "screens" text
        const headers = document.querySelectorAll('*');
        headers.forEach(el => {
          if (el.textContent === 'screens' || el.textContent?.trim() === 'screens') {
            // Find the parent container that looks like a header
            let parent = el.parentElement;
            while (parent) {
              const style = window.getComputedStyle(parent);
              if (style.backgroundColor === 'rgb(255, 255, 255)' || style.backgroundColor === 'white') {
                (parent as HTMLElement).style.display = 'none';
                break;
              }
              parent = parent.parentElement;
            }
          }
        });
      }, 100);
      
      // Even more aggressive approach - continuous monitoring
      const continuousHiding = setInterval(() => {
        hideElements();
      }, 500);
      
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
        observer.disconnect();
        clearInterval(continuousHiding);
      };
    }
  }, []);
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              <TermsProvider>
                <OnboardingProvider>
                  <DashboardPreferencesProvider>
                    <UpdatesProvider>
                      <ToastProvider>
                        {/* VOICETODO: VoiceUIProvider removed (archived) */}
                        <LayoutContent />
                      </ToastProvider>
                    </UpdatesProvider>
                  </DashboardPreferencesProvider>
                </OnboardingProvider>
              </TermsProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
