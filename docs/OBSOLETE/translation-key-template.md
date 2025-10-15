# Translation Key Template & Guidelines

## Overview

This document provides comprehensive guidelines for creating, organizing, and maintaining translation keys in EduDash Pro. Following these conventions ensures consistency, maintainability, and ease of translation across all supported languages.

## Supported Languages

EduDash Pro currently supports 8 languages:

- **en** - English (Primary)
- **es** - Spanish (Español)
- **fr** - French (Français)
- **pt** - Portuguese (Português)
- **de** - German (Deutsch)
- **af** - Afrikaans
- **zu** - Zulu (IsiZulu)
- **st** - Sepedi

**Coming Soon:** Xhosa, Tswana, Swati, Ndebele, Venda, Tsonga

## Translation File Structure

All translations are stored in `locales/{language}/common.json` following this structure:

```
locales/
├── en/
│   ├── common.json      # Main translation file
│   └── whatsapp.json    # WhatsApp-specific (if needed)
├── es/
│   └── common.json
├── fr/
│   └── common.json
...
```

## Namespace Organization

Translation keys are organized into **namespaces** for better structure and maintainability. Use the following top-level namespaces:

### Core Namespaces

- `app` - Application metadata (name, version, tagline)
- `common` - Common reusable terms
- `navigation` - Navigation items and buttons
- `actions` - Action buttons (save, cancel, confirm, etc.)

### Screen/Feature Namespaces

- `auth` - Authentication flows (sign in, sign up, password reset)
- `dashboard` - Dashboard screens (parent, teacher, principal, etc.)
- `parent` - Parent-specific screens
- `teacher` - Teacher-specific screens
- `principal` - Principal-specific screens
- `admin` - Admin/superadmin features
- `students` - Student management
- `classes` - Class management
- `lessons` - Lesson management
- `homework` - Homework/assignments
- `ai` - AI features (homework helper, lesson generator, quota)
- `settings` - Settings and preferences
- `petty_cash` - Petty cash management
- `finance_dashboard` - Financial dashboard
- `transactions` - Financial transactions

### Component Namespaces

- `screens` - Screen-level UI state (loading, errors)
- `components` - Reusable component labels (buttons, cards, lists)
- `modals` - Modal dialogs
- `forms` - Form-related messages
- `validation` - Field validation messages
- `loading` - Loading state messages
- `empty` - Empty state messages

### System Namespaces

- `errors` - Error messages
- `success` - Success messages
- `notifications` - Notification messages
- `time` - Time/date formatting
- `trends` - Trend indicators (up, down, stable)
- `metrics` - Metrics and statistics

## Naming Conventions

### 1. Use lowercase with underscores

✅ **Good:**
```json
{
  "auth": {
    "sign_in": "Sign In",
    "forgot_password": "Forgot Password"
  }
}
```

❌ **Bad:**
```json
{
  "auth": {
    "signIn": "Sign In",          // camelCase
    "Forgot-Password": "Forgot..."  // kebab-case, mixed case
  }
}
```

### 2. Organize hierarchically with dot notation

✅ **Good:**
```json
{
  "dashboard": {
    "announcement": {
      "create_announcement": "Create Announcement",
      "send": "Send",
      "preview": "Preview"
    }
  }
}
```

Usage: `t('dashboard.announcement.create_announcement')`

### 3. Be specific and descriptive

✅ **Good:**
```json
{
  "auth": {
    "biometric": {
      "authenticating_face": "Authenticating with Face ID",
      "authenticating_fingerprint": "Authenticating with Fingerprint"
    }
  }
}
```

❌ **Bad:**
```json
{
  "auth": {
    "biometric": {
      "auth1": "Authenticating...",
      "auth2": "Authenticating..."
    }
  }
}
```

### 4. Group related keys together

✅ **Good:**
```json
{
  "errors": {
    "network": "Network error. Please check your connection.",
    "unauthorized": "You don't have permission to access this resource.",
    "notFound": "The requested resource was not found."
  }
}
```

## Variable Interpolation

Use `{{variableName}}` for dynamic content that needs to be substituted at runtime.

### Simple Variables

```json
{
  "dashboard": {
    "welcome": "Welcome back, {{name}}!",
    "managing_school": "Managing {{schoolName}}"
  }
}
```

**Usage:**
```typescript
const { t } = useTranslation();
t('dashboard.welcome', { name: user.firstName });
// Output: "Welcome back, John!"
```

### Pluralization

