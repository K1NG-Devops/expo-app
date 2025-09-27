import React from 'react';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import ParentDashboard from './ParentDashboard';

export const ParentDashboardWrapper: React.FC<{ refreshTrigger?: number } > = ({ refreshTrigger }) => {
  const { preferences } = useDashboardPreferences();

  switch (preferences.layout) {
    case 'enhanced':
      // TODO: Replace with NewEnhancedParentDashboard when available
      return <ParentDashboard key="enhanced" />;
    case 'classic':
    default:
      return <ParentDashboard key="classic" />;
  }
};

export default ParentDashboardWrapper;
