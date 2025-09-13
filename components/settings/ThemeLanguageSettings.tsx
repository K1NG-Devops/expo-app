/**
 * Theme and Language Settings Component
 * 
 * Provides UI for switching between themes and languages
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import {
  changeLanguage,
  getCurrentLanguage,
  getAvailableLanguages,
  getComingSoonLanguages,
  SupportedLanguage,
} from '@/lib/i18n';
import { Ionicons } from '@expo/vector-icons';

export function ThemeLanguageSettings() {
  const { theme, mode, setMode, isDark } = useTheme();
  const { t } = useTranslation();
  const currentLanguage = getCurrentLanguage();
  const availableLanguages = getAvailableLanguages();
  const comingSoonLanguages = getComingSoonLanguages();

  const themeModes: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { mode: 'light', label: t('settings.theme.light'), icon: 'sunny' },
    { mode: 'dark', label: t('settings.theme.dark'), icon: 'moon' },
    { mode: 'system', label: t('settings.theme.system'), icon: 'phone-portrait' },
  ];

  const handleThemeChange = async (newMode: ThemeMode) => {
    await setMode(newMode);
  };

  const handleLanguageChange = async (language: SupportedLanguage) => {
    await changeLanguage(language);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('settings.theme.title')}
        </Text>
        
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {themeModes.map((item, index) => (
            <TouchableOpacity
              key={item.mode}
              style={[
                styles.themeOption,
                index < themeModes.length - 1 && [styles.borderBottom, { borderBottomColor: theme.divider }],
              ]}
              onPress={() => handleThemeChange(item.mode)}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={mode === item.mode ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: mode === item.mode ? theme.primary : theme.text,
                      fontWeight: mode === item.mode ? '600' : '400',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
              {mode === item.mode && (
                <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Current Theme Preview */}
        <View style={[styles.previewCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.previewTitle, { color: theme.textSecondary }]}>
            {t('settings.theme.preview')}
          </Text>
          <View style={styles.previewContent}>
            <View style={[styles.colorSample, { backgroundColor: theme.primary }]}>
              <Text style={{ color: theme.onPrimary }}>{t('settings.theme.primary')}</Text>
            </View>
            <View style={[styles.colorSample, { backgroundColor: theme.secondary }]}>
              <Text style={{ color: theme.onSecondary }}>{t('settings.theme.secondary')}</Text>
            </View>
            <View style={[styles.colorSample, { backgroundColor: theme.accent }]}>
              <Text style={{ color: theme.onAccent }}>{t('settings.theme.accent')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Language Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('settings.language.title')}
        </Text>

        {/* Available Languages */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {availableLanguages.map((lang, index) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                index < availableLanguages.length - 1 && [styles.borderBottom, { borderBottomColor: theme.divider }],
              ]}
              onPress={() => handleLanguageChange(lang.code)}
            >
              <View style={styles.languageInfo}>
                <Text
                  style={[
                    styles.languageName,
                    {
                      color: currentLanguage === lang.code ? theme.primary : theme.text,
                      fontWeight: currentLanguage === lang.code ? '600' : '400',
                    },
                  ]}
                >
                  {lang.nativeName}
                </Text>
                <Text style={[styles.languageSubtext, { color: theme.textTertiary }]}>
                  {lang.name}
                </Text>
              </View>
              {currentLanguage === lang.code && (
                <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Coming Soon Languages */}
        {comingSoonLanguages.length > 0 && (
          <>
            <Text style={[styles.subsectionTitle, { color: theme.textSecondary }]}>
              {t('settings.language.comingSoon')}
            </Text>
            <View style={[styles.card, { backgroundColor: theme.surface, opacity: 0.7 }]}>
              {comingSoonLanguages.map((lang, index) => (
                <View
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    index < comingSoonLanguages.length - 1 && [styles.borderBottom, { borderBottomColor: theme.divider }],
                  ]}
                >
                  <View style={styles.languageInfo}>
                    <Text style={[styles.languageName, { color: theme.textDisabled }]}>
                      {lang.nativeName}
                    </Text>
                    <Text style={[styles.languageSubtext, { color: theme.textDisabled }]}>
                      {lang.name}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: theme.surfaceVariant }]}>
                    <Text style={[styles.badgeText, { color: theme.textTertiary }]}>
                      {t('settings.language.soon')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Additional Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('settings.preferences.title')}
        </Text>
        
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceInfo}>
              <Text style={[styles.preferenceName, { color: theme.text }]}>
                {t('settings.preferences.autoTheme')}
              </Text>
              <Text style={[styles.preferenceDescription, { color: theme.textSecondary }]}>
                {t('settings.preferences.autoThemeDesc')}
              </Text>
            </View>
            <Switch
              value={mode === 'system'}
              onValueChange={(value) => handleThemeChange(value ? 'system' : (isDark ? 'dark' : 'light'))}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={mode === 'system' ? theme.onPrimary : theme.textTertiary}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
  },
  previewCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  previewTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  previewContent: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSample: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    marginBottom: 4,
  },
  languageSubtext: {
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceName: {
    fontSize: 16,
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
  },
});
