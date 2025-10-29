'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenantSlug } from '@/lib/tenant/useTenantSlug';
import { ParentShell } from '@/components/dashboard/parent/ParentShell';

export default function PlaceholderPage() {
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
  }, [router, supabase.auth]);

  return (
    <ParentShell tenantSlug={slug} userEmail={email}>
      <div className="container">
        <div className="section">
          <h1 className="h1">Coming soon</h1>
          <p className="muted">This section is under construction for the web version. Core dashboard is ready.</p>
        </div>
      </div>
    </ParentShell>
  );
}
