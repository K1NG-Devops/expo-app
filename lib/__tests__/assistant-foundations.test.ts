/**
 * Assistant Foundation Integration Tests
 * 
 * Tests for the core assistant enhancement foundations:
 * - Feature flags and monitoring utilities
 * - Assistant Context Bridge
 * - App Data Connectors
 * - Enhanced navigation system
 */

import { getFeatureFlagsSync } from '../featureFlags';
import { generateCorrelationId, trackAssistantEvent, trackAssistantBreadcrumb } from '../monitoring';
import { assistantContextBridge } from '../AssistantContextBridge';
import { StudentConnector, LessonConnector, MessagingConnector } from '../AppDataConnectors';

// Mock AsyncStorage for testing
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock Supabase for testing
jest.mock('../supabase', () => ({
  assertSupabase: () => ({
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
        order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
        ilike: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
        not: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  }),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

describe('Assistant Foundations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Feature Flags', () => {
    it('should return assistant v2 flags', () => {
      const flags = getFeatureFlagsSync();
      
      expect(flags).toHaveProperty('assistant_v2');
      expect(flags).toHaveProperty('assistant_voice_overlay');
      expect(flags).toHaveProperty('assistant_quota_prefetch');
      expect(flags).toHaveProperty('assistant_semantic_memory');
    });
  });

  describe('Monitoring Utilities', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      
      expect(id1).toMatch(/^dash_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^dash_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should track assistant events without errors', () => {
      expect(() => {
        trackAssistantEvent('test.event', {
          correlation_id: 'test-123',
          conversation_id: 'conv-456',
        });
      }).not.toThrow();
    });

    it('should add breadcrumbs without errors', () => {
      expect(() => {
        trackAssistantBreadcrumb('Test breadcrumb', {
          test_data: 'value',
        });
      }).not.toThrow();
    });
  });

  describe('Assistant Context Bridge', () => {
    it('should initialize without errors', async () => {
      await expect(assistantContextBridge.initialize()).resolves.not.toThrow();
    });

    it('should update current route', () => {
      const testPath = '/screens/test-screen';
      const testParams = { param1: 'value1' };

      assistantContextBridge.updateCurrentRoute(testPath, testParams);
      
      const currentRoute = assistantContextBridge.getCurrentRoute();
      expect(currentRoute).toMatchObject({
        pathname: testPath,
        params: testParams,
      });
    });

    it('should provide context snapshot', () => {
      const snapshot = assistantContextBridge.getContextSnapshot();
      
      expect(snapshot).toHaveProperty('current_route');
      expect(snapshot).toHaveProperty('recent_routes');
      expect(snapshot).toHaveProperty('user_context');
      expect(snapshot).toHaveProperty('app_state');
      
      expect(snapshot.user_context).toHaveProperty('session_duration');
      expect(snapshot.user_context).toHaveProperty('screen_transitions');
      expect(snapshot.user_context).toHaveProperty('last_activity');
    });

    it('should provide route-specific context', () => {
      assistantContextBridge.updateCurrentRoute('/screens/lesson-generator', {
        subject: 'math',
        grade: '3',
      });
      
      const context = assistantContextBridge.getRouteSpecificContext();
      
      expect(context).toHaveProperty('current_screen');
      expect(context).toHaveProperty('screen_type');
      expect(context.screen_type).toBe('lesson');
    });
  });

  describe('App Data Connectors', () => {
    describe('StudentConnector', () => {
      it('should list students without errors', async () => {
        const students = await StudentConnector.listStudents(10);
        expect(Array.isArray(students)).toBe(true);
      });

      it('should get classes without errors', async () => {
        const classes = await StudentConnector.getClasses();
        expect(Array.isArray(classes)).toBe(true);
      });

      it('should search students by name', async () => {
        const results = await StudentConnector.searchByName('test');
        expect(Array.isArray(results)).toBe(true);
      });
    });

    describe('LessonConnector', () => {
      it('should get recent lessons', async () => {
        const lessons = await LessonConnector.recentLessons(5);
        expect(Array.isArray(lessons)).toBe(true);
      });

      it('should get lesson categories', async () => {
        const categories = await LessonConnector.categories();
        expect(Array.isArray(categories)).toBe(true);
      });

      it('should get curriculum standards', async () => {
        const standards = await LessonConnector.standards();
        expect(Array.isArray(standards)).toBe(true);
        expect(standards.length).toBeGreaterThan(0);
      });
    });

    describe('MessagingConnector', () => {
      it('should get parent groups', async () => {
        const groups = await MessagingConnector.parentGroups();
        expect(Array.isArray(groups)).toBe(true);
      });

      it('should create message drafts', async () => {
        const result = await MessagingConnector.sendDraft(
          'Test message template',
          ['parent1', 'parent2']
        );
        
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('preview');
        expect(result.success).toBe(true);
      });

      it('should get message templates', async () => {
        const templates = await MessagingConnector.templates();
        expect(Array.isArray(templates)).toBe(true);
        expect(templates.length).toBeGreaterThan(0);
      });
    });
  });
});