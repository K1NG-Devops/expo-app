# Translation Workflow Guide

## Overview

This guide describes the complete workflow for translating EduDash Pro into all supported languages.

## Supported Languages

| Code | Language | Native Name | Priority | Status |
|------|----------|-------------|----------|--------|
| en | English | English | Master | 100% (1,395 keys) ✅ |
| af | Afrikaans | Afrikaans | High | 42% (583/1,395) |
| zu | Zulu | IsiZulu | High | 21% (298/1,395) |
| st | Sepedi | Sepedi | High | 19% (260/1,395) |
| es | Spanish | Español | Medium | 18% (256/1,395) |
| fr | French | Français | Medium | 11% (157/1,395) |
| pt | Portuguese | Português | Medium | 10% (137/1,395) |
| de | German | Deutsch | Medium | 10% (137/1,395) |

**Priority Rationale:**
- **High**: South African languages (primary target market)
- **Medium**: International languages for broader reach

## Translation Process

### Step 1: Export Translation Template

Generate the CSV file with all English keys:

```bash
npm run i18n:export
```

**Output**: `translations-template.csv` (124KB, 1,395+ rows)

**CSV Structure:**
- Column A: Key (e.g., `auth.sign_in`)
- Column B: Context (e.g., "Authentication")
- Column C: Variables (e.g., `name, count`)
- Column D: English text
- Columns E-K: Empty columns for each language (ES, FR, PT, DE, AF, ZU, ST)

### Step 2: Distribute to Translators

#### Option A: Professional Translation Services
- Export CSV file
- Send to translation agency
- Provide context from `docs/translation-key-template.md`
- Specify: Preserve `{{variable}}` placeholders exactly

**Recommended Services:**
- GenGo (general translations)
- OneHourTranslation (fast turnaround)
- Smartling (enterprise-grade)
- Local South African agencies (for af, zu, st)

#### Option B: AI-Assisted Translation (Draft Only)
Use AI for initial draft, then have native speakers review:

```bash
# Using Claude/GPT for batch translation
# Note: Always requires human review for accuracy
```

#### Option C: Community Translation
- Upload CSV to Google Sheets
- Share with native speakers
- Track progress per language
- Review and merge contributions

### Step 3: Translation Guidelines for Translators

**Critical Rules:**

1. **Preserve Variable Placeholders**
   - Keep `{{name}}`, `{{count}}`, etc. exactly as-is
   - Don't translate variable names
   - Example: `"Welcome, {{name}}!"` → `"Bienvenido, {{name}}!"`

2. **Preserve Brand Names**
   - **EduDash** - Never translate
   - **Dash** (AI assistant) - Never translate
   - **WhatsApp** - Never translate
   - **AI** - Never translate

3. **Preserve Emojis**
   - Keep emojis in the same position
   - Example: `"📊 Dashboard"` → `"📊 Tableau de bord"`

4. **Context Matters**
   - Review "Context" column for usage
   - Same English word may need different translations
   - Example: "Close" (verb) vs "Close" (adjective)

5. **Maintain Tone**
   - Educational setting: Professional but friendly
   - Parent communications: Warm and supportive
   - Teacher tools: Clear and efficient
   - Admin features: Professional and precise

6. **Technical Terms**
   - Dashboard → Often kept in English or adapted
   - Login/Sign In → Local convention
   - Settings → Local convention

### Step 4: Import Translations

Once translations are complete, update the JSON files:

#### Manual Method (Small Updates)

Edit language files directly:
```bash
# Example: Update Spanish translations
nano locales/es/common.json
```

#### Bulk Import Method (Recommended)

Create an import script (optional):
```bash
node scripts/import-from-csv.js translations-completed.csv
```

Or manually copy-paste from CSV to JSON maintaining structure.

### Step 5: Validation

Run verification to check for issues:

```bash
npm run i18n:verify
```

**This checks:**
- ✅ All keys present in all languages
- ✅ No missing keys
- ✅ Variable placeholders match ({{name}} in both EN and translation)
- ✅ No extra keys not in English

