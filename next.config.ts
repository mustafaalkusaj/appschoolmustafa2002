import type { NextConfig } from "next";
import nextIntl from "next-intl/plugin";

function resolveOptionalOrigin(value: string | undefined) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const supabaseOrigin = resolveOptionalOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseHost = supabaseOrigin ? new URL(supabaseOrigin).hostname : undefined;
const connectSrc = ["'self'"];
const imageSrc = ["'self'", "data:", "blob:", "https:"];

// TODO (security): replace 'unsafe-inline' in script-src with per-request nonces.
// Next.js App Router injects inline hydration scripts, so nonces must be generated
// in middleware and forwarded via response headers. See:
// https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
const scriptSrc = ["'self'", "'unsafe-inline'"];
if (process.env.NODE_ENV !== "production") {
  scriptSrc.push("'unsafe-eval'");
}

if (supabaseOrigin) {
  connectSrc.push(supabaseOrigin);
  imageSrc.push(supabaseOrigin);
}

if (supabaseHost) {
  connectSrc.push(`wss://${supabaseHost}`);
}

const cspParts = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  `connect-src ${Array.from(new Set(connectSrc)).join(" ")}`,
  `img-src ${Array.from(new Set(imageSrc)).join(" ")}`,
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  `script-src ${scriptSrc.join(" ")}`,
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspParts.join("; "),
          },
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
