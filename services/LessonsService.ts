/**
 * Lessons Service
 * 
 * Handles all lesson-related API calls, data fetching, and management
 * for the comprehensive lessons hub system.
 */

import { assertSupabase } from '@/lib/supabase';
import { getCurrentSession } from '@/lib/sessionManager';
import {
  Lesson,
  LessonCategory,
  LessonSkillLevel,
  LessonTag,
  LessonProgress,
  LessonReview,
  LessonPlan,
  LessonSearchFilters,
  LessonSearchResult,
  LessonSortOption,
  LessonAnalytics,
  DEFAULT_LESSON_CATEGORIES,
  DEFAULT_SKILL_LEVELS,
  COMMON_LESSON_TAGS,
} from '@/types/lessons';

export class LessonsService {
  private static instance: LessonsService;
  private supabase = assertSupabase();

  public static getInstance(): LessonsService {
    if (!LessonsService.instance) {
      LessonsService.instance = new LessonsService();
    }
    return LessonsService.instance;
  }

  /**
   * Get all lesson categories
   */
  async getCategories(): Promise<LessonCategory[]> {
    try {
      const { data, error } = await this.supabase
        .from('lesson_categories')
        .select('*')
        .order('order', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        // Return default categories as fallback
        return DEFAULT_LESSON_CATEGORIES;
      }

      return data || DEFAULT_LESSON_CATEGORIES;
    } catch (error) {
      console.error('Error in getCategories:', error);
      return DEFAULT_LESSON_CATEGORIES;
    }
  }

  /**
   * Get all skill levels
   */
  async getSkillLevels(): Promise<LessonSkillLevel[]> {
    try {
      const { data, error } = await this.supabase
        .from('lesson_skill_levels')
        .select('*')
        .order('order', { ascending: true });

      if (error) {
        console.error('Error fetching skill levels:', error);
        return DEFAULT_SKILL_LEVELS;
      }

      return data || DEFAULT_SKILL_LEVELS;
    } catch (error) {
      console.error('Error in getSkillLevels:', error);
      return DEFAULT_SKILL_LEVELS;
    }
  }

