# Dash Enhanced PDF Generation System

## Overview

Dash's PDF generation system has been enhanced to create professional, comprehensive educational documents beyond simple worksheets. The system uses `expo-print` with HTML/CSS rendering to generate PDFs that work across web, iOS, and Android platforms.

### Capabilities

- **Multiple Document Types**: Study guides, lesson plans, progress reports, assessments, certificates, newsletters, and worksheets
- **Professional Themes**: Three built-in themes (professional, colorful, minimalist)
- **Rich Formatting**: Charts, tables, callouts, timelines, rubrics, progress bars
- **Branding Support**: Custom logos, colors, watermarks, and organization branding
- **Page Management**: Automatic page breaks, page numbering, headers/footers
- **AI-Powered Content**: Automatically generate structured content based on user requests

### Constraints

- **PDF Size Budget**: 5MB maximum per document
- **Image Constraints**: 500KB per image, max 10 images per document
- **No External Libraries**: Pure HTML/CSS rendering (no external charting libraries)
- **Print-Safe CSS**: Uses expo-print supported CSS subset
- **Generation Timeout**: 30 seconds maximum

## Architecture

### Configuration Layer

**File**: `lib/config/pdfConfig.ts`

Feature flags and settings control the PDF generation system:

```typescript
- pdfEngine: 'legacy' | 'enhanced' | 'auto'
- enableEnhancedPDFGeneration: boolean
- defaultTheme: 'professional' | 'colorful' | 'minimalist'
- aiConfidenceThreshold: number (0-1)
```

Toggle between legacy worksheet-only mode and enhanced comprehensive PDF generation.

### Service Layer

**File**: `lib/services/EducationalPDFService.ts`

Core PDF generation with formatting helpers:

#### Theme System
- Three visual themes with CSS variables
- Customizable colors, fonts, and spacing
- Automatic theme application to all components

#### Formatting Helpers
- `createChartHTML()` - Bar and line charts using HTML/CSS or SVG
- `createTableHTML()` - Styled tables with zebra striping
- `createCalloutBox()` - Info, tip, warning, and objective boxes
- `createTimelineHTML()` - Step-by-step procedure timelines
- `createRubricTable()` - Assessment rubrics with criteria and levels
- `createProgressBar()` - Visual progress indicators

**File**: `lib/services/PDFTemplateService.ts` *(In Progress)*

Template registry and rendering engine:
- Template descriptors with metadata
- Theme and branding injection
- Table of contents generation
- Conditional sections based on data

### AI Integration Layer

**File**: `services/DashAIAssistant.ts` *(In Progress)*

#### Intent Detection
Detects when users request comprehensive PDFs vs simple worksheets:
- Document type classification
- Parameter extraction (topic, grade, audience, etc.)
- Confidence scoring with thresholds

#### Content Generation
Specialized methods for each document type:
- `generateStudyGuide()`
- `generateLessonPlan()`
- `generateProgressReport()`
- `generateAssessment()`
- `generateNewsletter()`
- `generateCertificate()`

#### Structured Output
AI returns JSON frontmatter + Markdown body:
```json
{
  "document_type": "study_guide",
  "topic": "Photosynthesis",
  "parameters": { "gradeLevel": 5, "sections": 6 },
  "sections": [...],
  "questions": [...],
  "rubric": [...]
}
```

### UI Layer

**File**: `components/ai/DashAssistant.tsx` *(In Progress)*

User-facing features:
- PDF preview modal (WebView/iframe)
- Template and theme selection
- Progress indicators
- PDF history/library
- Bulk generation queue

## Document Types

### 1. Study Guide
**Use Case**: Comprehensive learning material for students

**Sections**:
- Introduction and overview
- Learning objectives
- Key concepts (3-5 sections)
- Vocabulary terms (10-15)
- Practice questions
- Answer key
- Additional resources

**Prompts**: "Create a study guide about [topic] for grade [X]"

### 2. Lesson Plan
**Use Case**: Structured teaching plan for educators

**Sections**:
- Learning objectives and standards alignment
- Materials and resources needed
- Procedure timeline with steps
- Differentiation strategies
- Assessment methods
- Exit ticket/closure
- Reflection notes

**Prompts**: "Generate a lesson plan for teaching [topic] to [age group]"

### 3. Progress Report
**Use Case**: Student performance tracking

