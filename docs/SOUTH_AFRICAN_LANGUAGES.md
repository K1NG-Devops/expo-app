# South African Language Support

EduDash Pro now supports the three major South African languages in addition to the existing European languages.

## Supported Languages

### Official South African Languages Added:
- **Afrikaans** (`af`) - One of the official languages of South Africa
- **IsiZulu** (`zu`) - The most widely spoken home language in South Africa  
- **Sepedi/Northern Sotho** (`st`) - One of the official languages of South Africa

### Coming Soon - Additional Official Languages:
- **IsiXhosa** (`xh`) - Second most spoken home language 🚧 Coming Soon
- **Setswana** (`tn`) - Widely used in education 🚧 Coming Soon
- **SiSwati** (`ss`) - Official language of Eswatini and South Africa 🚧 Coming Soon
- **IsiNdebele** (`nr`) - Indigenous language of South Africa 🚧 Coming Soon
- **Tshivenda** (`ve`) - Northern provinces language 🚧 Coming Soon
- **Xitsonga** (`ts`) - Eastern provinces language 🚧 Coming Soon

### Existing Languages:
- English (`en`)
- German (`de`)
- Spanish (`es`)
- French (`fr`)
- Portuguese (`pt`)

## File Structure

```
locales/
├── af/
│   └── common.json         # Afrikaans translations
├── zu/
│   └── common.json         # IsiZulu translations
├── st/
│   └── common.json         # Sepedi translations
├── en/
│   └── common.json         # English translations
├── de/
│   └── common.json         # German translations
├── es/
│   └── common.json         # Spanish translations
├── fr/
│   └── common.json         # French translations
└── pt/
    └── common.json         # Portuguese translations
```

## Translation Coverage

All three new South African languages include comprehensive translations for:

### Core Application Areas:
- **Authentication** - Sign in, registration, password reset
- **Navigation** - Dashboard, profile, settings, logout
- **User Roles** - Parent, teacher, principal, admin, super admin
- **Dashboard** - Welcome messages, quick actions, statistics
- **AI Features** - Homework helper, lesson generator, usage tracking
- **Educational Content** - Homework, lessons, students, classes
- **Reports** - Performance, attendance, progress tracking
- **Settings** - Profile, notifications, privacy, language selection
- **Notifications** - Alerts, assignments, reminders
- **Common UI Elements** - Buttons, messages, status indicators

### Advanced Features:
- **AI Integration** - Step-by-step homework help in local languages
- **Lesson Planning** - AI-powered lesson generation with local context
- **Assessment Tools** - Grade tracking and performance analysis
- **Communication** - Parent-teacher messaging capabilities
- **Administrative Tools** - User management and system configuration

## Language-Specific Considerations

### Afrikaans (`af`)
- Uses formal tone appropriate for educational context
- Includes proper gendered article usage
- Educational terminology adapted for South African school system

### IsiZulu (`zu`)  
- Incorporates respectful address forms
- Uses appropriate educational terminology
- Considers cultural context in messaging

### Sepedi/Northern Sotho (`st`)
- Uses formal educational language
- Incorporates proper grammatical structures
- Adapted for educational institutional use

## Implementation Notes

### Technical Integration:
- All translations use React i18next interpolation format (`{{variable}}`)
- Consistent key structure across all languages
- Support for pluralization where needed
- Proper encoding for special characters

### Cultural Adaptation:
- Educational terms adapted for South African context
- Appropriate formality levels for school communication
- Consideration for different educational systems and terminology

## Complete South African Language Roadmap

### Phase 1 - ✅ Completed (3 Languages):
- Afrikaans (af) - Active
- IsiZulu (zu) - Active 
- Sepedi (st) - Active

### Phase 2 - 🚧 Coming Soon (6 Languages):
- IsiXhosa (xh) - In development
- Setswana (tn) - In development
- SiSwati (ss) - In development
- IsiNdebele (nr) - In development
- Tshivenda (ve) - In development
- Xitsonga (ts) - In development

### Future Enhancements:
- Regional dialect support
- Educational content localization
- Cultural celebration integration
- Local curriculum alignment

## Usage in Application

The language selection is available in:
- User profile settings
- Initial setup/onboarding
- Admin configuration panels
- Per-user preferences

To enable a specific language, users can:
1. Navigate to Settings → Language
2. Select from the available options
3. Application will automatically reload with the chosen language
4. All AI interactions will respond in the selected language

## Maintenance

To maintain language files:
- Keep translations consistent across all supported languages
- Regular review for educational terminology updates
- Community feedback integration for accuracy
- Professional translation review for critical areas

---

This language expansion makes EduDash Pro more accessible to South African communities and demonstrates commitment to educational inclusion across linguistic diversity.