Use `_one` and `_other` suffixes for pluralization:

```json
{
  "dashboard": {
    "managingChildren": "Managing {{count}} child",
    "managingChildrenPlural": "Managing {{count}} children"
  }
}
```

**Usage:**
```typescript
const count = children.length;
const key = count === 1 ? 'dashboard.managingChildren' : 'dashboard.managingChildrenPlural';
t(key, { count });
```

### Complex Interpolation

```json
{
  "validation": {
    "min_length": "{{field}} must be at least {{min}} characters",
    "max_value": "Value must be no more than {{max}}"
  }
}
```

**Usage:**
```typescript
t('validation.min_length', { field: 'Password', min: 12 });
// Output: "Password must be at least 12 characters"
```

## Translation Examples by Category

### 1. Buttons and Actions

```json
{
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "submit": "Submit",
    "continue": "Continue",
    "back": "Back",
    "next": "Next",
    "confirm": "Confirm",
    "done": "Done"
  }
}
```

### 2. Page Titles and Headers

```json
{
  "dashboard": {
    "parentDashboard": "Parent Dashboard",
    "todays_overview": "📊 Today's Overview",
    "quick_actions_section": "⚡ Quick Actions"
  }
}
```

**Note:** Emojis are acceptable in translation values for visual enhancement.

### 3. Error Messages

```json
{
  "errors": {
    "generic": "Something went wrong. Please try again.",
    "network": "Network error. Please check your connection.",
    "unauthorized": "You don't have permission to access this resource.",
    "validation": "Please check your input and try again.",
    "security": {
      "authentication_required": "Authentication required",
      "invalid_token": "Invalid or expired authentication token"
    }
  }
}
```

### 4. Success Messages

```json
{
  "success": {
    "saved": "Changes saved successfully",
    "deleted": "Item deleted successfully",
    "created": "Item created successfully",
    "updated": "Item updated successfully"
  }
}
```

### 5. Form Fields and Placeholders

```json
{
  "auth": {
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "firstName": "First Name",
    "lastName": "Last Name"
  },
  "forms": {
    "required_field": "This field is required",
    "invalid_format": "Invalid format",
    "character_count": "{{current}}/{{max}} characters"
  }
}
```

**Usage in placeholders:**
```typescript
<TextInput
  placeholder={t('auth.email')}
  accessibilityLabel={t('auth.email')}
/>
```

### 6. Loading States

```json
{
  "loading": {
    "default": "Loading...",
    "please_wait": "Please wait...",
    "fetching_data": "Fetching data...",
    "saving": "Saving...",
    "uploading": "Uploading...",
    "processing": "Processing..."
  }
}
```

### 7. Empty States

```json
{
  "empty": {
    "no_classes_title": "No Classes Yet",
    "no_classes_description": "You haven't created any classes yet. Start by creating your first class to manage students and lessons.",
    "create_first_class": "Create First Class"
  }
}
```

### 8. Modal Dialogs

```json
{
  "modals": {
    "confirm": {
      "title": "Confirm Action",
      "message": "Are you sure you want to proceed?",
      "yes": "Yes",
      "no": "No"
    },
    "delete": {
      "title": "Confirm Deletion",
      "message": "Are you sure you want to delete this item? This action cannot be undone."
    }
  }
}
```

### 9. Validation Messages

```json
{
  "validation": {
    "required": "{{field}} is required",
    "email_invalid": "Please enter a valid email address",
    "phone_invalid": "Please enter a valid phone number",
    "password_weak": "Password is too weak",
    "password_mismatch": "Passwords do not match"
  }
}
```

### 10. Dynamic Content with Variables

```json
{
  "dashboard": {
    "announcement": {
      "recipients_count": "{{count}} recipients",
      "characters_count": "{{count}}/1000 characters"
    },
    "school_stats_content": "Current Status:\n\n👥 Students Present: {{studentsPresent}}/{{totalStudents}} ({{studentsPercentage}}%)\n👨‍🏫 Teachers Present: {{teachersPresent}}/{{totalTeachers}} ({{teachersPercentage}}%)"
  }
}
```

## Best Practices

### 1. Keep Keys DRY (Don't Repeat Yourself)