**Example Output:**
```
✅ ES: Perfect match (1,395 keys)
✅ FR: Perfect match (1,395 keys)
❌ AF: Missing 812 keys
❌ AF: 2 placeholder mismatches
   dashboard.welcome: en={{name}} vs af={{nome}}
```

### Step 6: Quality Assurance

#### Automated QA
```bash
# Run all checks
npm run i18n:verify
npm run typecheck
npm run lint
```

#### Manual QA
1. **Switch language in app** (Settings → Language)
2. **Test key screens:**
   - Sign in / Sign up
   - Dashboard (for each role)
   - Settings
   - Error messages
   - Empty states

3. **Check for issues:**
   - Text overflow (some languages are longer)
   - Missing translations (shows key instead)
   - Broken placeholders (shows `{{variable}}` in UI)
   - Cultural appropriateness

#### Native Speaker Review
- Have native speakers test the app
- Document feedback
- Iterate on translations

## Translation Priority by Namespace

### Phase 1: Critical User-Facing (Priority 1)
Translate these first for immediate user impact:

1. **auth** - Sign in, sign up, password reset (31 keys)
2. **navigation** - Menu items, buttons (15 keys)
3. **errors** - Error messages (30 keys)
4. **common** - Frequently used terms (50 keys)
5. **dashboard** - Dashboard labels (200+ keys)

### Phase 2: Feature-Specific (Priority 2)
6. **parent** - Parent-specific screens
7. **teacher** - Teacher-specific screens
8. **ai** - AI feature labels
9. **settings** - Settings screens

### Phase 3: Admin & Advanced (Priority 3)
10. **admin** - Admin features
11. **principal** - Principal dashboard
12. **finance_dashboard** - Financial features
13. **petty_cash** - Petty cash system

## Language-Specific Guidelines

### Afrikaans (af)
- **Target**: South African preschools
- **Formality**: Professional but warm
- **Notes**: Some English terms are commonly used
- **Example**: "Dashboard" often kept as-is

### Zulu (IsiZulu - zu)
- **Target**: South African preschools
- **Formality**: Respectful, warm
- **Notes**: Educational terminology
- **Challenge**: Some tech terms may need creative translation

### Sepedi (st)
- **Target**: South African preschools
- **Formality**: Respectful, warm
- **Notes**: Educational context important
- **Challenge**: Limited tech vocabulary resources

### Spanish (es)
- **Dialect**: Neutral/International Spanish
- **Formality**: Formal usted in auth, informal tú in dashboards
- **Notes**: Educational context (not Spain Spanish)

### French (fr)
- **Dialect**: International French
- **Formality**: Formal vous initially, peut become informal
- **Notes**: African French acceptable

### Portuguese (pt)
- **Dialect**: Brazilian Portuguese preferred
- **Formality**: Você (formal)
- **Notes**: Some African Portuguese speakers may use it

### German (de)
- **Formality**: Sie (formal) for auth, du (informal) optional for parent-teacher
- **Notes**: Compound words may be long, check UI overflow

## Common Translation Challenges

### Challenge 1: Text Length Variations
**Problem**: German/French often 30% longer than English

**Solutions:**
- Use abbreviations where appropriate
- Adjust UI to wrap text
- Test on mobile devices (smallest screen)
- Use ellipsis for very long strings

### Challenge 2: Plural Forms
**Problem**: Different languages have different plural rules

**Solution**: Use i18next pluralization
```json
{
  "student": "student",
  "student_plural": "students"
}
```

### Challenge 3: Gender-Specific Terms
**Problem**: Languages like French/Spanish have gendered nouns

**Solution**: Use neutral or inclusive forms where possible
```json
{
  "fr": {
    "teacher": "enseignant·e"  // or "enseignant(e)"
  }
}
```

### Challenge 4: Date/Time Formats
**Problem**: Different date formats (DD/MM vs MM/DD)

**Solution**: Use Intl.DateTimeFormat with locale
```typescript
const date = new Intl.DateTimeFormat(i18n.language, {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}).format(new Date());
```

