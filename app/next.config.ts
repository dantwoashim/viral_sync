import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // output: 'export', // Uncomment for APK builds
  // Next.js 16 uses Turbopack by default.
  // Privy Solana externals are handled at runtime, not build-time.
  turbopack: {},
  async headers() {
    const securityHeaders = [
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/for-merchants",
        destination: "/for-sponsors",
        permanent: false,
      },
      {
        source: "/campaign/:path*",
        destination: "/market/ward12-water-repair",
        permanent: false,
      },
      {
        source: "/claim/:path*",
        destination: "/participate/ward12-water-repair",
        permanent: false,
      },
      {
        source: "/merchant/scan",
        destination: "/verify/ward12-water-repair",
        permanent: false,
      },
      {
        source: "/merchant/today",
        destination: "/ledger",
        permanent: false,
      },
      {
        source: "/proof",
        destination: "/ledger",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
