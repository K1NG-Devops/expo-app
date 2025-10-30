import { createClient } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      // Successfully verified email
      // Get user's role from profile to route to correct dashboard
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      // Determine redirect based on role or custom next param
      let redirectPath = next;
      
      if (!redirectPath) {
        // Route to role-specific dashboard
        switch (profile?.role) {
          case 'parent':
            redirectPath = '/dashboard/parent';
            break;
          case 'teacher':
            redirectPath = '/dashboard/teacher';
            break;
          case 'principal':
            redirectPath = '/dashboard/principal';
            break;
          default:
            redirectPath = '/dashboard';
        }
      }
      
      return NextResponse.redirect(`${origin}${redirectPath}?verified=true`);
    }
  }

  // If there's an error or no code, redirect to sign-in with error
  return NextResponse.redirect(`${origin}/sign-in?error=verification_failed`);
}
