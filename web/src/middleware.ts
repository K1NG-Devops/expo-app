import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Allow public access to manifest, icons, and service worker
  const publicPaths = [
    '/manifest.webmanifest',
    '/manifest.json',
    '/sw.js',
    '/icon-192.png',
    '/icon-512.png',
    '/api/manifest',
  ];
  
  if (publicPaths.some(path => pathname === path)) {
    // Clone the response and ensure it's public
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'none');
    return response;
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
