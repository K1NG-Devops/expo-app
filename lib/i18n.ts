/**
 * Internationalization (i18n) Configuration
 * 
 * Comprehensive multilanguage support for the EduDash platform
 * Supporting educational content in multiple languages
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// Import expo-localization with fallback
let getLocales: () => Array<{ languageCode: string; [key: string]: any }> = () => [{ languageCode: 'en' }];
try {
  const expoLocalization = require('expo-localization');
  getLocales = expoLocalization.getLocales;
} catch {
  console.warn('expo-localization not available, using fallback');
}
// Feature flags integration (fallback if not available)
let getFeatureFlagsSync: () => any = () => ({ enableMultilanguageSupport: true });
try {
  const featureFlags = require('@/lib/featureFlags');
  if (featureFlags.getFeatureFlagsSync) {
    getFeatureFlagsSync = featureFlags.getFeatureFlagsSync;
  }
} catch {
  console.debug('[i18n] Feature flags not available, using defaults');
}

// Import language resources with error handling
let en, es, fr, pt, de, af, zu, st, enWhatsApp;
try {
  en = require('../locales/en/common.json');
  es = require('../locales/es/common.json');
  fr = require('../locales/fr/common.json');
  pt = require('../locales/pt/common.json') || {};
  de = require('../locales/de/common.json');
  af = require('../locales/af/common.json');
  zu = require('../locales/zu/common.json') || {};
  st = require('../locales/st/common.json') || {};
  enWhatsApp = require('../locales/en/whatsapp.json');
} catch (error) {
  console.warn('[i18n] Some translation files are missing:', error);
  // Fallback to empty objects for missing translations
  en = en || {};
  es = es || {};
  fr = fr || {};
  pt = pt || {};
  de = de || {};
  af = af || {};
  zu = zu || {};
  st = st || {};
  enWhatsApp = enWhatsApp || {};
}

// Supported languages for educational content
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', rtl: false },
  es: { name: 'Spanish', nativeName: 'Español', rtl: false },
  fr: { name: 'French', nativeName: 'Français', rtl: false },
  pt: { name: 'Portuguese', nativeName: 'Português', rtl: false },
  de: { name: 'German', nativeName: 'Deutsch', rtl: false },
  // South African languages (Active)
  af: { name: 'Afrikaans', nativeName: 'Afrikaans', rtl: false },
  zu: { name: 'Zulu', nativeName: 'IsiZulu', rtl: false },
  st: { name: 'Sepedi', nativeName: 'Sepedi', rtl: false },
} as const;

// South African languages coming soon
export const COMING_SOON_LANGUAGES = {
  xh: { name: 'Xhosa', nativeName: 'IsiXhosa', rtl: false },
  tn: { name: 'Tswana', nativeName: 'Setswana', rtl: false },
  ss: { name: 'Swati', nativeName: 'SiSwati', rtl: false },
  nr: { name: 'Ndebele', nativeName: 'IsiNdebele', rtl: false },
  ve: { name: 'Venda', nativeName: 'Tshivenda', rtl: false },
  ts: { name: 'Tsonga', nativeName: 'Xitsonga', rtl: false },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Language resources
const resources = {
  en: { common: en, whatsapp: enWhatsApp },
  es: { common: es },
  fr: { common: fr },
  pt: { common: pt },
  de: { common: de },
  // South African languages
  af: { common: af },
  zu: { common: zu },
  st: { common: st },
};

// Detect user's preferred language
function detectLanguage(): string {
  try {
    const flags = getFeatureFlagsSync();
    
    // Check if multilanguage feature is enabled (default to true if flag doesn't exist)
    const multilangEnabled = flags.enableMultilanguageSupport !== false;
    if (!multilangEnabled) {
      return 'en'; // Default to English if feature is disabled
    }

    // First check persisted language
    try {
      // Use a synchronous-ish access pattern; in RN this is async, so we use a fallback
      const persisted = (global as any).__EDUDASH_LANG__ as string | undefined;
      if (persisted && persisted in SUPPORTED_LANGUAGES) {
        return persisted;
      }
    } catch {}

    // Get device locale
    const locales = getLocales();
    const deviceLanguage = locales[0]?.languageCode || 'en';
    
    // Check if we support this language
    if (deviceLanguage in SUPPORTED_LANGUAGES) {
      return deviceLanguage;
    }
    
    // Fallback to English
    return 'en';
  } catch {
    // Fallback to English on any error
    return 'en';
  }
}

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLanguage(),
    fallbackLng: 'en',
    
    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'whatsapp'],
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    // React-specific options
    react: {
      useSuspense: false, // Avoid suspense in React Native
    },
    
    // Debug in development
    debug: process.env.NODE_ENV === 'development',
    
    // Return objects for complex translations
    returnObjects: true,
    
    // Key separator for nested translations
    keySeparator: '.',
    
    // Plural handling
    pluralSeparator: '_',
    
    // Cache translations
    saveMissing: process.env.NODE_ENV === 'development', // Only save missing keys in development
    
    // Load path for additional resources (future enhancement)
    // backend: {
    //   loadPath: '/locales/{{lng}}/{{ns}}.json',
    // },
  });

/**
 * Get the current language
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  return i18n.language as SupportedLanguage || 'en';
};

/**
 * Get language information
 */
