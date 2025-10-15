# EduDash Pro - Translator Brief

## Project Overview

**Product**: EduDash Pro  
**Type**: Educational mobile application for preschools  
**Target Market**: South African preschools (primary), international (secondary)  
**Target Users**: Teachers, Parents, Principals, School Administrators  

## Translation Scope

- **Total Keys**: 1,395 translation strings
- **Source Language**: English (en)
- **Target Languages**: 7 languages
  - **High Priority**: Afrikaans, Zulu, Sepedi
  - **Medium Priority**: Spanish, French, Portuguese, German

## File Format

You will receive a CSV file (`translations-template.csv`) with the following structure:

| Column | Content | Example |
|--------|---------|---------|
| A | Key | `auth.sign_in` |
| B | Context | "Authentication" |
| C | Variables | `name, count` |
| D | English (Source) | "Welcome, {{name}}!" |
| E | Your Language | *[Empty - fill this]* |

## Critical Translation Rules

### 1. ⚠️ NEVER Translate Variable Placeholders

Variables appear as `{{variableName}}` and MUST remain unchanged.

**✅ CORRECT:**
```
EN: "Welcome, {{name}}!"
ES: "¡Bienvenido, {{name}}!"
```

**❌ WRONG:**
```
EN: "Welcome, {{name}}!"
ES: "¡Bienvenido, {{nombre}}!"  // Variable translated - WRONG
```

**❌ WRONG:**
```
EN: "Welcome, {{name}}!"
ES: "¡Bienvenido, nombre!"  // Brackets removed - WRONG
```

### 2. 🚫 NEVER Translate Brand Names

These terms MUST stay in English:

- **EduDash** - Product name
- **Dash** - AI assistant name
- **AI** - Technology term
- **WhatsApp** - Brand name

**✅ CORRECT:**
```
EN: "Ask Dash AI for help"
FR: "Demandez de l'aide à Dash AI"
```

### 3. 😀 Keep Emojis in Position

Emojis help users navigate - keep them in the same position:

**✅ CORRECT:**
```
EN: "📊 Dashboard"
DE: "📊 Dashboard"
```

### 4. 📋 Use Context Column

The "Context" column tells you WHERE the text appears:

- **Authentication** = Login/signup screens
- **Dashboard** = Main screens for teachers/parents
- **Error message** = Something went wrong
- **Form** = Input fields
- **Modal dialog** = Popup windows

Same English word may need different translations based on context!

**Example:**
```
Context: "Action button" → "Close" (verb - close a window)
Context: "Status" → "Close" (adjective - deadline is close)
```

## Tone and Style Guidelines

### For Different User Types

**Parents** (Warm, Supportive):
- Use friendly, encouraging language
- Avoid technical jargon
- Focus on child's progress and well-being

**Teachers** (Clear, Efficient):
- Professional but approachable
- Action-oriented language
- Clear instructions

**Administrators** (Professional, Precise):
- Formal tone
- Accurate terminology
- Business-appropriate

### General Style

- **Be concise**: Mobile screens are small
- **Be clear**: Educational setting, not marketing
- **Be consistent**: Use same term for same concept
- **Be natural**: Write as native speakers would speak

## Common Terms - Translation Guide

### Technical Terms

Some tech terms are often kept in English or adapted:

| English | Guideline | Example (Spanish) |
|---------|-----------|-------------------|
| Dashboard | Often kept or adapted | "Dashboard" or "Tablero" |
| Login / Sign In | Use local convention | "Iniciar sesión" |
| Settings | Translate | "Configuración" |
| Email | Usually kept | "Email" |
| Password | Translate | "Contraseña" |

### Educational Terms

| English | Context | Note |
|---------|---------|------|
| Preschool | Educational institution | Use local equivalent |
| Teacher | Educator | Respect cultural norms |
| Student | Learner | Age appropriate (3-6 years) |
| Class | Group of students | Not university class |
| Lesson | Teaching activity | Preschool appropriate |

## Special Cases

### Plural Forms

If your language has complex plural rules, let us know. We may need special keys.

**Example (English has 2 forms):**
```
"Managing {{count}} child"
"Managing {{count}} children"
```

### Gender

If your language requires gender agreement, use neutral or inclusive forms when possible.

**Example (French):**
```
Inclusive: "enseignant·e" or "enseignant(e)"
```

### Long Translations

If your translation is significantly longer than English (>30%), please note it. We may need to adjust the UI.

**Example:**
```
EN: "Save" (4 characters)
DE: "Speichern" (10 characters)
```

### Cultural Sensitivity

