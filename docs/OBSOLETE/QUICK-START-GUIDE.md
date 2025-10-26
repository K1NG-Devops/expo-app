# Quick Start Guide: i18n, Performance & Streaming Transcription

**Read This First!** 🚀

This guide will help you start the comprehensive refactoring immediately.

---

## 📖 Documentation Overview

1. **Master Plan** (Complete blueprint): `docs/i18n-perf-transcription-master-plan.md`
2. **Todo List** (Step-by-step tasks): Check your todo list tool
3. **This Guide** (Quick start): You're reading it now!

---

## ⚡ Getting Started (15 minutes)

### Step 1: Create Feature Branch

```bash
cd /home/king/Desktop/edudashpro
git checkout -b feat/i18n-perf-transcription
```

### Step 2: Verify Environment

```bash
# Install dependencies
npm ci

# Run checks
npm run typecheck
npm run lint
```

**Expected**: Some lint warnings OK, no critical errors

### Step 3: Run Baseline Audit

```bash
# Generate i18n audit report
node scripts/i18n-audit.js > i18n-audit-report.txt 2>&1

# Check the first 50 lines
head -50 i18n-audit-report.txt
```

**Expected Output**:
```
🌍 EduDash Pro I18N Audit Starting...
Total hardcoded strings found: 9420
Files affected: 344
```

### Step 4: Install ESLint i18n Plugin

```bash
npm install --save-dev eslint-plugin-i18next
```

Add to your ESLint config (find `.eslintrc.js` or similar):
```javascript
{
  "plugins": ["i18next"],
  "rules": {
    "i18next/no-literal-string": ["warn", { 
      "markupOnly": true, 
      "ignoreAttribute": ["testID", "name", "type"] 
    }]
  }
}
```

---

## 🎯 Your First Task: Dashboard Double-Loading Fix (2 hours)

This is the **highest priority** quick win. Let's fix it now!

### Analysis Phase (30 minutes)

Create analysis file:
```bash
mkdir -p debug
touch debug/dashboard-loading-analysis.md
```

Open these files side-by-side:
1. `app/screens/principal-dashboard.tsx` (lines 22-47)
2. `components/dashboard/PrincipalDashboardWrapper.tsx`

**What to look for:**
- Count how many `useEffect` hooks run on mount
- Identify duplicate data fetches
- Note navigation decision logic

**Document in `debug/dashboard-loading-analysis.md`:**

```markdown
# Dashboard Loading Analysis

## Current Issues

### app/screens/principal-dashboard.tsx

**Problem 1**: Two separate useEffect hooks
- Lines 22-28: Auth guard
- Lines 30-47: Org check guard

**Impact**: Both run on every mount, causing double evaluation

**Data Fetches**: None directly, but triggers wrapper remount

### components/dashboard/PrincipalDashboardWrapper.tsx

**Problem 2**: [Add your findings here]

## Root Cause

Multiple useEffect hooks + navigation redirects = component remounting

## Solution

Consolidate into single effect with early returns
```

### Implementation Phase (90 minutes)

#### Fix 1: Consolidate Effects

**File**: `app/screens/principal-dashboard.tsx`

**Replace lines 22-47 with:**

```typescript
// Add ref at top of component
const didNavigateRef = useRef(false);

// Single consolidated effect
useEffect(() => {
  // Guard: Prevent double-invoke in StrictMode
  if (didNavigateRef.current) return;
  
  // Guard: Wait for loading
  if (isStillLoading) return;
  
  // Auth check
  if (!user) {
    didNavigateRef.current = true;
    try { router.replace('/(auth)/sign-in'); } catch (e) {
      try { router.replace('/sign-in'); } catch {}
    }
    return;
  }
  
  // Org check
  if (!orgId) {
    didNavigateRef.current = true;
    try { router.replace('/screens/principal-onboarding'); } catch (e) {
      console.debug('Redirect to onboarding failed', e);
    }
    return;
  }
}, [isStillLoading, user, orgId]);
```

**Don't forget the import:**
```typescript
import { useRef } from 'react'; // Add to existing React imports
```

#### Fix 2: Optimize Wrapper (if needed)

Review `components/dashboard/PrincipalDashboardWrapper.tsx` for duplicate queries.

### Validation (15 minutes)

```bash
# Type check
npm run typecheck

# Start app
npm run start
```

