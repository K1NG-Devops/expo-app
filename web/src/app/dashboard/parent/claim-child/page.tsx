'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenantSlug } from '@/lib/tenant/useTenantSlug';
import { ParentShell } from '@/components/dashboard/parent/ParentShell';
import { Search } from 'lucide-react';

export default function ClaimChildPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>();
  const { slug } = useTenantSlug(userId);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/sign-in'); return; }
      setEmail(session.user.email || '');
      setUserId(session.user.id);
    })();
  }, [router, supabase]);

  return (
    <ParentShell tenantSlug={slug} userEmail={email}>
      <div className="container">
        <div className="section">
          <h1 className="h1">Search & Claim Child</h1>
          <p className="muted">Search for your child and send a link request to the school.</p>
        </div>
        <div className="section">
          <div className="card p-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                placeholder="Enter child's name..."
                className="w-full bg-gray-900/60 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="muted mt-sm">Search functionality coming soon</div>
          </div>
        </div>
      </div>
    </ParentShell>
  );
}
