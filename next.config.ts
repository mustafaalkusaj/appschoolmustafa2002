import type { NextConfig } from "next";
import nextIntl from "next-intl/plugin";
/**
 * CSP and Security headers are primarily handled by middleware.ts (per-request nonces).
 * Static assets use the fallback headers defined below.
 */

const nextConfig: NextConfig = {
  // Allows deploy scripts to build into a staging dir (NEXT_DIST_DIR=.next-build)
  // and swap it in atomically, instead of overwriting the served .next in place.
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
  outputFileTracingRoot: process.cwd(),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "itbmzrplvpagwnzphsfv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion", "zod", "@supabase/supabase-js", "exceljs"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextIntl({
  requestConfig: "./i18n.ts",
})(nextConfig);
