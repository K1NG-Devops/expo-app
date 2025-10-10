/**
 * App Data Connectors
 * 
 * Read-only connectors for accessing app entities to enrich
 * assistant responses and suggestions.
 */

import { assertSupabase } from '@/lib/supabase';
import { trackAssistantBreadcrumb } from '@/lib/monitoring';

export interface Student {
  id: string;
  name: string;
  class_id?: string;
  grade?: string;
}

export interface Class {
  id: string;
  name: string;
  grade_level?: string;
  teacher_id?: string;
}

export interface Lesson {
  id: string;
  title: string;
  subject?: string;
  grade_level?: string;
  created_at?: string;
}

export interface Assignment {
  id: string;
  title: string;
  subject?: string;
  class_id?: string;
  due_date?: string;
}

export interface ParentGroup {
  id: string;
  name: string;
  class_id?: string;
  parent_count?: number;
}

export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  template: string;
  category: 'attendance' | 'behavior' | 'academic' | 'general';
}

/**
 * Student data connector
 */
export class StudentConnector {
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();

  static async listStudents(limit: number = 50): Promise<Student[]> {
    try {
      const cacheKey = `students_${limit}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      const client = assertSupabase();
      
      const { data, error } = await client
        .from('students')
        .select('id, name, class_id, grade_level')
        .limit(limit);

      if (error) {
        console.warn('[StudentConnector] Failed to fetch students:', error);
        return [];
      }

      const students: Student[] = (data || []).map(row => ({
        id: row.id,
        name: row.name || 'Unnamed Student',
        class_id: row.class_id,
        grade: row.grade_level,
      }));

      this.cache.set(cacheKey, { data: students, timestamp: Date.now() });
      
      trackAssistantBreadcrumb('Students fetched', {
        count: students.length,
        cached: false,
      });

      return students;
    } catch (error) {
      console.warn('[StudentConnector] Error fetching students:', error);
      return [];
    }
  }

  static async getClasses(): Promise<Class[]> {
    try {
      const cacheKey = 'classes';
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      const client = assertSupabase();
      
      const { data, error } = await client
        .from('classes')
        .select('id, name, grade_level, teacher_id')
        .limit(100);

      if (error) {
        console.warn('[StudentConnector] Failed to fetch classes:', error);
        return [];
      }

      const classes: Class[] = (data || []).map(row => ({
        id: row.id,
        name: row.name || 'Unnamed Class',
        grade_level: row.grade_level,
        teacher_id: row.teacher_id,
      }));

      this.cache.set(cacheKey, { data: classes, timestamp: Date.now() });
      
      return classes;
    } catch (error) {
      console.warn('[StudentConnector] Error fetching classes:', error);
      return [];
    }
  }

  static async searchByName(query: string): Promise<Student[]> {
    try {
      const client = assertSupabase();
      
      const { data, error } = await client
        .from('students')
        .select('id, name, class_id, grade_level')
        .ilike('name', `%${query}%`)
        .limit(20);

      if (error) {
        console.warn('[StudentConnector] Failed to search students:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        name: row.name || 'Unnamed Student',
        class_id: row.class_id,
        grade: row.grade_level,
      }));
    } catch (error) {
      console.warn('[StudentConnector] Error searching students:', error);
      return [];
    }
  }
}

/**
 * Lesson data connector
 */
export class LessonConnector {
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();

  static async recentLessons(limit: number = 20): Promise<Lesson[]> {
    try {
      const cacheKey = `recent_lessons_${limit}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      const client = assertSupabase();
      
      const { data, error } = await client
        .from('lessons')
        .select('id, title, subject, grade_level, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('[LessonConnector] Failed to fetch recent lessons:', error);
        return [];
      }

      const lessons: Lesson[] = (data || []).map(row => ({
        id: row.id,
        title: row.title || 'Untitled Lesson',
        subject: row.subject,
        grade_level: row.grade_level,
        created_at: row.created_at,
      }));

      this.cache.set(cacheKey, { data: lessons, timestamp: Date.now() });
      
      return lessons;
    } catch (error) {
      console.warn('[LessonConnector] Error fetching recent lessons:', error);
      return [];
    }
  }

