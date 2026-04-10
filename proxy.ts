import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
import { getPublicEnv } from "@/lib/env/public";
import { routing } from "./i18n/routing";

/**
 * Generates a cryptographically random nonce for CSP.
 * Uses Web Crypto API which is available in Next.js runtime.
 */
function generateNonce(): string {
  // Generate 16 random bytes and encode as base64
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Convert to base64 without spread operator (avoids downlevelIteration issue)
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Resolves optional origin URL to its origin string.
 */
function resolveOptionalOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// Create the next-intl middleware
const intlMiddleware = createIntlMiddleware(routing);

/**
 * Builds the Content-Security-Policy header value with a nonce.
 * 
 * SECURITY DECISIONS:
 * - script-src uses nonce instead of 'unsafe-inline' for better security
 * - 'strict-dynamic' allows scripts loaded by trusted scripts to execute
 * - style-src keeps 'unsafe-inline' because Tailwind CSS generates inline styles
 *   (see: https://tailwindcss.com/docs/content-security-policy)
 */
function buildCSP(nonce: string): string {
  const publicEnv = getPublicEnv();
  const supabaseOrigin = resolveOptionalOrigin(publicEnv.supabaseUrl);
  const supabaseHost = supabaseOrigin ? new URL(supabaseOrigin).hostname : undefined;
  
  const connectSrc = ["'self'"];
  const imageSrc = ["'self'", "data:", "blob:", "https:"];
  
  // Add Supabase origins if configured
  if (supabaseOrigin) {
    connectSrc.push(supabaseOrigin);
    imageSrc.push(supabaseOrigin);
  }
  if (supabaseHost) {
    connectSrc.push(`wss://${supabaseHost}`);
  }

  // Script sources with nonce (removed 'unsafe-inline')
  const scriptSrc: string[] = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'", // Modern browsers: allows scripts loaded by trusted scripts
  ];
  
  // Add 'unsafe-eval' in development for source maps and HMR
  if (process.env.NODE_ENV !== "production") {
    scriptSrc.push("'unsafe-eval'");
    scriptSrc.push("'unsafe-inline'");
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
    // SECURITY NOTE: 'unsafe-inline' required for Tailwind CSS inline styles
    // Alternative: Use Tailwind's CSP-compatible mode (requires build config changes)
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc.join(" ")}`,
  ];

  return cspParts.join("; ");
}

/**
 * Next.js 16 proxy function (formerly middleware).
 * Handles locale routing and CSP header injection with per-request nonces.
 */
function resolveRequestId(request: NextRequest) {
  const incoming = request.headers.get("x-request-id")?.trim();
  if (incoming && incoming.length <= 128) {
    return incoming;
  }
  return crypto.randomUUID();
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(request);
  const nonce = generateNonce();
  const csp = buildCSP(nonce);

  // First, run the next-intl middleware to handle locale routing
  const intlResponse = intlMiddleware(request);
  
  // If intl middleware returns a redirect (e.g., adding locale prefix), return it
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  // Apply headers to the response
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-csp-nonce", nonce);

  // Use the intl response as the base if it's not a redirect
  const response = intlResponse.status === 200 
    ? intlResponse 
    : NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");

  if (!isApiRequest) {
    response.headers.set("Content-Security-Policy", csp);
  }

  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Origin-Agent-Cluster", "?1");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  response.headers.set("x-request-id", requestId);
  
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  response.headers.set("x-csp-nonce", nonce);

  return response;
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next`, `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