**Sections**:
- Student information
- Subject areas with ratings
- Achievement highlights
- Areas for growth
- Recommendations
- Progress visualizations (charts/bars)
- Teacher/parent comments

**Prompts**: "Make a progress report for [student] showing [subject] performance"

### 4. Assessment
**Use Case**: Tests and quizzes

**Sections**:
- Instructions and guidelines
- Sections by difficulty (easy/medium/hard)
- Multiple question types (MCQ, short answer, essay)
- Answer spaces
- Rubric table
- Answer key (optional)

**Prompts**: "Create an assessment test on [topic] with [N] questions"

### 5. Certificate
**Use Case**: Achievement recognition

**Sections**:
- Decorative border
- Achievement title
- Recipient name
- Date and signatures
- Logo watermark
- Seal/badge

**Prompts**: "Generate a certificate for [student] for completing [achievement]"

### 6. Newsletter
**Use Case**: Classroom/school communications

**Sections**:
- Header with branding
- Announcements (multi-column)
- Highlights and achievements
- Upcoming events
- Important dates
- Contact information

**Prompts**: "Make a classroom newsletter highlighting this week's activities"

### 7. Enhanced Worksheet
**Use Case**: Practice activities with enriched layouts

**Sections**:
- Instructions and objectives
- Activity blocks with visual design
- Vocabulary sections
- Practice areas
- Bonus challenges
- Parent notes

**Prompts**: "Generate teaching materials about [topic] with activities"

## Themes

