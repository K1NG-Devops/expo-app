# Contributing Guidelines

Thank you for contributing to EduDash Pro! To keep the UI consistent and fully localizable, please follow these guidelines.

1) Internationalization (i18n) is mandatory
- Never hardcode user-facing text in components, hooks, or services.
- Always use the i18n system via react-i18next:

```tsx path=null start=null
import { useTranslation } from 'react-i18next';
const { t } = useTranslation('common');

<Text>{t('dashboard.welcome', { name })}</Text>
```

- If a string is missing, add it to both locales/en/common.json and locales/af/common.json in the same structure.
- Prefer top-level sections for features (e.g., petty_cash, transactions, receipt, transaction, petty_cash_reconcile, announcement, category) so keys are consistent across languages.

2) Adding new translations
- Keep keys descriptive (e.g., petty_cash.current_balance, transactions.filter_title).
- Reuse existing common keys (common.ok, common.error, common.cancel) where possible.
- For interpolations, always pass variables via options: t('key', { count, total }).

3) Code review checklist (i18n)
- [ ] No user-visible English literals in JSX or alerts.
- [ ] All new keys exist in both en and af and are loaded under the correct section.
- [ ] Added sensible defaultValue in t() calls when rapidly iterating.

4) Optional linting rule (recommended)
To enforce “no literal strings in JSX”, consider using eslint-plugin-i18next (or similar) and enabling the no-literal-string rule. If you want us to set this up, run:

```bash path=null start=null
npm i -D eslint-plugin-i18next
```

Then add to .eslintrc:

```json path=null start=null
{
  "plugins": ["i18next"],
  "rules": {
    "i18next/no-literal-string": ["warn", { "markupOnly": true, "ignoreAttribute": ["testID", "accessibilityLabel", "accessibilityRole"] }]
  }
}
```

Note: This is optional and can be tuned per team preference.

5) Navigation
- Use navigateBack(fallbackRoute?) from lib/navigation for back buttons to avoid dead back actions when a screen is opened directly.

6) PR notes
- Summarize any new i18n keys added and why.
- Mention any screens updated to remove hardcoded strings.
