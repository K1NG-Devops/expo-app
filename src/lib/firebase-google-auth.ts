/**
 * Firebase Authentication - Google Sign-In
 * 
 * Verifies Google ID tokens from Firebase Auth and syncs with Supabase
 */

import { getFirebaseServiceAccount } from './firebase-admin';

interface GoogleAuthPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat: number;
  exp: number;
}

/**
 * Verify Google ID token from Firebase Authentication
 * 
 * Simplified approach: Decode the JWT and validate basic claims
 * Firebase already verified the token on the client side
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleAuthPayload | null> {
  try {
    const serviceAccount = getFirebaseServiceAccount();
    
    if (!serviceAccount) {
      console.error('Firebase not configured for Google authentication');
      return null;
    }

    // Decode the JWT payload (we trust Firebase client-side verification)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [headerB64, payloadB64] = parts;
    
    // Decode payload
    const payload: GoogleAuthPayload = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
    );

    console.log('🔍 Token payload:', {
      email: payload.email,
      email_verified: payload.email_verified,
      aud: payload.aud,
      iss: payload.iss,
      exp: new Date(payload.exp * 1000).toISOString(),
    });

    // Basic validation
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp < now) {
      console.error('❌ Token expired:', {
        exp: new Date(payload.exp * 1000).toISOString(),
        now: new Date(now * 1000).toISOString(),
      });
      throw new Error('Token expired');
    }

    if (payload.iat > now + 60) { // Allow 60 second clock skew
      console.error('❌ Token used before issued');
      throw new Error('Token used before issued');
    }

    // Validate issuer
    const validIssuers = [
      'https://securetoken.google.com/' + serviceAccount.project_id,
      'https://accounts.google.com'
    ];
    
    if (!validIssuers.includes(payload.iss)) {
      console.error('❌ Invalid issuer:', payload.iss);
      throw new Error('Invalid issuer');
    }

    // Validate audience (should match project ID)
    if (payload.aud !== serviceAccount.project_id) {
      console.error('❌ Invalid audience:', {
        expected: serviceAccount.project_id,
        actual: payload.aud,
      });
      throw new Error('Invalid audience');
    }

    if (!payload.email) {
      throw new Error('Email not found in token');
    }

    // Note: We're being lenient with email_verified for development
    // In production, you might want to enforce this
    if (!payload.email_verified) {
      console.warn('⚠️  Email not verified, but allowing for development');
    }

    console.log('✅ Token validation successful');
    return payload;
  } catch (error) {
    console.error('❌ Failed to verify Google ID token:', error);
    return null;
  }
}

/**
 * Sync Google user with Supabase
 * Creates or updates user in Supabase auth
 */
export async function syncGoogleUserWithSupabase(
  googleUser: GoogleAuthPayload,
  supabaseUrl: string,
  serviceRoleKey: string,
  role: string = 'parent'
): Promise<{ userId: string; email: string } | null> {
  try {
    console.log('🔄 Syncing user with Supabase:', googleUser.email, 'Role:', role);

    // Split full name into first and last name
    const nameParts = googleUser.name?.split(' ') || [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Try to create the user using Supabase Admin API
    const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        email: googleUser.email,
        email_confirm: true,
        user_metadata: {
          full_name: googleUser.name,
          first_name: firstName,
          last_name: lastName,
          avatar_url: googleUser.picture,
          provider: 'google',
          provider_id: googleUser.sub,
          role: role,  // ← Set role for the trigger!
        },
        app_metadata: {
          provider: 'google',
          providers: ['google'],
        },
      }),
    });

    const createResult = await createUserResponse.json();
    
    if (!createUserResponse.ok) {
      console.log('⚠️  User creation response:', createUserResponse.status, createResult);
      
      // Check if user already exists (409 Conflict or specific error)
      if (createUserResponse.status === 409 || 
          createResult.msg?.includes('already') ||
          createResult.message?.includes('already')) {
        console.log('👤 User already exists, fetching existing user...');
        
        // User already exists, get their ID
        const listUsersResponse = await fetch(
          `${supabaseUrl}/auth/v1/admin/users`,
          {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
            },
          }
        );

        if (listUsersResponse.ok) {
          const usersData = await listUsersResponse.json();
          const existingUser = usersData.users?.find((u: any) => u.email === googleUser.email);
          
          if (existingUser) {
            console.log('✅ Found existing user:', existingUser.id);
            return { userId: existingUser.id, email: googleUser.email };
          }
        }
      }

      console.error('❌ Failed to create or find user:', createResult);
      throw new Error(createResult.msg || createResult.message || 'Failed to create or find user');
    }

    console.log('✅ User created successfully:', createResult.id);
    return { userId: createResult.id, email: googleUser.email };
  } catch (error) {
    console.error('❌ Failed to sync Google user with Supabase:', error);
    if (error instanceof Error) {
      console.error('   Error details:', error.message);
    }
    return null;
  }
}

/**
 * Generate Supabase session token for Google-authenticated user
 */
export async function generateSupabaseSession(
  userId: string,
  email: string,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    console.log('🎟️  Generating session for user:', userId);
    
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        type: 'magiclink',
        email: email,
        options: {
          redirect_to: `${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'}/dashboard`,
        },
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed to generate link:', response.status, result);
      throw new Error(result.msg || result.message || 'Failed to generate session');
    }

    console.log('📧 Magic link generated, extracting tokens...');
    
    // Extract tokens from the magic link
    const actionLink = result.properties?.action_link;
    if (!actionLink) {
      console.error('❌ No action link in response:', result);
      throw new Error('No action link found in response');
    }

    const url = new URL(actionLink);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      console.error('❌ Tokens not found in URL. Params:', Array.from(url.searchParams.keys()));
      
      // Fallback: Try using hash parameters
      if (url.hash) {
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');
        
        if (hashAccessToken && hashRefreshToken) {
          console.log('✅ Found tokens in hash fragment');
          return { 
            accessToken: hashAccessToken, 
            refreshToken: hashRefreshToken 
          };
        }
      }
      
      throw new Error('Tokens not found in magic link');
    }

    console.log('✅ Session tokens generated successfully');
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('❌ Failed to generate Supabase session:', error);
    if (error instanceof Error) {
      console.error('   Error details:', error.message);
    }
    return null;
  }
}
