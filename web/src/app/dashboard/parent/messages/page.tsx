'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenantSlug } from '@/lib/tenant/useTenantSlug';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { ParentShell } from '@/components/dashboard/parent/ParentShell';
import { MessageSquare, Send, Search } from 'lucide-react';

export default function MessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string>();
  const [userId, setUserId] = useState<string>();
  const { slug } = useTenantSlug(userId);
  const { profile, loading: profileLoading } = useUserProfile(userId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/sign-in');
        return;
      }

      setUserEmail(session.user.email);
      setUserId(session.user.id);
      setLoading(false);
    };

    initAuth();
  }, [router, supabase]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ParentShell 
      tenantSlug={slug} 
      userEmail={userEmail} 
      userName={profile?.firstName}
      preschoolName={profile?.preschoolName}
      unreadCount={0}
    >
      <div className="container">
        <div className="section">
          <h1 className="h1">Messages</h1>
          <p className="muted">Communicate with teachers and school staff</p>
        </div>
        <div className="section">
          <div className="card p-md">
            <div className="relative mb-sm">
              <input
                type="text"
                placeholder="Search messages..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-4 pr-10 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <div className="text-center py-lg">
              <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Messages Yet</h3>
              <p className="text-gray-400 text-sm mb-4">
                When teachers or school staff send you messages, they'll appear here.
              </p>
              <button className="btn btnPrimary inline-flex items-center gap-2">
                <Send className="w-4 h-4" />
                Start New Conversation
              </button>
            </div>
          </div>
        </div>
      </div>
    </ParentShell>
  );
}
