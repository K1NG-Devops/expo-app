import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { track } from '@/lib/analytics';

function normalizeRole(r?: string | null): string | null {
  if (!r) return null;
  const s = String(r).trim().toLowerCase();
  // Map potential variants to canonical
  if (s.includes('super')) return 'superadmin';
  if (s.includes('principal')) return 'principal';
  if (s === 'admin' || s.includes('school admin')) return 'admin';
  if (s.includes('teacher')) return 'teacher';
  if (s.includes('parent')) return 'parent';
  return s as any;
}

export async function routeAfterLogin() {
  try {
    const { data: { user } } = await supabase!.auth.getUser();
    const id = user?.id;
    let role: string | null = normalizeRole((user?.user_metadata as any)?.role ?? null);
    let school: string | null = (user?.user_metadata as any)?.preschool_id ?? null;

    // Try profiles table if role not in metadata
    if (!role && id) {
      try {
        let data: any = null; let error: any = null;
        ({ data, error } = await supabase!.from('profiles').select('role,preschool_id').eq('id', id).maybeSingle());
        if ((!data || error) && id) {
          // Fallback if schema uses user_id
          ({ data, error } = await supabase!.from('profiles').select('role,preschool_id').eq('user_id', id).maybeSingle());
        }
        if (!error && data) {
          role = normalizeRole((data as any).role ?? role);
          school = (data as any).preschool_id ?? school;
        }
      } catch {}
    }

    // Default route map
    let to = '/screens/principal-dashboard';
    if (role === 'teacher') to = '/screens/teacher-dashboard';
    else if (role === 'parent') to = '/screens/parent-dashboard';
    else if (role === 'superadmin') to = '/screens/super-admin-leads';
    else if (role === 'admin' || role === 'principal') to = '/screens/principal-dashboard';

    track('route_after_login', { role, school, to });
    if (to.includes('principal') && school) {
      router.replace({ pathname: to as any, params: { school: String(school) } } as any);
    } else {
      router.replace(to as any);
    }
  } catch {
    // ignore
  }
}

