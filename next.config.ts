import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence multi-lockfile root inference warning in monorepo
  turbopack: {
    root: __dirname,
  },
  // Ensure static assets like manifest.json are served correctly
  // No PWA plugin to avoid deprecated transitive deps and SW conflicts
  
  // Headers for Google Sign-In popup support
  async headers() {
    return [
      {
        // Allow Google Sign-In popups to communicate with parent window
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
