'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useChildrenData } from '@/lib/hooks/parent/useChildrenData';
import { useChildMetrics } from '@/lib/hooks/parent/useChildMetrics';
import { useTenantSlug } from '@/lib/tenant/useTenantSlug';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useUnreadMessages } from '@/lib/hooks/parent/useUnreadMessages';
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
  BarChart3,
  Zap,
  Clock,
  X,
} from 'lucide-react';

import { AskAIWidget } from '@/components/dashboard/AskAIWidget';
import { TierBadge } from '@/components/ui/TierBadge';
import { CAPSActivitiesWidget } from '@/components/dashboard/parent/CAPSActivitiesWidget';
import { ExamPrepWidget } from '@/components/dashboard/exam-prep/ExamPrepWidget';
import { ParentOnboarding } from '@/components/dashboard/parent/ParentOnboarding';
import { PendingRequestsWidget } from '@/components/dashboard/parent/PendingRequestsWidget';

export default function ParentDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [userId, setUserId] = useState<string>();
  const [authLoading, setAuthLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  const [showAskAI, setShowAskAI] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiDisplay, setAIDisplay] = useState('');
  const [aiLanguage, setAiLanguage] = useState<string>('en-ZA');
  const [aiInteractive, setAiInteractive] = useState(false);

  const handleAskFromActivity = async (prompt: string, display: string, language?: string, enableInteractive?: boolean) => {
    try {
      const sb = createClient();
      // Determine school plan
      let plan = 'free';
      const schoolId = profile?.preschoolId;
      if (schoolId) {
        const { data } = await sb
          .from('preschools')
          .select('subscription_plan')
          .eq('id', schoolId)
          .maybeSingle();
        plan = (data?.subscription_plan as string | null) || 'free';
      }

      const isFree = String(plan || 'free').toLowerCase() === 'free';
      const key = `EDUDASH_CAPS_FREE_USED_${userId}`;

      if (isFree) {
        const used = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (used === '1') {
          alert('Free tier limit reached. Upgrade to generate more activities.');
          return;
        }
        // Mark as used immediately to prevent spamming
        if (typeof window !== 'undefined') localStorage.setItem(key, '1');
      }

      setAIPrompt(prompt);
      setAIDisplay(display);
      setAiLanguage(language || 'en-ZA');
      setAiInteractive(enableInteractive || false);
      setShowAskAI(true);
    } catch {
      // Fallback: allow one
      setAIPrompt(prompt);
      setAIDisplay(display);
      setAiLanguage(language || 'en-ZA');
      setAiInteractive(enableInteractive || false);
      setShowAskAI(true);
    }
  };
  
  // Fetch user profile with preschool data
  const { profile, loading: profileLoading } = useUserProfile(userId);
  const { slug: tenantSlug } = useTenantSlug(userId);
  
  const userEmail = profile?.email;
  const userName = profile?.firstName || userEmail?.split('@')[0] || 'User';
  const preschoolName = profile?.preschoolName;
  const userRole = profile?.role;
  const roleDisplay = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User';
  const avatarLetter = (userName[0] || 'U').toUpperCase();
  // Pending requests - real data from database
  const [pendingRequests, setPendingRequests] = useState<{
    childName: string;
    requestedDate: string;
    status: string;
  }[]>([]);
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

      // Set greeting based on time of day
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');

      setAuthLoading(false);
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
        const userPreschoolData = await sb
          .from('profiles')
          .select('preschool_id')
          .eq('id', userId)
          .maybeSingle();
        const userPreschoolId = userPreschoolData.data?.preschool_id;
        
        const { data: myReq } = await sb
          .from('guardian_requests')
          .select('id, child_full_name, created_at, status, school_id')
          .eq('parent_auth_id', userId)
          .eq('status', 'pending')
          .eq('school_id', userPreschoolId)
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
        // Use profiles table (users table is deprecated)
        const { data: internal } = await sb
          .from('profiles')
          .select('id, preschool_id')
          .eq('id', userId)
          .maybeSingle();

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
              .select('id, parent_auth_id, child_full_name, relationship, created_at, school_id')
              .in('student_id', studentIds)
              .eq('status', 'pending')
              .eq('school_id', preschoolId)
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
  const { unreadCount } = useUnreadMessages(userId, activeChildId);

  const handleRefresh = async () => {
    await refetchChildren();
  };

  const loading = authLoading || profileLoading || childrenLoading;
  
  if (loading) {
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

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbarRow topbarEdge">
          <div className="leftGroup">
            {preschoolName ? (
              <div className="chip" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>🎓</span>
                <span style={{ fontWeight: 600 }}>{preschoolName}</span>
              </div>
            ) : profile?.preschoolId ? (
              <div className="chip" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <span style={{ fontWeight: 600 }}>School Info Loading...</span>
              </div>
            ) : (
              <div className="chip" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <span style={{ fontWeight: 600 }}>No School Linked</span>
              </div>
            )}
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
          {/* Search Bar */}
          <div style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
            <div style={{ position: 'relative' }}>
              <input
                className="searchInput"
                placeholder="Search..."
                style={{ width: '100%', paddingRight: '2.5rem' }}
                onKeyDown={(e) => {
                  const t = e.target as HTMLInputElement;
                  if (e.key === 'Enter' && t.value.trim()) router.push(`/dashboard/parent/search?q=${encodeURIComponent(t.value.trim())}`);
                }}
              />
              <Search className="searchIcon icon16" style={{ right: '0.75rem', left: 'auto' }} />
            </div>
          </div>

          {/* Greeting */}
          <div className="section" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)', gap: 'var(--space-2)' }}>
              <h1 className="h1" style={{ margin: 0 }}>{greeting}, {userName}</h1>
            </div>

            {/* Show onboarding if no preschool linked */}
            {!preschoolName && !profile?.preschoolId && (
              <ParentOnboarding userName={userName} />
            )}

            {/* Show pending requests widget */}
            <PendingRequestsWidget userId={userId} />

            {/* Show pending status if preschool linked but no children */}
            {preschoolName && childrenCards.length === 0 && pendingRequests.length === 0 && !childrenLoading && (
              <div className="section">
                <div className="card" style={{ 
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                  color: 'white',
                  padding: 'var(--space-5)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🕒</div>
                  <h2 style={{ margin: 0, marginBottom: 8, fontSize: 20, fontWeight: 700 }}>
                    Registration Pending
                  </h2>
                  <p style={{ margin: 0, marginBottom: 16, fontSize: 14, opacity: 0.9 }}>
                    Your child registration is awaiting approval from {preschoolName}.
                  </p>
                  <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
                    You'll be notified once the school approves your request.
                  </p>
                </div>
              </div>
            )}

            {preschoolName && (
              <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', marginBottom: 16, cursor: 'pointer' }} onClick={() => router.push('/dashboard/parent/preschool')}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 24 }}>🎓</span>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{preschoolName}</h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingLeft: 32 }}>
                    <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>{roleDisplay}</p>
                    <span style={{ opacity: 0.7 }}>•</span>
                    <TierBadge userId={userId} size="sm" showUpgrade />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Children Cards - Horizontal Scroll */}
          {childrenCards.length > 0 && (
            <div className="section">
              <div className="sectionTitle">
                <Users className="w-4 h-4 text-purple-400" />
                My Children
              </div>
              <style>{`
                .child-scroll-container {
                  display: flex;
                  gap: var(--space-3);
                  overflow-x: auto;
                  overflow-y: hidden;
                  padding-bottom: var(--space-2);
                  scrollbar-width: thin;
                  scrollbar-color: var(--border) transparent;
                }
                .child-scroll-container::-webkit-scrollbar {
                  height: 6px;
                }
                .child-scroll-container::-webkit-scrollbar-track {
                  background: transparent;
                }
                .child-scroll-container::-webkit-scrollbar-thumb {
                  background: var(--border);
                  border-radius: 3px;
                }
                .child-scroll-container::-webkit-scrollbar-thumb:hover {
                  background: var(--muted);
                }
              `}</style>
              <div className="child-scroll-container">
                {childrenCards.map((child) => (
                  <div
                    key={child.id}
                    className="card"
                    style={{
                      padding: 'var(--space-4)',
                      cursor: 'pointer',
                      border: activeChildId === child.id ? '2px solid var(--primary)' : undefined,
                      transition: 'all 0.2s ease',
                      minWidth: '280px',
                      maxWidth: '320px',
                      width: '100%',
                      flexShrink: 0
                    }}
                    onClick={() => setActiveChildId(child.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                      <div 
                        className="avatar" 
                        style={{ 
                          width: 48, 
                          height: 48, 
                          fontSize: 20, 
                          flexShrink: 0,
                          backgroundImage: child.avatarUrl ? `url(${child.avatarUrl})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {!child.avatarUrl && `${child.firstName[0]}${child.lastName[0]}`}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                          {child.firstName} {child.lastName}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {child.grade}{child.className ? ` • ${child.className}` : ''}
                        </div>
                      </div>
                      {activeChildId === child.id && (
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          flexShrink: 0
                        }}></div>
                      )}
                    </div>
                    <div className="grid2" style={{ gap: 'var(--space-2)' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>{child.homeworkPending}</div>
                        Homework
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>{child.upcomingEvents}</div>
                        Events
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

            {/* Removed duplicate buttons - onboarding banner already has CTAs */}

            {pendingRequests.length > 0 && (
              <div className="section">
                <div className="card">
                  <div className="sectionTitle">
                    <Clock className="w-4 h-4 text-orange-400" />
                    Pending Child Link Requests ({pendingRequests.length})
                  </div>
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
              <div className="sectionTitle">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Overview
              </div>
              <div className="grid2">
                <div className="card tile">
                  <div className="metricValue">{unreadCount}</div>
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
              <div className="sectionTitle">
                <Zap className="w-4 h-4 text-yellow-400" />
                Quick Actions
              </div>
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

            {/* CAPS Curriculum Activities */}
            {activeChild && (
              <div className="section">
                <style>{`
                  @media (max-width: 767px) {
                    .caps-activities-grid {
                      grid-template-columns: 1fr !important;
                    }
                  }
                `}</style>
                <CAPSActivitiesWidget
                  childAge={activeChild.progressScore > 80 ? 6 : 5} 
                  childName={activeChild.firstName}
                  onAskDashAI={(prompt, display) => {
                    handleAskFromActivity(prompt, display);
                  }}
                />
              </div>
            )}

            {/* CAPS Exam Preparation - For older children (school-age) */}
            {activeChild && activeChild.progressScore > 50 && (
              <div className="section">
                <div className="card" style={{ padding: 'var(--space-5)', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                <ExamPrepWidget
                  onAskDashAI={(prompt, display, language, enableInteractive) => {
                    handleAskFromActivity(prompt, display, language, enableInteractive);
                  }}
                  guestMode={false}
                />
                </div>
              </div>
            )}
        </main>

        <aside className="right sticky" aria-label="At a glance">
          <div style={{ overflowY: 'auto', height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="card">
                <div className="sectionTitle">
                  <Clock className="w-4 h-4 text-purple-400" />
                  At a Glance
                </div>
                <ul style={{ display: 'grid', gap: 8 }}>
                  <li className="listItem"><span>Upcoming events</span><span className="badge">{activeChild ? metrics.upcomingEvents : 0}</span></li>
                  <li className="listItem"><span>Unread messages</span><span className="badge">{unreadCount}</span></li>
                  <li className="listItem"><span>Fees due</span><span className="badge">{activeChild && metrics.feesDue ? 'R ' + metrics.feesDue.amount.toLocaleString() : 'None'}</span></li>
                </ul>
            </div>
            <AskAIWidget inline />
          </div>
        </aside>
      </div>

      {/* Ask AI Modal - Fullscreen */}
      {showAskAI && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            padding: 'var(--space-4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}>
            <h2 className="h2" style={{ margin: 0 }}>Ask Dash AI</h2>
            <button
              className="iconBtn"
              onClick={() => setShowAskAI(false)}
              aria-label="Close"
            >
              <X className="icon20" />
            </button>
          </div>
          <div style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <AskAIWidget
              initialPrompt={aiPrompt}
              displayMessage={aiDisplay}
              language={aiLanguage}
              enableInteractive={aiInteractive}
              inline
              fullscreen
            />
          </div>
        </div>
      )}

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
