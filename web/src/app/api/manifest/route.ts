import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.webmanifest');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    
    return new NextResponse(manifestContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error serving manifest:', error);
    return new NextResponse('Manifest not found', { status: 404 });
  }
}
