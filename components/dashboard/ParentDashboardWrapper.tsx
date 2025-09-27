import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { useTheme } from '@/contexts/ThemeContext';
import ParentDashboard from './ParentDashboard';
import { NewEnhancedParentDashboard } from './NewEnhancedParentDashboard';

interface ParentDashboardWrapperProps {
  // Add any props that should be passed to both dashboard components
  refreshTrigger?: number;
}

export const ParentDashboardWrapper: React.FC<ParentDashboardWrapperProps> = ({
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
        <NewEnhancedParentDashboard 
          key="enhanced"
          refreshTrigger={refreshTrigger}
          preferences={preferences}
        />
      );
    case 'classic':
    default:
      return (
        <ParentDashboard 
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

export default ParentDashboardWrapper;
