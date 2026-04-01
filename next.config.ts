import type { NextConfig } from "next";
import nextIntl from "next-intl/plugin";

// CSP is now handled by proxy.ts with per-request nonces
// Security headers are set in proxy.ts for dynamic routes
// Static assets use the headers below as fallback

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        // Headers for static assets only
        // Dynamic routes use proxy.ts for CSP with nonces
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