export const getLanguageInfo = (lang: SupportedLanguage) => {
  return SUPPORTED_LANGUAGES[lang];
};

/**
 * Check if language is RTL (Right-to-Left)
 */
export const isRTL = (lang?: SupportedLanguage): boolean => {
  const language = lang || getCurrentLanguage();
  return SUPPORTED_LANGUAGES[language]?.rtl || false;
};

/**
 * Change language dynamically
 */
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  try {
    await i18n.changeLanguage(language);

    // Persist language selection
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem('@edudash_language', language);
      if (__DEV__) console.log('[i18n] Persisted language:', language);
    } catch (e) {
      console.warn('[i18n] Failed to persist language', e);
    }
    
    // Track language change (if analytics available)
    try {
      const { track } = await import('@/lib/analytics');
      track('edudash.language.changed', {
        from: i18n.language,
        to: language,
        timestamp: new Date().toISOString(),
      });
    } catch {
      console.debug('[i18n] Analytics not available for language tracking');
    }
  } catch (error) {
    console.error('Failed to change language:', error);
  }
};

/**
 * Get available languages
 */
export const getAvailableLanguages = (): Array<{
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  rtl: boolean;
}> => {
  return Object.entries(SUPPORTED_LANGUAGES)
    .map(([code, info]) => ({
      code: code as SupportedLanguage,
      ...info,
    }))
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by English name
};

/**
 * Get coming soon languages
 */
export const getComingSoonLanguages = (): Array<{
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  comingSoon: true;
}> => {
  return Object.entries(COMING_SOON_LANGUAGES)
    .map(([code, info]) => ({
      code,
      ...info,
      comingSoon: true as const,
    }))
    .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by English name
};

/**
 * Translation key validation (development only)
 */
export const validateTranslationKey = (key: string, namespace = 'common'): boolean => {
  if (!__DEV__) return true;
  
  return i18n.exists(key, { ns: namespace });
};

/**
 * Format educational content based on language
 */
export const formatEducationalContent = (
  content: string,
  language?: SupportedLanguage
): string => {
  const lang = language || getCurrentLanguage();
  const langInfo = SUPPORTED_LANGUAGES[lang];
  
  // Apply language-specific formatting
  if (langInfo.rtl) {
    // RTL languages might need special handling
    return content;
  }
  
  return content;
};

/**
 * Get localized curriculum standards
 */
export const getCurriculumStandards = (
  subject: string,
  gradeLevel: number,
  language?: SupportedLanguage
): string[] => {
  const lang = language || getCurrentLanguage();
  
  // This would typically fetch from a database or API
  // For now, return a placeholder
  return [
    i18n.t('curriculum.standards.placeholder', {
      subject,
      grade: gradeLevel,
      lng: lang,
    }),
  ];
};

export default i18n;
