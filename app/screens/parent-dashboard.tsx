import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useAuth, usePermissions } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import ParentDashboard from '@/components/dashboard/ParentDashboard';
import { track } from '@/lib/analytics';

export default function ParentDashboardScreen() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const permissions = usePermissions();
  const { ready: subscriptionReady, tier } = useSubscription();

  // Enforce RBAC: must be parent role with dashboard access
  const canView = permissions.hasRole('parent') && permissions.can('view_dashboard');
  const hasAccess = permissions.can('access_mobile_app');

  // Features enabled based on tier
  const featuresEnabled = [
    'homework_help',
    'language_switching',
    ...(tier === 'pro' || tier === 'enterprise' ? ['advanced_analytics'] : []),
    ...(tier === 'free' && Platform.OS === 'android' ? ['ads'] : []),
  ];

  // Track dashboard view - MUST be called before any early returns
  React.useEffect(() => {
    if (canView && hasAccess && subscriptionReady) {
      track('edudash.dashboard.view', {
        role: 'parent',
        user_id: user?.id,
        features_enabled: featuresEnabled,
        tier,
        platform: Platform.OS,
      });
    }
  }, [canView, hasAccess, subscriptionReady, tier, user?.id, featuresEnabled]);

  // Early return after all hooks are called
  if (!canView || !hasAccess) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: t('dashboard.parentDashboard'), headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff', headerBackVisible: false }} />
        <StatusBar style="light" backgroundColor="#0b1220" />
        <SafeAreaView edges={['top']} style={styles.deniedContainer}>
          <LinearGradient
            colors={['#0b1220', '#1a0a2e', '#16213e']}
            style={styles.deniedGradient}
          >
            <IconSymbol name="shield.slash" size={64} color="#EF4444" />
            <Text style={styles.deniedTitle}>{t('dashboard.accessDenied')}</Text>
            <Text style={styles.deniedText}>
              {!hasAccess 
                ? t('dashboard.mobileAppAccessRequired')
                : t('dashboard.parentRoleRequired')
              }
            </Text>
            <TouchableOpacity 
              style={styles.accountButton}
              onPress={() => {
                track('edudash.dashboard.access_denied_redirect', {
                  user_id: user?.id,
                  role: profile?.role,
                  reason: !hasAccess ? 'no_mobile_access' : 'not_parent_role',
                });
                router.push('/screens/account');
              }}
            >
              <LinearGradient
                colors={['#00f5ff', '#0080ff']}
                style={styles.accountButtonGradient}
              >
                <Text style={styles.accountButtonText}>{t('dashboard.goToAccount')}</Text>
                <IconSymbol name="arrow.right" size={16} color="#000000" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Parent Dashboard', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff', headerBackVisible: false }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
        <ParentDashboard />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  deniedContainer: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  deniedGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  deniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  deniedText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  accountButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  accountButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginRight: 8,
  },
});
