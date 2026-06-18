import { type NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

/**
 * Security middleware: attaches a per-request nonce and Content-Security-Policy header.
 *
 * Static security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
 * Permissions-Policy, HSTS) are set in next.config.ts and apply to all responses
 * including static files. This middleware handles the nonce-based CSP which requires
 * per-request randomness and therefore cannot be done in next.config.ts.
 */

function generateNonce(): string {
  return randomBytes(16).toString("base64");
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";

  const directives: Record<string, string> = {
    "default-src": "'self'",
    // nonce covers Next.js inline scripts; strict-dynamic lets those scripts load further scripts
    "script-src": `'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // unsafe-inline needed for CSS-in-JS / Tailwind style injection at runtime
    "style-src": "'self' 'unsafe-inline'",
    "img-src": "'self' data: blob: https:",
    "font-src": "'self' data:",
    // Supabase project URL — adjust if the project URL changes
    "connect-src": [
      "'self'",
      "https://*.supabase.co",
      "https://*.supabase.in",
      // Sentry DSN reporting
      "https://*.sentry.io",
      // Next.js HMR in dev
      ...(isDev ? ["ws://localhost:*", "http://localhost:*"] : []),
    ].join(" "),
    "frame-src": "'none'",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "upgrade-insecure-requests": "",
  };

  return Object.entries(directives)
    .map(([key, value]) => (value ? `${key} ${value}` : key))
    .join("; ");
}

/** Maximum allowed request body size for API routes (1 MiB). */
const API_BODY_SIZE_LIMIT_BYTES = 1 * 1024 * 1024;

export function middleware(req: NextRequest) {
  // Reject oversized request bodies on API routes before they reach handlers.
  if (
    req.nextUrl.pathname.startsWith("/api/") &&
    ["POST", "PUT", "PATCH"].includes(req.method)
  ) {
    const contentLength = req.headers.get("content-length");
    if (contentLength !== null) {
      const bodySize = parseInt(contentLength, 10);
      if (!isNaN(bodySize) && bodySize > API_BODY_SIZE_LIMIT_BYTES) {
        return new NextResponse(
          JSON.stringify({ ok: false, error: "الطلب كبير جداً. الحد الأقصى للحجم هو 1 ميغابايت." }),
          {
            status: 413,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        );
      }
    }
  }

  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const res = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  // Expose nonce to layout/page via request header so Next.js can inject it into <script> tags
  res.headers.set("x-nonce", nonce);
  res.headers.set("content-security-policy", csp);

  return res;
}

export const config = {
  matcher: [
    /*
     * Run on all request paths EXCEPT:
     * - _next/static  (static files served directly by Next.js)
     * - _next/image   (image optimization API)
     * - favicon.ico, sitemap.xml, robots.txt, manifest.json
     * - public folder assets (images, icons, etc.)
     *
     * API routes that return JSON are included — browsers don't enforce CSP on
     * JSON responses, so the header is harmless and improves defence-in-depth.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot)).*)",
  ],
};
