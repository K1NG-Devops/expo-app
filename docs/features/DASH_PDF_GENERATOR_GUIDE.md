# Dash PDF Generator - Complete Guide

## Overview

The **Dash PDF Generator** is a comprehensive PDF generation module for EduDash Pro that creates high-quality PDF documents from natural language prompts, templates, or structured data. It features knowledge base integration, user preferences, custom templates, and advanced layout capabilities.

## Features

✅ **AI-Powered Generation** - Natural language prompts to professional PDFs  
✅ **Custom Templates** - Create, save, and share templates within your organization  
✅ **User Preferences** - Persistent branding, themes, and layout defaults  
✅ **Knowledge Base Integration** - Pull relevant data from your organization  
✅ **Batch Processing** - Generate multiple PDFs at once  
✅ **Multiple Document Types** - Reports, letters, invoices, certificates, newsletters, and more  
✅ **Professional Themes** - Professional, Colorful, and Minimalist options  
✅ **Cross-Platform** - Works on Web, iOS, and Android  
✅ **Storage Integration** - Automatic upload to Supabase Storage  
✅ **PDF History** - Track and manage generated documents  

## Supported Document Types

| Type | Description | Use Cases |
|------|-------------|-----------|
| `report` | Business or academic reports | Monthly reports, analytics, summaries |
| `letter` | Formal correspondence | Parent letters, official communications |
| `invoice` | Billing documents | Fee invoices, receipts |
| `study_guide` | Educational study materials | Review guides, exam prep |
| `lesson_plan` | Teacher lesson plans | Daily/weekly lesson planning |
| `progress_report` | Student progress reports | Term reports, assessments |
| `assessment` | Tests and quizzes | Exams, practice tests |
| `certificate` | Achievement certificates | Awards, completion certificates |
| `newsletter` | Organizational newsletters | School updates, announcements |
| `worksheet` | Practice worksheets | Homework, exercises |
| `general` | Any other document | Memos, notes, misc documents |

## Installation & Setup

### 1. Run Database Migration

```bash
# Apply the migration to create tables and policies
psql -U your_user -d your_database -f migrations/20251009_dash_pdf_generator_tables.sql
```

Or using Supabase CLI:

```bash
supabase db push migrations/20251009_dash_pdf_generator_tables.sql
```

### 2. Create Storage Bucket

The migration automatically creates the `generated-pdfs` bucket. Verify in your Supabase dashboard:

- **Bucket name**: `generated-pdfs`
- **Public**: No (private)
- **File size limit**: 10MB
- **Allowed MIME types**: `application/pdf`

### 3. Import the Service

```typescript
import { getDashPDFGenerator } from '@/services/DashPDFGenerator';

const pdfGenerator = getDashPDFGenerator();
```

## Usage Examples

### 1. Generate PDF from Prompt (Simplest)

```typescript
import { getDashPDFGenerator } from '@/services/DashPDFGenerator';

const pdfGenerator = getDashPDFGenerator();

// Simple prompt-based generation
const result = await pdfGenerator.generateFromPrompt(
  "Create a parent letter about our upcoming field trip to the science museum next Friday. Include permission slip and emergency contact information.",
  {
    theme: 'professional',
    enablePageNumbers: true,
    enableWatermark: false,
  },
  (phase, progress, message) => {
    console.log(`${phase}: ${progress}% - ${message}`);
  }
);

if (result.success) {
  console.log('PDF created:', result.filename);
  console.log('Storage path:', result.storagePath);
  // Share or download the PDF
  await Sharing.shareAsync(result.uri);
} else {
  console.error('Failed:', result.error);
}
```

### 2. Generate from Structured Data

