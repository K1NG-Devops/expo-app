/**
 * Direct Database AI Allocation Implementation
 * 
 * This is a temporary implementation that works directly with database tables
 * instead of relying on Edge Functions, allowing us to test the AI Quota
 * Management system with real data before the serverless functions are deployed.
 */

import { assertSupabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { reportError } from '@/lib/monitoring';
import type { SchoolAISubscription, TeacherAIAllocation } from './allocation';

/**
 * Get school AI subscription details - fallback implementation
 */
export async function getSchoolAISubscriptionDirect(preschoolId: string): Promise<SchoolAISubscription | null> {
  try {
    const client = assertSupabase();
    
    // Get basic school info and subscription details
    const { data: school, error: schoolError } = await client
      .from('preschools')
      .select('id, name, subscription_tier, subscription_plan')
      .eq('id', preschoolId)
      .single();

    if (schoolError || !school) {
      console.warn('School not found:', schoolError);
      return null;
    }

    // Create a mock subscription based on tier
    const tier = school.subscription_tier || 'enterprise';
    const baseQuotas = getBaseQuotasByTier(tier);

    const subscription: SchoolAISubscription = {
      preschool_id: preschoolId,
      subscription_tier: tier as any,
      org_type: 'preschool' as any,
      total_quotas: baseQuotas,
      allocated_quotas: {
        'chat_completions': 0,
        'image_generation': 0,
        'text_to_speech': 0,
        'speech_to_text': 0,
      },
      available_quotas: baseQuotas,
      total_usage: {
        'chat_completions': 0,
        'image_generation': 0,
        'text_to_speech': 0,
        'speech_to_text': 0,
      },
      allow_teacher_self_allocation: false,
      default_teacher_quotas: {
        'chat_completions': 100,
        'image_generation': 10,
        'text_to_speech': 50,
        'speech_to_text': 50,
      },
      max_individual_quota: {
        'chat_completions': Math.floor(baseQuotas.chat_completions * 0.5),
        'image_generation': Math.floor(baseQuotas.image_generation * 0.5),
        'text_to_speech': Math.floor(baseQuotas.text_to_speech * 0.5),
        'speech_to_text': Math.floor(baseQuotas.speech_to_text * 0.5),
      },
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    };

    return subscription;
  } catch (error) {
    reportError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'getSchoolAISubscriptionDirect',
      preschool_id: preschoolId,
    });
    return null;
  }
}

/**
 * Get teacher allocations - fallback implementation using users table
 */
export async function getTeacherAllocationsDirect(preschoolId: string): Promise<TeacherAIAllocation[]> {
  try {
    const client = assertSupabase();
    
    // Use service role to bypass RLS when available in server context
    // Get all teachers in the school - try both users and profiles tables
    let teachers = [];
    let teachersError = null;
    
    // First try users table
    try {
      const { data: usersData, error: usersErr } = await client
        .from('users')
        .select('id, email, role, first_name, last_name, is_active')
        .eq('preschool_id', preschoolId)
        .in('role', ['teacher', 'principal', 'principal_admin']);
      
      if (!usersErr && usersData && usersData.length > 0) {
        teachers = usersData;
      } else {
        teachersError = usersErr;
      }
    } catch (usersException) {
      teachersError = usersException;
    }
    
    // Fallback to profiles table if users didn't work
    if (teachers.length === 0) {
      try {
        const { data: profilesData, error: profilesErr } = await client
          .from('profiles')
          .select('id, email, role, first_name, last_name, is_active, preschool_id')
          .eq('preschool_id', preschoolId)
          .in('role', ['teacher', 'principal', 'principal_admin']);
        
        if (!profilesErr && profilesData && profilesData.length > 0) {
          teachers = profilesData;
          teachersError = null;
        }
      } catch (profilesException) {
        console.warn('Profiles fallback also failed:', profilesException);
      }
    }

    if (teachersError && teachers.length === 0) {
      console.warn('Failed to fetch teachers:', teachersError);
      return [];
    }

    if (!teachers || teachers.length === 0) {
      console.log('No teachers found for school:', preschoolId);
      return [];
    }

    // Create mock allocations for each teacher
    const allocations: TeacherAIAllocation[] = teachers.map((teacher) => {
      const isActive = teacher.is_active !== false;
      const role = teacher.role || 'teacher';
      const baseQuotas = getDefaultTeacherQuotas(role);
      
      // Generate name from email if first/last name is missing
      const firstName = teacher.first_name || teacher.email.split('@')[0] || 'Teacher';
      const lastName = teacher.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      return {
        id: `allocation-${teacher.id}`,
        preschool_id: preschoolId,
        user_id: teacher.id,
        teacher_id: teacher.id, // Add this field for compatibility
        teacher_name: fullName,
        full_name: fullName,
        teacher_email: teacher.email || 'no-email@example.com',
        email: teacher.email || 'no-email@example.com',
        role: role,
        allocated_quotas: baseQuotas,
        used_quotas: {
          'chat_completions': Math.floor(Math.random() * (baseQuotas.chat_completions * 0.6)),
          'image_generation': Math.floor(Math.random() * (baseQuotas.image_generation * 0.4)),
          'text_to_speech': Math.floor(Math.random() * (baseQuotas.text_to_speech * 0.3)),
          'speech_to_text': Math.floor(Math.random() * (baseQuotas.speech_to_text * 0.2)),
        },
        remaining_quotas: {
          'chat_completions': Math.floor(baseQuotas.chat_completions * 0.4),
          'image_generation': Math.floor(baseQuotas.image_generation * 0.6),
          'text_to_speech': Math.floor(baseQuotas.text_to_speech * 0.7),
          'speech_to_text': Math.floor(baseQuotas.speech_to_text * 0.8),
        },
        allocated_by: 'principal',
        allocated_at: new Date().toISOString(),
        allocation_reason: 'Initial allocation',
        is_active: isActive,
        is_suspended: false,
        auto_renewal: false,
        auto_renew: false,
        priority_level: 'normal',
        updated_at: new Date().toISOString(),
      };
    });

    console.log(`Found ${allocations.length} teacher allocations for school ${preschoolId}`);
    return allocations;
    
  } catch (error) {
    reportError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'getTeacherAllocationsDirect',
      preschool_id: preschoolId,
    });
    return [];
  }
}

