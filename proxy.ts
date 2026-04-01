import { NextRequest, NextResponse } from "next/server";

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

// Pre-compute static CSP values
const supabaseOrigin = resolveOptionalOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseHost = supabaseOrigin ? new URL(supabaseOrigin).hostname : undefined;

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
 * Handles CSP header injection with per-request nonces.
 */
export async function proxy(_request: NextRequest): Promise<NextResponse> {
  const nonce = generateNonce();
  const csp = buildCSP(nonce);

  // Continue to the requested route
  const response = NextResponse.next();

  // Set Content-Security-Policy with nonce
  response.headers.set("Content-Security-Policy", csp);
  
  // Set other security headers (these were previously in next.config.ts)
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  
  // HSTS only in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Store nonce in a custom header for use by server components if needed
  // This can be read by components that need to inject scripts with nonces
  response.headers.set("x-csp-nonce", nonce);

  return response;
}

export const config = {
  // Match all paths except static files, api routes, and Next.js internals
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
