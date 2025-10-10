/**
 * Enhanced Dash PDF Generator - Unified PDF System
 * 
 * Combines the best of both PDF implementations:
 * - Original DashPDFGenerator: AI prompts, batch processing, user preferences
 * - Enhanced PDF System: Educational templates, collaboration, accessibility
 * 
 * @module EnhancedDashPDFGenerator
 */

import { DashPDFGenerator } from './DashPDFGenerator';
import { EnhancedPDFEngine } from '../lib/services/EnhancedPDFEngine';
import { PDFCollaborationManager } from '../lib/services/PDFCollaborationManager';
import { PDFSecurityAccessibilityManager } from '../lib/services/PDFSecurityAccessibilityManager';
import { PDFPerformanceManager } from '../lib/services/PDFPerformanceManager';
import type { 
  PDFGenerationRequest, 
  PDFGenerationResult, 
  DocumentType,
  ContentSection,
  DashPDFOptions,
  UserPDFPreferences,
  CustomTemplate
} from './DashPDFGenerator';

// Extended types for enhanced features
export interface EnhancedPDFOptions extends DashPDFOptions {
  enableCollaboration?: boolean;
  enableVersionControl?: boolean;
  enableAnnotations?: boolean;
  accessibilityLevel?: 'basic' | 'WCAG_AA' | 'WCAG_AAA';
  securityPolicy?: {
    watermark?: boolean;
    restrictCopy?: boolean;
    auditAccess?: boolean;
  };
  cacheEnabled?: boolean;
  backgroundProcessing?: boolean;
}

export interface EnhancedPDFRequest extends PDFGenerationRequest {
  collaborationEnabled?: boolean;
  sharePermissions?: {
    canView?: boolean;
    canEdit?: boolean;
    canComment?: boolean;
    canShare?: boolean;
  };
  educationalContent?: {
    gradeLevel?: string;
    subject?: string;
    standards?: string[];
    contentBlocks?: Array<{
      type: 'header' | 'problem' | 'answer-space' | 'instruction' | 'multimedia';
      content: string;
      metadata?: any;
    }>;
  };
}

export interface EnhancedPDFResult extends PDFGenerationResult {
  documentId?: string;
  shareToken?: string;
  collaborationSessionId?: string;
  versionId?: string;
  accessibilityScore?: number;
  performanceMetrics?: {
    generationTime: number;
    cacheHit: boolean;
    renderingTime: number;
  };
}

/**
 * Enhanced Dash PDF Generator - Unified System
 * 
 * Provides all existing DashPDFGenerator functionality plus:
 * - Educational content templates
 * - Real-time collaboration
 * - Advanced accessibility
 * - Performance optimization
 * - Version control
 */
export class EnhancedDashPDFGenerator extends DashPDFGenerator {
  private pdfEngine: EnhancedPDFEngine;
  private collaborationManager: PDFCollaborationManager;
  private securityManager: PDFSecurityAccessibilityManager;
  private performanceManager: PDFPerformanceManager;

  constructor() {
    super();
    this.pdfEngine = new EnhancedPDFEngine();
    this.collaborationManager = new PDFCollaborationManager();
    this.securityManager = new PDFSecurityAccessibilityManager();
    this.performanceManager = new PDFPerformanceManager();
  }

  /**
   * Enhanced PDF generation with collaboration features
   */
  async generateEnhancedPDF(request: EnhancedPDFRequest): Promise<EnhancedPDFResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first if enabled
      let cacheHit = false;
      if (request.preferencesOverride?.cacheEnabled !== false) {
        const cacheKey = this.generateCacheKey(request);
        const cached = await this.performanceManager.getCachedPDF(cacheKey);
        if (cached) {
          cacheHit = true;
          return {
            success: true,
            uri: cached.uri,
            filename: cached.filename,
            documentId: cached.metadata?.documentId,
            performanceMetrics: {
              generationTime: Date.now() - startTime,
              cacheHit: true,
              renderingTime: 0
            }
          };
        }
      }

      // Determine if this is educational content
      const isEducational = this.isEducationalRequest(request);
      let result: EnhancedPDFResult;

