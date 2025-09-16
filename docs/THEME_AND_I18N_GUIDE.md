# Theme and Internationalization (i18n) Guide

This guide explains how to implement and use the comprehensive theme and internationalization system in EduDash Pro.

## Table of Contents
- [Theme System](#theme-system)
- [Internationalization (i18n)](#internationalization-i18n)
- [Implementation Examples](#implementation-examples)
- [Best Practices](#best-practices)

## Theme System

Note:
- Theme mode is persisted under @edudash_theme_mode
- Language selection is persisted under @edudash_language and hydrated at app init to prevent flicker
- Use useTheme() for colors. Do not hardcode color values; use theme tokens.
- Use changeLanguage(code) to switch languages, and getCurrentLanguage() for current code.

### Overview
The app supports light and dark themes with automatic system theme detection. All UI components automatically adapt to the selected theme.

### Theme Context
The theme is managed by `ThemeContext` which provides:
- Current theme colors
- Theme mode (light/dark/system)
- Functions to change theme
- Persistent theme preferences

### Using Theme in Components

#### Basic Usage
```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.background }}>
      <Text style={{ color: theme.text }}>Hello World</Text>
    </View>
  );
}
```

#### Using Themed Styles Hook
```tsx
import { useThemedStyles } from '@/hooks/useThemedStyles';

function MyComponent() {
  const styles = useThemedStyles((theme, isDark) => ({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    title: {
      fontSize: 24,
      color: theme.text,
    },
  }));
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello World</Text>
    </View>
  );
}
```

### Theme Components

#### ThemedButton
```tsx
import { ThemedButton } from '@/components/ui/ThemedButton';

<ThemedButton
  title="Click Me"
  variant="primary" // primary | secondary | success | danger | warning | ghost
  size="medium"     // small | medium | large
  onPress={() => {}}
/>
```

#### ThemedModal
```tsx
import { ThemedModal } from '@/components/ui/ThemedModal';

<ThemedModal
  visible={isVisible}
  onClose={() => setIsVisible(false)}
  title="Modal Title"
  actions={[
    { text: 'Cancel', variant: 'ghost', onPress: () => {} },
    { text: 'Confirm', variant: 'primary', onPress: () => {} },
  ]}
>
  <Text>Modal content</Text>
</ThemedModal>
```

### Theme Colors Reference
- **Primary Colors**: primary, primaryLight, primaryDark, onPrimary
- **Secondary Colors**: secondary, secondaryLight, secondaryDark, onSecondary
- **Background Colors**: background, surface, surfaceVariant, elevated
- **Text Colors**: text, textSecondary, textTertiary, textDisabled
- **Status Colors**: success, warning, error, info (with light/dark variants)
- **UI Elements**: border, divider, shadow, overlay
- **Special**: cardBackground, modalBackground, headerBackground, etc.

## Internationalization (i18n)

### Overview
The app supports multiple languages with seamless switching and persistent language preferences.

### Supported Languages
- English (en)
- Spanish (es)
- French (fr)
- Portuguese (pt)
- German (de)
- Afrikaans (af)
- Zulu (zu)
- Sepedi (st)

### Using Translations

#### Basic Usage
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <View>
      <Text>{t('navigation.dashboard')}</Text>
      <Text>{t('auth.signIn')}</Text>
    </View>
  );
}
```

#### With Interpolation
```tsx
// Translation: "Welcome back, {{name}}!"
<Text>{t('dashboard.welcome', { name: user.name })}</Text>
```

### Changing Language
```tsx
import { changeLanguage } from '@/lib/i18n';

// Change to Spanish
await changeLanguage('es');
```

### Language Selector Component
```tsx
import { LanguageSelector } from '@/components/ui/LanguageSelector';

<LanguageSelector
  onLanguageSelect={() => {
    // Optional callback after language change
  }}
  showComingSoon={true} // Show languages that are coming soon
/>
```

## Implementation Examples

### Complete Screen with Theme and i18n
```tsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { RoleBasedHeader } from '@/components/RoleBasedHeader';
import { ThemedButton } from '@/components/ui/ThemedButton';

export default function MyScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  
  const styles = useThemedStyles((theme, isDark) => ({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 16,
    },
    card: {
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    description: {
      fontSize: 16,
      color: theme.textSecondary,
    },
  }));
  
  return (
    <View style={styles.container}>
      <RoleBasedHeader title={t('navigation.dashboard')} />
      
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('dashboard.welcome', { name: 'User' })}</Text>
          <Text style={styles.description}>{t('dashboard.quickActions')}</Text>
          
          <ThemedButton
            title={t('navigation.save')}
            variant="primary"
            onPress={() => {}}
            style={{ marginTop: 16 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}
```

### Theme and Language Settings Screen
```tsx
import { ThemeLanguageSettings } from '@/components/settings/ThemeLanguageSettings';

export default function SettingsScreen() {
  return <ThemeLanguageSettings />;
}
```

## Best Practices

### Theme Implementation
1. **Always use theme colors** - Never hardcode colors
2. **Use ThemedComponents** - Prefer themed components over custom implementations
3. **Memoize styles** - Use `useThemedStyles` hook for performance
4. **Test both themes** - Always test UI in both light and dark modes
5. **Consider contrast** - Ensure text is readable in both themes

### i18n Implementation
1. **Use translation keys** - Never hardcode text strings
2. **Organize translations** - Group related translations together
3. **Provide context** - Use descriptive translation keys
4. **Handle plurals** - Use i18n plural support for countable items
5. **Test all languages** - Ensure UI works with different text lengths

### Code Examples

#### Good ✅
```tsx
// Using theme colors
<View style={{ backgroundColor: theme.background }}>
  <Text style={{ color: theme.text }}>{t('auth.signIn')}</Text>
</View>
```

#### Bad ❌
```tsx
// Hardcoded colors and text
<View style={{ backgroundColor: '#ffffff' }}>
  <Text style={{ color: '#000000' }}>Sign In</Text>
</View>
```

### Adding New Translations
1. Add the key to all language files in `/locales/[lang]/common.json`
2. Use the key in your component with `t('your.new.key')`
3. Test in all supported languages

### Creating Theme-Aware Components
```tsx
import { useTheme } from '@/contexts/ThemeContext';

export function MyThemedComponent({ children }) {
  const { theme } = useTheme();
  
  return (
    <View style={{
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }}>
      {children}
    </View>
  );
}
```

## Testing

### Testing Theme Changes
1. Toggle between light and dark modes
2. Check system theme detection
3. Verify theme persistence after app restart
4. Test all UI components in both themes

### Testing Language Changes
1. Switch between all supported languages
2. Verify all text changes correctly
3. Check for text overflow in different languages
4. Test language persistence after app restart

## Troubleshooting

### Common Issues
1. **Colors not updating**: Ensure you're using `theme` from `useTheme()` hook
2. **Translations not showing**: Check translation keys exist in all language files
3. **Theme not persisting**: Verify AsyncStorage is working correctly
4. **Language not changing**: Ensure you're using the correct language code

### Debug Mode
Enable debug mode for i18n:
```tsx
// In lib/i18n.ts
debug: __DEV__, // Shows missing translation warnings
```

## Future Enhancements
- Additional languages (coming soon)
- Theme customization options
- RTL language support
- Dynamic theme creation
