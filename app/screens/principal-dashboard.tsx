import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EnhancedPrincipalDashboard } from '@/components/dashboard/EnhancedPrincipalDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function PrincipalDashboardScreen() {
  const { profile, profileLoading, loading } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Handle both organization_id (new RBAC) and preschool_id (legacy) fields
  const orgId = profile?.organization_id || (profile as any)?.preschool_id;
  
  // Wait for auth and profile to finish loading before making routing decisions
  const isStillLoading = loading || profileLoading;

  useEffect(() => {
    // Only make routing decisions after profile has loaded
    if (!isStillLoading && !orgId) {
      console.log('Principal dashboard: No school found, redirecting to onboarding', {
        profile,
        organization_id: profile?.organization_id,
        preschool_id: (profile as any)?.preschool_id,
        profileLoading,
        loading
      });
      // No school linked — send to onboarding
      try { router.replace('/screens/principal-onboarding'); } catch (e) {
        console.debug('Redirect to onboarding failed', e);
      }
    }
  }, [orgId, isStillLoading, profile, profileLoading, loading]);

  // Show loading state while auth/profile is loading
  if (isStillLoading) {
    return (
      <View style={styles.empty}>
        <Text style={styles.text}>{t('dashboard.loading_profile')}</Text>
      </View>
    );
  }

  // Show redirect message if no organization after loading is complete
  if (!orgId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.text}>{t('dashboard.no_school_found_redirect')}</Text>
        <TouchableOpacity onPress={() => {
          try { router.replace('/screens/principal-onboarding'); } catch (e) { console.debug('Redirect failed', e); }
        }}>
          <Text style={[styles.text, { textDecorationLine: 'underline' }]}>{t('common.go_now')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <EnhancedPrincipalDashboard />;
}

const createStyles = (theme: any) => StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme?.background || '#0b1220' },
  text: { color: theme?.text || '#E5E7EB' },
});
