import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const error_description = searchParams.get('error_description');
  const error_code = searchParams.get('error');

  // Handle OAuth errors
  if (error_code) {
    console.error('[Auth Callback] OAuth error:', error_code, error_description);
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(error_description || 'OAuth authentication failed')}`
    );
  }

  if (!code) {
    // If there's no code and no error, redirect to sign-in
    return NextResponse.redirect(`${origin}/sign-in`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Prepare a redirect response we will return, and attach cookies to it
  let redirectPath = next || '/dashboard';
  const response = NextResponse.redirect(`${origin}${redirectPath}`);

  // Create server client that reads cookies from the request and writes to the response
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        response.cookies.set(name, value, options);
      },
      remove(name: string, options: any) {
        response.cookies.set(name, '', { ...options, maxAge: 0 });
      },
    },
    auth: {
      storageKey: 'edudash-auth-session',
      flowType: 'pkce',
    },
  });

  // Exchange code for a session and set cookies on the same response
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data?.session) {
    console.error('[Auth Callback] Session exchange error:', error);
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(error?.message || 'Authentication failed')}`
    );
  }

  console.log('[Auth Callback] Session established for', data.user.email);

  // Determine role for redirect
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    const role = profile?.role as string | undefined;

    redirectPath = next
      ? next
      : role === 'parent'
        ? '/dashboard/parent'
        : role === 'teacher'
          ? '/dashboard/teacher'
          : role === 'principal'
            ? '/dashboard/principal'
            : role === 'superadmin'
              ? '/dashboard/admin'
              : '/dashboard';
  } catch (e) {
    console.warn('[Auth Callback] Failed to load profile role, defaulting to /dashboard');
    redirectPath = next || '/dashboard';
  }

  // Update final redirect location on the same response carrying cookies
  response.headers.set('Location', `${origin}${redirectPath}`);
  return response;
}