  /**
   * Get all lesson tags
   */
  async getTags(): Promise<LessonTag[]> {
    try {
      const { data, error } = await this.supabase
        .from('lesson_tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching tags:', error);
        return COMMON_LESSON_TAGS;
      }

      return data || COMMON_LESSON_TAGS;
    } catch (error) {
      console.error('Error in getTags:', error);
      return COMMON_LESSON_TAGS;
    }
  }

  /**
   * Search lessons with filters and pagination
   */
  async searchLessons(
    query: string = '',
    filters: LessonSearchFilters = {},
    sortBy: LessonSortOption = 'newest',
    page: number = 1,
    pageSize: number = 20
  ): Promise<LessonSearchResult> {
    try {
      let queryBuilder = this.supabase
        .from('lessons')
        .select(`
          *,
          category:lesson_categories(*),
          skill_level:lesson_skill_levels(*),
          tags:lesson_lesson_tags(lesson_tag:lesson_tags(*)),
          progress:lesson_progress(*)
        `)
        .eq('status', 'published');

      // Apply text search
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%,short_description.ilike.%${query}%`);
      }

      // Apply filters
      if (filters.category_ids?.length) {
        queryBuilder = queryBuilder.in('category_id', filters.category_ids);
      }

      if (filters.skill_level_ids?.length) {
        queryBuilder = queryBuilder.in('skill_level_id', filters.skill_level_ids);
      }

      if (filters.age_range) {
        if (filters.age_range.min_age) {
          queryBuilder = queryBuilder.gte('age_range->min_age', filters.age_range.min_age);
        }
        if (filters.age_range.max_age) {
          queryBuilder = queryBuilder.lte('age_range->max_age', filters.age_range.max_age);
        }
      }

      if (filters.duration_range) {
        if (filters.duration_range.min_duration) {
          queryBuilder = queryBuilder.gte('estimated_duration', filters.duration_range.min_duration);
        }
        if (filters.duration_range.max_duration) {
          queryBuilder = queryBuilder.lte('estimated_duration', filters.duration_range.max_duration);
        }
      }

      if (filters.difficulty_range) {
        if (filters.difficulty_range.min_difficulty) {
          queryBuilder = queryBuilder.gte('difficulty_rating', filters.difficulty_range.min_difficulty);
        }
        if (filters.difficulty_range.max_difficulty) {
          queryBuilder = queryBuilder.lte('difficulty_rating', filters.difficulty_range.max_difficulty);
        }
      }

      if (filters.rating_threshold) {
        queryBuilder = queryBuilder.gte('rating', filters.rating_threshold);
      }

      if (filters.is_featured !== undefined) {
        queryBuilder = queryBuilder.eq('is_featured', filters.is_featured);
      }

      if (filters.is_premium !== undefined) {
        queryBuilder = queryBuilder.eq('is_premium', filters.is_premium);
      }

      if (filters.language) {
        queryBuilder = queryBuilder.eq('language', filters.language);
      }

      if (filters.organization_id) {
        queryBuilder = queryBuilder.eq('organization_id', filters.organization_id);
      }

      // Apply sorting
      switch (sortBy) {
        case 'newest':
          queryBuilder = queryBuilder.order('created_at', { ascending: false });
          break;
        case 'oldest':
          queryBuilder = queryBuilder.order('created_at', { ascending: true });
          break;
        case 'most_popular':
          queryBuilder = queryBuilder.order('completion_count', { ascending: false });
          break;
        case 'highest_rated':
          queryBuilder = queryBuilder.order('rating', { ascending: false });
          break;
        case 'duration_short':
          queryBuilder = queryBuilder.order('estimated_duration', { ascending: true });
          break;
        case 'duration_long':
          queryBuilder = queryBuilder.order('estimated_duration', { ascending: false });
          break;
        case 'difficulty_easy':
          queryBuilder = queryBuilder.order('difficulty_rating', { ascending: true });
          break;
        case 'difficulty_hard':
          queryBuilder = queryBuilder.order('difficulty_rating', { ascending: false });
          break;
        case 'alphabetical':
          queryBuilder = queryBuilder.order('title', { ascending: true });
          break;
        case 'completion_count':
          queryBuilder = queryBuilder.order('completion_count', { ascending: false });
          break;
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      queryBuilder = queryBuilder.range(from, to);

      const { data, error, count } = await queryBuilder;

      if (error) {
        console.error('Error searching lessons:', error);
        return this.getEmptySearchResult(page, pageSize);
      }

      // Get facets for filtering UI
      const facets = await this.getFacets(filters);

      return {
        lessons: data || [],
        total_count: count || 0,
        page,
        page_size: pageSize,
        total_pages: Math.ceil((count || 0) / pageSize),
        facets,
      };
    } catch (error) {
      console.error('Error in searchLessons:', error);
      return this.getEmptySearchResult(page, pageSize);
    }
  }

  /**
   * Get lesson by ID with full details
   */
  async getLessonById(lessonId: string): Promise<Lesson | null> {
    try {
      const { data, error } = await this.supabase
        .from('lessons')
        .select(`
          *,
          category:lesson_categories(*),
          skill_level:lesson_skill_levels(*),
          tags:lesson_lesson_tags(lesson_tag:lesson_tags(*)),
          steps:lesson_steps(*),
          resources:lesson_resources(*),
          assessments:lesson_assessments(*),
          learning_objectives:lesson_learning_objectives(*),
          progress:lesson_progress(*)
        `)
        .eq('id', lessonId)
        .single();

      if (error) {
        console.error('Error fetching lesson:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getLessonById:', error);
      return null;
    }
  }

  /**
   * Get featured lessons
   */
  async getFeaturedLessons(limit: number = 10): Promise<Lesson[]> {
    try {
      const { data, error } = await this.supabase
        .from('lessons')
        .select(`
          *,
          category:lesson_categories(*),
          skill_level:lesson_skill_levels(*),
          tags:lesson_lesson_tags(lesson_tag:lesson_tags(*))
        `)
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching featured lessons:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getFeaturedLessons:', error);
      return [];
    }
  }

  /**
   * Get popular lessons
   */
  async getPopularLessons(limit: number = 10): Promise<Lesson[]> {
    try {
      const { data, error } = await this.supabase
        .from('lessons')
        .select(`
          *,
          category:lesson_categories(*),
          skill_level:lesson_skill_levels(*),
          tags:lesson_lesson_tags(lesson_tag:lesson_tags(*))
        `)
        .eq('status', 'published')
        .order('completion_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching popular lessons:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPopularLessons:', error);
      return [];
    }
  }

  /**
   * Get lessons by category
   */
  async getLessonsByCategory(categoryId: string, limit: number = 20): Promise<Lesson[]> {
    try {
      const { data, error } = await this.supabase
        .from('lessons')
        .select(`
          *,
          category:lesson_categories(*),
          skill_level:lesson_skill_levels(*),
          tags:lesson_lesson_tags(lesson_tag:lesson_tags(*))
        `)
        .eq('status', 'published')
        .eq('category_id', categoryId)
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching lessons by category:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getLessonsByCategory:', error);
      return [];
    }
  }

  /**
   * Get user's lesson progress
   */
  async getUserLessonProgress(lessonId: string): Promise<LessonProgress | null> {
    try {
      const session = await getCurrentSession();
      if (!session) return null;

      const { data, error } = await this.supabase
        .from('lesson_progress')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', session.user_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching lesson progress:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserLessonProgress:', error);
      return null;
    }
  }

  /**
   * Update lesson progress
   */
  async updateLessonProgress(
    lessonId: string,
    progress: Partial<LessonProgress>
  ): Promise<LessonProgress | null> {
    try {
      const session = await getCurrentSession();
      if (!session) return null;

      const existingProgress = await this.getUserLessonProgress(lessonId);

      const progressData = {
        lesson_id: lessonId,
        user_id: session.user_id,
        ...progress,
        last_accessed_at: new Date().toISOString(),
      };

      let data, error;
      
      if (existingProgress) {
        ({ data, error } = await this.supabase
          .from('lesson_progress')
          .update(progressData)
          .eq('id', existingProgress.id)
          .select()
          .single());
      } else {
        progressData.started_at = new Date().toISOString();
        ({ data, error } = await this.supabase
          .from('lesson_progress')
          .insert(progressData)
          .select()
          .single());
      }

      if (error) {
        console.error('Error updating lesson progress:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateLessonProgress:', error);
      return null;
    }
  }

  /**
   * Get lesson reviews
   */
  async getLessonReviews(
    lessonId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ reviews: LessonReview[]; total_count: number }> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await this.supabase
        .from('lesson_reviews')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching lesson reviews:', error);
        return { reviews: [], total_count: 0 };
      }

      return {
        reviews: data || [],
        total_count: count || 0,
      };
    } catch (error) {
      console.error('Error in getLessonReviews:', error);
      return { reviews: [], total_count: 0 };
    }
  }

  /**
   * Add lesson review
   */
  async addLessonReview(
    lessonId: string,
    rating: number,
    reviewText: string
  ): Promise<LessonReview | null> {
    try {
      const session = await getCurrentSession();
      if (!session) return null;

      const reviewData = {
        lesson_id: lessonId,
        user_id: session.user_id,
        rating,
        review_text: reviewText,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('lesson_reviews')
        .insert(reviewData)
        .select()
        .single();

      if (error) {
        console.error('Error adding lesson review:', error);
        return null;
      }

      // Update lesson rating
      await this.updateLessonRating(lessonId);

      return data;
    } catch (error) {
      console.error('Error in addLessonReview:', error);
      return null;
    }
  }

  /**
   * Bookmark/unbookmark lesson
   */
  async toggleLessonBookmark(lessonId: string): Promise<boolean> {
    try {
      const session = await getCurrentSession();
      if (!session) return false;

      const existingProgress = await this.getUserLessonProgress(lessonId);
      const isBookmarked = !!existingProgress?.bookmarked_at;

      await this.updateLessonProgress(lessonId, {
        bookmarked_at: isBookmarked ? undefined : new Date().toISOString(),
      });

      return !isBookmarked;
    } catch (error) {
      console.error('Error in toggleLessonBookmark:', error);
      return false;
    }
  }

  /**
   * Get user's bookmarked lessons
   */
  async getUserBookmarkedLessons(): Promise<Lesson[]> {
    try {
      const session = await getCurrentSession();
      if (!session) return [];

      const { data, error } = await this.supabase
        .from('lesson_progress')
        .select(`
          lesson:lessons(
            *,
            category:lesson_categories(*),
            skill_level:lesson_skill_levels(*),
            tags:lesson_lesson_tags(lesson_tag:lesson_tags(*))
          )
        `)
        .eq('user_id', session.user_id)
        .not('bookmarked_at', 'is', null)
        .order('bookmarked_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookmarked lessons:', error);
        return [];
      }

      return data?.map((item: any) => item.lesson).filter(Boolean) || [];
    } catch (error) {
      console.error('Error in getUserBookmarkedLessons:', error);
      return [];
    }
  }

  /**
   * Get user's lesson progress history
   */
  async getUserLessonHistory(): Promise<Lesson[]> {
    try {
      const session = await getCurrentSession();
      if (!session) return [];

      const { data, error } = await this.supabase
        .from('lesson_progress')
        .select(`
          lesson:lessons(
            *,
            category:lesson_categories(*),
            skill_level:lesson_skill_levels(*),
            tags:lesson_lesson_tags(lesson_tag:lesson_tags(*))
          ),
          progress_percentage,
          status,
          last_accessed_at
        `)
        .eq('user_id', session.user_id)
        .order('last_accessed_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching lesson history:', error);
        return [];
      }

      return data?.map((item: any) => ({
        ...item.lesson,
        user_progress: {
          progress_percentage: item.progress_percentage,
          status: item.status,
          last_accessed_at: item.last_accessed_at,
        },
      })).filter(Boolean) || [];
    } catch (error) {
      console.error('Error in getUserLessonHistory:', error);
      return [];
    }
  }

  /**
   * Get lesson analytics (for educators)
   */
  async getLessonAnalytics(lessonId: string): Promise<LessonAnalytics | null> {
    try {
      // This would typically be a database function or complex query
      // For now, return mock analytics
      return {
        lesson_id: lessonId,
        total_views: 0,
        total_starts: 0,
        total_completions: 0,
        completion_rate: 0,
        average_rating: 0,
        average_duration: 0,
        popular_exit_points: [],
        common_difficulties: [],
      };
    } catch (error) {
      console.error('Error in getLessonAnalytics:', error);
      return null;
    }
  }

  // Private helper methods

  private async getFacets(filters: LessonSearchFilters) {
    // This would typically be implemented with proper aggregation queries
    // For now, return empty facets
    return {
      categories: [],
      skill_levels: [],
      tags: [],
      age_ranges: [],
      durations: [],
      difficulties: [],
    };
  }

  private getEmptySearchResult(page: number, pageSize: number): LessonSearchResult {
    return {
      lessons: [],
      total_count: 0,
      page,
      page_size: pageSize,
      total_pages: 0,
      facets: {
        categories: [],
        skill_levels: [],
        tags: [],
        age_ranges: [],
        durations: [],
        difficulties: [],
      },
    };
  }

  private async updateLessonRating(lessonId: string): Promise<void> {
    try {
      // This would typically be a database function to recalculate the average rating
      // For now, just log the operation
      console.log('Updating lesson rating for lesson:', lessonId);
    } catch (error) {
      console.error('Error updating lesson rating:', error);
    }
  }
}

export default LessonsService;