```typescript
import { getDashPDFGenerator, type PDFGenerationRequest } from '@/services/DashPDFGenerator';

const pdfGenerator = getDashPDFGenerator();

const request: PDFGenerationRequest = {
  type: 'newsletter',
  title: 'March 2025 School Newsletter',
  sections: [
    {
      id: 'welcome',
      title: 'Welcome Message',
      markdown: '## Dear Parents\n\nWe are excited to share our March updates...',
    },
    {
      id: 'events',
      title: 'Upcoming Events',
      markdown: '- **March 15**: Parent-Teacher Conferences\n- **March 20**: Science Fair\n- **March 28**: Spring Break Begins',
    },
  ],
  preferencesOverride: {
    theme: 'colorful',
    paperSize: 'Letter',
    orientation: 'portrait',
  },
};

const result = await pdfGenerator.generateFromStructuredData(request);
```

### 3. Generate from Custom Template

```typescript
// First, create a template
const template = await pdfGenerator.createTemplate({
  ownerUserId: currentUser.id,
  organizationId: currentOrg.id,
  name: 'Monthly Progress Report',
  description: 'Standard template for monthly student progress',
  documentType: 'progress_report',
  templateHtml: `
    <html>
      <head><title>{{studentName}} - Progress Report</title></head>
      <body>
        <h1>{{studentName}}</h1>
        <h2>Month: {{month}}</h2>
        <p>Overall Progress: {{overallGrade}}</p>
        <div>{{comments}}</div>
      </body>
    </html>
  `,
  inputSchema: {
    studentName: { type: 'string', required: true },
    month: { type: 'string', required: true },
    overallGrade: { type: 'string', required: true },
    comments: { type: 'string', required: false },
  },
  isOrgShared: true,
});

// Later, use the template
const result = await pdfGenerator.generateFromTemplate(
  template.id!,
  {
    studentName: 'Alice Johnson',
    month: 'March 2025',
    overallGrade: 'Excellent',
    comments: 'Alice continues to excel in all subjects...',
  }
);
```

### 4. Batch Generation

```typescript
import { getDashPDFGenerator, type PDFGenerationRequest } from '@/services/DashPDFGenerator';

const pdfGenerator = getDashPDFGenerator();

// Generate certificates for all students
const students = await getClassStudents(classId);

const requests: PDFGenerationRequest[] = students.map(student => ({
  type: 'certificate',
  title: `Certificate of Achievement - ${student.name}`,
  sections: [{
    id: 'main',
    title: '',
    markdown: `
# Certificate of Achievement

This certifies that

## ${student.name}

has successfully completed Grade ${student.grade} 
with excellence in all subjects.

Awarded this ${new Date().toLocaleDateString()}
    `,
  }],
}));

const results = await pdfGenerator.batchGenerate(
  requests,
  3, // concurrent generation limit
  (overallProgress, currentIndex, total) => {
    console.log(`Progress: ${overallProgress}% (${currentIndex}/${total})`);
  }
);

console.log(`Generated ${results.filter(r => r.success).length} certificates`);
```

### 5. Preview HTML Before Generating

```typescript
const request: PDFGenerationRequest = {
  type: 'letter',
  title: 'Important Update',
  sections: [{
    id: 'content',
    title: '',
    markdown: 'Your content here...',
  }],
};

const preview = await pdfGenerator.previewHTML(request);

// Display in WebView or save for debugging
console.log(preview.html);
console.log('Warnings:', preview.warnings);
```

## User Preferences

### Save User Preferences

```typescript
const saved = await pdfGenerator.saveUserPreferences({
  defaultTheme: 'professional',
  defaultFont: 'Arial, sans-serif',
  defaultBranding: {
    primaryColor: '#1565c0',
    secondaryColor: '#42a5f5',
    watermarkText: 'EduDash Pro',
    footerHtmlSafe: '<p>© 2025 My School - Generated by Dash AI</p>',
  },
  headerHtmlSafe: '<div style="text-align: center;"><img src="logo.png" height="50"/></div>',
});

if (saved) {
  console.log('Preferences saved successfully');
}
```

### Load User Preferences

```typescript
const prefs = await pdfGenerator.loadUserPreferences();

if (prefs) {
  console.log('Default theme:', prefs.defaultTheme);
  console.log('Branding:', prefs.defaultBranding);
}
```

## Custom Templates

### List Templates