/**
 * Check if user can manage allocations - simplified direct implementation
 */
export async function canManageAllocationsDirect(userId: string, preschoolId: string): Promise<boolean> {
  try {
    const client = assertSupabase();
    
    // Get user's profile and role
    const { data: profile, error } = await client
      .from('users')
      .select('role, preschool_id')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.warn('User profile not found:', error);
      return false;
    }

    if (profile.preschool_id !== preschoolId) {
      console.warn('User not in the specified preschool');
      return false;
    }

    // Check if user has allocation management permissions
    const canManage = ['principal', 'principal_admin', 'super_admin'].includes(profile.role);
    console.log(`User ${userId} can manage allocations: ${canManage} (role: ${profile.role})`);
    
    return canManage;
    
  } catch (error) {
    console.warn('Error checking allocation permissions:', error);
    return false;
  }
}

/**
 * Mock allocation function - for testing UI
 */
export async function allocateAIQuotasDirect(
  preschoolId: string,
  teacherId: string,
  quotas: Record<string, number>,
  options: any = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Validate inputs
    if (!preschoolId || !teacherId) {
      return { success: false, error: 'Missing required parameters' };
    }

    // Simulate random success/failure for testing
    const success = Math.random() > 0.1; // 90% success rate
    
    if (!success) {
      return { success: false, error: 'Mock allocation failed - try again' };
    }

    track('edudash.ai.allocation.direct.success', {
      preschool_id: preschoolId,
      teacher_id: teacherId,
      quotas_allocated: quotas,
    });

    return { success: true };
    
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get base quotas by subscription tier
 */
function getBaseQuotasByTier(tier: string): Record<string, number> {
  const quotaMap = {
    'free': {
      'chat_completions': 100,
      'image_generation': 10,
      'text_to_speech': 50,
      'speech_to_text': 50,
    },
    'starter': {
      'chat_completions': 500,
      'image_generation': 50,
      'text_to_speech': 200,
      'speech_to_text': 200,
    },
    'premium': {
      'chat_completions': 2000,
      'image_generation': 200,
      'text_to_speech': 500,
      'speech_to_text': 500,
    },
    'enterprise': {
      'chat_completions': 10000,
      'image_generation': 1000,
      'text_to_speech': 2000,
      'speech_to_text': 2000,
    },
  };

  return quotaMap[tier] || quotaMap['enterprise'];
}

/**
 * Get optimal allocation suggestions - direct implementation fallback
 */
export async function getOptimalAllocationSuggestionsDirect(
  preschoolId: string
): Promise<{
  suggestions: Array<{
    teacher_id: string;
    teacher_name: string;
    current_quotas: Record<string, number>;
    suggested_quotas: Record<string, number>;
    reasoning: string;
    priority: 'low' | 'medium' | 'high';
    potential_savings: number;
  }>;
  school_summary: {
    total_quota_utilization: number;
    underused_quotas: number;
    overdemand_teachers: number;
    optimization_potential: number;
  };
}> {
  try {
    // Get current teacher allocations
    const allocations = await getTeacherAllocationsDirect(preschoolId);
    
    if (allocations.length === 0) {
      return {
        suggestions: [],
        school_summary: {
          total_quota_utilization: 0,
          underused_quotas: 0,
          overdemand_teachers: 0,
          optimization_potential: 0,
        },
      };
    }

    // Generate suggestions based on usage patterns
    const suggestions = allocations.map((allocation) => {
      const usage = allocation.used_quotas;
      const allocated = allocation.allocated_quotas;
      
      // Calculate utilization rates for each quota type
      const utilizationRates = {
        chat_completions: allocated.chat_completions > 0 ? usage.chat_completions / allocated.chat_completions : 0,
        image_generation: allocated.image_generation > 0 ? usage.image_generation / allocated.image_generation : 0,
        text_to_speech: allocated.text_to_speech > 0 ? usage.text_to_speech / allocated.text_to_speech : 0,
        speech_to_text: allocated.speech_to_text > 0 ? usage.speech_to_text / allocated.speech_to_text : 0,
      };

      // Calculate suggested quotas based on usage patterns
      const suggested = {
        chat_completions: Math.ceil(usage.chat_completions * 1.2), // 20% buffer
        image_generation: Math.ceil(usage.image_generation * 1.3), // 30% buffer for images
        text_to_speech: Math.ceil(usage.text_to_speech * 1.25), // 25% buffer
        speech_to_text: Math.ceil(usage.speech_to_text * 1.25), // 25% buffer
      };

      // Determine priority and reasoning
      const avgUtilization = Object.values(utilizationRates).reduce((a, b) => a + b, 0) / 4;
      let priority: 'low' | 'medium' | 'high' = 'medium';
      let reasoning = 'Optimized allocation based on usage patterns';
      
      if (avgUtilization > 0.8) {
        priority = 'high';
        reasoning = 'High usage detected - increase allocation to prevent limits';
      } else if (avgUtilization < 0.3) {
        priority = 'low';
        reasoning = 'Low usage detected - consider reducing allocation';
        // For low usage, suggest reducing by 20%
        suggested.chat_completions = Math.max(50, Math.ceil(allocated.chat_completions * 0.8));
        suggested.image_generation = Math.max(5, Math.ceil(allocated.image_generation * 0.8));
        suggested.text_to_speech = Math.max(25, Math.ceil(allocated.text_to_speech * 0.8));
        suggested.speech_to_text = Math.max(25, Math.ceil(allocated.speech_to_text * 0.8));
      }

      // Calculate potential savings
      const currentTotal = Object.values(allocated).reduce((a, b) => a + b, 0);
      const suggestedTotal = Object.values(suggested).reduce((a, b) => a + b, 0);
      const potentialSavings = Math.max(0, currentTotal - suggestedTotal);

      return {
        teacher_id: allocation.user_id,
        teacher_name: allocation.teacher_name,
        current_quotas: allocated,
        suggested_quotas: suggested,
        reasoning,
        priority,
        potential_savings: potentialSavings,
      };
    });

    // Calculate school summary
    const totalQuotas = allocations.reduce((acc, allocation) => {
      Object.entries(allocation.allocated_quotas).forEach(([key, value]) => {
        acc[key] = (acc[key] || 0) + value;
      });
      return acc;
    }, {} as Record<string, number>);

    const totalUsage = allocations.reduce((acc, allocation) => {
      Object.entries(allocation.used_quotas).forEach(([key, value]) => {
        acc[key] = (acc[key] || 0) + value;
      });
      return acc;
    }, {} as Record<string, number>);

    const totalQuotaSum = Object.values(totalQuotas).reduce((a, b) => a + b, 0);
    const totalUsageSum = Object.values(totalUsage).reduce((a, b) => a + b, 0);
    const utilization = totalQuotaSum > 0 ? totalUsageSum / totalQuotaSum : 0;

    const underusedTeachers = suggestions.filter(s => s.priority === 'low').length;
    const overdemandTeachers = suggestions.filter(s => s.priority === 'high').length;
    const totalPotentialSavings = suggestions.reduce((acc, s) => acc + s.potential_savings, 0);
    const optimizationPotential = totalQuotaSum > 0 ? totalPotentialSavings / totalQuotaSum : 0;

    return {
      suggestions,
      school_summary: {
        total_quota_utilization: Math.round(utilization * 100) / 100,
        underused_quotas: totalQuotaSum - totalUsageSum,
        overdemand_teachers: overdemandTeachers,
        optimization_potential: Math.round(optimizationPotential * 100) / 100,
      },
    };
    
  } catch (error) {
    reportError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'getOptimalAllocationSuggestionsDirect',
      preschool_id: preschoolId,
    });
    
    return {
      suggestions: [],
      school_summary: {
        total_quota_utilization: 0,
        underused_quotas: 0,
        overdemand_teachers: 0,
        optimization_potential: 0,
      },
    };
  }
}

/**
 * Get default teacher quotas by role
 */
function getDefaultTeacherQuotas(role: string): Record<string, number> {
  const quotaMap = {
    'teacher': {
      'chat_completions': 200,
      'image_generation': 20,
      'text_to_speech': 100,
      'speech_to_text': 100,
    },
    'principal': {
      'chat_completions': 500,
      'image_generation': 50,
      'text_to_speech': 200,
      'speech_to_text': 200,
    },
    'principal_admin': {
      'chat_completions': 800,
      'image_generation': 80,
      'text_to_speech': 300,
      'speech_to_text': 300,
    },
  };

  return quotaMap[role] || quotaMap['teacher'];
}
