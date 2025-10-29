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
  DollarSign,
  FileText,
  UserPlus,
  School,
} from 'lucide-react';
import { TierBadge } from '@/components/ui/TierBadge';

interface PrincipalShellProps {
  tenantSlug?: string;
  userEmail?: string;
  userName?: string;
  preschoolName?: string;
  preschoolId?: string;
  unreadCount?: number;
  children: React.ReactNode;
  rightSidebar?: React.ReactNode;
}

export function PrincipalShell({ 
  tenantSlug, 
  userEmail, 
  userName,
  preschoolName,
  preschoolId,
  unreadCount = 0, 
  children,
  rightSidebar 
}: PrincipalShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const avatarLetter = useMemo(() => (userName?.[0] || userEmail?.[0] || 'P').toUpperCase(), [userName, userEmail]);

  const nav = [
    { href: '/dashboard/principal', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/principal/students', label: 'Students', icon: Users },
    { href: '/dashboard/principal/teachers', label: 'Teachers', icon: School },
    { href: '/dashboard/principal/financials', label: 'Financials', icon: DollarSign },
    { href: '/dashboard/principal/reports', label: 'Reports', icon: FileText },
    { href: '/dashboard/principal/messages', label: 'Messages', icon: MessageCircle, badge: unreadCount },
    { href: '/dashboard/principal/settings', label: 'Settings', icon: Settings },
  ];

  // Check if we should show back button (not on dashboard home)
  const showBackButton = pathname !== '/dashboard/principal';

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
                <span style={{ fontSize: 16 }}>🏫</span>
                <span style={{ fontWeight: 600 }}>{preschoolName}</span>
              </div>
            ) : (
              <div className="chip">{tenantSlug ? `/${tenantSlug}` : 'EduDash Pro'}</div>
            )}
          </div>
          <div className="searchGroup">
            <Search className="searchIcon icon16" />
            <input
              className="searchInput"
              placeholder="Search students, teachers, reports..."
              onKeyDown={(e) => {
                const t = e.target as HTMLInputElement;
                if (e.key === 'Enter' && t.value.trim()) router.push(`/dashboard/principal/search?q=${encodeURIComponent(t.value.trim())}`);
              }}
            />
          </div>
          <div className="rightGroup">
            <TierBadge preschoolId={preschoolId} size="sm" showUpgrade />
            <button className="iconBtn" aria-label="Notifications">
              <Bell className="icon20" />
            </button>
            <div className="avatar">{avatarLetter}</div>
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

        {rightSidebar && (
          <aside className="right sticky" aria-label="Activity">
            {rightSidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
