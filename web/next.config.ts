import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence multi-lockfile root inference warning in monorepo
  turbopack: {
    root: __dirname,
  },
  // Ensure static assets like manifest.json are served correctly
  // No PWA plugin to avoid deprecated transitive deps and SW conflicts
};

export default nextConfig;
