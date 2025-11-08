                    'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useChildrenData } from '@/lib/hooks/parent/useChildrenData';
import { useChildMetrics } from '@/lib/hooks/parent/useChildMetrics';
import { useUnreadMessages } from '@/lib/hooks/parent/useUnreadMessages';
import { useTenantSlug } from '@/lib/tenant/useTenantSlug';

export interface TrialStatus {
  is_trial: boolean;
  days_remaining: number;
  plan_tier: string;
  plan_name: string;
}

export function useParentDashboardData() {
  const supabase = createClient();
  
  // Auth state
  const [userId, setUserId] = useState<string>();
  const [authLoading, setAuthLoading] = useState(true);
  
  // Trial state
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  
  // Fetch user ID
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
      setAuthLoading(false);
    };
    initAuth();
  }, [supabase]);
  
  // Use custom hooks
  const { profile, loading: profileLoading, refetch: refetchProfile } = useUserProfile(userId);
  const { slug: tenantSlug } = useTenantSlug(userId);
  const {
    childrenCards,
    activeChildId,
    setActiveChildId,
    loading: childrenLoading,
    refetch: refetchChildren,
  } = useChildrenData(userId);
  const { metrics } = useChildMetrics(activeChildId);
  const { unreadCount } = useUnreadMessages(userId, activeChildId);
  
  // Derived values
  const userName = profile?.firstName || profile?.email?.split('@')[0] || 'User';
  const usageType = profile?.usageType;
  const hasOrganization = !!profile?.preschoolId;
  
  // Show "EduDash Pro Community" for standalone users, actual school name for org users
  const preschoolName = hasOrganization 
    ? profile?.preschoolName 
    : 'EduDash Pro Community';
  
  // Debug logging (cleaner - no warnings for standalone users)
  useEffect(() => {
    if (profile) {
      if (!profile.preschoolId) {
        // Standalone user - this is expected and good!
        console.log('✅ [ParentDashboard] Standalone user:', {
          usageType: profile.usageType,
          displayName: 'EduDash Pro Community',
          isTrial: profile.is_trial
        });
      } else {
        // Organization user
        console.log('📊 [ParentDashboard] Organization user:', {
          preschoolId: profile.preschoolId,
          preschoolName: profile.preschoolName,
          usageType: profile.usageType
        });
      }
    }
  }, [profile]);
  
  // Fetch trial status
  useEffect(() => {
    const loadTrialStatus = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase.rpc('get_my_trial_status');
        
        if (error) {
          console.debug('[ParentDashboard] Trial status RPC not available:', error);
          return;
        }
        
        setTrialStatus(data);
      } catch (err) {
        console.debug('[ParentDashboard] Trial status error:', err);
      }
    };
    
    loadTrialStatus();
  }, [userId, supabase]);
  
  return {
    // Auth
    userId,
    authLoading,
    
    // Profile
    profile,
    profileLoading,
    refetchProfile,
    userName,
    preschoolName,
    usageType,
    hasOrganization,
    tenantSlug,
    
    // Children
    childrenCards,
    activeChildId,
    setActiveChildId,
    childrenLoading,
    refetchChildren,
    
    // Metrics
    metrics,
    unreadCount,
    
    // Trial
    trialStatus,
    
    // Computed
    loading: authLoading || profileLoading,
  };
}
