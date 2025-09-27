import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assertSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Types for user blocking
export interface BlockedUser {
  id: string;
  blocked_user_id: string;
  blocked_user_name: string;
  blocked_user_role: string;
  block_type: 'user' | 'content' | 'communication';
  reason?: string;
  created_at: string;
  expires_at?: string;
  school_name?: string;
}

export interface BlockUserParams {
  userId: string;
  blockType?: 'user' | 'content' | 'communication';
  reason?: string;
  details?: string;
  expiresAt?: string;
}

export interface BlockContentParams {
  contentType: 'lesson' | 'homework' | 'message' | 'comment' | 'announcement' | 'activity' | 'assessment';
  contentId: string;
  authorId?: string;
  reason?: string;
}

// Hook for managing user blocks
export function useUserBlocking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Query to get blocked users
  const {
    data: blockedUsers,
    isLoading: blockedUsersLoading,
    error: blockedUsersError,
    refetch: refetchBlockedUsers,
  } = useQuery({
    queryKey: ['blocked-users', user?.id],
    queryFn: async (): Promise<BlockedUser[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await assertSupabase()
        .rpc('get_blocked_users');
      
      if (error) {
        console.error('Error fetching blocked users:', error);
        throw new Error(error.message);
      }
      
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
  });

  // Mutation to block a user
  const blockUserMutation = useMutation({
    mutationFn: async (params: BlockUserParams) => {
      const { data, error } = await assertSupabase()
        .rpc('block_user', {
          p_blocked_user_id: params.userId,
          p_block_type: params.blockType || 'user',
          p_reason: params.reason,
          p_details: params.details,
          p_expires_at: params.expiresAt,
        });
      
      if (error) {
        console.error('Error blocking user:', error);
        throw new Error(error.message);
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: () => {
      // Refetch blocked users list
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      // Invalidate any user-related queries that might be affected
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      queryClient.invalidateQueries({ queryKey: ['parent-threads'] });
    },
  });

  // Mutation to unblock a user
  const unblockUserMutation = useMutation({
    mutationFn: async ({ userId, blockType }: { userId: string; blockType?: string }) => {
      const { data, error } = await assertSupabase()
        .rpc('unblock_user', {
          p_blocked_user_id: userId,
          p_block_type: blockType || 'user',
        });
      
      if (error) {
        console.error('Error unblocking user:', error);
        throw new Error(error.message);
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: () => {
      // Refetch blocked users list
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      // Invalidate any user-related queries that might be affected
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      queryClient.invalidateQueries({ queryKey: ['parent-threads'] });
    },
  });

  // Mutation to block specific content
  const blockContentMutation = useMutation({
    mutationFn: async (params: BlockContentParams) => {
      const { data, error } = await assertSupabase()
        .rpc('block_content', {
          p_content_type: params.contentType,
          p_content_id: params.contentId,
          p_author_id: params.authorId,
          p_reason: params.reason,
        });
      
      if (error) {
        console.error('Error blocking content:', error);
        throw new Error(error.message);
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate content-related queries
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      queryClient.invalidateQueries({ queryKey: ['homework'] });
    },
  });

  // Function to check if a user is blocked
  const checkIsUserBlocked = useCallback(async (userId: string, blockType: string = 'user'): Promise<boolean> => {
    try {
      const { data, error } = await assertSupabase()
        .rpc('is_user_blocked', {
          p_user_id: userId,
          p_block_type: blockType,
        });
      
      if (error) {
        console.error('Error checking if user is blocked:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Error checking blocked status:', error);
      return false;
    }
  }, []);

  // Convenience functions
  const blockUser = useCallback(async (params: BlockUserParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await blockUserMutation.mutateAsync(params);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to block user';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [blockUserMutation]);

  const unblockUser = useCallback(async (userId: string, blockType?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await unblockUserMutation.mutateAsync({ userId, blockType });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unblock user';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [unblockUserMutation]);

  const blockContent = useCallback(async (params: BlockContentParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await blockContentMutation.mutateAsync(params);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to block content';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [blockContentMutation]);

  return {
    // Data
    blockedUsers: blockedUsers || [],
    
    // Loading states
    isLoading: isLoading || blockUserMutation.isPending || unblockUserMutation.isPending || blockContentMutation.isPending,
    blockedUsersLoading,
    
    // Error states
    error: error || blockedUsersError?.message,
    blockError: blockUserMutation.error?.message,
    unblockError: unblockUserMutation.error?.message,
    contentBlockError: blockContentMutation.error?.message,
    
    // Actions
    blockUser,
    unblockUser,
    blockContent,
    checkIsUserBlocked,
    refetchBlockedUsers,
    
    // Raw mutations for advanced usage
    blockUserMutation,
    unblockUserMutation,
    blockContentMutation,
  };
}

// Hook specifically for checking if users are blocked (useful for filtering)
export function useBlockedUsersCheck() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['blocked-users-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      
      const { data } = await assertSupabase()
        .rpc('get_blocked_users');
      
      if (!data) return {};
      
      // Convert to a lookup map for faster checks
      const blockedMap: Record<string, boolean> = {};
      data.forEach((block: BlockedUser) => {
        blockedMap[block.blocked_user_id] = true;
      });
      
      return blockedMap;
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 minute
  });
}