import type { NextConfig } from "next";
import nextIntl from "next-intl/plugin";
/**
 * CSP and Security headers are primarily handled by middleware.ts (per-request nonces).
 * Static assets use the fallback headers defined below.
 */

const nextConfig: NextConfig = {
  // Strict by default. The deploy script sets SKIP_BUILD_TYPECHECK=1 for the
  // REMOTE build only, and solely because it already ran `npm run typecheck`
  // locally and aborts on any error. Type-checking a second time inside
  // `next build` pushed the 7.7 GB host past its limit and the kernel
  // OOM-killed the build mid-write. Never set this by hand to dodge an error.
  typescript: { ignoreBuildErrors: process.env.SKIP_BUILD_TYPECHECK === "1" },
  // Allows deploy scripts to build into a staging dir (NEXT_DIST_DIR=.next-build)
  // and swap it in atomically, instead of overwriting the served .next in place.
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
  outputFileTracingRoot: process.cwd(),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  poweredByHeader: false,
  compress: true,
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
    // One worker per core is what the build defaults to, and each carries its
    // own heap. On the 4-core / 7 GB production host that put resident memory
    // at 7.4 GB and the kernel OOM-killed the build. BUILD_CPUS lets the deploy
    // throttle it there without slowing builds down anywhere else.
    ...(process.env.BUILD_CPUS ? { cpus: Number(process.env.BUILD_CPUS) } : {}),
  },
  // The filesystem cache is assembled in memory before it is serialised, which
  // on the 4-core / 7 GB production host is the difference between a build that
  // finishes and one the kernel OOM-kills (resident peaked at 7.4 GB). The
  // deploy sets DISABLE_BUILD_CACHE=1 there and trades build time for headroom;
  // everywhere else the cache stays on.
  webpack(config) {
    if (process.env.DISABLE_BUILD_CACHE === "1") {
      config.cache = false;
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
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
