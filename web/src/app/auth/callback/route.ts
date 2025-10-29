import { createClient } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Successfully verified email - redirect to dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If there's an error or no code, redirect to sign-in with error
  return NextResponse.redirect(`${origin}/sign-in?error=verification_failed`);
}
