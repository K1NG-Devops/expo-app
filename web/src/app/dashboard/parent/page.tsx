'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useChildrenData } from '@/lib/hooks/parent/useChildrenData';
import { useChildMetrics } from '@/lib/hooks/parent/useChildMetrics';
import { useTenantSlug } from '@/lib/tenant/useTenantSlug';
import {
  MessageCircle,
  Calendar,
  FileText,
  DollarSign,
  Users,
  Search,
  LayoutDashboard,
  Settings as SettingsIcon,
  Bell,
  LogOut,
} from 'lucide-react';

import { AskAIWidget } from '@/components/dashboard/AskAIWidget';

export default function ParentDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [userId, setUserId] = useState<string>();
  const [userEmail, setUserEmail] = useState<string>();
  const avatarLetter = (userEmail?.[0] || 'U').toUpperCase();
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const { slug: tenantSlug } = useTenantSlug(userId);
  // Demo data - will be replaced with real data from database
  const [pendingRequests, setPendingRequests] = useState<{
    childName: string;
    requestedDate: string;
    status: string;
  }[]>([
    { childName: 'Thabo Malema', requestedDate: '2 days ago', status: 'pending' },
  ]);
  const [, setParentLinkRequests] = useState<{
    id: string;
    parentName: string;
    childName: string;
    relationship?: string;
    requestedDate: string;
  }[]>([]);

  // Initialize auth and user ID
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
      setUserEmail(session.user.email);

      // Set greeting based on time of day
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');

      setLoading(false);
    };

    initAuth();
  }, [router, supabase]);

  // Load link requests (parent's own and incoming to approve)
  useEffect(() => {
    const loadLinkRequests = async () => {
      if (!userId) return;
      try {
        const sb = createClient();

        // My pending requests
        const { data: myReq } = await sb
          .from('guardian_requests')
          .select('id, child_full_name, created_at, status, preschool_id')
          .eq('parent_auth_id', userId)
          .eq('status', 'pending')
          .eq('preschool_id', (await sb.from('users').select('preschool_id').eq('auth_user_id', userId).single()).data?.preschool_id)
          .order('created_at', { ascending: false });

        if (myReq && myReq.length > 0) {
          const mapped = myReq.map((r: {
            child_full_name?: string;
            created_at: string;
            status: string;
          }) => ({
            childName: r.child_full_name || 'Child',
            requestedDate: new Date(r.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }),
            status: r.status,
          }));
          setPendingRequests(mapped);
        }

        // Incoming requests to approve (for children linked to this parent)
        const { data: internal } = await sb
          .from('users')
          .select('id, preschool_id')
          .eq('auth_user_id', userId)
          .single();

        const internalId = internal?.id;
        const preschoolId = internal?.preschool_id;

        // Tenant slug now handled by useTenantSlug(userId)

        if (internalId) {
          const { data: myStudents } = await sb
            .from('students')
            .select('id, first_name, last_name, preschool_id')
            .eq('parent_id', internalId)
            .eq('preschool_id', preschoolId);

          const studentIds = (myStudents || []).map((s: { id: string }) => s.id);
          if (studentIds.length > 0) {
            const { data: incoming } = await sb
              .from('guardian_requests')
              .select('id, parent_auth_id, child_full_name, relationship, created_at, preschool_id')
              .in('student_id', studentIds)
              .eq('status', 'pending')
              .eq('preschool_id', preschoolId)
              .order('created_at', { ascending: true });

            const parentIds = Array.from(new Set((incoming || []).map((r: {
              parent_auth_id: string;
            }) => r.parent_auth_id)));
            let parentMap = new Map<string, {
              id: string;
              first_name?: string;
              last_name?: string;
            }>();
            if (parentIds.length > 0) {
              const { data: parents } = await sb
                .from('profiles')
                .select('id, first_name, last_name')
                .in('id', parentIds);
              parentMap = new Map((parents || []).map((p: {
                id: string;
                first_name?: string;
                last_name?: string;
              }) => [p.id, p]));
            }

            const mappedIncoming = (incoming || []).map((r: {
              id: string;
              parent_auth_id: string;
              child_full_name?: string;
              relationship?: string;
              created_at: string;
            }) => {
              const parent = parentMap.get(r.parent_auth_id);
              return {
                id: r.id,
                parentName: parent
                  ? `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || 'Parent'
                  : 'Parent',
                childName: r.child_full_name || 'Child',
                relationship: r.relationship || undefined,
                requestedDate: new Date(r.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }),
              };
            });

            if (mappedIncoming.length > 0) setParentLinkRequests(mappedIncoming);
          }
        }
      } catch {
        // Fail silently; demo data remains
      }
    };

    loadLinkRequests();
  }, [userId]);

  // Load dashboard data
  const {
    childrenCards,
    activeChildId,
    setActiveChildId,
    loading: childrenLoading,
    refetch: refetchChildren,
  } = useChildrenData(userId);

  const { metrics } = useChildMetrics(activeChildId);

  const handleRefresh = async () => {
    await refetchChildren();
  };

  if (loading || childrenLoading) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="container topbarRow">
            <div className="brand">EduDash Pro</div>
            <div className="iconBtn" aria-hidden />
          </div>
        </header>
        <main className="content container">
          Loading...
        </main>
      </div>
    );
  }

  const activeChild = childrenCards.find((c) => c.id === activeChildId);
  const unreadCount = activeChild ? metrics.unreadMessages : 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbarRow topbarEdge">
            <div className="leftGroup">
            <div className="chip">{tenantSlug ? `/${tenantSlug}` : ''}</div>
          </div>
          <div className="searchGroup">
            <Search className="searchIcon icon16" />
            <input
              className="searchInput"
              placeholder="Search..."
              onKeyDown={(e) => {
                const t = e.target as HTMLInputElement;
                if (e.key === 'Enter' && t.value.trim()) router.push(`/dashboard/parent/search?q=${encodeURIComponent(t.value.trim())}`);
              }}
            />
          </div>
          <div className="rightGroup">
            <button className="iconBtn" aria-label="Notifications">
              <Bell className="icon20" />
            </button>
            <div className="avatar">{avatarLetter}</div>
          </div>
        </div>
      </header>

      <div className="frame">
        {/* Left sidebar (desktop/tablet) */}
        <aside className="sidenav sticky" aria-label="Sidebar">
            <div className="sidenavCol">
              <nav className="nav">
              {[
                { href: '/dashboard/parent', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/dashboard/parent/messages', label: 'Messages', icon: MessageCircle, badge: unreadCount },
                { href: '/dashboard/parent/children', label: 'My Children', icon: Users },
                { href: '/dashboard/parent/settings', label: 'Settings', icon: SettingsIcon },
              ].map((it) => {
                const Icon = it.icon as any;
                const active = pathname === it.href || pathname?.startsWith(it.href + '/');
                return (
                  <Link key={it.href} href={it.href} className={`navItem ${active ? 'navItemActive' : ''}`} aria-current={active ? 'page' : undefined}>
                    <Icon className="navIcon" />
                    <span>{it.label}</span>
                    {typeof it.badge === 'number' && it.badge > 0 && (
                      <span className="navItemBadge badgeNumber">{it.badge}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="sidenavFooter">
              <button
                className="navItem"
                onClick={async () => { const sb = createClient(); await sb.auth.signOut(); router.push('/sign-in'); }}
              >
                <LogOut className="navIcon" />
                <span>Sign out</span>
              </button>
              <div className="brandPill w-full text-center">Powered by EduDash Pro</div>
            </div>
            </div>
          </aside>

        {/* Main column */}
        <main className="content">
          <h1 className="h1">{greeting}, Olivia</h1>

            {childrenCards.length === 0 && (
              <div className="section">
                <div className="card" style={{ textAlign: 'center' }}>
                  <h3 style={{ marginBottom: 8 }}>No children linked yet</h3>
                  <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
                    Link your child to get started.
                  </p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button className="btn btnPrimary" onClick={() => router.push('/dashboard/parent/claim-child')}>
                      <Search className="icon16" /> Link a child
                    </button>
                    <button className="btn" onClick={() => router.push('/dashboard/parent/children')}>
                      <Users className="icon16" /> Register new
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pendingRequests.length > 0 && (
              <div className="section">
                <div className="card">
                  <div className="sectionTitle">Pending child link requests ({pendingRequests.length})</div>
                  <ul style={{ display: 'grid', gap: 8 }}>
                    {pendingRequests.map((req, idx) => (
                      <li key={idx} className="listItem">
                        <div style={{ display: 'grid', gap: 2 }}>
                          <strong>{req.childName}</strong>
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Requested {req.requestedDate}</span>
                        </div>
                        <span className="badge">Awaiting approval</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="section">
              <div className="sectionTitle">Overview</div>
              <div className="grid2">
                <div className="card tile">
                  <div className="metricValue">{activeChild ? metrics.unreadMessages : 0}</div>
                  <div className="metricLabel">Unread Messages</div>
                </div>
                <div className="card tile">
                  <div className="metricValue">{activeChild ? metrics.pendingHomework : 0}</div>
                  <div className="metricLabel">Homework Pending</div>
                </div>
                <div className="card tile">
                  <div className="metricValue">0%</div>
                  <div className="metricLabel">Attendance Rate</div>
                </div>
                <div className="card tile">
                  <div className="metricValue">{childrenCards.length}</div>
                  <div className="metricLabel">Total Children</div>
                </div>
              </div>
            </div>

            <div className="section">
              <div className="sectionTitle">Quick actions</div>
              <div className="grid2">
                <button className="qa" onClick={() => router.push('/dashboard/parent/homework')}>
                  <FileText className="icon20" />
                  <span>View Homework</span>
                </button>
                <button className="qa" onClick={() => router.push('/dashboard/parent/attendance')}>
                  <Calendar className="icon20" />
                  <span>Check Attendance</span>
                </button>
                <button className="qa" onClick={() => router.push('/dashboard/parent/messages')}>
                  <MessageCircle className="icon20" />
                  <span>Messages</span>
                </button>
                <button className="qa" onClick={() => router.push('/dashboard/parent/payments')}>
                  <DollarSign className="icon20" />
                  <span>Fees</span>
                </button>
              </div>
            </div>
        </main>

        <aside className="right sticky" aria-label="At a glance">
          <div className="card">
              <div className="sectionTitle">At a glance</div>
              <ul style={{ display: 'grid', gap: 8 }}>
                <li className="listItem"><span>Upcoming events</span><span className="badge">0</span></li>
                <li className="listItem"><span>Unread messages</span><span className="badge">{activeChild ? metrics.unreadMessages : 0}</span></li>
                <li className="listItem"><span>Fees due</span><span className="badge">{activeChild && metrics.feesDue ? 'R ' + metrics.feesDue.amount.toLocaleString() : 'None'}</span></li>
              </ul>
          </div>
          <AskAIWidget inline />
        </aside>
      </div>

      <nav className="bottomNav" aria-label="Primary">
        <div className="bottomNavInner">
          <div className="bottomGrid">
            {[{href:'/dashboard/parent',label:'Home',icon:MessageCircle},{href:'/dashboard/parent/messages',label:'Messages',icon:MessageCircle},{href:'/dashboard/parent/calendar',label:'Calendar',icon:Calendar},{href:'/dashboard/parent/payments',label:'Fees',icon:DollarSign},{href:'/dashboard/parent/settings',label:'Settings',icon:Calendar}].map((it, i) => {
              const Icon = it.icon; const active = pathname === it.href;
              return (
                <Link key={i} href={it.href} className={`bnItem ${active ? 'bnItemActive' : ''}`} aria-current={active ? 'page' : undefined}>
                  <Icon className="icon20" />
                  <span style={{ fontSize: 12 }}>{it.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
