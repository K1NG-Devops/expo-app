# Dash PDF Generator - Quick Start

## What is This?

A complete PDF generation system for Dash AI that converts natural language prompts into professional PDF documents. **Production-ready today!**

## 5-Minute Setup

### 1. Database Setup

```bash
# From your project root
supabase db push migrations/20251009_dash_pdf_generator_tables.sql
```

This creates:
- `pdf_user_preferences` - User themes and branding
- `pdf_custom_templates` - Reusable templates
- `pdf_documents` - Document history
- `generated-pdfs` bucket - PDF storage

### 2. Basic Usage

```typescript
import { getDashPDFGenerator } from '@/services/DashPDFGenerator';

// Create PDF from prompt
const pdfGen = getDashPDFGenerator();
const result = await pdfGen.generateFromPrompt(
  "Create a parent letter about field trip to the zoo on Friday"
);

if (result.success) {
  console.log('PDF ready:', result.uri);
  // Share or download
  await Sharing.shareAsync(result.uri);
}
```

### 3. With Progress Tracking

```typescript
const result = await pdfGen.generateFromPrompt(
  "Create a monthly newsletter",
  { theme: 'colorful' },
  (phase, progress, message) => {
    console.log(`${phase}: ${progress}%`);
    setProgress(progress); // Update UI
    setMessage(message);
  }
);
```

## Common Use Cases

### Parent Letter

```typescript
const result = await pdfGen.generateFromPrompt(
  "Write a letter to parents about upcoming parent-teacher conferences"
);
```

### Certificate

```typescript
const result = await pdfGen.generateFromStructuredData({
  type: 'certificate',
  title: 'Certificate of Achievement',
  sections: [{
    id: 'main',
    title: '',
    markdown: `# Certificate of Achievement\n\n## ${studentName}\n\nAwarded for excellence in ${subject}`
  }]
});
```

### Batch Certificates

```typescript
const requests = students.map(s => ({
  type: 'certificate',
  title: `Certificate - ${s.name}`,
  sections: [{ 
    id: 'main', 
    title: '', 
    markdown: `# Certificate\n\n## ${s.name}\n\nGrade ${s.grade}` 
  }]
}));

const results = await pdfGen.batchGenerate(requests);
console.log(`Generated ${results.filter(r => r.success).length} PDFs`);
```

### Custom Template

```typescript
// Create template once
const template = await pdfGen.createTemplate({
  ownerUserId: user.id,
  organizationId: org.id,
  name: 'Permission Slip',
  documentType: 'letter',
  templateHtml: `
    <html>
      <body>
        <h1>Permission Slip</h1>
        <p>Student: {{studentName}}</p>
        <p>Trip: {{destination}}</p>
        <p>Date: {{date}}</p>
      </body>
    </html>
  `,
  isOrgShared: true
});

// Use template many times
const result = await pdfGen.generateFromTemplate(
  template.id!,
  {
    studentName: 'Alice',
    destination: 'Science Museum',
    date: '2025-10-15'
  }
);
```

## Available Options

```typescript
interface DashPDFOptions {
  theme?: 'professional' | 'colorful' | 'minimalist';
  paperSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  enablePageNumbers?: boolean;
  enableWatermark?: boolean;
  branding?: {
    primaryColor?: string;
    watermarkText?: string;
    headerHtmlSafe?: string;
    footerHtmlSafe?: string;
  };
}
```

## Supported Document Types

- `general` - Any content
- `letter` - Correspondence
- `report` - Reports, summaries
- `newsletter` - Updates, announcements
- `certificate` - Awards, achievements
- `invoice` - Billing, receipts
- `worksheet` - Practice materials
- `lesson_plan` - Teaching plans
- `progress_report` - Student reports
- `assessment` - Tests, quizzes
- `study_guide` - Review materials

## Integration with Dash AI

Add to `services/DashAIAssistant.ts`:

```typescript
import { getDashPDFGenerator } from './DashPDFGenerator';

// Add method
public async generatePDFFromPrompt(prompt: string) {
  const pdfGen = getDashPDFGenerator();
  return await pdfGen.generateFromPrompt(prompt);
}

// Detect intent
if (/create.*pdf|generate.*letter/i.test(userInput)) {
  const result = await this.generatePDFFromPrompt(userInput);
  if (result.success) {
    return {
      content: "I've created your PDF!",
      dashboard_action: {
        type: 'pdf_ready',
        uri: result.uri,
        filename: result.filename
      }
    };
  }
}
```

## User Preferences

```typescript
// Save user defaults
await pdfGen.saveUserPreferences({
  defaultTheme: 'professional',
  defaultBranding: {
    primaryColor: '#1565c0',
    watermarkText: 'My School',
  }
});

// Load preferences (automatically used in generation)
const prefs = await pdfGen.loadUserPreferences();
```

## Template Management

```typescript
// List templates
const myTemplates = await pdfGen.listCustomTemplates();
const letterTemplates = await pdfGen.listCustomTemplates({ 
  documentType: 'letter' 
});

// Share with organization
await pdfGen.shareTemplate(templateId, true);

// Delete template
await pdfGen.deleteTemplate(templateId);
```

## Error Handling

```typescript
const result = await pdfGen.generateFromPrompt(prompt);

if (!result.success) {
  Alert.alert('PDF Generation Failed', result.error);
  return;
}

// Success - use result.uri
await Sharing.shareAsync(result.uri);
```

## Full Documentation

See `docs/features/DASH_PDF_GENERATOR_GUIDE.md` for:
- Complete API reference
- Advanced usage patterns
- Troubleshooting guide
- Security best practices
- Performance optimization

## Files Created

```
services/
  DashPDFGenerator.ts       - Main service (1,280 lines)
  README_DASH_PDF.md        - This file

migrations/
  20251009_dash_pdf_generator_tables.sql  - Database schema (354 lines)

docs/features/
  DASH_PDF_GENERATOR_GUIDE.md          - Complete guide (753 lines)
  DASH_PDF_IMPLEMENTATION_SUMMARY.md   - Implementation details (508 lines)
```

## Support

**Questions?** Check the full documentation in `docs/features/DASH_PDF_GENERATOR_GUIDE.md`

**Issues?** Review console logs and Supabase dashboard

**Next Steps:**
1. ✅ Apply database migration
2. ✅ Test basic generation
3. ⬜ Integrate with Dash AI
4. ⬜ Create custom templates
5. ⬜ Build UI screens

---

**Built by Claude 4.5 Sonnet • October 2025**