### Challenge 5: Currency
**Problem**: Different currency symbols

**Solution**: Use Intl.NumberFormat
```typescript
const price = new Intl.NumberFormat(i18n.language, {
  style: 'currency',
  currency: 'ZAR'  // South African Rand
}).format(100);
```

## Translation Glossary

Maintain consistency across all languages:

| English | Afrikaans | Zulu | Sepedi | Spanish | French | Portuguese | German |
|---------|-----------|------|--------|---------|--------|------------|--------|
| Dashboard | Dashboard | Ibhodi | Dashboard | Tablero | Tableau | Painel | Dashboard |
| Student | Student | Umfundi | Moithuti | Estudiante | Étudiant | Estudante | Schüler |
| Teacher | Onderwyser | Uthisha | Morutisi | Profesor | Enseignant | Professor | Lehrer |
| Parent | Ouer | Umzali | Motsadi | Padre | Parent | Pai | Elternteil |
| Class | Klas | Ikilasi | Kelo | Clase | Classe | Turma | Klasse |
| School | Skool | Isikole | Sekolo | Escuela | École | Escola | Schule |

**Note**: This glossary will grow as translations progress.

## Tools and Resources

### Translation Tools
- **Google Translate** - Initial drafts only
- **DeepL** - Better quality for European languages
- **Microsoft Translator** - Good for South African languages
- **Phrase** - Translation management platform
- **Lokalise** - Developer-friendly TMS

### Resources for South African Languages
- **Zulu Language Board** - Official terminology
- **PanSALB** (Pan South African Language Board)
- **National Lexicography Units**

### Quality Checkers
- **LanguageTool** - Grammar checking
- **Grammarly** - English source quality
- **Native speaker networks** - Final review

## Timeline Estimate

| Task | Duration | Notes |
|------|----------|-------|
| Export & distribute | 1 day | Prepare files and instructions |
| Translation (per language) | 3-5 days | Professional translator |
| Review & QA | 2 days | Per language |
| Import & validation | 1 day | Technical work |
| Testing & fixes | 2-3 days | All languages |
| **Total per language** | **8-11 days** | Can parallelize |

**For all 7 languages in parallel**: ~2-3 weeks with proper resources

## Cost Estimate

Professional translation rates (approximate):

| Language | Word Count | Rate (per word) | Estimated Cost |
|----------|------------|-----------------|----------------|
| Afrikaans | ~8,000 | $0.08 | $640 |
| Zulu | ~8,000 | $0.10 | $800 |
| Sepedi | ~8,000 | $0.10 | $800 |
| Spanish | ~8,000 | $0.06 | $480 |
| French | ~8,000 | $0.06 | $480 |
| Portuguese | ~8,000 | $0.06 | $480 |
| German | ~8,000 | $0.07 | $560 |
| **Total** | | | **~$4,240** |

**Budget Options:**
- Full professional: $4,000-5,000
- AI-assisted + review: $1,500-2,000
- Community + spot review: $500-1,000

## Next Steps

### Immediate Actions
1. ✅ Generate CSV: `npm run i18n:export`
2. 📤 Choose translation approach (Professional/AI/Community)
3. 📋 Prepare translation brief with guidelines
4. 🌍 Distribute to translators
5. 📅 Set deadline and milestones

### For Phase 5.1 (Current)
- [x] Export translation template
- [ ] Prepare translator brief
- [ ] Identify translation resources
- [ ] Distribute for translation
- [ ] Track progress by language

### For Phase 5.2 (Next)
- [ ] Receive completed translations
- [ ] Import to JSON files
- [ ] Run verification
- [ ] Fix any issues
- [ ] QA testing
- [ ] Native speaker review

## Support

For questions or issues during translation:
- Technical: Check `docs/translation-key-template.md`
- Process: This document
- Code integration: `docs/i18n-implementation-guide.md` (to be created)

---

**Last Updated**: 2025-01-14  
**Version**: 1.0  
**Status**: Active translation phase
