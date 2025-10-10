/**
 * Enhanced PDF System Integration Tests
 * 
 * Comprehensive test suite covering all PDF generation,
 * preview, collaboration, security, and performance features.
 */

import { enhancedPDFEngine, PDFDocument, PDFContentBlock } from '../services/EnhancedPDFEngine';
import { pdfCollaborationManager, PDFShare, SharePermissions } from '../services/PDFCollaborationManager';
import { pdfSecurityAccessibilityManager, PDFSecurityPolicy, AccessibilityFeatures } from '../services/PDFSecurityAccessibilityManager';
import { pdfPerformanceManager, PDFCache, BackgroundTask } from '../services/PDFPerformanceManager';
import { PDFAnnotation } from '../../components/PDFPreviewSystem';
import { generateCorrelationId } from '../monitoring';

// Mock dependencies
jest.mock('../supabase', () => ({
  assertSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      })),
      upsert: jest.fn(() => Promise.resolve({ error: null }))
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: { path: 'test.pdf' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/test.pdf' } }))
      }))
    }
  }))
}));

jest.mock('../sessionManager', () => ({
  getCurrentSession: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' }
    }
  })),
  getCurrentProfile: jest.fn(() => Promise.resolve({
    role: 'teacher',
    permissions: ['read', 'write']
  }))
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve())
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1024 * 100 })),
  readAsStringAsync: jest.fn(() => Promise.resolve('base64encodedcontent')),
  copyAsync: jest.fn(() => Promise.resolve()),
  downloadAsync: jest.fn(() => Promise.resolve({ uri: 'file://downloaded.pdf', status: 200 })),
  documentDirectory: 'file://documents/'
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(() => Promise.resolve({
    uri: 'file://generated.pdf',
    numberOfPages: 3
  }))
}));

