import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Platform,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BiometricAuthService } from "@/services/BiometricAuthService";
import { BiometricBackupManager } from "@/lib/BiometricBackupManager";
import { assertSupabase } from "@/lib/supabase";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { useThemedStyles, themedStyles } from "@/hooks/useThemedStyles";
import { ThemeLanguageSettings } from '@/components/settings/ThemeLanguageSettings';
import { RoleBasedHeader } from '@/components/RoleBasedHeader';
import Constants from 'expo-constants';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { useAuth } from '@/contexts/AuthContext';
import { assertSupabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
  const [biometricLastUsed, setBiometricLastUsed] = useState<string | null>(null);
  const [hasBackupMethods, setHasBackupMethods] = useState(false);
  const [loading, setLoading] = useState(true);
  const { checking, available, error, check, apply } = useAppUpdates();
  
  // Push testing state
  const [testNotificationTitle, setTestNotificationTitle] = useState('Test Notification');
  const [testNotificationMessage, setTestNotificationMessage] = useState('This is a test notification from EduDash Pro');
  const [sendingTest, setSendingTest] = useState(false);

  const styles = useThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    section: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    settingsCard: {
      ...themedStyles.card(theme),
      padding: 0,
      overflow: 'hidden',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    lastSettingItem: {
      borderBottomWidth: 0,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIcon: {
      marginRight: 16,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
      marginBottom: 2,
    },
    settingSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    settingRight: {
      marginLeft: 16,
    },
    biometricInfo: {
      backgroundColor: theme.surfaceVariant,
      padding: 12,
      marginTop: 8,
      borderRadius: 8,
    },
    biometricInfoText: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.divider,
      marginVertical: 8,
    },
    themeSectionContainer: {
      backgroundColor: theme.surface,
      marginHorizontal: 20,
      marginTop: 8,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
  }));

  // Load user settings and biometric information
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load biometric information using direct methods that work on OppoA40
      try {
        // Use unified service
        const [capabilities, availableTypes, isEnabled] = await Promise.all([
          BiometricAuthService.checkCapabilities(),
          BiometricAuthService.getAvailableBiometricOptions(),
          BiometricAuthService.isBiometricEnabled(),
        ]);
        
        console.log('Settings: Biometric check:', { capabilities, availableTypes, isEnabled });
        
        setBiometricSupported(capabilities.isAvailable);
        setBiometricEnrolled(capabilities.isEnrolled);
        setBiometricEnabled(isEnabled);
        setBiometricTypes(availableTypes);
        setBiometricLastUsed(null); // We'll get this later if needed

        // Check for backup methods
        const backupMethods = await BiometricBackupManager.getAvailableFallbackMethods();
        setHasBackupMethods(backupMethods.hasPin || backupMethods.hasSecurityQuestions);
      } catch (error) {
        console.error("Error loading biometric info:", error);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  }, [loadSettings]);

  const toggleBiometric = async () => {
    if (!biometricEnrolled) {
      Alert.alert(
        "Biometric Setup Required",
        "Please set up fingerprint or face recognition in your device settings first.",
        [{ text: "OK" }],
      );
      return;
    }

    try {
      const { data } = await assertSupabase().auth.getUser();
      const user = data.user;

      if (!user) {
        Alert.alert("Error", "User not found");
        return;
      }

      if (biometricEnabled) {
        // Disable biometric authentication
        await BiometricAuthService.disableBiometric();
        setBiometricEnabled(false);
        Alert.alert(
          "Biometric Login Disabled",
          "You will need to use your password to sign in.",
        );
      } else {
        // Enable biometric authentication
        const success = await BiometricAuthService.enableBiometric(
          user.id,
          user.email || "",
        );
        if (success) {
          setBiometricEnabled(true);
          Alert.alert(
            "Biometric Login Enabled",
            "You can now use biometric authentication to sign in quickly.",
          );
        }
      }
    } catch (error) {
      console.error("Error toggling biometric:", error);
      Alert.alert("Error", "Failed to update biometric settings.");
    }
  };

  const getBiometricStatusText = () => {
    if (!biometricSupported) return t('settings.biometric.notAvailable');
    if (!biometricEnrolled) return t('settings.biometric.setupRequired');
    if (biometricEnabled && biometricTypes.length > 0) {
      return `${t('settings.biometric.enabled')} (${biometricTypes.join(', ')})`;
    }
    return biometricEnabled ? t('settings.biometric.enabled') : t('settings.biometric.disabled');
  };

  const getBiometricIcon = () => {
    if (!biometricSupported) return "finger-print-outline";
    // Prioritize Fingerprint icon for OPPO devices with multiple biometric types
    if (biometricTypes.includes('Fingerprint')) {
      return biometricEnabled ? "finger-print" : "finger-print-outline";
    } else if (biometricTypes.includes('Face ID')) {
      return biometricEnabled ? "scan" : "scan-outline";
    } else if (biometricTypes.includes('Iris Scan')) {
      return biometricEnabled ? "eye" : "eye-outline";
    }
    // Default to fingerprint icon
    return biometricEnabled ? "finger-print" : "finger-print-outline";
  };

  const getBiometricIconColor = () => {
    if (!biometricSupported) return theme.textDisabled;
    return biometricEnabled ? theme.success : theme.textSecondary;
  };

  const getBiometricTitle = () => {
    if (biometricTypes.length > 0) {
      // Prioritize Fingerprint over Face ID for OPPO devices
      if (biometricTypes.includes('Fingerprint')) return t('settings.biometric.fingerprint');
      if (biometricTypes.includes('Face ID')) return t('settings.biometric.faceId');
      if (biometricTypes.includes('Iris Scan')) return t('settings.biometric.title');
      return t('settings.biometric.title');
    }
    return t('settings.biometric.title');
  };

  // Check if push testing should be shown (dev tools or superadmin)
  const showPushTesting = Boolean(
    process.env.EXPO_PUBLIC_ENABLE_TEST_TOOLS === '1' ||
    profile?.role === 'superadmin'
  );

  const sendTestNotification = async () => {
    if (!user || !testNotificationTitle.trim() || !testNotificationMessage.trim()) return;
    
    try {
      setSendingTest(true);
      
      const { data, error } = await assertSupabase().functions.invoke('notifications-dispatcher', {
        body: {
          event_type: 'custom',
          user_ids: [user.id],
          template_override: {
            title: testNotificationTitle.trim(),
            body: testNotificationMessage.trim(),
            data: { 
              screen: 'settings',
              test: true 
            }
          },
          send_immediately: true
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      Alert.alert(
        'Test Sent', 
        `Test notification sent successfully. Recipients: ${data?.recipients || 0}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Test notification failed:', error);
      Alert.alert(
        'Test Failed', 
        'Failed to send test notification. Check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <RoleBasedHeader title="Settings" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RoleBasedHeader title="Settings" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.securityPrivacy')}</Text>
          
          <View style={styles.settingsCard}>
            {/* Biometric Authentication */}
            <TouchableOpacity
              style={[styles.settingItem]}
              onPress={() => {
                if (biometricSupported && biometricEnrolled) {
                  // Open switch account picker quickly from settings if biometrics enabled
                  if (biometricEnabled) {
                    router.push('/(auth)/sign-in?switch=1');
                    return;
                  }
                  // Toggle biometric authentication
                  toggleBiometric();
                } else {
                  // Show information about setting up biometrics
                  Alert.alert(
                    t('settings.biometric.title'),
                    !biometricSupported 
                      ? t('settings.biometric.notAvailable')
                      : t('settings.biometric.setupRequired'),
                    [{ text: t('common.ok') }]
                  );
                }
              }}
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name={getBiometricIcon()}
                  size={24}
                  color={getBiometricIconColor()}
                  style={styles.settingIcon}
                />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{getBiometricTitle()}</Text>
                  <Text style={styles.settingSubtitle}>
                    {getBiometricStatusText()}
                  </Text>
                  {biometricEnabled && biometricLastUsed && (
                    <Text style={[styles.settingSubtitle, { fontSize: 12, marginTop: 2 }]}>
                      Last used: {new Date(biometricLastUsed).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.settingRight}>
                {biometricSupported && biometricEnrolled ? (
                  <Switch
                    value={biometricEnabled}
                    onValueChange={toggleBiometric}
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor={biometricEnabled ? theme.onPrimary : theme.textTertiary}
                  />
                ) : biometricSupported && !biometricEnrolled ? (
                  <TouchableOpacity onPress={() => {
                    Alert.alert(
                      t('settings.biometric.setupRequired'),
                      "Please set up fingerprint or face recognition in your device settings.",
                      [{ text: t('common.ok') }]
                    );
                  }}>
                    <Ionicons
                      name="settings"
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                ) : (
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color={theme.textDisabled}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* Privacy & Data Protection */}
            <TouchableOpacity
              style={[styles.settingItem, styles.lastSettingItem]}
              onPress={() =>
                Alert.alert(
                  "Privacy & Security",
                  "Your data is encrypted and stored securely. Biometric data never leaves your device.",
                )
              }
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="lock-closed"
                  size={24}
                  color={theme.textSecondary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.dataProtection')}</Text>
                  <Text style={styles.settingSubtitle}>
                    {t('settings.learnDataProtection')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Biometric Info Card */}
          {biometricSupported && (
            <View style={styles.biometricInfo}>
              <Text style={styles.biometricInfoText}>
                🔒 Your biometric data is processed locally on your device and never transmitted or stored on our servers.
                {biometricTypes.length > 0 && (
                  biometricTypes.includes('Fingerprint') 
                    ? ' Your fingerprint data remains secure on your device.'
                    : biometricTypes.includes('Face ID')
                    ? ' Your facial recognition data remains secure on your device.'
                    : ` Available methods: ${biometricTypes.join(', ')}.`
                )}
                {hasBackupMethods && ' Device passcode is available as a backup method.'}
                {biometricEnabled && biometricLastUsed && (
                  ` Last authenticated: ${new Date(biometricLastUsed).toLocaleDateString()}.`
                )}
              </Text>
            </View>
          )}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={[styles.settingItem]}
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Push notification settings will be available in the next update.",
                )
              }
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="notifications"
                  size={24}
                  color={theme.textSecondary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.pushNotifications')}</Text>
                  <Text style={styles.settingSubtitle}>{t('settings.manageAlerts')}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, styles.lastSettingItem]}
              onPress={() =>
                Alert.alert(
                  "Coming Soon",
                  "Email notification preferences will be available in the next update.",
                )
              }
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="mail"
                  size={24}
                  color={theme.textSecondary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{t('settings.emailNotifications')}</Text>
                  <Text style={styles.settingSubtitle}>{t('settings.configureEmails')}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Appearance Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.appearanceLanguage')}</Text>
        </View>

        {/* Theme & Language Settings Component */}
        <View style={styles.themeSectionContainer}>
          <ThemeLanguageSettings />
        </View>

        {/* Updates */}
        {Platform.OS !== 'web' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Updates</Text>
            <View style={styles.settingsCard}>
              <TouchableOpacity
                style={[styles.settingItem]}
                onPress={async () => {
                  try {
                    const result = await check(true);
                    if (available) {
                      Alert.alert(
                        'Update Ready',
                        'A new version has been downloaded. Restart now to apply the update?',
                        [
                          { text: 'Later', style: 'cancel' },
                          { text: 'Restart Now', onPress: apply }
                        ]
                      );
                    } else {
                      Alert.alert('Up to Date', 'You have the latest version.');
                    }
                  } catch (err) {
                    Alert.alert('Error', 'Failed to check for updates. Please try again.');
                  }
                }}
                disabled={checking}
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="cloud-download"
                    size={24}
                    color={theme.textSecondary}
                    style={styles.settingIcon}
                  />
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Check for updates</Text>
                    <Text style={styles.settingSubtitle}>
                      {checking ? 'Checking…' : available ? 'Update ready to install' : `Current version: ${Constants.expoConfig?.version ?? 'n/a'}`}
                    </Text>
                  </View>
                </View>
                {checking ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>

              {available && (
                <TouchableOpacity
                  style={[styles.settingItem, styles.lastSettingItem]}
                  onPress={apply}
                >
                  <View style={styles.settingLeft}>
                    <Ionicons
                      name="refresh-circle"
                      size={24}
                      color={theme.textSecondary}
                      style={styles.settingIcon}
                    />
                    <View style={styles.settingContent}>
                      <Text style={styles.settingTitle}>Restart to apply update</Text>
                      <Text style={styles.settingSubtitle}>An update has been downloaded</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Push Testing Section (Development/Superadmin Only) */}
        {showPushTesting && Platform.OS !== 'web' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Push Testing</Text>
            <View style={styles.settingsCard}>
              <View style={[styles.settingItem, { flexDirection: 'column', alignItems: 'stretch', paddingVertical: 20 }]}>
                <Text style={[styles.settingTitle, { marginBottom: 12 }]}>Test Notification</Text>
                
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.settingSubtitle, { marginBottom: 4 }]}>Title:</Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                      color: theme.text,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 16
                    }}
                    value={testNotificationTitle}
                    onChangeText={setTestNotificationTitle}
                    placeholder="Enter notification title"
                    placeholderTextColor={theme.textTertiary}
                  />
                </View>
                
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.settingSubtitle, { marginBottom: 4 }]}>Message:</Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                      color: theme.text,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 16,
                      minHeight: 80
                    }}
                    value={testNotificationMessage}
                    onChangeText={setTestNotificationMessage}
                    placeholder="Enter notification message"
                    placeholderTextColor={theme.textTertiary}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: sendingTest ? 0.7 : 1
                  }}
                  onPress={sendTestNotification}
                  disabled={sendingTest || !testNotificationTitle.trim() || !testNotificationMessage.trim()}
                >
                  {sendingTest ? (
                    <ActivityIndicator color={theme.onPrimary} size="small" style={{ marginRight: 8 }} />
                  ) : (
                    <Ionicons name="paper-plane" size={16} color={theme.onPrimary} style={{ marginRight: 8 }} />
                  )}
                  <Text style={{ color: theme.onPrimary, fontWeight: '600', fontSize: 16 }}>
                    {sendingTest ? 'Sending...' : 'Send Test Notification'}
                  </Text>
                </TouchableOpacity>
                
                <Text style={[styles.settingSubtitle, { marginTop: 8, fontSize: 12, fontStyle: 'italic' }]}>  
                  This will send a test notification to your device only. Ensure you have notifications enabled.
                </Text>
              </View>
            </View>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.aboutSupport')}</Text>
          
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={[styles.settingItem]}
              onPress={() =>
                Alert.alert(
                  "EduDash Pro",
                  "Version 1.0.0\nBuilt with ❤️ for educators and parents",
                  [{ text: "OK" }]
                )
              }
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="information-circle"
                  size={24}
                  color={theme.textSecondary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>About EduDash Pro</Text>
                  <Text style={styles.settingSubtitle}>Version and app information</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem]}
              onPress={() =>
                Alert.alert(
                  "Help & Support",
                  "For support, please contact us at support@edudashrpo.com",
                  [{ text: "OK" }]
                )
              }
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="help-circle"
                  size={24}
                  color={theme.textSecondary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Help & Support</Text>
                  <Text style={styles.settingSubtitle}>Get help and contact support</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, styles.lastSettingItem]}
              onPress={() => router.push('/screens/account')}
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="person-circle"
                  size={24}
                  color={theme.primary}
                  style={styles.settingIcon}
                />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Account Settings</Text>
                  <Text style={styles.settingSubtitle}>Manage your profile and account</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}