      if (isEducational && request.educationalContent) {
        // Use Enhanced PDF Engine for educational content
        result = await this.generateEducationalPDF(request);
      } else {
        // Use original DashPDFGenerator for general content
        const originalResult = await this.generatePDF(request);
        result = {
          ...originalResult,
          performanceMetrics: {
            generationTime: Date.now() - startTime,
            cacheHit: false,
            renderingTime: Date.now() - startTime
          }
        };
      }

      // Apply security and accessibility enhancements
      if (result.success && result.uri) {
        await this.applyEnhancements(result, request);
      }

      // Set up collaboration if requested
      if (request.collaborationEnabled && result.documentId) {
        await this.setupCollaboration(result, request);
      }

      // Cache the result
      if (!cacheHit && result.success) {
        const cacheKey = this.generateCacheKey(request);
        await this.performanceManager.setCachedPDF(cacheKey, {
          uri: result.uri!,
          filename: result.filename!,
          metadata: { documentId: result.documentId }
        });
      }

      return result;

    } catch (error) {
      console.error('Enhanced PDF generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performanceMetrics: {
          generationTime: Date.now() - startTime,
          cacheHit: false,
          renderingTime: 0
        }
      };
    }
  }

  /**
   * Generate educational PDF using Enhanced PDF Engine
   */
  private async generateEducationalPDF(request: EnhancedPDFRequest): Promise<EnhancedPDFResult> {
    const { educationalContent } = request;
    
    // Create document using Enhanced PDF Engine
    const document = await this.pdfEngine.createDocument({
      title: request.title,
      type: this.mapDocumentType(request.type),
      template: this.selectEducationalTemplate(request),
      metadata: {
        gradeLevel: educationalContent?.gradeLevel,
        subject: educationalContent?.subject,
        standards: educationalContent?.standards || [],
        generatedBy: 'dash-ai'
      }
    });

    // Add content blocks
    if (educationalContent?.contentBlocks) {
      for (const block of educationalContent.contentBlocks) {
        await this.pdfEngine.addContentBlock(document.id, {
          type: block.type,
          content: block.content,
          metadata: block.metadata || {}
        });
      }
    }

    // Generate the PDF
    const pdfResult = await this.pdfEngine.generatePDF(document.id, {
      format: 'pdf',
      includeMetadata: true
    });

    return {
      success: pdfResult.success,
      uri: pdfResult.uri,
      filename: pdfResult.filename,
      documentId: document.id,
      pageCount: pdfResult.pageCount,
      warnings: pdfResult.warnings,
      error: pdfResult.error
    };
  }

  /**
   * Apply security and accessibility enhancements
   */
  private async applyEnhancements(result: EnhancedPDFResult, request: EnhancedPDFRequest): Promise<void> {
    if (!result.documentId) return;

    const options = request.preferencesOverride as EnhancedPDFOptions;

    // Apply security policies
    if (options?.securityPolicy) {
      await this.securityManager.applySecurityPolicy(result.documentId, {
        watermark: options.securityPolicy.watermark || false,
        restrictCopy: options.securityPolicy.restrictCopy || false,
        auditAccess: options.securityPolicy.auditAccess || false,
        allowPrint: true,
        requireAuth: false
      });
    }

    // Enhance accessibility
    if (options?.accessibilityLevel && options.accessibilityLevel !== 'basic') {
      const accessibilityResult = await this.securityManager.enhanceAccessibility(result.documentId, {
        level: options.accessibilityLevel,
        generateAltText: true,
        optimizeReadingOrder: true,
        ensureColorContrast: true
      });
      
      result.accessibilityScore = accessibilityResult.score;
    }
  }

  /**
   * Set up collaboration features
   */
  private async setupCollaboration(result: EnhancedPDFResult, request: EnhancedPDFRequest): Promise<void> {
    if (!result.documentId) return;

    const permissions = request.sharePermissions || {
      canView: true,
      canEdit: false,
      canComment: true,
      canShare: false
    };

    // Create document share
    const share = await this.collaborationManager.shareDocument(result.documentId, {
      canView: permissions.canView || true,
      canComment: permissions.canComment || true,
      canEdit: permissions.canEdit || false,
      canShare: permissions.canShare || false,
      canDownload: true,
      canPrint: true
    });

    result.shareToken = share.shareToken;

    // Start collaboration session if editing is enabled
    if (permissions.canEdit) {
      const session = await this.collaborationManager.startCollaborationSession(result.documentId);
      result.collaborationSessionId = session.id;
    }
  }

  /**
   * Utility methods
   */
  private isEducationalRequest(request: EnhancedPDFRequest): boolean {
    const educationalTypes: DocumentType[] = ['worksheet', 'lesson_plan', 'assessment', 'study_guide'];
    return educationalTypes.includes(request.type) || !!request.educationalContent;
  }

  private mapDocumentType(type: DocumentType): 'worksheet' | 'lesson-plan' | 'assessment' | 'general' {
    const mapping: Record<DocumentType, 'worksheet' | 'lesson-plan' | 'assessment' | 'general'> = {
      'worksheet': 'worksheet',
      'lesson_plan': 'lesson-plan',
      'assessment': 'assessment',
      'study_guide': 'general',
      'progress_report': 'general',
      'certificate': 'general',
      'report': 'general',
      'letter': 'general',
      'invoice': 'general',
      'newsletter': 'general',
      'general': 'general'
    };
    return mapping[type] || 'general';
  }

  private selectEducationalTemplate(request: EnhancedPDFRequest): string {
    // Select template based on content and preferences
    if (request.educationalContent?.gradeLevel) {
      const gradeNum = parseInt(request.educationalContent.gradeLevel.replace(/\D/g, ''));
      if (gradeNum <= 3) return 'playful-kids';
      if (gradeNum <= 8) return 'educational-standard';
      return 'assessment-focused';
    }
    return 'educational-standard';
  }

  private generateCacheKey(request: EnhancedPDFRequest): string {
    const key = {
      type: request.type,
      title: request.title,
      prompt: request.prompt,
      sections: request.sections?.length || 0,
      educational: !!request.educationalContent,
      template: request.templateId
    };
    return btoa(JSON.stringify(key)).substring(0, 32);
  }

  /**
   * Enhanced batch processing with collaboration support
   */
  async generateBatchEnhanced(
    requests: EnhancedPDFRequest[],
    options?: {
      maxConcurrent?: number;
      enableCollaboration?: boolean;
      progressCallback?: (progress: { completed: number; total: number; current?: string }) => void;
    }
  ): Promise<EnhancedPDFResult[]> {
    const maxConcurrent = options?.maxConcurrent || 3;
    const results: EnhancedPDFResult[] = [];
    
    // Process in batches
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (request, index) => {
        try {
          options?.progressCallback?.({
            completed: results.length,
            total: requests.length,
            current: request.title
          });

          const result = await this.generateEnhancedPDF({
            ...request,
            collaborationEnabled: options?.enableCollaboration
          });
          
          return result;
        } catch (error) {
          console.error(`Batch PDF generation failed for ${request.title}:`, error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          } as EnhancedPDFResult;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    options?.progressCallback?.({
      completed: results.length,
      total: requests.length
    });

    return results;
  }

  /**
   * Get collaboration features for a document
   */
  async getDocumentCollaboration(documentId: string) {
    return {
      shares: await this.collaborationManager.getDocumentShares?.(documentId) || [],
      versions: await this.collaborationManager.getVersionHistory(documentId),
      comments: await this.collaborationManager.getComments?.(documentId) || [],
      activeSession: await this.collaborationManager.getActiveSession?.(documentId)
    };
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics() {
    return this.performanceManager.getPerformanceAnalytics();
  }

  /**
   * Clear cache
   */
  async clearCache() {
    return this.performanceManager.clearCache?.() || Promise.resolve();
  }
}

// Singleton instance
let instance: EnhancedDashPDFGenerator | null = null;

export const getEnhancedPDFGenerator = (): EnhancedDashPDFGenerator => {
  if (!instance) {
    instance = new EnhancedDashPDFGenerator();
  }
  return instance;
};

// Export all types for backward compatibility
export * from './DashPDFGenerator';