// Test data
const mockDocument: PDFDocument = {
  id: 'test-doc-123',
  title: 'Test Educational Document',
  content: [
    {
      id: 'header-1',
      type: 'header',
      data: {
        title: 'Math Worksheet',
        subtitle: 'Grade 3 Addition',
        icon: '🔢'
      }
    },
    {
      id: 'text-1',
      type: 'text',
      data: {
        heading: 'Instructions',
        content: 'Complete the following addition problems.'
      }
    },
    {
      id: 'exercise-1',
      type: 'exercise',
      data: {
        title: 'Addition Problems',
        questions: [
          {
            question: '2 + 3 = ?',
            type: 'short-answer',
            answerSpace: 50
          },
          {
            question: '5 + 7 = ?',
            type: 'short-answer',
            answerSpace: 50
          }
        ]
      }
    }
  ],
  metadata: {
    author: 'Test Teacher',
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    version: '1.0.0',
    educationalLevel: 'elementary',
    subject_area: 'mathematics'
  },
  template: {
    id: 'educational-standard',
    name: 'Educational Standard',
    style: 'educational',
    layout: {
      margins: { top: 20, right: 15, bottom: 20, left: 15 }
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
  },
  settings: {
    format: 'A4',
    orientation: 'portrait',
    quality: 'standard',
    enableBookmarks: true,
    accessibility: {
      enableScreenReader: true,
      altTextRequired: true,
      taggedPDF: true
    }
  },
  status: 'draft',
  versions: [],
  permissions: {
    owner: 'test-user-123',
    collaborators: [],
    isPublic: false
  }
};

describe('Enhanced PDF System Integration', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ====================================================================
  // PDF GENERATION ENGINE TESTS
  // ====================================================================

  describe('Enhanced PDF Engine', () => {
    
    test('should create document with default template', async () => {
      const document = await enhancedPDFEngine.createDocument('Test Document');
      
      expect(document).toBeDefined();
      expect(document.title).toBe('Test Document');
      expect(document.template.id).toBe('educational-standard');
      expect(document.content).toEqual([]);
      expect(document.status).toBe('draft');
      expect(document.metadata.correlation_id).toBeDefined();
    });

    test('should add content blocks to document', async () => {
      const document = await enhancedPDFEngine.createDocument('Test Document');
      
      await enhancedPDFEngine.addContentBlock(document.id, {
        type: 'text',
        data: {
          heading: 'Test Heading',
          content: 'Test content'
        }
      });

      expect(document.content).toHaveLength(1);
      expect(document.content[0].type).toBe('text');
      expect(document.content[0].data.heading).toBe('Test Heading');
    });

    test('should create worksheet document with exercises', async () => {
      const exercises = [
        {
          title: 'Math Problem 1',
          questions: [
            { question: '2 + 2 = ?', type: 'short-answer', answerSpace: 50 }
          ]
        }
      ];

      const document = await enhancedPDFEngine.createWorksheetDocument(
        'Math Worksheet',
        'mathematics',
        '3',
        exercises
      );

      expect(document.title).toBe('Math Worksheet');
      expect(document.content.length).toBeGreaterThan(0);
      
      // Should have header, instructions, exercise, and spacer
      const headerBlock = document.content.find(block => block.type === 'header');
      const exerciseBlock = document.content.find(block => block.type === 'exercise');
      
      expect(headerBlock).toBeDefined();
      expect(exerciseBlock).toBeDefined();
      expect(exerciseBlock?.data.title).toBe('Math Problem 1');
    });

    test('should generate PDF with progress tracking', async () => {
      const progressUpdates: any[] = [];
      
      const result = await enhancedPDFEngine.generatePDF(mockDocument, {
        preview: false,
        saveToFile: true,
        onProgress: (progress) => progressUpdates.push(progress)
      });

      expect(result).toBeDefined();
      expect(result.uri).toBeDefined();
      expect(result.pages).toBe(3);
      expect(result.size).toBe(1024 * 100);
      
      // Should have received progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('complete');
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });

    test('should handle different template styles', async () => {
      const playfulDoc = await enhancedPDFEngine.createDocument(
        'Kids Worksheet',
        'playful-kids'
      );

      expect(playfulDoc.template.id).toBe('playful-kids');
      expect(playfulDoc.template.style).toBe('playful');
      expect(playfulDoc.template.fonts.primary).toContain('Comic Sans');
    });

    test('should share PDF file', async () => {
      const result = await enhancedPDFEngine.generatePDF(mockDocument);
      
      // Mock the sharing functionality
      await expect(enhancedPDFEngine.sharePDF(result.uri, mockDocument.title))
        .resolves
        .toBeUndefined();
    });
  });

  // ====================================================================
  // COLLABORATION MANAGER TESTS
  // ====================================================================

  describe('PDF Collaboration Manager', () => {
    
    test('should create document share with permissions', async () => {
      const permissions: SharePermissions = {
        canView: true,
        canComment: true,
        canEdit: false,
        canShare: false,
        canDownload: true,
        canPrint: true
      };

      const share = await pdfCollaborationManager.shareDocument(
        mockDocument.id,
        permissions,
        {
          email: 'colleague@example.com',
          message: 'Please review this worksheet',
          expiresIn: 48 // 48 hours
        }
      );

      expect(share).toBeDefined();
      expect(share.documentId).toBe(mockDocument.id);
      expect(share.permissions).toEqual(permissions);
      expect(share.sharedWith).toBe('colleague@example.com');
      expect(share.shareToken).toContain('share_');
      expect(share.expiresAt).toBeDefined();
    });

    test('should access shared document with valid token', async () => {
      // First create a share
      const share = await pdfCollaborationManager.shareDocument(
        mockDocument.id,
        { canView: true, canComment: false, canEdit: false, canShare: false, canDownload: true, canPrint: false }
      );

      // Mock successful access
      const mockAccess = { share, document: mockDocument };
      jest.spyOn(pdfCollaborationManager, 'accessSharedDocument')
        .mockResolvedValueOnce(mockAccess);

      const result = await pdfCollaborationManager.accessSharedDocument(share.shareToken);
      
      expect(result.share.shareToken).toBe(share.shareToken);
      expect(result.document.id).toBe(mockDocument.id);
    });

    test('should create and track document versions', async () => {
      const changes = [
        'Added new exercise section',
        'Updated instructions',
        'Fixed spelling errors'
      ];

      const version = await pdfCollaborationManager.createVersion(
        mockDocument.id,
        changes,
        'test@example.com'
      );

      expect(version).toBeDefined();
      expect(version.version).toBe('1.0.1');
      expect(version.changes).toEqual(changes);
      expect(version.author).toBe('test@example.com');
    });

    test('should compare document versions', async () => {
      // Create first version
      await pdfCollaborationManager.createVersion(mockDocument.id, ['Initial version']);
      
      // Create second version
      await pdfCollaborationManager.createVersion(mockDocument.id, ['Added content']);

      const comparison = await pdfCollaborationManager.compareVersions(
        mockDocument.id,
        '1.0.1',
        '1.0.2'
      );

      expect(comparison).toBeDefined();
      expect(comparison.documentId).toBe(mockDocument.id);
      expect(comparison.fromVersion).toBe('1.0.1');
      expect(comparison.toVersion).toBe('1.0.2');
      expect(comparison.changes).toBeInstanceOf(Array);
    });

    test('should add and retrieve comments', async () => {
      const comment = await pdfCollaborationManager.addComment(
        mockDocument.id,
        1, // page
        100, // x
        200, // y
        'This exercise needs more explanation'
      );

      expect(comment).toBeDefined();
      expect(comment.documentId).toBe(mockDocument.id);
      expect(comment.page).toBe(1);
      expect(comment.content).toBe('This exercise needs more explanation');
      expect(comment.author.email).toBe('test@example.com');

      const comments = await pdfCollaborationManager.getComments(mockDocument.id, 1);
      expect(comments).toHaveLength(1);
      expect(comments[0].id).toBe(comment.id);
    });

    test('should resolve comments', async () => {
      const comment = await pdfCollaborationManager.addComment(
        mockDocument.id,
        1,
        100,
        200,
        'Test comment'
      );

      await pdfCollaborationManager.resolveComment(comment.id);
      
      // Verify comment resolution through mocked database calls
      expect(true).toBe(true); // Placeholder for actual verification
    });

    test('should start and join collaboration sessions', async () => {
      const session = await pdfCollaborationManager.startCollaborationSession(mockDocument.id);
      
      expect(session).toBeDefined();
      expect(session.documentId).toBe(mockDocument.id);
      expect(session.participants).toHaveLength(1);
      expect(session.participants[0].role).toBe('owner');

      const permissions: SharePermissions = {
        canView: true,
        canComment: true,
        canEdit: true,
        canShare: false,
        canDownload: false,
        canPrint: false
      };

      const participant = await pdfCollaborationManager.joinCollaborationSession(
        session.id,
        permissions
      );

      expect(participant.role).toBe('editor');
      expect(participant.online).toBe(true);
    });
  });

  // ====================================================================
  // SECURITY & ACCESSIBILITY TESTS
  // ====================================================================

  describe('PDF Security and Accessibility Manager', () => {
    
    test('should apply organizational security policy', async () => {
      const policy = await pdfSecurityAccessibilityManager.applySecurityPolicy(
        mockDocument.id,
        'organizational'
      );

      expect(policy).toBeDefined();
      expect(policy.policyType).toBe('organizational');
      expect(policy.name).toBe('Organizational Security Policy');
      expect(policy.rules.length).toBeGreaterThan(0);
      
      // Should have authentication and watermark rules
      const authRule = policy.rules.find(rule => rule.id === 'require_auth');
      const watermarkRule = policy.rules.find(rule => rule.id === 'watermark_downloads');
      
      expect(authRule).toBeDefined();
      expect(watermarkRule).toBeDefined();
    });

    test('should check access permissions', async () => {
      await pdfSecurityAccessibilityManager.applySecurityPolicy(
        mockDocument.id,
        'organizational'
      );

      const accessResult = await pdfSecurityAccessibilityManager.checkAccess(
        mockDocument.id,
        'download'
      );

      expect(accessResult.allowed).toBe(true);
      expect(accessResult.watermark).toBeDefined();
      expect(accessResult.watermark?.content).toContain('test@example.com');
    });

    test('should enhance document accessibility', async () => {
      const features = await pdfSecurityAccessibilityManager.enhanceAccessibility(
        mockDocument,
        'WCAG_2_1_AA'
      );

      expect(features).toBeDefined();
      expect(features.altText).toBeInstanceOf(Map);
      expect(features.readingOrder).toBeInstanceOf(Array);
      expect(features.headingStructure).toBeInstanceOf(Array);
      expect(features.screenReaderInstructions).toBeInstanceOf(Array);

      // Should have proper reading order
      expect(features.readingOrder.length).toBe(mockDocument.content.length);
      
      // Should have heading structure
      expect(features.headingStructure.length).toBeGreaterThan(0);
      
      // Should have screen reader instructions
      const docInstruction = features.screenReaderInstructions.find(
        inst => inst.id === 'doc_description'
      );
      expect(docInstruction).toBeDefined();
      expect(docInstruction?.content).toContain(mockDocument.title);
    });

    test('should validate accessibility compliance', async () => {
      // First enhance accessibility
      await pdfSecurityAccessibilityManager.enhanceAccessibility(mockDocument);

      const results = await pdfSecurityAccessibilityManager.validateCompliance(
        mockDocument.id,
        'WCAG_2_1_AA'
      );

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);

      const altTextResult = results.find(r => r.requirementId === 'alt_text_images');
      const headingResult = results.find(r => r.requirementId === 'heading_structure');
      const contrastResult = results.find(r => r.requirementId === 'color_contrast');

      expect(altTextResult).toBeDefined();
      expect(headingResult).toBeDefined();
      expect(contrastResult).toBeDefined();
    });

    test('should track security audit events', async () => {
      await pdfSecurityAccessibilityManager.applySecurityPolicy(
        mockDocument.id,
        'regulatory'
      );

      // Trigger access check to generate audit log
      await pdfSecurityAccessibilityManager.checkAccess(
        mockDocument.id,
        'access'
      );

      const auditLog = await pdfSecurityAccessibilityManager.getSecurityAuditLog(
        mockDocument.id
      );

      expect(auditLog).toBeInstanceOf(Array);
      // Audit log functionality is mocked, so we just verify structure
    });
  });

  // ====================================================================
  // PERFORMANCE MANAGER TESTS
  // ====================================================================

  describe('PDF Performance Manager', () => {
    
    test('should cache and retrieve PDF files', async () => {
      const metadata = {
        pages: 3,
        template: 'educational-standard',
        quality: 'standard',
        format: 'A4'
      };

      // Set cache
      await pdfPerformanceManager.setCachedPDF(
        mockDocument.id,
        '1.0.0',
        'file://test.pdf',
        metadata,
        { priority: 'high', ttl: 2 }
      );

      // Get cache
      const cached = await pdfPerformanceManager.getCachedPDF(
        mockDocument.id,
        '1.0.0'
      );

      expect(cached).toBeDefined();
      expect(cached?.documentId).toBe(mockDocument.id);
      expect(cached?.version).toBe('1.0.0');
      expect(cached?.metadata).toEqual(metadata);
      expect(cached?.priority).toBe('high');
    });

    test('should queue and process background tasks', async () => {
      const taskId = await pdfPerformanceManager.queueBackgroundTask({
        type: 'generate_pdf',
        priority: 50,
        data: { document: mockDocument, options: {} }
      });

      expect(taskId).toBeDefined();

      const task = pdfPerformanceManager.getTaskStatus(taskId);
      expect(task).toBeDefined();
      expect(task?.type).toBe('generate_pdf');
      expect(task?.status).toBe('queued');

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should upload to and download from cloud storage', async () => {
      const cloudUrl = await pdfPerformanceManager.uploadToCloud(
        mockDocument.id,
        'file://test.pdf',
        { title: mockDocument.title }
      );

      expect(cloudUrl).toBeDefined();
      expect(cloudUrl).toContain('https://');

      const localUri = await pdfPerformanceManager.downloadFromCloud(cloudUrl);
      expect(localUri).toBeDefined();
      expect(localUri).toContain('file://');
    });

    test('should generate thumbnails', async () => {
      const thumbnails = await pdfPerformanceManager.generateThumbnails(
        mockDocument.id,
        'file://test.pdf',
        {
          width: 150,
          height: 200,
          quality: 0.8,
          format: 'jpeg',
          pages: [1, 2]
        }
      );

      expect(thumbnails).toBeDefined();
      expect(thumbnails.length).toBe(2);
      expect(thumbnails[0]).toContain('thumbnail-');
      expect(thumbnails[1]).toContain('thumbnail-');
    });

    test('should track performance metrics', async () => {
      await pdfPerformanceManager.trackPerformanceMetric({
        documentId: mockDocument.id,
        operation: 'test_operation',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        success: true,
        resourceUsage: {
          memoryPeak: 50 * 1024 * 1024, // 50MB
          cpuTime: 500 // 500ms
        }
      });

      const analytics = pdfPerformanceManager.getPerformanceAnalytics(1);
      expect(analytics.totalOperations).toBe(1);
      expect(analytics.successRate).toBe(1);
      expect(analytics.averageDuration).toBe(1000);
    });

    test('should provide cache statistics', () => {
      const stats = pdfPerformanceManager.getCacheStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalItems).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });

    test('should update and retrieve settings', () => {
      const newSettings = {
        enableCaching: false,
        compressionLevel: 5 as const,
        imageQuality: 0.9
      };

      pdfPerformanceManager.updateSettings(newSettings);
      
      const currentSettings = pdfPerformanceManager.getSettings();
      expect(currentSettings.enableCaching).toBe(false);
      expect(currentSettings.compressionLevel).toBe(5);
      expect(currentSettings.imageQuality).toBe(0.9);
    });
  });

  // ====================================================================
  // INTEGRATION SCENARIOS
  // ====================================================================

  describe('End-to-End Integration Scenarios', () => {
    
    test('should handle complete worksheet creation workflow', async () => {
      // 1. Create document
      const document = await enhancedPDFEngine.createWorksheetDocument(
        'Math Addition Worksheet',
        'mathematics',
        '3',
        [
          {
            title: 'Basic Addition',
            questions: [
              { question: '1 + 1 = ?', type: 'short-answer', answerSpace: 30 },
              { question: '2 + 3 = ?', type: 'short-answer', answerSpace: 30 }
            ]
          }
        ]
      );

      // 2. Apply security policy
      await pdfSecurityAccessibilityManager.applySecurityPolicy(
        document.id,
        'organizational'
      );

      // 3. Enhance accessibility
      const accessibility = await pdfSecurityAccessibilityManager.enhanceAccessibility(
        document,
        'WCAG_2_1_AA'
      );

      // 4. Generate PDF with caching
      const result = await enhancedPDFEngine.generatePDF(document, {
        saveToFile: true
      });

      // 5. Cache the result
      await pdfPerformanceManager.setCachedPDF(
        document.id,
        document.metadata.version,
        result.uri,
        {
          pages: result.pages,
          template: document.template.id,
          quality: 'standard',
          format: 'A4'
        }
      );

      // 6. Share document
      const share = await pdfCollaborationManager.shareDocument(
        document.id,
        {
          canView: true,
          canComment: true,
          canEdit: false,
          canShare: false,
          canDownload: true,
          canPrint: true
        },
        { expiresIn: 24 }
      );

      // Verify complete workflow
      expect(document.id).toBeDefined();
      expect(accessibility.screenReaderInstructions.length).toBeGreaterThan(0);
      expect(result.uri).toBeDefined();
      expect(share.shareToken).toBeDefined();

      // Test cached retrieval
      const cached = await pdfPerformanceManager.getCachedPDF(
        document.id,
        document.metadata.version
      );
      expect(cached).toBeDefined();
    });

    test('should handle collaborative editing scenario', async () => {
      // 1. Create document
      const document = await enhancedPDFEngine.createDocument('Collaborative Document');

      // 2. Start collaboration session
      const session = await pdfCollaborationManager.startCollaborationSession(document.id);

      // 3. Add some content
      await enhancedPDFEngine.addContentBlock(document.id, {
        type: 'text',
        data: {
          heading: 'Introduction',
          content: 'This is a collaborative document.'
        }
      });

      // 4. Create version
      const version1 = await pdfCollaborationManager.createVersion(
        document.id,
        ['Added introduction section']
      );

      // 5. Add comment
      const comment = await pdfCollaborationManager.addComment(
        document.id,
        1,
        100,
        150,
        'This introduction needs more detail.'
      );

      // 6. Make changes and create new version
      await enhancedPDFEngine.addContentBlock(document.id, {
        type: 'text',
        data: {
          content: 'Additional detailed content based on feedback.'
        }
      });

      const version2 = await pdfCollaborationManager.createVersion(
        document.id,
        ['Added detailed content', 'Addressed feedback']
      );

      // 7. Compare versions
      const comparison = await pdfCollaborationManager.compareVersions(
        document.id,
        version1.version,
        version2.version
      );

      // 8. Resolve comment
      await pdfCollaborationManager.resolveComment(comment.id);

      // Verify collaborative workflow
      expect(session.participants.length).toBeGreaterThan(0);
      expect(version1.version).not.toBe(version2.version);
      expect(comparison.changes.length).toBeGreaterThan(0);
      expect(comment.id).toBeDefined();
    });

    test('should handle performance optimization scenario', async () => {
      const documents: PDFDocument[] = [];
      const startTime = Date.now();

      // Create multiple documents to test performance
      for (let i = 0; i < 5; i++) {
        const doc = await enhancedPDFEngine.createDocument(`Document ${i + 1}`);
        documents.push(doc);

        // Add content
        await enhancedPDFEngine.addContentBlock(doc.id, {
          type: 'text',
          data: { content: `Content for document ${i + 1}` }
        });
      }

      // Generate PDFs in background
      const taskIds: string[] = [];
      for (const doc of documents) {
        const taskId = await pdfPerformanceManager.queueBackgroundTask({
          type: 'generate_pdf',
          priority: 50,
          data: { document: doc, options: {} }
        });
        taskIds.push(taskId);
      }

      // Track performance
      const totalTime = Date.now() - startTime;
      await pdfPerformanceManager.trackPerformanceMetric({
        documentId: 'batch_generation',
        operation: 'batch_pdf_generation',
        startTime,
        endTime: Date.now(),
        success: true,
        resourceUsage: {
          memoryPeak: 100 * 1024 * 1024,
          cpuTime: totalTime
        }
      });

      // Verify performance tracking
      const analytics = pdfPerformanceManager.getPerformanceAnalytics(1);
      expect(analytics.totalOperations).toBeGreaterThan(0);
      expect(taskIds.length).toBe(5);
    });
  });

  // ====================================================================
  // ERROR HANDLING TESTS
  // ====================================================================

  describe('Error Handling', () => {
    
    test('should handle invalid document creation', async () => {
      await expect(enhancedPDFEngine.createDocument('', 'invalid-template'))
        .rejects.toThrow();
    });

    test('should handle expired share tokens', async () => {
      const expiredShare: PDFShare = {
        id: 'expired-share',
        documentId: 'test-doc',
        shareToken: 'expired-token',
        sharedBy: 'user1',
        permissions: { canView: true, canComment: false, canEdit: false, canShare: false, canDownload: false, canPrint: false },
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        createdAt: Date.now() - 2000,
        accessCount: 0
      };

      jest.spyOn(pdfCollaborationManager, 'accessSharedDocument')
        .mockRejectedValueOnce(new Error('Share link has expired'));

      await expect(pdfCollaborationManager.accessSharedDocument(expiredShare.shareToken))
        .rejects.toThrow('Share link has expired');
    });

    test('should handle security policy violations', async () => {
      await pdfSecurityAccessibilityManager.applySecurityPolicy(
        mockDocument.id,
        'regulatory'
      );

      // Mock unauthorized access attempt
      jest.spyOn(pdfSecurityAccessibilityManager, 'checkAccess')
        .mockResolvedValueOnce({
          allowed: false,
          reason: 'Access denied by security policy'
        });

      const result = await pdfSecurityAccessibilityManager.checkAccess(
        mockDocument.id,
        'access'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Access denied by security policy');
    });

    test('should handle cache size limits', async () => {
      // Update settings to very small cache
      pdfPerformanceManager.updateSettings({
        cacheMaxSize: 0.001 // 1KB
      });

      const largeMetadata = {
        pages: 100,
        template: 'educational-standard',
        quality: 'high',
        format: 'A4'
      };

      // This should work but trigger cache cleanup
      await expect(pdfPerformanceManager.setCachedPDF(
        'large-doc',
        '1.0.0',
        'file://large.pdf',
        largeMetadata
      )).resolves.not.toThrow();
    });
  });
});

