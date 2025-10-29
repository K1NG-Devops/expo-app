'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  MessageCircle,
  Users,
  LayoutDashboard,
  LogOut,
  Search,
  Bell,
  ArrowLeft,
  Settings,
} from 'lucide-react';

interface ParentShellProps {
  tenantSlug?: string;
  userEmail?: string;
  userName?: string;
  preschoolName?: string;
  unreadCount?: number;
  children: React.ReactNode;
}

export function ParentShell({ tenantSlug, userEmail, userName, preschoolName, unreadCount = 0, children }: ParentShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const avatarLetter = useMemo(() => (userEmail?.[0] || 'U').toUpperCase(), [userEmail]);

  const nav = [
    { href: '/dashboard/parent', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/parent/messages', label: 'Messages', icon: MessageCircle, badge: unreadCount },
    { href: '/dashboard/parent/children', label: 'My Children', icon: Users },
    { href: '/dashboard/parent/settings', label: 'Settings', icon: Settings },
  ];

  // Check if we should show back button (not on dashboard home)
  const showBackButton = pathname !== '/dashboard/parent';

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbarRow topbarEdge">
          <div className="leftGroup">
            {showBackButton && (
              <button className="iconBtn" aria-label="Back" onClick={() => router.back()}>
                <ArrowLeft className="icon20" />
              </button>
            )}
            {preschoolName ? (
              <div className="chip" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>🎓</span>
                <span style={{ fontWeight: 600 }}>{preschoolName}</span>
              </div>
            ) : (
              <div className="chip">{tenantSlug || 'EduDash Pro'}</div>
            )}
          </div>
          <div className="searchGroup">
            <input
              className="searchInput"
              placeholder="Search..."
              style={{ paddingRight: '2.5rem' }}
              onKeyDown={(e) => {
                const t = e.target as HTMLInputElement;
                if (e.key === 'Enter' && t.value.trim()) router.push(`/dashboard/parent/search?q=${encodeURIComponent(t.value.trim())}`);
              }}
            />
            <Search className="searchIcon icon16" style={{ right: '0.75rem', left: 'auto' }} />
          </div>
          <div className="rightGroup">
            <button className="iconBtn" aria-label="Notifications">
              <Bell className="icon20" />
            </button>
            <button 
              className="avatar" 
              style={{ cursor: 'pointer', border: 'none', background: 'none' }}
              onClick={() => router.push('/dashboard/parent/settings')}
              aria-label="Profile Settings"
            >
              {avatarLetter}
            </button>
          </div>
        </div>
      </header>

      <div className="frame">
        <aside className="sidenav sticky" aria-label="Sidebar">
          <div className="sidenavCol">
            <nav className="nav">
              {nav.map((it) => {
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
                onClick={async () => { await supabase.auth.signOut(); router.push('/sign-in'); }}
              >
                <LogOut className="navIcon" />
                <span>Sign out</span>
              </button>
              <div className="brandPill w-full text-center">Powered by EduDash Pro</div>
            </div>
          </div>
        </aside>

        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}