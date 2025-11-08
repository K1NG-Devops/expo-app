import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Central Proxy (Next.js 16). This replaces legacy middleware.
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const publicPaths = new Set([
    '/manifest.webmanifest',
    '/manifest.json',
    '/sw.js',
    '/icon-192.png',
    '/icon-512.png',
    '/api/manifest',
  ]);

  if (publicPaths.has(pathname)) {
    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'none');
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/manifest.webmanifest',
    '/manifest.json',
    '/sw.js',
    '/icon-:path*',
    '/api/manifest',
  ],
};
