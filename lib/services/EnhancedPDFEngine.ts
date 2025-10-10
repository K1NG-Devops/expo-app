/**
 * Enhanced PDF Generation Engine
 * 
 * Advanced PDF generation system with rendering capabilities, preview support,
 * template management, performance optimizations, and educational content focus.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { assertSupabase } from '../supabase';
import { generateCorrelationId, trackAssistantEvent } from '../monitoring';
import { assistantContextBridge } from '../AssistantContextBridge';

// ====================================================================
// CORE TYPES AND INTERFACES
// ====================================================================

export type PDFFormat = 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5';
export type PDFOrientation = 'portrait' | 'landscape';
export type PDFQuality = 'draft' | 'standard' | 'high' | 'print';
export type PDFTemplateStyle = 'professional' | 'educational' | 'colorful' | 'minimalist' | 'playful';

export interface PDFDocument {
  id: string;
  title: string;
  content: PDFContentBlock[];
  metadata: PDFMetadata;
  template: PDFTemplate;
  settings: PDFRenderSettings;
  status: 'draft' | 'generating' | 'ready' | 'error';
  versions: PDFVersion[];
  permissions: PDFPermissions;
}

export interface PDFContentBlock {
  id: string;
  type: 'header' | 'text' | 'image' | 'table' | 'chart' | 'exercise' | 'callout' | 'spacer';
  data: any;
  styles?: Record<string, any>;
  conditions?: PDFCondition[];
}

export interface PDFMetadata {
  author: string;
  subject?: string;
  keywords?: string[];
  createdAt: number;
  modifiedAt: number;
  educationalLevel?: 'preschool' | 'elementary' | 'middle' | 'high' | 'university';
  subject_area?: string;
  language?: string;
  version: string;
  correlation_id?: string;
}

export interface PDFTemplate {
  id: string;
  name: string;
  style: PDFTemplateStyle;
  layout: {
    margins: { top: number; right: number; bottom: number; left: number };
    header?: PDFHeaderTemplate;
    footer?: PDFFooterTemplate;
    watermark?: PDFWatermark;
    columns?: number;
  };
  branding?: PDFBranding;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    heading: string;
    code?: string;
  };
}

export interface PDFHeaderTemplate {
  content: string;
  height: number;
  showPageNumbers?: boolean;
  showDate?: boolean;
  logo?: string;
}

export interface PDFFooterTemplate {
  content: string;
  height: number;
  showPageNumbers?: boolean;
  alignment?: 'left' | 'center' | 'right';
}

export interface PDFWatermark {
  text?: string;
  image?: string;
  opacity: number;
  position: 'center' | 'diagonal' | 'background';
  color?: string;
}

export interface PDFBranding {
  logo?: string;
  organizationName?: string;
  colors?: {
    primary: string;
    secondary: string;
  };
  customCSS?: string;
}

export interface PDFRenderSettings {
  format: PDFFormat;
  orientation: PDFOrientation;
  quality: PDFQuality;
  enableBookmarks?: boolean;
  enableTOC?: boolean;
  enableIndex?: boolean;
  accessibility?: PDFAccessibilitySettings;
  security?: PDFSecuritySettings;
}

export interface PDFAccessibilitySettings {
  enableScreenReader: boolean;
  altTextRequired: boolean;
  highContrast?: boolean;
  largePrint?: boolean;
  taggedPDF: boolean;
}

export interface PDFSecuritySettings {
  password?: string;
  permissions: {
    canPrint: boolean;
    canCopy: boolean;
    canModify: boolean;
    canAnnotate: boolean;
  };
  watermark?: string;
  expireAfter?: number; // hours
}

export interface PDFVersion {
  id: string;
  version: string;
  createdAt: number;
  changes: string[];
  author: string;
  size: number;
  uri?: string;
}

export interface PDFPermissions {
  owner: string;
  collaborators: Array<{
    userId: string;
    role: 'viewer' | 'editor' | 'admin';
    permissions: string[];
  }>;
  isPublic: boolean;
  shareToken?: string;
}

export interface PDFCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less';
  value: any;
}

export interface PDFPreviewOptions {
  page?: number;
  scale?: number;
  showAnnotations?: boolean;
  highlightChanges?: boolean;
}

export interface PDFGenerationProgress {
  stage: 'preparing' | 'rendering' | 'optimizing' | 'saving' | 'complete';
  progress: number; // 0-100
  message: string;
  timeElapsed: number;
  estimatedTimeRemaining?: number;
}

// ====================================================================
// ENHANCED PDF GENERATION ENGINE
// ====================================================================

export class EnhancedPDFEngine {
  private cache = new Map<string, any>();
  private templates = new Map<string, PDFTemplate>();
  private activeGenerations = new Map<string, PDFGenerationProgress>();

  constructor() {
    this.initializeDefaultTemplates();
  }

  // ====================================================================
  // TEMPLATE MANAGEMENT
  // ====================================================================

  private initializeDefaultTemplates(): void {
    const educationalTemplate: PDFTemplate = {
      id: 'educational-standard',
      name: 'Educational Standard',
      style: 'educational',
      layout: {
        margins: { top: 20, right: 15, bottom: 20, left: 15 },
        header: {
          content: '{{title}} - {{date}}',
          height: 15,
          showPageNumbers: true,
          showDate: true
        },
        footer: {
          content: 'EduDash Pro - {{organizationName}}',
          height: 10,
          showPageNumbers: true,
          alignment: 'center'
        }
      },
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#f59e0b',
        text: '#1f2937',
        background: '#ffffff'
      },
      fonts: {
        primary: 'Inter, sans-serif',
        secondary: 'Inter, sans-serif',
        heading: 'Inter, sans-serif'
      }
    };

    const playfulTemplate: PDFTemplate = {
      id: 'playful-kids',
      name: 'Playful Kids',
      style: 'playful',
      layout: {
        margins: { top: 25, right: 20, bottom: 25, left: 20 },
        header: {
          content: '🎓 {{title}} 🌟',
          height: 20,
          showDate: true
        }
      },
      colors: {
        primary: '#ef4444',
        secondary: '#f97316',
        accent: '#22c55e',
        text: '#374151',
        background: '#fef3c7'
      },
      fonts: {
        primary: 'Comic Sans MS, cursive',
        secondary: 'Comic Sans MS, cursive',
        heading: 'Comic Sans MS, cursive'
      }
    };

    this.templates.set('educational-standard', educationalTemplate);
    this.templates.set('playful-kids', playfulTemplate);
  }

  getTemplate(templateId: string): PDFTemplate | null {
    return this.templates.get(templateId) || null;
  }

  // ====================================================================
  // DOCUMENT CREATION & MANAGEMENT
  // ====================================================================

  async createDocument(
    title: string,
    templateId: string = 'educational-standard',
    options?: Partial<PDFRenderSettings>
  ): Promise<PDFDocument> {
    const correlationId = generateCorrelationId();
    
    trackAssistantEvent('pdf.document.create', {
      correlation_id: correlationId,
      template_id: templateId,
      title
    });

    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const document: PDFDocument = {
      id: correlationId,
      title,
      content: [],
      metadata: {
        author: 'EduDash Pro User',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        version: '1.0.0',
        correlation_id: correlationId
      },
      template,
      settings: {
        format: 'A4',
        orientation: 'portrait',
        quality: 'standard',
        enableBookmarks: true,
        accessibility: {
          enableScreenReader: true,
          altTextRequired: true,
          taggedPDF: true
        },
        ...options
      },
      status: 'draft',
      versions: [],
      permissions: {
        owner: 'current-user', // TODO: Get from session
        collaborators: [],
        isPublic: false
      }
    };

    // Cache the document
    this.cache.set(document.id, document);
    
    return document;
  }

  async addContentBlock(documentId: string, block: Omit<PDFContentBlock, 'id'>): Promise<void> {
    const document = this.cache.get(documentId) as PDFDocument;
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    const contentBlock: PDFContentBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...block
    };

    document.content.push(contentBlock);
    document.metadata.modifiedAt = Date.now();
    
    trackAssistantEvent('pdf.content.add', {
      correlation_id: document.metadata.correlation_id,
      block_type: block.type
    });
  }

  // ====================================================================
  // EDUCATIONAL CONTENT GENERATORS
  // ====================================================================

  async createWorksheetDocument(
    title: string,
    subject: string,
    gradeLevel: string,
    exercises: any[]
  ): Promise<PDFDocument> {
    const document = await this.createDocument(
      title,
      gradeLevel.includes('K') || gradeLevel.includes('1') || gradeLevel.includes('2') 
        ? 'playful-kids' 
        : 'educational-standard'
    );

    // Add header with subject and grade level
    await this.addContentBlock(document.id, {
      type: 'header',
      data: {
        title,
        subtitle: `${subject} - Grade ${gradeLevel}`,
        icon: this.getSubjectIcon(subject)
      }
    });

    // Add instructions
    await this.addContentBlock(document.id, {
      type: 'callout',
      data: {
        type: 'info',
        title: 'Instructions',
        content: 'Complete all exercises. Show your work where applicable.',
        icon: '📝'
      }
    });

    // Add exercises
    for (const exercise of exercises) {
      await this.addContentBlock(document.id, {
        type: 'exercise',
        data: exercise
      });
      
      // Add spacer between exercises
      await this.addContentBlock(document.id, {
        type: 'spacer',
        data: { height: 20 }
      });
    }

    return document;
  }

  async createLessonPlan(
    title: string,
    subject: string,
    duration: string,
    objectives: string[],
    activities: any[]
  ): Promise<PDFDocument> {
    const document = await this.createDocument(title, 'educational-standard');

    // Add lesson header
    await this.addContentBlock(document.id, {
      type: 'header',
      data: {
        title,
        subtitle: `${subject} Lesson Plan`,
        duration: duration,
        date: new Date().toLocaleDateString()
      }
    });

    // Add objectives
    await this.addContentBlock(document.id, {
      type: 'callout',
      data: {
        type: 'objective',
        title: 'Learning Objectives',
        content: objectives.map(obj => `• ${obj}`).join('\n'),
        icon: '🎯'
      }
    });

    // Add activities
    for (const activity of activities) {
      await this.addContentBlock(document.id, {
        type: 'text',
        data: {
          heading: activity.title,
          content: activity.description,
          duration: activity.duration
        }
      });
    }

    return document;
  }

  // ====================================================================
  // RENDERING ENGINE
  // ====================================================================

  async generatePDF(
    document: PDFDocument, 
    options?: {
      preview?: boolean;
      saveToFile?: boolean;
      onProgress?: (progress: PDFGenerationProgress) => void;
    }
  ): Promise<{ uri: string; size: number; pages: number }> {
    const correlationId = document.metadata.correlation_id || generateCorrelationId();
    
    this.activeGenerations.set(correlationId, {
      stage: 'preparing',
      progress: 0,
      message: 'Preparing document...',
      timeElapsed: 0
    });

    const startTime = Date.now();
    
    try {
      // Stage 1: Preparing
      this.updateProgress(correlationId, {
        stage: 'preparing',
        progress: 10,
        message: 'Building document structure...',
        timeElapsed: Date.now() - startTime
      }, options?.onProgress);

      const htmlContent = await this.renderDocumentHTML(document);
      
      // Stage 2: Rendering
      this.updateProgress(correlationId, {
        stage: 'rendering',
        progress: 40,
        message: 'Rendering PDF content...',
        timeElapsed: Date.now() - startTime
      }, options?.onProgress);

      const pdfResult = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        ...this.getPrintOptions(document.settings)
      });

      // Stage 3: Optimizing
      this.updateProgress(correlationId, {
        stage: 'optimizing',
        progress: 70,
        message: 'Optimizing PDF...',
        timeElapsed: Date.now() - startTime
      }, options?.onProgress);

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(pdfResult.uri);
      const fileSize = fileInfo.exists ? (fileInfo as any).size || 0 : 0;
      
      // Stage 4: Saving
      if (options?.saveToFile) {
        this.updateProgress(correlationId, {
          stage: 'saving',
          progress: 90,
          message: 'Saving document...',
          timeElapsed: Date.now() - startTime
        }, options?.onProgress);

        // Save to persistent storage
        await this.savePDFToStorage(document, pdfResult.uri);
      }

      // Stage 5: Complete
      this.updateProgress(correlationId, {
        stage: 'complete',
        progress: 100,
        message: 'PDF generation complete!',
        timeElapsed: Date.now() - startTime
      }, options?.onProgress);

      trackAssistantEvent('pdf.generate.success', {
        correlation_id: correlationId,
        document_id: document.id,
        pages: pdfResult.numberOfPages || 1,
        size: fileSize,
        generation_time: Date.now() - startTime
      });

      return {
        uri: pdfResult.uri,
        size: fileSize,
        pages: pdfResult.numberOfPages || 1
      };

    } catch (error) {
      this.updateProgress(correlationId, {
        stage: 'complete',
        progress: 100,
        message: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timeElapsed: Date.now() - startTime
      }, options?.onProgress);

      trackAssistantEvent('pdf.generate.error', {
        correlation_id: correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    } finally {
      this.activeGenerations.delete(correlationId);
    }
  }

  private updateProgress(
    correlationId: string,
    progress: PDFGenerationProgress,
    callback?: (progress: PDFGenerationProgress) => void
  ): void {
    this.activeGenerations.set(correlationId, progress);
    callback?.(progress);
  }

  private async renderDocumentHTML(document: PDFDocument): Promise<string> {
    const { template } = document;
    
    const styles = this.generateCSS(template);
    const header = this.renderHeader(document);
    const content = await this.renderContent(document.content, template);
    const footer = this.renderFooter(document);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${document.title}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${header}
        <main class="pdf-content">
          ${content}
        </main>
        ${footer}
      </body>
      </html>
    `;
  }

  private generateCSS(template: PDFTemplate): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: ${template.fonts.primary};
        color: ${template.colors.text};
        background-color: ${template.colors.background};
        line-height: 1.6;
        font-size: 12px;
      }
      
      .pdf-header {
        border-bottom: 2px solid ${template.colors.primary};
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      
      .pdf-footer {
        border-top: 1px solid ${template.colors.secondary};
        padding-top: 10px;
        margin-top: 20px;
        text-align: center;
        font-size: 10px;
        color: ${template.colors.secondary};
      }
      
      .pdf-content {
        padding: ${template.layout.margins.top}px ${template.layout.margins.right}px 
                ${template.layout.margins.bottom}px ${template.layout.margins.left}px;
      }
      
      h1, h2, h3 { 
        font-family: ${template.fonts.heading};
        color: ${template.colors.primary};
        margin-bottom: 10px;
      }
      
      .callout {
        border-left: 4px solid ${template.colors.accent};
        background-color: #f8f9fa;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      
      .callout.info { border-left-color: #17a2b8; }
      .callout.tip { border-left-color: #28a745; }
      .callout.warning { border-left-color: #ffc107; }
      .callout.objective { border-left-color: ${template.colors.accent}; }
      
      .exercise {
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 20px;
        margin: 15px 0;
      }
      
      .spacer {
        height: var(--spacer-height, 20px);
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      
      th, td {
        border: 1px solid #dee2e6;
        padding: 8px;
        text-align: left;
      }
      
      th {
        background-color: ${template.colors.primary};
        color: white;
      }
      
      @media print {
        .pdf-content {
          margin: 0;
          padding: 0;
        }
        
        .page-break {
          page-break-before: always;
        }
      }
    `;
  }

  private renderHeader(document: PDFDocument): string {
    const { template } = document;
    if (!template.layout.header) return '';

    let content = template.layout.header.content
      .replace('{{title}}', document.title)
      .replace('{{date}}', new Date().toLocaleDateString())
      .replace('{{organizationName}}', template.branding?.organizationName || '');

    return `
      <header class="pdf-header">
        ${content}
      </header>
    `;
  }

  private renderFooter(document: PDFDocument): string {
    const { template } = document;
    if (!template.layout.footer) return '';

    let content = template.layout.footer.content
      .replace('{{organizationName}}', template.branding?.organizationName || 'EduDash Pro');

    return `
      <footer class="pdf-footer">
        ${content}
      </footer>
    `;
  }

  private async renderContent(content: PDFContentBlock[], template: PDFTemplate): Promise<string> {
    const renderedBlocks = await Promise.all(
      content.map(block => this.renderContentBlock(block, template))
    );
    
    return renderedBlocks.join('\n');
  }

  private async renderContentBlock(block: PDFContentBlock, template: PDFTemplate): Promise<string> {
    switch (block.type) {
      case 'header':
        return this.renderHeaderBlock(block.data);
        
      case 'text':
        return this.renderTextBlock(block.data);
        
      case 'callout':
        return this.renderCalloutBlock(block.data);
        
      case 'exercise':
        return this.renderExerciseBlock(block.data);
        
      case 'table':
        return this.renderTableBlock(block.data);
        
      case 'spacer':
        return this.renderSpacerBlock(block.data);
        
      default:
        return `<!-- Unknown block type: ${block.type} -->`;
    }
  }

  private renderHeaderBlock(data: any): string {
    return `
      <div class="document-header">
        <h1>${data.title}</h1>
        ${data.subtitle ? `<h2>${data.subtitle}</h2>` : ''}
        ${data.icon ? `<span class="header-icon">${data.icon}</span>` : ''}
        ${data.duration ? `<p class="duration">Duration: ${data.duration}</p>` : ''}
        ${data.date ? `<p class="date">Date: ${data.date}</p>` : ''}
      </div>
    `;
  }

  private renderTextBlock(data: any): string {
    return `
      <div class="text-block">
        ${data.heading ? `<h3>${data.heading}</h3>` : ''}
        <p>${data.content}</p>
        ${data.duration ? `<small class="text-muted">Duration: ${data.duration}</small>` : ''}
      </div>
    `;
  }

  private renderCalloutBlock(data: any): string {
    return `
      <div class="callout ${data.type || 'info'}">
        <div class="callout-header">
          ${data.icon ? `<span class="callout-icon">${data.icon}</span>` : ''}
          ${data.title ? `<strong>${data.title}</strong>` : ''}
        </div>
        <div class="callout-content">
          ${data.content.replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
  }

  private renderExerciseBlock(data: any): string {
    return `
      <div class="exercise">
        <h4>${data.title || 'Exercise'}</h4>
        ${data.instructions ? `<p class="instructions">${data.instructions}</p>` : ''}
        ${data.questions ? data.questions.map((q: any, i: number) => `
          <div class="question">
            <p><strong>${i + 1}. ${q.question}</strong></p>
            ${q.options ? `
              <div class="options">
                ${q.options.map((option: string, j: number) => `
                  <label>
                    <input type="radio" name="q${i}" value="${j}">
                    ${option}
                  </label>
                `).join('')}
              </div>
            ` : ''}
            ${q.answerSpace ? `<div class="answer-space" style="height: ${q.answerSpace}px; border-bottom: 1px solid #ccc; margin: 10px 0;"></div>` : ''}
          </div>
        `).join('') : ''}
      </div>
    `;
  }

  private renderTableBlock(data: any): string {
    return `
      <table>
        <thead>
          <tr>
            ${data.headers.map((header: string) => `<th>${header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.rows.map((row: string[]) => `
            <tr>
              ${row.map(cell => `<td>${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  private renderSpacerBlock(data: any): string {
    return `<div class="spacer" style="--spacer-height: ${data.height || 20}px;"></div>`;
  }

  private getPrintOptions(settings: PDFRenderSettings): any {
    return {
      width: this.getPageWidth(settings.format),
      height: this.getPageHeight(settings.format),
      orientation: settings.orientation,
      margins: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    };
  }

  private getPageWidth(format: PDFFormat): number {
    const sizes = {
      'A4': 595,
      'Letter': 612,
      'Legal': 612,
      'A3': 842,
      'A5': 420
    };
    return sizes[format] || sizes['A4'];
  }

  private getPageHeight(format: PDFFormat): number {
    const sizes = {
      'A4': 842,
      'Letter': 792,
      'Legal': 1008,
      'A3': 1191,
      'A5': 595
    };
    return sizes[format] || sizes['A4'];
  }

  // ====================================================================
  // UTILITY METHODS
  // ====================================================================

  private getSubjectIcon(subject: string): string {
    const icons: Record<string, string> = {
      'math': '🔢',
      'english': '📚',
      'science': '🔬',
      'history': '🏛️',
      'art': '🎨',
      'music': '🎵',
      'pe': '⚽',
      'geography': '🌍'
    };
    return icons[subject.toLowerCase()] || '📖';
  }

  private async savePDFToStorage(document: PDFDocument, uri: string): Promise<string> {
    const fileName = `${document.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    const destinationUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.copyAsync({
      from: uri,
      to: destinationUri
    });
    
    // Save metadata to AsyncStorage
    await AsyncStorage.setItem(`pdf_${document.id}`, JSON.stringify({
      ...document,
      savedUri: destinationUri,
      savedAt: Date.now()
    }));
    
    return destinationUri;
  }

  // ====================================================================
  // PUBLIC INTERFACE METHODS
  // ====================================================================

  async sharePDF(uri: string, title: string): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Sharing is not available on this platform');
    }
    
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${title}`,
      UTI: 'com.adobe.pdf'
    });
  }

  getGenerationProgress(correlationId: string): PDFGenerationProgress | null {
    return this.activeGenerations.get(correlationId) || null;
  }

  async getDocumentHistory(documentId: string): Promise<PDFVersion[]> {
    const document = this.cache.get(documentId) as PDFDocument;
    return document?.versions || [];
  }
}

// Export singleton instance
export const enhancedPDFEngine = new EnhancedPDFEngine();