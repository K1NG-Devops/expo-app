'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseUnreadMessagesReturn {
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUnreadMessages(userId: string | undefined, childId: string | null): UseUnreadMessagesReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUnreadCount = useCallback(async () => {
    if (!userId || !childId) {
      setLoading(false);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Get internal user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id, preschool_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (!userData) {
        setUnreadCount(0);
        return;
      }

      // Count unread messages where recipient is this parent
      // Messages can be in different tables depending on your schema
      // This assumes a 'messages' table with recipient_id and is_read fields
      
      try {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', userData.id)
          .eq('is_read', false)
          .eq('preschool_id', userData.preschool_id);

        setUnreadCount(count || 0);
      } catch (messagesError) {
        // If messages table doesn't exist or has different schema, try alternative
        console.warn('Unable to fetch messages, table may not exist:', messagesError);
        
        // Try alternative: announcements or notifications table
        try {
          const { count: announcementCount } = await supabase
            .from('announcements')
            .select('id', { count: 'exact', head: true })
            .eq('preschool_id', userData.preschool_id)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          
          setUnreadCount(announcementCount || 0);
        } catch {
          setUnreadCount(0);
        }
      }
    } catch (err) {
      console.error('Failed to load unread messages:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId, childId]);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  return {
    unreadCount,
    loading,
    error,
    refetch: loadUnreadCount,
  };
}
