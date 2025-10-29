'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useTenantSlug } from '@/lib/tenant/useTenantSlug';
import { PrincipalShell } from '@/components/dashboard/principal/PrincipalShell';
import { FileText, Download, Calendar } from 'lucide-react';

export default function ReportsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string>();
  const [loading, setLoading] = useState(true);

  const { profile } = useUserProfile(userId);
  const { slug: tenantSlug } = useTenantSlug(userId);
  const preschoolName = profile?.preschoolName;

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/sign-in');
        return;
      }
      setUserId(session.user.id);
      setLoading(false);
    };
    initAuth();
  }, [router, supabase]);

  const reportTypes = [
    { id: 'attendance', name: 'Attendance Report', description: 'Student and staff attendance tracking', icon: Calendar },
    { id: 'financial', name: 'Financial Summary', description: 'Revenue, expenses, and payments', icon: FileText },
    { id: 'enrollment', name: 'Enrollment Report', description: 'Student enrollment trends', icon: FileText },
    { id: 'academic', name: 'Academic Performance', description: 'Student progress and assessments', icon: FileText },
  ];

  if (loading) {
    return (
      <PrincipalShell tenantSlug={tenantSlug} preschoolName={preschoolName} preschoolId={profile?.preschoolId}>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-slate-400">Loading reports...</p>
        </div>
      </PrincipalShell>
    );
  }

  return (
    <PrincipalShell tenantSlug={tenantSlug} preschoolName={preschoolName} preschoolId={profile?.preschoolId}>
      <div className="section">
        <h1 className="h1">Reports</h1>

        <div className="sectionTitle">Available Reports</div>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <div key={report.id} className="card" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon size={24} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: 8 }}>{report.name}</h3>
                    <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>{report.description}</p>
                    <button className="btn btnSecondary" style={{ width: '100%' }}>
                      <Download size={16} style={{ marginRight: 8 }} />
                      Generate Report
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PrincipalShell>
  );
}
