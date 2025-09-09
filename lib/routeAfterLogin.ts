import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export async function routeAfterLogin() {
  try {
    const { data: { user } } = await supabase!.auth.getUser();
    const id = user?.id;
    let role: string | null = (user?.user_metadata as any)?.role ?? null;
    let school: string | null = (user?.user_metadata as any)?.preschool_id ?? null;

    // Try profiles table if role not in metadata
    if (!role && id) {
      try {
        const { data, error } = await supabase!.from('profiles').select('role,preschool_id').eq('id', id).maybeSingle();
        if (!error && data) {
          role = (data as any).role ?? role;
          school = (data as any).preschool_id ?? school;
        }
      } catch {}
    }

    const to = role === 'teacher' ? '/screens/teacher-dashboard'
      : role === 'parent' ? '/screens/parent-dashboard'
      : '/screens/principal-dashboard';

    if (to.includes('principal') && school) {
      router.replace(`${to}?school=${encodeURIComponent(String(school))}`);
    } else {
      router.replace(to);
    }
  } catch {
    // ignore
  }
}

