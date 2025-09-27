import React from 'react';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { TeacherDashboard as TeacherDashboardImpl } from './TeacherDashboard';

export const TeacherDashboardWrapper: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger }) => {
  const { preferences } = useDashboardPreferences();

  switch (preferences.layout) {
    case 'enhanced':
      // TODO: Replace with a dedicated NewEnhancedTeacherDashboard when available
      return <TeacherDashboardImpl key="enhanced" />;
    case 'classic':
    default:
      return <TeacherDashboardImpl key="classic" />;
  }
};

export default TeacherDashboardWrapper;