**Test**:
1. Open browser console
2. Navigate to principal dashboard
3. Count network requests in Network tab
4. **Expected**: Single request per data type (not double)

**Before/After**:
- Before: 2x requests, 2x renders
- After: 1x request, 1x render

---

## 🔥 Your Second Task: Create Translation Scripts (1 hour)

These scripts will be used throughout the project.

### Script 1: Export for Translation

**Create**: `scripts/export-for-translation.js`

```javascript
#!/usr/bin/env node
/**
 * Export English translation keys to CSV for translators
 */

const fs = require('fs');
const path = require('path');

const LANGUAGES = ['en', 'es', 'fr', 'pt', 'de', 'af', 'zu', 'st'];
const enFile = path.join(__dirname, '../locales/en/common.json');

function flattenKeys(obj, prefix = '') {
  const result = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result.push(...flattenKeys(value, fullKey));
    } else {
      result.push({ key: fullKey, en: value });
    }
  }
  return result;
}

try {
  const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
  const keys = flattenKeys(enData);

  // Generate CSV
  const header = ['Key', ...LANGUAGES].join(',');
  const rows = keys.map(({ key, en }) => {
    const cells = [key, en, ...Array(LANGUAGES.length - 1).fill('')];
    return cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
  });

  const csvPath = path.join(__dirname, '../translations-template.csv');
  fs.writeFileSync(csvPath, [header, ...rows].join('\n'));
  console.log(`✅ Exported ${keys.length} keys to translations-template.csv`);
} catch (error) {
  console.error('❌ Export failed:', error.message);
  process.exit(1);
}
```

### Script 2: Verify Translations

**Create**: `scripts/verify-translations.js`

```javascript
#!/usr/bin/env node
/**
 * Verify translation parity across all languages
 */

const fs = require('fs');
const path = require('path');

const LANGUAGES = ['en', 'es', 'fr', 'pt', 'de', 'af', 'zu', 'st'];
const localesDir = path.join(__dirname, '../locales');

function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenKeys(value, fullKey).forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

const results = {};
for (const lang of LANGUAGES) {
  const file = path.join(localesDir, lang, 'common.json');
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    results[lang] = flattenKeys(data);
  } else {
    console.warn(`⚠️  ${lang}/common.json not found`);
    results[lang] = new Set();
  }
}

const enKeys = results.en;
let hasErrors = false;

console.log('\n📊 Translation Parity Check\n');
console.log('='.repeat(50));

for (const lang of LANGUAGES.filter(l => l !== 'en')) {
  const missing = [...enKeys].filter(k => !results[lang].has(k));
  const extra = [...results[lang]].filter(k => !enKeys.has(k));
  
  if (missing.length > 0) {
    console.error(`\n❌ ${lang.toUpperCase()}: Missing ${missing.length} keys`);
    if (missing.length <= 10) {
      console.error(`   ${missing.join(', ')}`);
    } else {
      console.error(`   First 10: ${missing.slice(0, 10).join(', ')}`);
    }
    hasErrors = true;
  }
  
  if (extra.length > 0) {
    console.warn(`\n⚠️  ${lang.toUpperCase()}: ${extra.length} extra keys not in English`);
  }
  
  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅ ${lang.toUpperCase()}: Perfect match (${results[lang].size} keys)`);
  }
}

console.log('\n' + '='.repeat(50));
console.log(`\nEnglish keys: ${enKeys.size}`);
console.log(hasErrors ? '\n❌ Translation check FAILED\n' : '\n✅ Translation check PASSED\n');

process.exit(hasErrors ? 1 : 0);
```

### Make Scripts Executable

```bash
chmod +x scripts/export-for-translation.js
chmod +x scripts/verify-translations.js
```

### Add to package.json

Add to the `"scripts"` section:

```json
{
  "scripts": {
    "i18n:export": "node scripts/export-for-translation.js",
    "i18n:verify": "node scripts/verify-translations.js"
  }
}
```

### Test Scripts

```bash
# Export
npm run i18n:export

# Check output
ls -lh translations-template.csv

# Verify
npm run i18n:verify
```

---

## 📝 Progress Tracking

Create your progress file:

```bash
touch docs/i18n-progress.md
```

Add this template:

```markdown
# i18n Conversion Progress

**Last Updated**: $(date +%Y-%m-%d)

