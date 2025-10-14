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

// Only load English eagerly to reduce bundle size
// Other languages are lazy-loaded on demand
const en = require('../locales/en/common.json');
const enWhatsApp = (() => {
  try { return require('../locales/en/whatsapp.json'); } catch { return {}; }
})();

// Mark when i18n has been optimized
const OPTIMIZED_I18N = true;

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

// Eager resources (English only)
const baseResources: Record<string, any> = {
  en: { common: en, whatsapp: enWhatsApp },
};

// Dynamic loaders for other languages - ensures Metro bundles these files
const LANGUAGE_LOADERS: Record<SupportedLanguage, () => Promise<any>> = {
  en: async () => ({ common: (await import('../locales/en/common.json')).default || en }),
  es: async () => ({ common: (await import('../locales/es/common.json')).default }),
  fr: async () => ({ common: (await import('../locales/fr/common.json')).default }),
  pt: async () => ({ common: (await import('../locales/pt/common.json')).default }),
  de: async () => ({ common: (await import('../locales/de/common.json')).default }),
  af: async () => ({ common: (await import('../locales/af/common.json')).default }),
  zu: async () => ({ common: (await import('../locales/zu/common.json')).default }),
  st: async () => ({ common: (await import('../locales/st/common.json')).default }),
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

// Initialize i18n with English only
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: baseResources,
      lng: detectLanguage(),
      fallbackLng: 'en',
      defaultNS: 'common',
      ns: ['common', 'whatsapp'],
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      debug: process.env.NODE_ENV === 'development',
      returnObjects: true,
      keySeparator: '.',
      pluralSeparator: '_',
      saveMissing: process.env.NODE_ENV === 'development',
    });
}

/**
 * Lazy load language resources if not loaded yet
 */
export const lazyLoadLanguage = async (language: SupportedLanguage) => {
  if (!SUPPORTED_LANGUAGES[language]) return;
  if ((i18n.options?.resources as any)?.[language]) return; // already added
  try {
    const bundle = await LANGUAGE_LOADERS[language]();
    // Add as resource bundle
    Object.keys(bundle).forEach((ns) => {
      i18n.addResourceBundle(language, ns, (bundle as any)[ns], true, true);
    });
  } catch (e) {
    console.warn(`[i18n] Failed to lazy-load language: ${language}`, e);
  }
};

/**
 * Get the current language
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language as SupportedLanguage) || 'en';
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
 * Change language dynamically (lazy loads resources first)
 */
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  try {
    await lazyLoadLanguage(language);
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

export default i18n;
