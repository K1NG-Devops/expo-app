'use client';

import { useMemo, useState } from 'react';
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
  BookOpen,
  ClipboardCheck,
  Menu,
  X,
} from 'lucide-react';
import { TierBadge } from '@/components/ui/TierBadge';

interface TeacherShellProps {
  tenantSlug?: string;
  userEmail?: string;
  userName?: string;
  preschoolName?: string;
  preschoolId?: string;
  userId?: string;
  unreadCount?: number;
  children: React.ReactNode;
}

export function TeacherShell({ 
  tenantSlug, 
  userEmail, 
  userName,
  preschoolName,
  preschoolId,
  userId,
  unreadCount = 0, 
  children 
}: TeacherShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const avatarLetter = useMemo(() => (userName?.[0] || userEmail?.[0] || 'T').toUpperCase(), [userName, userEmail]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const nav = [
    { href: '/dashboard/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/teacher/classes', label: 'My Classes', icon: Users },
    { href: '/dashboard/teacher/assignments', label: 'Assignments', icon: ClipboardCheck },
    { href: '/dashboard/teacher/lessons', label: 'Lesson Plans', icon: BookOpen },
    { href: '/dashboard/teacher/messages', label: 'Messages', icon: MessageCircle, badge: unreadCount },
    { href: '/dashboard/teacher/settings', label: 'Settings', icon: Settings },
  ];

  // Check if we should show back button (not on dashboard home)
  const showBackButton = pathname !== '/dashboard/teacher';

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbarRow topbarEdge">
          <div className="leftGroup">
            <button 
              className="iconBtn md:hidden" 
              aria-label="Menu" 
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="icon20" />
            </button>
            {showBackButton && (
              <button className="iconBtn hidden md:flex" aria-label="Back" onClick={() => router.back()}>
                <ArrowLeft className="icon20" />
              </button>
            )}
            {preschoolName ? (
              <div className="chip" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>🎓</span>
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
              placeholder="Search students, classes..."
              onKeyDown={(e) => {
                const t = e.target as HTMLInputElement;
                if (e.key === 'Enter' && t.value.trim()) router.push(`/dashboard/teacher/search?q=${encodeURIComponent(t.value.trim())}`);
              }}
            />
          </div>
          <div className="rightGroup">
            <TierBadge preschoolId={preschoolId} userId={userId} size="sm" showUpgrade />
            <button className="iconBtn" aria-label="Notifications">
              <Bell className="icon20" />
            </button>
            <button
              className="avatar" 
              style={{ cursor: 'pointer', border: 'none', background: 'none' }}
              onClick={() => router.push('/dashboard/teacher/settings')}
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

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-700/60 shadow-2xl rounded-r-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🎓</div>
                <div>
                  <div className="text-sm font-bold text-white truncate max-w-[160px]">
                    {preschoolName || 'EduDash Pro'}
                  </div>
                  <div className="text-xs text-blue-400 capitalize font-semibold">Teacher</div>
                </div>
              </div>
              <button
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-800/60 text-slate-300 border border-slate-700/40 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
              {nav.map((it) => {
                const Icon = it.icon as any;
                const active = pathname === it.href || pathname?.startsWith(it.href + '/');
                return (
                  <button
                    key={it.href}
                    onClick={() => { setMobileMenuOpen(false); router.push(it.href); }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent hover:border-slate-700/40'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-semibold text-sm truncate">{it.label}</span>
                    {typeof it.badge === 'number' && it.badge > 0 && (
                      <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">{it.badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="px-4 pb-5 pt-4 border-t border-slate-700/60">
              <button
                onClick={() => { setMobileMenuOpen(false); supabase.auth.signOut().then(() => router.push('/sign-in')); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-red-400 hover:bg-red-900/30 rounded-xl transition-all duration-200 border border-transparent hover:border-red-800/40"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm truncate font-semibold">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
