import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    });

    // Get session to verify user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[API AI-Proxy] Calling Supabase edge function for user:', session.user.email);

    // Call the ai-proxy edge function
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        message,
        conversationHistory: conversationHistory || [],
        userId: session.user.id
      }
    });

    if (error) {
      console.error('[API AI-Proxy] Edge function error:', error);
      throw error;
    }

    console.log('[API AI-Proxy] Response received successfully');

    return NextResponse.json({
      response: data.content || data.response || data.message,
      usage: data.usage,
      success: true
    });

  } catch (error) {
    console.error('[API AI-Proxy] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get AI response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
