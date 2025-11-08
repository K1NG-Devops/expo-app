import { NextRequest, NextResponse } from 'next/server';
import { verifyGoogleIdToken, syncGoogleUserWithSupabase, generateSupabaseSession } from '@/lib/firebase-google-auth';

/**
 * POST /api/auth/google
 * 
 * Authenticate users with Google Sign-In via Firebase
 * 
 * Request body:
 * {
 *   idToken: string // Google ID token from Firebase Auth
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   user: { id, email, name, picture },
 *   session: { accessToken, refreshToken }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📥 Google authentication request received');
    
    const { idToken, role } = await request.json();

    if (!idToken) {
      console.error('❌ No ID token provided');
      return NextResponse.json(
        { error: 'ID token required' },
        { status: 400 }
      );
    }

    console.log('🔐 Verifying Google ID token...');

    // Verify Google ID token
    const googleUser = await verifyGoogleIdToken(idToken);

    if (!googleUser) {
      console.error('❌ Token verification failed');
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.log('✅ Token verified for user:', googleUser.email);

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Supabase credentials not configured:', {
        supabaseUrl: !!supabaseUrl,
        serviceRoleKey: !!serviceRoleKey,
      });
      return NextResponse.json(
        { error: 'Authentication service not configured' },
        { status: 500 }
      );
    }

    console.log('📤 Syncing user with Supabase...');

    // Sync user with Supabase (pass role for proper profile creation)
    const supabaseUser = await syncGoogleUserWithSupabase(
      googleUser,
      supabaseUrl,
      serviceRoleKey,
      role || 'parent'  // Default to 'parent' if not specified
    );

    if (!supabaseUser) {
      console.error('❌ Failed to sync user with Supabase');
      return NextResponse.json(
        { error: 'Failed to create user session' },
        { status: 500 }
      );
    }

    console.log('✅ User synced:', supabaseUser.email);
    console.log('🎟️  Generating session tokens...');

    // Generate Supabase session tokens
    const session = await generateSupabaseSession(
      supabaseUser.userId,
      supabaseUser.email,
      supabaseUrl,
      serviceRoleKey
    );

    if (!session) {
      console.error('❌ Failed to generate session tokens');
      return NextResponse.json(
        { error: 'Failed to generate session' },
        { status: 500 }
      );
    }

    console.log('✅ Session generated successfully');

    // Return user data and session
    return NextResponse.json({
      success: true,
      user: {
        id: supabaseUser.userId,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        emailVerified: googleUser.email_verified,
      },
      session: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      },
    });
  } catch (error) {
    console.error('❌ Google authentication error:', error);
    return NextResponse.json(
      {
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/google
 * 
 * Check if Google authentication is configured
 */
export async function GET() {
  const firebaseConfigured = !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  );

  const supabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return NextResponse.json({
    configured: firebaseConfigured && supabaseConfigured,
    firebase: firebaseConfigured,
    supabase: supabaseConfigured,
    message: firebaseConfigured && supabaseConfigured
      ? 'Google Sign-In is ready'
      : 'Google Sign-In not fully configured',
  });
}