```typescript
// List all accessible templates
const allTemplates = await pdfGenerator.listCustomTemplates();

// Filter by document type
const reportTemplates = await pdfGenerator.listCustomTemplates({
  documentType: 'report',
});

// Show only org-shared templates
const orgTemplates = await pdfGenerator.listCustomTemplates({
  orgShared: true,
});

// Show only public templates
const publicTemplates = await pdfGenerator.listCustomTemplates({
  publicOnly: true,
});
```

### Create Template

```typescript
const template = await pdfGenerator.createTemplate({
  ownerUserId: user.id,
  organizationId: org.id,
  name: 'Field Trip Permission Slip',
  description: 'Standard permission slip for field trips',
  documentType: 'letter',
  templateHtml: `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Permission Slip</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #1565c0; }
          .signature-line { border-top: 1px solid #000; width: 300px; margin-top: 50px; }
        </style>
      </head>
      <body>
        <h1>Field Trip Permission Slip</h1>
        <p>Student Name: {{studentName}}</p>
        <p>Destination: {{destination}}</p>
        <p>Date: {{tripDate}}</p>
        <p>I give permission for my child to attend the field trip.</p>
        <div class="signature-line">
          <p>Parent Signature: ___________________________</p>
        </div>
      </body>
    </html>
  `,
  inputSchema: {
    studentName: { type: 'string', required: true },
    destination: { type: 'string', required: true },
    tripDate: { type: 'string', required: true },
  },
  isOrgShared: true,
});

console.log('Template created:', template?.id);
```

### Update Template

```typescript
const updated = await pdfGenerator.updateTemplate(templateId, {
  name: 'Updated Template Name',
  description: 'New description',
  isOrgShared: false, // Make private
});
```

### Share Template with Organization

```typescript
const shared = await pdfGenerator.shareTemplate(templateId, true);
```

### Delete Template

```typescript
const deleted = await pdfGenerator.deleteTemplate(templateId);
```

## Integration with Dash AI Assistant

The PDF Generator is designed to work seamlessly with the Dash AI Assistant:

```typescript
// In DashAIAssistant.ts

import { getDashPDFGenerator } from '@/services/DashPDFGenerator';

// Add new method to DashAIAssistant class
public async generatePDFFromPrompt(prompt: string): Promise<{ success: boolean; uri?: string; error?: string }> {
  try {
    const pdfGenerator = getDashPDFGenerator();
    
    const result = await pdfGenerator.generateFromPrompt(
      prompt,
      undefined,
      (phase, progress, message) => {
        // Optionally update UI with progress
        console.log(`[PDF Gen] ${phase}: ${progress}% - ${message}`);
      }
    );

    return result;
  } catch (error) {
    console.error('[DashAIAssistant] PDF generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Detecting PDF Intent in Assistant

```typescript
// In callAIServiceLegacy method

if (/\b(generate|create|make)\b.*\b(pdf|document|letter|report|certificate)\b/i.test(userInput)) {
  // User wants to generate a PDF
  const pdfResult = await this.generatePDFFromPrompt(userInput);
  
  if (pdfResult.success) {
    return {
      content: "I've generated your PDF! You can download it below.",
      dashboard_action: {
        type: 'open_screen',
        route: '/screens/pdf-library',
      },
      suggested_actions: ['view_pdf', 'share_pdf', 'generate_another'],
    };
  }
}
```

## Progress Callbacks

Monitor PDF generation progress with callbacks:

```typescript
const result = await pdfGenerator.generateFromPrompt(
  "Create a monthly newsletter...",
  undefined,
  (phase, progress, message) => {
    // Update your UI
    switch (phase) {
      case 'parse':
        console.log(`📝 Analyzing: ${progress}%`);
        break;
      case 'retrieve':
        console.log(`🔍 Gathering data: ${progress}%`);
        break;
      case 'compose':
        console.log(`🎨 Creating layout: ${progress}%`);
        break;
      case 'render':
        console.log(`📄 Rendering PDF: ${progress}%`);
        break;
      case 'upload':
        console.log(`☁️ Uploading: ${progress}%`);
        break;
    }
    
    // Update progress bar
    setProgressValue(progress);
    setProgressMessage(message);
  }
);
```

## Themes

Three built-in themes are available:

### Professional Theme
- **Colors**: Deep blues (#1565c0, #0d47a1)
- **Use for**: Official documents, reports, invoices
- **Style**: Clean, corporate, formal

### Colorful Theme
- **Colors**: Vibrant blues and greens (#1976d2, #388e3c, #fbc02d)
- **Use for**: Newsletters, certificates, student materials
- **Style**: Friendly, engaging, educational

### Minimalist Theme
- **Colors**: Grayscale (#424242, #757575, #e0e0e0)
- **Use for**: Simple documents, drafts, notes
- **Style**: Clean, modern, distraction-free

## Best Practices

### 1. Use Descriptive Titles
```typescript
// ❌ Bad
title: 'Document'

// ✅ Good
title: 'March 2025 Parent Newsletter - Grade 3A'
```

### 2. Structure Content with Sections
```typescript
sections: [
  { id: 'intro', title: 'Introduction', markdown: '...' },
  { id: 'main', title: 'Main Content', markdown: '...' },
  { id: 'conclusion', title: 'Conclusion', markdown: '...' },
]
```

### 3. Set Appropriate Progress Callbacks
```typescript
// Simple console logging for development
onProgress: (phase, progress) => console.log(`${phase}: ${progress}%`)

// Full UI updates for production
onProgress: (phase, progress, message) => {
  setPhase(phase);
  setProgress(progress);
  setMessage(message);
}
```

### 4. Handle Errors Gracefully
```typescript
const result = await pdfGenerator.generateFromPrompt(prompt);

if (!result.success) {
  Alert.alert(
    'PDF Generation Failed',
    result.error || 'An unknown error occurred',
    [
      { text: 'Try Again', onPress: () => retryGeneration() },
      { text: 'Cancel', style: 'cancel' },
    ]
  );
}
```

### 5. Cache Preferences Locally
The service automatically caches preferences after the first load. Clear cache when switching users:

```typescript
// After user logout
pdfGenerator.preferencesLoaded = false;
pdfGenerator.userPreferences = null;
```

## API Reference

### Core Methods

#### `generateFromPrompt(prompt, options?, onProgress?)`
Generate PDF from natural language description.

**Parameters:**
- `prompt: string` - Natural language description
- `options?: Partial<DashPDFOptions>` - Generation options
- `onProgress?: ProgressCallback` - Progress callback

**Returns:** `Promise<PDFGenerationResult>`

#### `generateFromTemplate(templateId, data, options?, onProgress?)`
Generate PDF from a custom template.

**Parameters:**
- `templateId: string` - Template UUID
- `data: Record<string, any>` - Template data
- `options?: Partial<DashPDFOptions>` - Generation options
- `onProgress?: ProgressCallback` - Progress callback

**Returns:** `Promise<PDFGenerationResult>`

#### `generateFromStructuredData(request, onProgress?)`
Generate PDF from structured request object.

**Parameters:**
- `request: PDFGenerationRequest` - Complete request
- `onProgress?: ProgressCallback` - Progress callback

**Returns:** `Promise<PDFGenerationResult>`

#### `previewHTML(request)`
Preview HTML without generating PDF.

**Parameters:**
- `request: PDFGenerationRequest` - Generation request

**Returns:** `Promise<{ html: string; warnings: string[] }>`

#### `batchGenerate(requests, concurrency?, onProgress?)`
Generate multiple PDFs at once.

**Parameters:**
- `requests: PDFGenerationRequest[]` - Array of requests
- `concurrency?: number` - Max concurrent generations (default: 3)
- `onProgress?: (overall, current, total) => void` - Batch progress callback

**Returns:** `Promise<PDFGenerationResult[]>`

### Preferences Methods

#### `loadUserPreferences()`
Load user preferences from database.

**Returns:** `Promise<UserPDFPreferences | null>`

#### `saveUserPreferences(preferences)`
Save user preferences to database.

**Parameters:**
- `preferences: Partial<UserPDFPreferences>` - Preferences to save

**Returns:** `Promise<boolean>`

### Template Methods

#### `listCustomTemplates(filters?)`
List accessible templates.

**Parameters:**
- `filters?: { documentType?, orgShared?, publicOnly? }` - Optional filters

**Returns:** `Promise<CustomTemplate[]>`

#### `getTemplate(templateId)`
Get a specific template.

**Parameters:**
- `templateId: string` - Template UUID

**Returns:** `Promise<CustomTemplate | null>`

#### `createTemplate(template)`
Create a new template.

**Parameters:**
- `template: Omit<CustomTemplate, 'id' | 'createdAt' | 'updatedAt'>` - Template data

**Returns:** `Promise<CustomTemplate | null>`

#### `updateTemplate(templateId, updates)`
Update an existing template.

**Parameters:**
- `templateId: string` - Template UUID
- `updates: Partial<CustomTemplate>` - Fields to update

**Returns:** `Promise<boolean>`

#### `deleteTemplate(templateId)`
Delete a template.

**Parameters:**
- `templateId: string` - Template UUID

**Returns:** `Promise<boolean>`

#### `shareTemplate(templateId, orgShared)`
Share template with organization.

**Parameters:**
- `templateId: string` - Template UUID
- `orgShared: boolean` - Share with org or make private

**Returns:** `Promise<boolean>`

## Troubleshooting

### PDF Not Generating

**Issue**: `generateFromPrompt` returns `success: false`

**Solutions:**
1. Check network connectivity
2. Verify user authentication
3. Check browser/app permissions for file system access
4. Review console for specific error messages

### Storage Upload Fails

**Issue**: PDF generates but doesn't upload to Supabase

**Solutions:**
1. Verify storage bucket exists (`generated-pdfs`)
2. Check RLS policies allow user uploads
3. Ensure file size is under 10MB limit
4. Verify organization_id is set correctly

### Templates Not Loading

**Issue**: `listCustomTemplates()` returns empty array

**Solutions:**
1. Check RLS policies on `pdf_custom_templates` table
2. Verify user has correct organization_id
3. Ensure templates are marked as `is_org_shared` or `is_public`
4. Check user authentication status

### Preferences Not Saving

**Issue**: `saveUserPreferences()` returns `false`

**Solutions:**
1. Verify RLS policies on `pdf_user_preferences` table
2. Check user_id matches authenticated user
3. Ensure organization_id is valid
4. Review database constraints

## Performance Considerations

### Large Documents
- Use `onProgress` callbacks to keep UI responsive
- Consider breaking very large documents into sections
- Batch generation limited to 3 concurrent by default (adjustable)

### Image Optimization
- Convert images to base64 for embedding
- Resize large images before inclusion
- Use appropriate quality settings

### Caching
- Preferences are cached after first load
- Templates can be cached locally for offline use
- Clear cache when switching users

## Security

### RLS Policies
All tables have Row Level Security enabled:
- Users can only access their own data
- Organization admins can view org data
- Templates respect sharing settings

### HTML Sanitization
- Custom template HTML should be sanitized
- Header/footer HTML marked as "safe" should be validated
- Avoid user-provided scripts in templates

### Storage Access
- All PDFs in `generated-pdfs` bucket are private
- Signed URLs with expiration for downloads
- Path structure: `{org_id}/{user_id}/{filename}`

## Future Enhancements

### Planned Features
- [ ] AI-powered content composition via `pdf_compose` action
- [ ] Knowledge base search integration (RAG)
- [ ] Vector similarity search for templates
- [ ] Chart and table generation from data
- [ ] Multi-language support
- [ ] PDF editing and annotation
- [ ] Version history for documents
- [ ] Collaborative template editing

### Contributing
To contribute enhancements:
1. Follow existing code patterns
2. Add unit tests for new features
3. Update this documentation
4. Ensure RLS policies are secure

## Support

For issues or questions:
1. Check this documentation
2. Review console logs for errors
3. Check Supabase dashboard for data/storage issues
4. Contact dev team with error details

---

**Generated by Dash AI • EduDash Pro**  
**Last Updated:** October 2025  
**Version:** 1.0.0
