import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { RoleBasedHeader } from '@/components/RoleBasedHeader';
import { track } from '@/lib/analytics';
import { useTheme } from '@/contexts/ThemeContext';
import { NavigationShell } from '@/components/wireframes/NavigationShells';
import { isSuperAdmin } from '@/lib/roleUtils';

// Import tab components
import GlobalOverview from '@/components/superadmin/GlobalOverview';
import Tenants from '@/components/superadmin/Tenants';
import SalesLeads from '@/components/superadmin/SalesLeads';
import Settings from '@/components/superadmin/Settings';

type TabScreen = 'overview' | 'tenants' | 'sales' | 'settings';

export default function SuperAdminDashboardScreen() {
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabScreen>('overview');
  const [loading, setLoading] = useState(false);

  // Debug: Log the user profile for troubleshooting
  React.useEffect(() => {
    console.log('SuperAdminDashboard - User profile:', {
      profile,
      role: profile?.role,
      userId: user?.id,
    });
  }, [profile, user]);

  // Track dashboard opening
  useEffect(() => {
    if (user?.id) {
      track('edudash.superadmin.dashboard_opened', {
        user_id: user.id,
        platform: Platform.OS,
        initial_tab: activeTab,
      });
    }
  }, [user?.id, activeTab]);

  // Handle tab changes
  const handleTabPress = useCallback((screen: string) => {
    // Map NavigationShell screen names to our tab names
    const screenToTab: Record<string, TabScreen> = {
      'dashboard': 'overview',
      'tenants': 'tenants', 
      'sales': 'sales',
      'settings': 'settings'
    };
    
    const tabId = screenToTab[screen] || 'overview';
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      
      // Track tab changes
      if (user?.id) {
        track('edudash.superadmin.tab_changed', {
          user_id: user.id,
          from_tab: activeTab,
          to_tab: tabId,
          platform: Platform.OS,
        });
      }
    }
  }, [activeTab, user?.id]);

  // Show a lightweight loading state while auth/profile is refreshing
  if (authLoading || profileLoading) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading admin profile…</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Access control: Check if user has super admin access
  if (!profile || !isSuperAdmin(profile.role)) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.accessDenied}>
            <Text style={[styles.accessDeniedText, { color: theme.text }]}>Access Denied - Super Admin Only</Text>
            <Text style={[styles.debugText, { color: theme.textSecondary }]}>Role: {profile?.role || 'undefined'}</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <GlobalOverview loading={loading} setLoading={setLoading} />;
      case 'tenants':
        return <Tenants loading={loading} setLoading={setLoading} />;
      case 'sales':
        return <SalesLeads loading={loading} setLoading={setLoading} />;
      case 'settings':
        return <Settings loading={loading} setLoading={setLoading} />;
      default:
        return <GlobalOverview loading={loading} setLoading={setLoading} />;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
        <RoleBasedHeader 
          title="SuperAdmin Dashboard" 
          showBackButton={false} // Hide back button when authenticated
          backgroundColor={theme.headerBackground}
          textColor={theme.headerText}
        />
        
        <NavigationShell
          role="superadmin"
          activeTab={activeTab === 'overview' ? 'dashboard' : activeTab}
          onTabPress={handleTabPress}
        >
          {renderTabContent()}
        </NavigationShell>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  accessDeniedText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  debugText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
});
