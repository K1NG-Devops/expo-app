'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'parent' | 'teacher' | 'principal' | 'superadmin' | null;
  preschoolId?: string;
  preschoolName?: string;
  preschoolSlug?: string;
  organizationId?: string;
  organizationName?: string;
}

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserProfile(userId: string | undefined): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Get auth user email
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }


      // Get profile data from profiles table (includes role)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, preschool_id, role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      // Use preschool_id from profiles table
      const preschoolId = profileData?.preschool_id;
      
      
      let preschoolName: string | undefined;
      let preschoolSlug: string | undefined;

      // Fetch preschool details if we have an ID
      if (preschoolId) {
        const { data: preschoolData, error: preschoolError } = await supabase
          .from('preschools')
          .select('name')
          .eq('id', preschoolId)
          .maybeSingle();


        preschoolName = preschoolData?.name;
        preschoolSlug = undefined; // slug column doesn't exist in schema
      }

      // Organization data (columns don't exist yet in schema)
      const organizationId = undefined;
      const organizationName = undefined;

      const profileObj = {
        id: userId,
        email: user.email!,
        firstName: profileData?.first_name,
        lastName: profileData?.last_name,
        role: profileData?.role as any || null,
        preschoolId,
        preschoolName,
        preschoolSlug,
        organizationId,
        organizationName,
      };
      
      
      setProfile(profileObj);
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    refetch: loadProfile,
  };
}
