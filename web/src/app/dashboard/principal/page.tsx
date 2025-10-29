'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useTenantSlug } from '@/lib/tenant/useTenantSlug';
import { PrincipalShell } from '@/components/dashboard/principal/PrincipalShell';
import {
  Users,
  School,
  DollarSign,
  TrendingUp,
  UserPlus,
  FileText,
  Calendar,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
} from 'lucide-react';
import { ParentApprovalWidget } from '@/components/dashboard/principal/ParentApprovalWidget';
import { AskAIWidget } from '@/components/dashboard/AskAIWidget';

interface PrincipalMetrics {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  revenue: number;
  pendingPayments: number;
  activeEnrollments: number;
  staffAttendance: number;
  upcomingEvents: number;
}

export default function PrincipalDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string>();
  const [authLoading, setAuthLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [metrics, setMetrics] = useState<PrincipalMetrics>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    revenue: 0,
    pendingPayments: 0,
    activeEnrollments: 0,
    staffAttendance: 0,
    upcomingEvents: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Fetch user profile with preschool data
  const { profile, loading: profileLoading } = useUserProfile(userId);
  const { slug: tenantSlug } = useTenantSlug(userId);

  const userEmail = profile?.email;
  const userName = profile?.firstName || userEmail?.split('@')[0] || 'Principal';
  const preschoolName = profile?.preschoolName;
  const preschoolId = profile?.preschoolId;

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/sign-in');
        return;
      }

      setUserId(session.user.id);

      // Set greeting based on time of day
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');

      setAuthLoading(false);
    };

    initAuth();
  }, [router, supabase]);

  // Load dashboard metrics
  useEffect(() => {
    if (!preschoolId) return;

    const loadMetrics = async () => {
      try {
        setMetricsLoading(true);

        // Fetch students count
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('preschool_id', preschoolId)
          .eq('status', 'active');

        // Fetch teachers count
        const { count: teacherCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', preschoolId)
          .eq('role', 'teacher');

        // Fetch classes count
        const { count: classCount } = await supabase
          .from('classes')
          .select('*', { count: 'exact', head: true })
          .eq('preschool_id', preschoolId);

        setMetrics({
          totalStudents: studentCount || 0,
          totalTeachers: teacherCount || 0,
          totalClasses: classCount || 0,
          revenue: 0, // TODO: Implement financial tracking
          pendingPayments: 0,
          activeEnrollments: studentCount || 0,
          staffAttendance: teacherCount || 0,
          upcomingEvents: 0,
        });
      } catch (error) {
        console.error('Error loading metrics:', error);
      } finally {
        setMetricsLoading(false);
      }
    };

    loadMetrics();
  }, [preschoolId, supabase]);

  const loading = authLoading || profileLoading || metricsLoading;

  if (loading) {
    return (
      <PrincipalShell
        tenantSlug={tenantSlug}
        userEmail={userEmail}
        userName={userName}
        preschoolName={preschoolName}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-slate-400">Loading...</p>
        </div>
      </PrincipalShell>
    );
  }

  // Right sidebar content
  const rightSidebar = (
    <>
      {/* At a Glance */}
      <div className="card">
        <div className="sectionTitle">At a glance</div>
        <ul style={{ display: 'grid', gap: 8 }}>
          <li className="listItem">
            <span>Total Students</span>
            <span className="badge">{metrics.totalStudents}</span>
          </li>
          <li className="listItem">
            <span>Teaching Staff</span>
            <span className="badge">{metrics.totalTeachers}</span>
          </li>
          <li className="listItem">
            <span>Active Classes</span>
            <span className="badge">{metrics.totalClasses}</span>
          </li>
        </ul>
      </div>

      {/* Parent Approval Requests */}
      <ParentApprovalWidget preschoolId={preschoolId} userId={userId} />

      {/* Recent Activity */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Activity size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Recent Activity</h3>
        </div>
        <ul style={{ display: 'grid', gap: 12 }}>
          <li style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <Clock size={14} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 500 }}>System Update</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>All systems operational</div>
            </div>
          </li>
        </ul>
      </div>

      {/* Ask Dash AI Assistant */}
      <AskAIWidget inline />
    </>
  );

  return (
    <PrincipalShell
      tenantSlug={tenantSlug}
      userEmail={userEmail}
      userName={userName}
      preschoolName={preschoolName}
      preschoolId={preschoolId}
      rightSidebar={rightSidebar}
    >
      {/* Page Header with Preschool Name */}
      <div className="section" style={{ marginBottom: 0 }}>
        {preschoolName && (
          <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32 }}>🏫</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{preschoolName}</h2>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>Principal Dashboard</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <h1 className="h1">{greeting}, {userName}</h1>

      {/* Overview Metrics */}
      <div className="section">
        <div className="sectionTitle">School Overview</div>
        <div className="grid2">
          <div className="card tile">
            <div className="metricValue">{metrics.totalStudents}</div>
            <div className="metricLabel">Total Students</div>
          </div>
          <div className="card tile">
            <div className="metricValue">{metrics.totalTeachers}</div>
            <div className="metricLabel">Teaching Staff</div>
          </div>
          <div className="card tile">
            <div className="metricValue">{metrics.totalClasses}</div>
            <div className="metricLabel">Active Classes</div>
          </div>
          <div className="card tile">
            <div className="metricValue">{metrics.staffAttendance}</div>
            <div className="metricLabel">Staff Present Today</div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="section">
        <div className="sectionTitle">Financial Summary</div>
        <div className="grid2">
          <div className="card tile">
            <div className="metricValue" style={{ color: '#10b981' }}>
              R{metrics.revenue.toLocaleString()}
            </div>
            <div className="metricLabel">Monthly Revenue</div>
          </div>
          <div className="card tile">
            <div className="metricValue" style={{ color: '#f59e0b' }}>
              {metrics.pendingPayments}
            </div>
            <div className="metricLabel">Pending Payments</div>
          </div>
          <div className="card tile">
            <div className="metricValue">{metrics.activeEnrollments}</div>
            <div className="metricLabel">Active Enrollments</div>
          </div>
          <div className="card tile">
            <div className="metricValue">{metrics.upcomingEvents}</div>
            <div className="metricLabel">Upcoming Events</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="section">
        <div className="sectionTitle">Quick Actions</div>
        <div className="grid2">
          <button className="qa" onClick={() => router.push('/dashboard/principal/students')}>
            <UserPlus className="icon20" />
            <span>Enroll Student</span>
          </button>
          <button className="qa" onClick={() => router.push('/dashboard/principal/teachers')}>
            <School className="icon20" />
            <span>Manage Teachers</span>
          </button>
          <button className="qa" onClick={() => router.push('/dashboard/principal/financials')}>
            <DollarSign className="icon20" />
            <span>View Financials</span>
          </button>
          <button className="qa" onClick={() => router.push('/dashboard/principal/reports')}>
            <FileText className="icon20" />
            <span>Generate Reports</span>
          </button>
          <button className="qa" onClick={() => router.push('/dashboard/principal/messages')}>
            <MessageCircle className="icon20" />
            <span>Send Announcement</span>
          </button>
          <button className="qa" onClick={() => router.push('/dashboard/principal/settings')}>
            <Calendar className="icon20" />
            <span>School Calendar</span>
          </button>
        </div>
      </div>

      {/* Alerts & Notifications */}
      <div className="section">
        <div className="sectionTitle">Recent Alerts</div>
        <div className="card">
          {metrics.pendingPayments > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderLeft: '4px solid #f59e0b' }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <div>
                <div style={{ fontWeight: 600 }}>Pending Payments</div>
                <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                  {metrics.pendingPayments} payments awaiting review
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderLeft: '4px solid #10b981' }}>
              <CheckCircle size={20} color="#10b981" />
              <div>
                <div style={{ fontWeight: 600 }}>All Systems Operational</div>
                <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                  No urgent actions required at this time
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PrincipalShell>
  );
}