## Summary
- Files converted: 0/344
- Keys added: 0/~2000
- Languages complete: 1/8 (English only)

## Completed Today

### $(date +%Y-%m-%d)
- [ ] Phase 0: Preflight complete
- [ ] Dashboard double-loading fixed
- [ ] Translation scripts created
- [ ] First component converted: _______________

## Next Steps
1. Fix remaining dashboard wrappers (parent, teacher)
2. Start Phase 4.1: Auth screens conversion
3. Continue with systematic i18n conversion

## Notes
- Dashboard now loads once ✅
- Translation tooling in place ✅
- Ready for bulk conversion
```

---

## 🎬 Ready to Start Full Conversion?

### Phase 4.1: Your First File Conversion

Let's convert `app/(auth)/sign-in.tsx` as an example.

#### Step 1: Identify Hardcoded Strings

Open the file and find:
```typescript
"Please enter email and password"
"Sign In Failed"
"Invalid or expired authentication token"
// ... etc
```

#### Step 2: Add Keys to Translation File

Edit `locales/en/common.json`, add under `"auth"`:

```json
{
  "auth": {
    // ... existing keys ...
    "enter_email_password": "Please enter email and password",
    "sign_in": {
      "failed": "Sign In Failed"
    },
    "invalid_token": "Invalid or expired authentication token"
  }
}
```

#### Step 3: Update Component

```typescript
// Add at top
import { useTranslation } from 'react-i18next';

// Inside component
const { t } = useTranslation();

// Replace strings
// Before: Alert.alert("Error", "Please enter email and password");
// After:
Alert.alert(t('common.error'), t('auth.enter_email_password'));
```

#### Step 4: Test

```bash
npm run typecheck
npm run start
```

Navigate to sign-in screen and verify text displays correctly.

#### Step 5: Document

Update `docs/i18n-progress.md`:

```markdown
## Completed Files

### Phase 4.1: Auth (1/31)
- [x] app/(auth)/sign-in.tsx - 15 keys added
```

---

## 🚨 Common Issues & Solutions

### Issue: "Missing translation key"

**Solution**: Check spelling in both code and JSON file. Keys are case-sensitive.

### Issue: "Module not found: i18next"

**Solution**: 
```bash
npm install i18next react-i18next
```

### Issue: Dashboard still loads twice in dev

**Solution**: This is StrictMode double-invoke in development. Check production build behavior.

### Issue: Translation doesn't update

**Solution**: 
1. Clear cache: `npm run start:clear`
2. Verify JSON is valid (use JSONLint)
3. Check browser console for errors

---

## ✅ Daily Checklist

Before starting work:
- [ ] Pull latest changes: `git pull origin feat/i18n-perf-transcription`
- [ ] Check todos: Review your todo list
- [ ] Run checks: `npm run typecheck && npm run lint`

After completing work:
- [ ] Test changes: Manual testing + automated checks
- [ ] Update progress: `docs/i18n-progress.md`
- [ ] Commit: `git commit -m "feat(i18n): [description]"`
- [ ] Push: `git push origin feat/i18n-perf-transcription`

---

## 📊 Track Your Progress

Use this command to see how many strings remain:

```bash
node scripts/i18n-audit.js | grep "Total hardcoded strings"
```

**Goal**: Reduce from 9,420 to 0!

---

## 🎯 Next Milestones

- **Week 1**: Complete Phase 0-3 (setup, fixes, infrastructure)
- **Week 2**: Phase 4 bulk i18n conversion (200+ files)
- **Week 3**: Phase 5-6 (translations, performance)
- **Week 4**: Phase 7-9 (validation, deployment)

---

## 💡 Pro Tips

1. **Work in batches**: Convert 5-10 files at a time, then test
2. **Use find-replace**: Speed up conversion with regex
3. **Reuse keys**: Check existing keys before creating new ones
4. **Test as you go**: Don't wait until the end
5. **Document blockers**: Note any issues in progress file

---

## 🆘 Need Help?

- **Master Plan**: `docs/i18n-perf-transcription-master-plan.md`
- **Governance**: `docs/governance/WARP.md`
- **i18next Docs**: https://www.i18next.com/
- **React i18next**: https://react.i18next.com/

---

**Ready? Let's transform EduDash Pro! 🚀**

Start with: `git checkout -b feat/i18n-perf-transcription`
