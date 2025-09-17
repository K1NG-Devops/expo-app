import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import * as Updates from 'expo-updates';
import { Platform, AppState } from 'react-native';

// Types for update state
export interface UpdateState {
  isDownloading: boolean;
  isUpdateDownloaded: boolean;
  updateError: string | null;
  lastCheckTime: Date | null;
}

export interface UpdatesContextValue extends UpdateState {
  checkForUpdates: () => Promise<void>;
  applyUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  dismissError: () => void;
}

// Context
const UpdatesContext = createContext<UpdatesContextValue | undefined>(undefined);

// Provider component
interface UpdatesProviderProps {
  children: ReactNode;
}

export function UpdatesProvider({ children }: UpdatesProviderProps) {
  const [state, setState] = useState<UpdateState>({
    isDownloading: false,
    isUpdateDownloaded: false,
    updateError: null,
    lastCheckTime: null,
  });

  // Update state helper
  const updateState = (partial: Partial<UpdateState>) => {
    setState(prev => ({ ...prev, ...partial }));
  };

  // Check for updates manually
  const checkForUpdates = async () => {
    if (!Updates.isEnabled) {
      return;
    }

    try {
      updateState({ isDownloading: true, updateError: null });
      
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        // Start downloading
        await Updates.fetchUpdateAsync();
        // Download complete - this will also trigger the UPDATE_DOWNLOADED event
        updateState({ isDownloading: false, isUpdateDownloaded: true });
      } else {
        updateState({ isDownloading: false, lastCheckTime: new Date() });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check for updates';
      updateState({ 
        isDownloading: false, 
        updateError: errorMessage,
        lastCheckTime: new Date()
      });
      
      // Log to Sentry in production (no PII)
      if (__DEV__) {
        console.warn('Update check failed:', errorMessage);
      }
    }
  };

  // Apply the downloaded update
  const applyUpdate = async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply update';
      updateState({ updateError: errorMessage });
      
      if (__DEV__) {
        console.warn('Update apply failed:', errorMessage);
      }
    }
  };

  // Dismiss the update banner (user chose "Later")
  const dismissUpdate = () => {
    updateState({ isUpdateDownloaded: false });
  };

  // Dismiss error messages
  const dismissError = () => {
    updateState({ updateError: null });
  };

  // Background update checking
  const backgroundCheck = useCallback(async () => {
    if (!Updates.isEnabled) {
      return;
    }

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        updateState({ isDownloading: true, updateError: null });
        await Updates.fetchUpdateAsync();
        updateState({ 
          isDownloading: false, 
          isUpdateDownloaded: true,
          lastCheckTime: new Date()
        });
      } else {
        updateState({ 
          isDownloading: false, 
          lastCheckTime: new Date()
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Background update check failed';
      updateState({ 
        isDownloading: false, 
        updateError: errorMessage,
        lastCheckTime: new Date()
      });
      
      if (__DEV__) {
        console.warn('Background update check failed:', errorMessage);
      }
    }
  }, []);

  // Set up background checking on app state changes
  useEffect(() => {
    if (!Updates.isEnabled) {
      return;
    }

    // Initial background check
    backgroundCheck();
    
    // Check on app state changes
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        backgroundCheck();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [backgroundCheck]);

  const contextValue: UpdatesContextValue = {
    ...state,
    checkForUpdates,
    applyUpdate,
    dismissUpdate,
    dismissError,
  };

  return (
    <UpdatesContext.Provider value={contextValue}>
      {children}
    </UpdatesContext.Provider>
  );
}

// Hook to use the updates context
export function useUpdates() {
  const context = useContext(UpdatesContext);
  if (context === undefined) {
    throw new Error('useUpdates must be used within an UpdatesProvider');
  }
  return context;
}