  static async categories(): Promise<string[]> {
    try {
      const cacheKey = 'lesson_categories';
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data;
      }

      const client = assertSupabase();
      
      const { data, error } = await client
        .from('lessons')
        .select('subject')
        .not('subject', 'is', null);

      if (error) {
        console.warn('[LessonConnector] Failed to fetch categories:', error);
        return [];
      }

      const categories = [...new Set((data || []).map(row => row.subject))].filter(Boolean);
      this.cache.set(cacheKey, { data: categories, timestamp: Date.now() });
      
      return categories;
    } catch (error) {
      console.warn('[LessonConnector] Error fetching categories:', error);
      return [];
    }
  }

  static async standards(): Promise<string[]> {
    // Simplified implementation - in a real app this would fetch from a standards table
    return [
      'CAPS Mathematics',
      'CAPS Languages', 
      'CAPS Life Skills',
      'CAPS Natural Sciences',
      'Common Core Math',
      'Common Core ELA'
    ];
  }
}

/**
 * Messaging data connector
 */
export class MessagingConnector {
  static async parentGroups(): Promise<ParentGroup[]> {
    try {
      // Simplified implementation - in a real app this would fetch from parent groups
      return [
        { id: '1', name: 'Grade R Parents', class_id: '1', parent_count: 12 },
        { id: '2', name: 'Grade 1 Parents', class_id: '2', parent_count: 15 },
        { id: '3', name: 'All Parents', parent_count: 45 },
      ];
    } catch (error) {
      console.warn('[MessagingConnector] Error fetching parent groups:', error);
      return [];
    }
  }

  static async sendDraft(template: string, recipients: string[]): Promise<{ success: boolean; preview: string }> {
    // Dry-run implementation for creating message drafts
    const preview = `Draft message to ${recipients.length} recipients:\n\n${template}`;
    
    trackAssistantBreadcrumb('Message draft created', {
      recipient_count: recipients.length,
      template_length: template.length,
    });
    
    return { success: true, preview };
  }

  static async templates(): Promise<MessageTemplate[]> {
    return [
      {
        id: '1',
        name: 'Weekly Progress Update',
        subject: 'Weekly Progress Report for {student_name}',
        template: 'Dear {parent_name},\n\nHere is {student_name}\'s progress for this week...',
        category: 'academic',
      },
      {
        id: '2',
        name: 'Attendance Reminder',
        subject: 'Attendance Notice',
        template: 'Dear Parents,\n\nWe noticed some irregular attendance patterns...',
        category: 'attendance',
      },
      {
        id: '3',
        name: 'Positive Behavior',
        subject: 'Great News About {student_name}',
        template: 'Dear {parent_name},\n\nI wanted to share some wonderful news about {student_name}...',
        category: 'behavior',
      },
    ];
  }
}

/**
 * Unified search across all entities
 */
export class UnifiedSearchConnector {
  static async search(query: string, types: ('students' | 'classes' | 'lessons')[] = ['students', 'classes', 'lessons']) {
    const results: {
      students: Student[];
      classes: Class[];
      lessons: Lesson[];
    } = {
      students: [],
      classes: [],
      lessons: [],
    };

    // Search students
    if (types.includes('students')) {
      results.students = await StudentConnector.searchByName(query);
    }

    // Search lessons by title
    if (types.includes('lessons')) {
      try {
        const client = assertSupabase();
        const { data } = await client
          .from('lessons')
          .select('id, title, subject, grade_level, created_at')
          .ilike('title', `%${query}%`)
          .limit(10);

        results.lessons = (data || []).map(row => ({
          id: row.id,
          title: row.title || 'Untitled Lesson',
          subject: row.subject,
          grade_level: row.grade_level,
          created_at: row.created_at,
        }));
      } catch (error) {
        console.warn('[UnifiedSearch] Error searching lessons:', error);
      }
    }

    trackAssistantBreadcrumb('Unified search performed', {
      query,
      types,
      results_count: results.students.length + results.classes.length + results.lessons.length,
    });

    return results;
  }
}