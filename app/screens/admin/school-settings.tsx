/**
 * School Settings Screen
 * 
 * Clean, compact settings interface for school administrators
 * Only accessible by Principals and School Administrators.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { offlineCacheService } from '@/lib/services/offlineCacheService';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { Colors } from '@/constants/Colors';

interface SchoolSettings {
  // Basic School Info
  schoolName: string;
  schoolLogo?: string;
  primaryColor: string;
  secondaryColor: string;
  timezone: string;
  currency: string;
  
  // Feature Toggles
  features: {
    activityFeed: {
      enabled: boolean;
      allowTeacherDelete: boolean;
      allowParentComment: boolean;
      showPriorityBadges: boolean;
    };
    studentsDirectory: {
      enabled: boolean;
      showPhotos: boolean;
      showMedicalInfo: boolean;
      allowTeacherEdit: boolean;
      showPaymentStatus: boolean;
    };
    teachersDirectory: {
      enabled: boolean;
      showSalaries: boolean;
      showPerformanceRatings: boolean;
      allowParentContact: boolean;
      showQualifications: boolean;
    };
    financialReports: {
      enabled: boolean;
      showTeacherView: boolean;
      allowExport: boolean;
      showDetailedBreakdown: boolean;
      requireApprovalLimit: number;
    };
    pettyCash: {
      enabled: boolean;
      dailyLimit: number;
      requireApprovalAbove: number;
      allowedCategories: string[];
      requireReceipts: boolean;
    };
  };
  
  // Display Options
  display: {
    dashboardLayout: 'grid' | 'list';
    showWeatherWidget: boolean;
    showCalendarWidget: boolean;
    defaultLanguage: string;
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
  };
  
  // Permissions & Roles
  permissions: {
    allowTeacherReports: boolean;
    allowParentMessaging: boolean;
    requireTwoFactorAuth: boolean;
    sessionTimeout: number;
  };
  
  // Notifications
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    dailyReports: boolean;
    urgentAlertsOnly: boolean;
  };
  
  // Backup & Data
  backup: {
    autoBackupEnabled: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    dataRetentionMonths: number;
  };
}

const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'My School',
  primaryColor: '#4F46E5',
  secondaryColor: '#6B7280',
  timezone: 'Africa/Johannesburg',
  currency: 'ZAR',
  features: {
    activityFeed: {
      enabled: true,
      allowTeacherDelete: false,
      allowParentComment: true,
      showPriorityBadges: true,
    },
    studentsDirectory: {
      enabled: true,
      showPhotos: true,
      showMedicalInfo: true,
      allowTeacherEdit: true,
      showPaymentStatus: true,
    },
    teachersDirectory: {
      enabled: true,
      showSalaries: false,
      showPerformanceRatings: true,
      allowParentContact: true,
      showQualifications: true,
    },
    financialReports: {
      enabled: true,
      showTeacherView: false,
      allowExport: true,
      showDetailedBreakdown: true,
      requireApprovalLimit: 1000,
    },
    pettyCash: {
      enabled: true,
      dailyLimit: 500,
      requireApprovalAbove: 200,
      allowedCategories: ['Office Supplies', 'Maintenance', 'Emergency', 'Utilities'],
      requireReceipts: true,
    },
  },
  display: {
    dashboardLayout: 'grid',
    showWeatherWidget: true,
    showCalendarWidget: true,
    defaultLanguage: 'en',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
  },
  permissions: {
    allowTeacherReports: true,
    allowParentMessaging: true,
    requireTwoFactorAuth: false,
    sessionTimeout: 30,
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    dailyReports: true,
    urgentAlertsOnly: false,
  },
  backup: {
    autoBackupEnabled: true,
    backupFrequency: 'daily',
    dataRetentionMonths: 12,
  },
};

export default function SchoolSettingsScreen() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const [settings, setSettings] = useState<SchoolSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadSettings();
  }, []);

  const canAccessSettings = (): boolean => {
    return profile?.role === 'principal' || profile?.role === 'principal_admin';
  };

  const loadSettings = async () => {
    try {
      const schoolId = profile?.organization_id || 'school-123';
      const cached = await offlineCacheService.get(`school_settings`, schoolId, user?.id || '');
      if (cached) {
        setSettings({ ...DEFAULT_SETTINGS, ...cached });
      }
    } catch (error) {
      console.error('Failed to load school settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const schoolId = profile?.organization_id || 'school-123';
      
      // Save to local cache first
      await offlineCacheService.set(`school_settings`, schoolId, settings, user?.id || '', schoolId);
      
      // Here you would normally sync to your backend
      // await syncSettingsToBackend(settings);
      
      Alert.alert(
        'Settings Saved', 
        'Your school settings have been updated successfully.\n\nChanges will take effect immediately.',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert(
        'Save Failed', 
        'There was an error saving your settings. Please check your connection and try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SchoolSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedSetting = (path: string[], value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      let current = newSettings as any;
      
      for (let i = 0; i < path.length - 1; i++) {
        if (current[path[i]]) {
          current[path[i]] = { ...current[path[i]] };
          current = current[path[i]];
        }
      }
      
      current[path[path.length - 1]] = value;
      return newSettings;
    });
  };

  const renderSettingRow = (label: string, value: string | boolean, onPress?: () => void) => (
    <TouchableOpacity style={[styles.settingRow, { backgroundColor: theme.surface }]} onPress={onPress} disabled={!onPress}>
      <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.settingValue}>
        {typeof value === 'boolean' ? (
          <Switch
            value={value}
            onValueChange={onPress || (() => {})}
            trackColor={{ false: theme.border, true: theme.primary + '40' }}
            thumbColor={value ? theme.primary : theme.surface}
          />
        ) : (
          <>
            <Text style={[styles.settingValueText, { color: theme.textSecondary }]}>{value}</Text>
            {onPress && <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />}
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!canAccessSettings()) {
    return (
      <View style={[styles.accessDenied, { backgroundColor: theme.background }]}>
        <Ionicons name="lock-closed" size={64} color={theme.textSecondary} />
        <Text style={[styles.accessDeniedTitle, { color: theme.text }]}>Access Denied</Text>
        <Text style={[styles.accessDeniedText, { color: theme.textSecondary }]}>
          Only school principals can access these settings.
        </Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.primary }]} onPress={() => router.back()}>
          <Text style={[styles.backButtonText, { color: theme.onPrimary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}>
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.surfaceVariant }]}>
            <Ionicons name="arrow-back" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.heroTitle, { color: theme.text }]}>{t('School Settings')}</Text>
            <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>Manage features, permissions and policies</Text>
          </View>
        </View>

        {/* Basic Settings */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>School Information</Text>
          {renderSettingRow('School Name', settings.schoolName, () => {
            Alert.prompt('School Name', 'Enter school name', (text) => {
              if (text) updateSetting('schoolName', text);
            });
          })}
          {renderSettingRow('Currency', settings.currency, () => {
            Alert.alert('Currency', 'Change currency?');
          })}
          {renderSettingRow('Timezone', settings.timezone, () => {
            Alert.alert('Timezone', 'Change timezone?');
          })}
        </View>

        {/* Display Settings */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Display & Language</Text>
          {renderSettingRow('Language', settings.display.defaultLanguage.toUpperCase(), () => {
            Alert.alert('Language', 'Change language?');
          })}
          {renderSettingRow('Date Format', settings.display.dateFormat, () => {
            Alert.alert('Date Format', 'Change date format?');
          })}
          {renderSettingRow('Time Format', settings.display.timeFormat, () => {
            Alert.alert('Time Format', 'Change time format?');
          })}
        </View>

        {/* Features */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Features</Text>
          {renderSettingRow('Activity Feed', settings.features.activityFeed.enabled, () => {
            updateNestedSetting(['features', 'activityFeed', 'enabled'], !settings.features.activityFeed.enabled);
          })}
          {renderSettingRow('Students Directory', settings.features.studentsDirectory.enabled, () => {
            updateNestedSetting(['features', 'studentsDirectory', 'enabled'], !settings.features.studentsDirectory.enabled);
          })}
          {renderSettingRow('Financial Reports', settings.features.financialReports.enabled, () => {
            updateNestedSetting(['features', 'financialReports', 'enabled'], !settings.features.financialReports.enabled);
          })}
          {renderSettingRow('Petty Cash System', settings.features.pettyCash.enabled, () => {
            updateNestedSetting(['features', 'pettyCash', 'enabled'], !settings.features.pettyCash.enabled);
          })}
        </View>

        {/* Permissions */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Permissions</Text>
          {renderSettingRow('Allow Teacher Reports', settings.permissions.allowTeacherReports, () => {
            updateNestedSetting(['permissions', 'allowTeacherReports'], !settings.permissions.allowTeacherReports);
          })}
          {renderSettingRow('Allow Parent Messaging', settings.permissions.allowParentMessaging, () => {
            updateNestedSetting(['permissions', 'allowParentMessaging'], !settings.permissions.allowParentMessaging);
          })}
          {renderSettingRow('Session Timeout', `${settings.permissions.sessionTimeout} min`, () => {
            Alert.alert('Session Timeout', 'Choose timeout duration:', [
              { text: '15 min', onPress: () => updateNestedSetting(['permissions', 'sessionTimeout'], 15) },
              { text: '30 min', onPress: () => updateNestedSetting(['permissions', 'sessionTimeout'], 30) },
              { text: '60 min', onPress: () => updateNestedSetting(['permissions', 'sessionTimeout'], 60) },
              { text: '120 min', onPress: () => updateNestedSetting(['permissions', 'sessionTimeout'], 120) },
              { text: 'Cancel', style: 'cancel' }
            ]);
          })}
        </View>

        {/* Notifications */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>
          {renderSettingRow('Email Notifications', settings.notifications.emailEnabled, () => {
            updateNestedSetting(['notifications', 'emailEnabled'], !settings.notifications.emailEnabled);
          })}
          {renderSettingRow('SMS Notifications', settings.notifications.smsEnabled, () => {
            updateNestedSetting(['notifications', 'smsEnabled'], !settings.notifications.smsEnabled);
          })}
          {renderSettingRow('Push Notifications', settings.notifications.pushEnabled, () => {
            updateNestedSetting(['notifications', 'pushEnabled'], !settings.notifications.pushEnabled);
          })}
          {renderSettingRow('Daily Reports', settings.notifications.dailyReports, () => {
            updateNestedSetting(['notifications', 'dailyReports'], !settings.notifications.dailyReports);
          })}
        </View>

        {/* Security & Backup */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Security & Backup</Text>
          {renderSettingRow('Two-Factor Authentication', settings.permissions.requireTwoFactorAuth, () => {
            updateNestedSetting(['permissions', 'requireTwoFactorAuth'], !settings.permissions.requireTwoFactorAuth);
          })}
          {renderSettingRow('Auto Backup', settings.backup.autoBackupEnabled, () => {
            updateNestedSetting(['backup', 'autoBackupEnabled'], !settings.backup.autoBackupEnabled);
          })}
          {renderSettingRow('Backup Frequency', settings.backup.backupFrequency, () => {
            Alert.alert('Backup Frequency', 'Choose frequency', [
              { text: 'Daily', onPress: () => updateNestedSetting(['backup', 'backupFrequency'], 'daily') },
              { text: 'Weekly', onPress: () => updateNestedSetting(['backup', 'backupFrequency'], 'weekly') },
              { text: 'Monthly', onPress: () => updateNestedSetting(['backup', 'backupFrequency'], 'monthly') },
              { text: 'Cancel', style: 'cancel' }
            ]);
          })}
          {renderSettingRow('Data Retention', `${settings.backup.dataRetentionMonths} months`, () => {
            Alert.alert('Data Retention', 'Choose retention period:', [
              { text: '6 months', onPress: () => updateNestedSetting(['backup', 'dataRetentionMonths'], 6) },
              { text: '12 months', onPress: () => updateNestedSetting(['backup', 'dataRetentionMonths'], 12) },
              { text: '24 months', onPress: () => updateNestedSetting(['backup', 'dataRetentionMonths'], 24) },
              { text: '36 months', onPress: () => updateNestedSetting(['backup', 'dataRetentionMonths'], 36) },
              { text: 'Cancel', style: 'cancel' }
            ]);
          })}
        </View>

        {/* Advanced Settings */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Advanced Settings</Text>
          {renderSettingRow('Dashboard Layout', settings.display.dashboardLayout, () => {
            Alert.alert('Dashboard Layout', 'Choose layout', [
              { text: 'Grid', onPress: () => updateNestedSetting(['display', 'dashboardLayout'], 'grid') },
              { text: 'List', onPress: () => updateNestedSetting(['display', 'dashboardLayout'], 'list') },
              { text: 'Cancel', style: 'cancel' }
            ]);
          })}
          {renderSettingRow('Weather Widget', settings.display.showWeatherWidget, () => {
            updateNestedSetting(['display', 'showWeatherWidget'], !settings.display.showWeatherWidget);
          })}
          {renderSettingRow('Calendar Widget', settings.display.showCalendarWidget, () => {
            updateNestedSetting(['display', 'showCalendarWidget'], !settings.display.showCalendarWidget);
          })}
          {renderSettingRow('Financial Reports Limit', `${settings.features.financialReports.requireApprovalLimit}`, () => {
            Alert.alert('Approval Limit', 'Choose amount requiring approval:', [
              { text: 'R500', onPress: () => updateNestedSetting(['features', 'financialReports', 'requireApprovalLimit'], 500) },
              { text: 'R1000', onPress: () => updateNestedSetting(['features', 'financialReports', 'requireApprovalLimit'], 1000) },
              { text: 'R2500', onPress: () => updateNestedSetting(['features', 'financialReports', 'requireApprovalLimit'], 2500) },
              { text: 'R5000', onPress: () => updateNestedSetting(['features', 'financialReports', 'requireApprovalLimit'], 5000) },
              { text: 'Cancel', style: 'cancel' }
            ]);
          })}
          {renderSettingRow('Petty Cash Daily Limit', `${settings.features.pettyCash.dailyLimit}`, () => {
            Alert.alert('Daily Limit', 'Choose daily petty cash limit:', [
              { text: 'R200', onPress: () => updateNestedSetting(['features', 'pettyCash', 'dailyLimit'], 200) },
              { text: 'R500', onPress: () => updateNestedSetting(['features', 'pettyCash', 'dailyLimit'], 500) },
              { text: 'R1000', onPress: () => updateNestedSetting(['features', 'pettyCash', 'dailyLimit'], 1000) },
              { text: 'R2000', onPress: () => updateNestedSetting(['features', 'pettyCash', 'dailyLimit'], 2000) },
              { text: 'Cancel', style: 'cancel' }
            ]);
          })}
        </View>
      </ScrollView>
      {/* Sticky bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom, backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.bottomBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
          <Ionicons name="close" size={18} color={theme.text} />
          <Text style={[styles.bottomBtnText, { color: theme.text }]}>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={saveSettings} disabled={saving} style={[styles.bottomBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
          {saving ? <ActivityIndicator size="small" color={theme.onPrimary} /> : <Ionicons name="checkmark" size={18} color={theme.onPrimary} />}
          <Text style={[styles.bottomBtnText, { color: theme.onPrimary }]}>Save changes</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 8,
  },
  heroTitle: { fontSize: 20, fontWeight: '800' },
  heroSubtitle: { marginTop: 4 },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 14,
    marginRight: 8,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  bottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bottomPrimary: { },
  bottomSecondary: { },
  bottomBtnText: { fontWeight: '800' },
  sectionTabs: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  sectionTabActive: {
    backgroundColor: Colors.light.tint,
  },
  sectionTabText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginLeft: 8,
  },
  sectionTabTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  sectionContainer: {
    flex: 1,
  },
  sectionContent: {
    flex: 1,
    padding: 20,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 24,
    marginBottom: 16,
  },
  headerButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minWidth: 120,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: 80,
    textAlign: 'right',
  },
  numberInputSuffix: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginLeft: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  pickerOptionSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  pickerOptionText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  pickerOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPreviewInner: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.light.tabIconDefault,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
});
