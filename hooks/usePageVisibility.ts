/**
 * usePageVisibility Hook
 * 
 * Handles web page visibility changes (tab switching) to prevent
 * app freezes and manage data refresh properly.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { track } from '@/lib/analytics';

interface UsePageVisibilityOptions {
  /**
   * Callback when page becomes visible
   */
  onVisible?: () => void;
  
  /**
   * Callback when page becomes hidden
   */
  onHidden?: () => void;
  
  /**
   * Debounce delay for visibility changes (ms)
   * Prevents rapid fire on quick tab switches
   */
  debounceDelay?: number;
  
  /**
   * Enable analytics tracking
   */
  enableTracking?: boolean;
}

export function usePageVisibility(options: UsePageVisibilityOptions = {}) {
  const {
    onVisible,
    onHidden,
    debounceDelay = 300,
    enableTracking = true,
  } = options;

  const [isVisible, setIsVisible] = useState(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVisibilityRef = useRef(Date.now());
  const appStateRef = useRef(AppState.currentState);

  const handleVisibilityChange = useCallback(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce visibility changes
    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now();
      const timeSinceLastChange = now - lastVisibilityRef.current;

      if (Platform.OS === 'web') {
        const visible = !document.hidden;
        setIsVisible(visible);

        if (enableTracking) {
          track('app.visibility_change', {
            is_visible: visible,
            time_since_last_change_ms: timeSinceLastChange,
            platform: 'web',
          });
        }

        if (visible) {
          onVisible?.();
        } else {
          onHidden?.();
        }
      }

      lastVisibilityRef.current = now;
    }, debounceDelay);
  }, [onVisible, onHidden, debounceDelay, enableTracking]);

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    const now = Date.now();
    const timeSinceLastChange = now - lastVisibilityRef.current;

    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      setIsVisible(true);
      
      if (enableTracking) {
        track('app.visibility_change', {
          is_visible: true,
          time_since_last_change_ms: timeSinceLastChange,
          platform: Platform.OS,
          trigger: 'app_state_active',
        });
      }

      onVisible?.();
    } else if (
      appStateRef.current === 'active' &&
      nextAppState.match(/inactive|background/)
    ) {
      setIsVisible(false);
      
      if (enableTracking) {
        track('app.visibility_change', {
          is_visible: false,
          time_since_last_change_ms: timeSinceLastChange,
          platform: Platform.OS,
          trigger: 'app_state_background',
        });
      }

      onHidden?.();
    }

    appStateRef.current = nextAppState;
    lastVisibilityRef.current = now;
  }, [onVisible, onHidden, enableTracking]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web: Use Page Visibility API
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Also listen to window focus/blur as fallback
      window.addEventListener('focus', handleVisibilityChange);
      window.addEventListener('blur', handleVisibilityChange);

      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
        window.removeEventListener('blur', handleVisibilityChange);
      };
    } else {
      // Mobile: Use AppState
      const subscription = AppState.addEventListener('change', handleAppStateChange);
      
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        subscription.remove();
      };
    }
  }, [handleVisibilityChange, handleAppStateChange]);

  return {
    isVisible,
    isHidden: !isVisible,
  };
}

export default usePageVisibility;
