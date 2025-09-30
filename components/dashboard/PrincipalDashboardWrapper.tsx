import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { useTheme } from '@/contexts/ThemeContext';
import { EnhancedPrincipalDashboard } from './EnhancedPrincipalDashboard';
import { NewEnhancedPrincipalDashboard } from './NewEnhancedPrincipalDashboard';

interface PrincipalDashboardWrapperProps {
  // Add any props that should be passed to both dashboard components
  // refreshTrigger?: number; // Currently unused
}

export const PrincipalDashboardWrapper: React.FC<PrincipalDashboardWrapperProps> = () => {
  const { preferences } = useDashboardPreferences();
  const { theme } = useTheme();

  // Render the appropriate dashboard based on layout preference
  // No loading screen - dashboard should handle its own loading states
  switch (preferences.layout) {
    case 'enhanced':
      return (
        <NewEnhancedPrincipalDashboard
          key="enhanced"
        />
      );
    case 'classic':
    default:
      return (
        <EnhancedPrincipalDashboard
          key="classic"
        />
      );
  }
};

const styles = StyleSheet.create({});