Reuse common keys across namespaces:

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "cancel": "Cancel"
  }
}
```

Use namespace-specific keys only when needed:
```json
{
  "auth": {
    "loading": "Signing in..."  // More specific than common.loading
  }
}
```

### 2. Avoid String Concatenation

❌ **Bad:**
```typescript
// Don't concatenate translated strings
const message = t('common.hello') + ' ' + userName + '!';
```

✅ **Good:**
```typescript
// Use interpolation
const message = t('common.hello_user', { name: userName });
```

### 3. Handle Pluralization Properly

❌ **Bad:**
```typescript
const text = `${count} student${count !== 1 ? 's' : ''}`;
```

✅ **Good:**
```json
{
  "metrics": {
    "my_students": "My Students",
    "student_count_one": "{{count}} student",
    "student_count_other": "{{count}} students"
  }
}
```

### 4. Context-Aware Keys

Provide context when the same English word has different meanings:

```json
{
  "actions": {
    "close": "Close"  // verb (close a modal)
  },
  "status": {
    "close": "Close"  // adjective (close to deadline)
  }
}
```

### 5. Preserve Brand Terms

Keep brand names, product names, and technical terms consistent:

```json
{
  "app": {
    "name": "EduDash"  // Never translate
  },
  "ai": {
    "dash_ai": {
      "assistant_name": "Dash"  // Never translate
    }
  }
}
```

### 6. Use Consistent Terminology

Maintain a glossary of key terms:

| English | Context | Notes |
|---------|---------|-------|
| Dashboard | UI screen | Main screen for role |
| Preschool | Institution | Primary education level |
| AI | Technology | Artificial Intelligence (never translate) |
| WhatsApp | Brand | Communication platform (never translate) |
| Teacher | Role | Instructor/educator |
| Principal | Role | School head/administrator |

## Code Integration

### Basic Usage

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <View>
      <Text>{t('dashboard.welcome', { name: 'John' })}</Text>
      <Button title={t('actions.save')} />
    </View>
  );
}
```

### With Memoization (Performance Optimization)

```typescript
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

function MyComponent() {
  const { t } = useTranslation();
  
  // Memoize static labels to avoid re-translation on every render
  const labels = useMemo(() => ({
    title: t('dashboard.title'),
    save: t('actions.save'),
    cancel: t('actions.cancel'),
  }), [t]);
  
  return (
    <View>
      <Text>{labels.title}</Text>
      <Button title={labels.save} />
      <Button title={labels.cancel} />
    </View>
  );
}
```

### With Namespace

```typescript
import { useTranslation } from 'react-i18next';

function AuthScreen() {
  const { t } = useTranslation('common', { keyPrefix: 'auth' });
  
  // Now you can use short keys
  return <Text>{t('sign_in')}</Text>;
  // Instead of t('auth.sign_in')
}
```

## Adding New Translation Keys

### Step 1: Identify the Appropriate Namespace

Determine which namespace your key belongs to based on the categorization above.

### Step 2: Add to English (en) First

Always add new keys to `locales/en/common.json` first:

```json
{
  "dashboard": {
    "new_feature_title": "New Feature",
    "new_feature_description": "This is a new feature that {{action}}"
  }
}
```

### Step 3: Use the Key in Code

```typescript
const { t } = useTranslation();
<Text>{t('dashboard.new_feature_title')}</Text>
```

### Step 4: Add to Other Languages

Copy the English structure to all other language files and translate:

**locales/es/common.json:**
```json
{
  "dashboard": {
    "new_feature_title": "Nueva Función",
    "new_feature_description": "Esta es una nueva función que {{action}}"
  }
}
```

**locales/fr/common.json:**
```json
{
  "dashboard": {
    "new_feature_title": "Nouvelle Fonctionnalité",
    "new_feature_description": "Ceci est une nouvelle fonctionnalité qui {{action}}"
  }
}
```

### Step 5: Verify Translation Parity

Run the verification script to ensure all languages have the same keys:

```bash
node scripts/verify-translations.js
```

## Tooling and Scripts

### Export for Translation

Generate a CSV file for translators:

```bash
node scripts/export-for-translation.js
```

This creates `translations-template.csv` with columns for all supported languages.

### Verify Translation Parity

Check that all languages have matching keys:

```bash
node scripts/verify-translations.js
```

Reports missing keys and placeholder mismatches.

### i18n Audit

Find hardcoded strings in the codebase:

```bash
node scripts/i18n-audit.js
```

## Accessibility Considerations

### 1. Screen Reader Support

Always provide accessible labels for UI elements:

```typescript
<Pressable
  accessibilityLabel={t('actions.save')}
  accessibilityHint={t('actions.save_hint')}
  accessibilityRole="button"
>
  <Text>{t('actions.save')}</Text>
</Pressable>
```

