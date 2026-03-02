import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Uncomment for APK builds
  // Next.js 16 uses Turbopack by default.
  // Privy Solana externals are handled at runtime, not build-time.
  turbopack: {},
};

export default nextConfig;