### Professional Theme
- **Use Case**: Formal documents, reports, official communications
- **Colors**: Deep blues (#1a237e), professional grays
- **Fonts**: Georgia serif headings, Arial body
- **Style**: Clean, minimal decoration, business-appropriate

### Colorful Theme
- **Use Case**: Student materials, engaging learning resources
- **Colors**: Bright blues (#1565c0), oranges (#ff9800)
- **Fonts**: Comic Sans headings (child-friendly), Arial body
- **Style**: Vibrant, fun, educational

### Minimalist Theme
- **Use Case**: Print-efficient, accessible, distraction-free
- **Colors**: Black, grays, high contrast
- **Fonts**: Helvetica/Arial throughout
- **Style**: Simple, clean, maximum readability

## Customization

### Branding

Apply organization branding to all documents:

```typescript
{
  logoUri: 'base64://...' or 'https://...',
  organizationName: 'Your School Name',
  primaryColor: '#1565c0',
  accentColor: '#42a5f5',
  watermarkText: 'DRAFT' or 'CONFIDENTIAL',
  footerText: 'Custom footer text'
}
```

### Page Layout

Control document structure:

```typescript
{
  paperSize: 'A4' | 'Letter',
  orientation: 'portrait' | 'landscape',
  enablePageNumbers: boolean,
  enableWatermark: boolean,
  enableTableOfContents: boolean
}
```

## Usage Examples

### Example 1: Generate Study Guide

```typescript
// User: "Create a comprehensive study guide about photosynthesis for grade 5"

// Dash detects:
- Document type: study_guide
- Topic: photosynthesis
- Grade level: 5
- Confidence: 0.95 → Auto-generate

// AI generates structured content
// Template Service renders with 'colorful' theme
// Result: 8-page PDF with TOC, diagrams, questions, answer key
```

### Example 2: Generate Lesson Plan

```typescript
// User: "Generate a detailed lesson plan for teaching fractions to 7-year-olds"

// Dash detects:
- Document type: lesson_plan
- Topic: fractions
- Age group: 7 years (Grade 2)
- Confidence: 0.91 → Auto-generate

// AI generates with timeline, activities, differentiation
// Template Service renders with 'professional' theme
// Result: 6-page lesson plan with materials list, procedure, assessment
```

### Example 3: Generate Progress Report

```typescript
// User: "Make a progress report for Sarah showing her math performance"

// Dash detects:
- Document type: progress_report
- Student: Sarah
- Subject: math
- Confidence: 0.88 → Auto-generate

// Retrieves actual student data or generates mock data
// Includes charts showing progress over time
// Result: 3-page report with visualizations and recommendations
```

## Print-Friendly Tips

### Page Breaks
- Use `page-break-after: always` to force new pages
- Use `page-break-inside: avoid` to keep sections together
- Place `.page-break` divs between major sections

### Images
- Compress images before embedding (target 80% quality)
- Use max dimensions: 600px width for full-width, 300px for inline
- Convert to base64 only when necessary
- Prefer SVG for diagrams and charts

### Tables
- Keep tables under 20 rows per page
- Use compact mode for dense data
- Consider splitting large tables across pages

### Fonts
- System fonts render fastest and most reliably
- Avoid embedding custom fonts (adds significant size)
- Stick to Arial, Helvetica, Georgia, Times

## Troubleshooting

### Layout Overflow
**Issue**: Content extends beyond page boundaries

**Solutions**:
- Reduce font sizes slightly
- Adjust margins (min 1.5cm)
- Split long sections with page breaks
- Use compact table mode

### Page Breaks Not Working
**Issue**: expo-print may not support all page-break CSS

**Solutions**:
- Use explicit `<div class="page-break"></div>` between sections
- Avoid page breaks inside flex/grid containers
- Test on target platform early

### Images Too Large
**Issue**: PDF exceeds 5MB budget

**Solutions**:
- Reduce image quality (70-80% is usually sufficient)
- Resize images (max 600px)
- Limit to 10 images per document
- Use CSS-based visualizations instead of images where possible

### Counters Not Supported
**Issue**: Page numbers don't appear

**Solutions**:
- CSS counters may not work on all platforms
- Fallback: Static footer text without page numbers
- Alternative: Generate page numbers server-side during content creation

## Cost Considerations

### AI Token Usage

| Document Type | Avg Tokens | Est. Cost (Claude 3.5) |
|--------------|------------|----------------------|
| Study Guide | 3,000-5,000 | $0.015-$0.025 |
| Lesson Plan | 2,500-4,000 | $0.0125-$0.020 |
| Progress Report | 1,500-2,500 | $0.0075-$0.0125 |
| Assessment | 2,000-3,500 | $0.010-$0.0175 |
| Certificate | 300-500 | $0.0015-$0.0025 |
| Newsletter | 1,500-2,500 | $0.0075-$0.0125 |

**Optimization**:
- Cache common templates and boilerplate
- Reuse generated content with parameter variations
- Batch similar requests

### Render Time

| Document Complexity | Web | iOS | Android |
|--------------------|-----|-----|---------|
| Simple (1-3 pages) | 0.5-1s | 1-2s | 1-2s |
| Medium (4-8 pages) | 1-2s | 2-4s | 2-4s |
| Complex (9-15 pages) | 2-4s | 4-8s | 4-8s |

**Optimization**:
- Minimize inline styles (use classes)
- Limit SVG complexity
- Reduce image count

### Storage Footprint

**Per Document**:
- Metadata: ~1-2KB
- File URI: ~200 bytes
- Total per history item: ~1.5-2.5KB

**Max History (50 items)**:
- ~75-125KB total metadata storage
- PDFs stored in device document directory (not in app bundle)

**Optimization**:
- Prune history after 30-90 days
- Allow users to delete individual items
- Consider cloud backup only for critical documents

## Current Implementation Status

### ✅ Completed (Phase 1)
- Configuration system with feature flags
- Theme system (professional, colorful, minimalist)
- Enhanced base styles with CSS variables
- Formatting helper methods:
  - Charts (bar/line)
  - Tables with styling
  - Callout boxes
  - Timelines
  - Rubrics
  - Progress bars
- Backward compatibility with legacy worksheet system

### 🚧 In Progress (Phase 2)
- PDF Template Service
- Template registry and rendering engine
- Pre-built templates for all document types
- Data models and validation

### 📋 Planned (Phase 3-5)
- AI content generation enhancements
- Intent detection and classification
- End-to-end pipeline wiring
- UI components (preview, selection, history)
- Cross-platform testing
- Documentation finalization

## Next Steps

1. **Complete Template Service** (Phase 2)
   - Implement template registry
   - Build rendering engine
   - Create all 7 document type templates

2. **Enhance AI Integration** (Phase 3)
   - Add specialized generation methods
   - Improve prompts for structured output
   - Implement intent detection

3. **Wire Pipeline** (Phase 3)
   - Connect AI → validation → template → PDF
   - Add size enforcement
   - Implement file naming

4. **Build UI Components** (Phase 4)
   - Preview modal
   - Template selector
   - PDF history/library
   - Bulk generation queue

5. **Test and Validate** (Phase 5)
   - Cross-platform testing
   - Performance optimization
   - Documentation completion

---

**Last Updated**: 2025-10-02  
**Version**: 1.0 (Initial Implementation)  
**Status**: In Development - Phase 1 Complete