### 2. Dynamic Content Announcements

Use `accessibilityLiveRegion` for dynamic updates:

```typescript
<View accessibilityLiveRegion="polite">
  <Text>{t('loading.fetching_data')}</Text>
</View>
```

### 3. Cultural Sensitivity

Be mindful of cultural differences when translating:

- Date formats (e.g., DD/MM/YYYY vs MM/DD/YYYY)
- Number formats (e.g., 1,000.00 vs 1.000,00)
- Currency symbols (R for ZAR, $ for USD)
- Colors and symbols (meanings vary across cultures)

## Translation Memory and Consistency

### Translation Glossary

Maintain consistency across translations using a shared glossary:

| Term | English | Afrikaans | Zulu | Notes |
|------|---------|-----------|------|-------|
| Dashboard | Dashboard | Dashboard | Ibhodi | Keep English for UI consistency |
| Student | Student | Student | Umfundi | Educational context |
| Teacher | Teacher | Onderwyser | Uthisha | Role designation |

### Context Notes for Translators

Add comments in the translation template when context is needed:

```csv
Key,English,Context,Spanish,French
auth.biometric.prompt,"Sign in to EduDash Pro","Biometric authentication prompt","Iniciar sesión en EduDash Pro","Se connecter à EduDash Pro"
```

## Testing Translations

### 1. Manual Testing

Switch between languages in the app settings and verify:

- All text is translated correctly
- UI layout accommodates longer/shorter text
- Variables are interpolated correctly
- Numbers and dates use locale-specific formats

### 2. Automated Testing

```typescript
describe('i18n', () => {
  it('should have all required keys', () => {
    const keys = ['auth.sign_in', 'auth.sign_up'];
    keys.forEach(key => {
      expect(i18n.exists(key)).toBe(true);
    });
  });
});
```

## Common Pitfalls to Avoid

### 1. ❌ Hardcoding Text in JSX

```typescript
// Bad
<Text>Sign In</Text>

// Good
<Text>{t('auth.sign_in')}</Text>
```

### 2. ❌ Using String Concatenation

```typescript
// Bad
const message = t('hello') + ' ' + userName;

// Good
const message = t('greeting', { name: userName });
```

### 3. ❌ Not Handling Pluralization

```typescript
// Bad
<Text>{count} students</Text>

// Good
<Text>{t('student_count', { count })}</Text>
```

### 4. ❌ Translating Brand Names

```json
// Bad
{
  "app": {
    "name": "EduDash"  // Should never be translated
  }
}

// Good - keep brand names consistent across all languages
```

### 5. ❌ Missing Variable Placeholders in Translation

```json
// Bad - missing {{name}} placeholder in Spanish
{
  "en": {
    "welcome": "Welcome, {{name}}!"
  },
  "es": {
    "welcome": "¡Bienvenido!"  // Missing {{name}}
  }
}
```

## Performance Optimization

### 1. Memoize Static Translations

```typescript
const labels = useMemo(() => ({
  title: t('screen.title'),
  subtitle: t('screen.subtitle'),
}), [t]);
```

### 2. Lazy Load Languages

Only load language resources when needed:

```typescript
import { lazyLoadLanguage } from '@/lib/i18n';

await lazyLoadLanguage('es');
```

### 3. Use Key Prefixes for Namespace Scoping

```typescript
const { t } = useTranslation('common', { keyPrefix: 'dashboard' });
// Now t('welcome') translates to 'dashboard.welcome'
```

## Support and Contribution

### Getting Help

- Review this guide for common patterns
- Check existing translations for consistency
- Run verification scripts before submitting

### Contributing Translations

1. Add keys to `locales/en/common.json`
2. Use the key in code with `t('namespace.key')`
3. Run `npm run typecheck` and `npm run lint`
4. Submit keys for translation to other languages
5. Run `node scripts/verify-translations.js`
6. Create a pull request

### Translation Review Process

1. Developer adds English keys and uses them in code
2. Keys are exported via `export-for-translation.js`
3. Translators provide translations in CSV
4. Translations are imported back to JSON files
5. Verification script ensures parity
6. QA tests all languages manually

## Conclusion

Following these guidelines ensures:

- **Consistency** across the entire application
- **Maintainability** for future updates
- **Quality** translations that respect cultural context
- **Performance** through proper memoization
- **Accessibility** for all users

For questions or suggestions, please reach out to the development team or consult the main project documentation.

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0.0  
**Maintained by:** EduDash Pro Development Team
