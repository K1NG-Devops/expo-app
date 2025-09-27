import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { useTheme } from '@/contexts/ThemeContext';
import { EnhancedPrincipalDashboard } from './EnhancedPrincipalDashboard';
import { NewEnhancedPrincipalDashboard } from './NewEnhancedPrincipalDashboard';

interface PrincipalDashboardWrapperProps {
  // Add any props that should be passed to both dashboard components
  refreshTrigger?: number;
}

export const PrincipalDashboardWrapper: React.FC<PrincipalDashboardWrapperProps> = ({
  refreshTrigger
}) => {
  const { preferences, isLoading } = useDashboardPreferences();
  const { theme } = useTheme();

  // Show loading indicator while preferences are being loaded
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Render the appropriate dashboard based on layout preference
  switch (preferences.layout) {
    case 'enhanced':
      return (
        <NewEnhancedPrincipalDashboard 
          key="enhanced"
          refreshTrigger={refreshTrigger}
        />
      );
    case 'classic':
    default:
      return (
        <EnhancedPrincipalDashboard 
          key="classic"
          refreshTrigger={refreshTrigger}
        />
      );
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});