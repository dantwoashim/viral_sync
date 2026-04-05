import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Uncomment for APK builds
  // Next.js 16 uses Turbopack by default.
  // Use the repo root so workspace-hoisted dependencies resolve during builds.
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