- Consider local educational practices
- Respect cultural norms around authority/respect
- Adapt greetings and formality appropriately

## Quality Checklist

Before submitting, check:

- [ ] All `{{variables}}` preserved exactly
- [ ] Brand names (EduDash, Dash, AI, WhatsApp) NOT translated
- [ ] Emojis in same position
- [ ] Tone appropriate for context
- [ ] No machine translation artifacts
- [ ] Grammatically correct
- [ ] Natural phrasing (native speaker would say it)
- [ ] Consistent terminology throughout

## Example Translations

### Authentication Flow

```csv
Key,Context,Variables,English,Spanish,French
auth.sign_in,Authentication,,Sign In,Iniciar sesión,Se connecter
auth.email,Authentication,,Email,Correo electrónico,Email
auth.password,Authentication,,Password,Contraseña,Mot de passe
auth.welcome,Authentication,name,"Welcome, {{name}}!","¡Bienvenido, {{name}}!","Bienvenue, {{name}} !"
```

### Dashboard

```csv
Key,Context,Variables,English,Spanish,French
dashboard.welcome,Dashboard,name,"Welcome back, {{name}}!","¡Bienvenido de nuevo, {{name}}!","Bon retour, {{name}} !"
dashboard.todays_overview,Dashboard,,"📊 Today's Overview","📊 Resumen de hoy","📊 Aperçu du jour"
dashboard.loading,Dashboard,,"Loading dashboard...","Cargando tablero...","Chargement du tableau..."
```

### Error Messages

```csv
Key,Context,Variables,English,Spanish,French
errors.network,Error message,,"Network error. Please check your connection.","Error de red. Verifica tu conexión.","Erreur réseau. Vérifiez votre connexion."
errors.unauthorized,Error message,,"You don't have permission to access this resource.","No tienes permiso para acceder a este recurso.","Vous n'avez pas la permission d'accéder à cette ressource."
```

## Translation Tools

### Recommended (Use with Caution)

- **DeepL**: Generally high quality, but always review
- **Google Translate**: Quick reference only, always edit
- **Microsoft Translator**: Good for South African languages

### NOT Recommended Without Review

- **Direct machine translation**: Always requires human review
- **Auto-translate**: Will break `{{variables}}`

## Delivery Format

### Return the CSV file with translations filled in Column E (your language)

**Before:**
```csv
Key,Context,Variables,English,Spanish
auth.sign_in,Authentication,,Sign In,
```

**After:**
```csv
Key,Context,Variables,English,Spanish
auth.sign_in,Authentication,,Sign In,Iniciar sesión
```

### Notes for Translators

If you need to add notes or have questions:
1. Use a separate column or
2. Add a comment in Google Sheets or
3. Send questions via email

## Language-Specific Notes

### Afrikaans
- Target: South African preschools
- Some English tech terms commonly used
- Maintain professional but warm tone

### Zulu (IsiZulu)
- Target: South African preschools
- Respectful tone appropriate for educational context
- Some tech terms may need creative translation
- Educational terminology important

### Sepedi
- Target: South African preschools
- Respectful, warm tone
- Educational context important
- Limited tech vocabulary - prioritize clarity

### Spanish
- Dialect: Neutral/International (not Spain Spanish)
- Formality: "usted" for authentication, "tú" for dashboards
- Target: International market

### French
- Dialect: International French
- Formality: "vous" initially
- African French acceptable

### Portuguese
- Dialect: Brazilian Portuguese preferred
- Formality: "Você" (formal)
- Some African Portuguese speakers

### German
- Formality: "Sie" (formal) for authentication
- Consider text length (often 30% longer)
- Compound words may affect UI

## Support and Questions

**Questions about:**
- **Context**: Check the "Context" column
- **Variables**: See examples above - NEVER translate
- **Technical terms**: When in doubt, keep English or ask
- **Cultural appropriateness**: Your expertise is valued!

**Contact**: [Your contact information]

## Timeline

- **Start Date**: [Date]
- **Deadline**: [Date]
- **Estimated Time**: 3-5 days per language
- **Priority**: High priority languages first (Afrikaans, Zulu, Sepedi)

## Compensation

[Add payment terms if applicable]

## Next Steps After Translation

1. You return the completed CSV
2. We import translations into the app
3. We run automated validation (checks variables, etc.)
4. We test in the application
5. Native speaker final review
6. Production deployment

---

**Thank you for helping make EduDash Pro accessible to more learners!**

Your work directly impacts preschool education and helps teachers and parents communicate better.

---

**Project**: EduDash Pro Translation  
**Version**: 1.0  
**Date**: 2025-01-14
