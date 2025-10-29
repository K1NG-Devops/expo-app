'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenantSlug } from '@/lib/tenant/useTenantSlug';
import { ParentShell } from '@/components/dashboard/parent/ParentShell';
import { Settings, User, Bell, Lock, Globe, Moon, Sun } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string>();
  const [userId, setUserId] = useState<string>();
  const { slug } = useTenantSlug(userId);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ParentShell tenantSlug={slug} userEmail={userEmail}>
      <div className="container">
        <div className="section">
          <h1 className="h1">Settings</h1>
          <p className="muted">Manage your account preferences</p>
        </div>
        <div className="section">
          <div className="grid gap-4 max-w-3xl">

            {/* Profile Settings */}
            <div className="card p-md">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold">Profile</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors">
                  Save Changes
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="card p-md">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold">Notifications</h2>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Email Notifications</div>
                    <div className="text-xs text-gray-400">Receive updates via email</div>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                    <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Push Notifications</div>
                    <div className="text-xs text-gray-400">Receive push notifications</div>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600">
                    <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                  </button>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="card p-md">
              <div className="flex items-center gap-3 mb-4">
                {darkMode ? (
                  <Moon className="w-5 h-5 text-blue-500" />
                ) : (
                  <Sun className="w-5 h-5 text-blue-500" />
                )}
                <h2 className="text-lg font-semibold">Appearance</h2>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Dark Mode</div>
                  <div className="text-xs text-gray-400">Toggle dark mode</div>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    darkMode ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                  />
                </button>
              </div>
            </div>

            {/* Language */}
            <div className="card p-md">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold">Language</h2>
              </div>
              <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>English (South Africa)</option>
                <option>Afrikaans</option>
                <option>Zulu</option>
                <option>Xhosa</option>
              </select>
            </div>

            {/* Security */}
            <div className="card p-md">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold">Security</h2>
              </div>
              <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors text-left">
                Change Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </ParentShell>
  );
}