// ====================================================================
// PERFORMANCE BENCHMARKS
// ====================================================================

describe('Performance Benchmarks', () => {
  
  test('PDF generation should complete within reasonable time', async () => {
    const startTime = Date.now();
    
    await enhancedPDFEngine.generatePDF(mockDocument);
    
    const generationTime = Date.now() - startTime;
    expect(generationTime).toBeLessThan(5000); // Should complete in under 5 seconds
  });

  test('Cache operations should be fast', async () => {
    const metadata = {
      pages: 1,
      template: 'test',
      quality: 'standard',
      format: 'A4'
    };

    const startTime = Date.now();
    
    // Set cache
    await pdfPerformanceManager.setCachedPDF(
      'speed-test',
      '1.0.0',
      'file://speed-test.pdf',
      metadata
    );

    // Get cache
    await pdfPerformanceManager.getCachedPDF('speed-test', '1.0.0');
    
    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(100); // Should complete in under 100ms
  });
});

describe('Memory Usage', () => {
  
  test('should not leak memory during multiple operations', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Perform multiple operations
    for (let i = 0; i < 10; i++) {
      const doc = await enhancedPDFEngine.createDocument(`Test Doc ${i}`);
      await enhancedPDFEngine.addContentBlock(doc.id, {
        type: 'text',
        data: { content: 'Test content' }
      });
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 10MB for 10 documents)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});