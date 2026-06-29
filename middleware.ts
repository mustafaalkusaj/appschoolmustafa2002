import { NextRequest, NextResponse } from "next/server";

const MOBILE_API_WINDOW_MS = 60_000;
const MOBILE_API_MAX_HITS = 100;

const store = new Map<string, { count: number; resetAt: number }>();

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (now > entry.resetAt) store.delete(key);
    });
  }, 60_000).unref?.();
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/mobile/")) {
    return NextResponse.next();
  }

  if (pathname === "/api/mobile/auth/login") {
    return NextResponse.next();
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + MOBILE_API_WINDOW_MS });
    return NextResponse.next();
  }

  entry.count++;

  if (entry.count > MOBILE_API_MAX_HITS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { ok: false, error: "rate_limited", message: "تم تجاوز حد الطلبات المسموح. يرجى المحاولة لاحقاً." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, retryAfter)),
          "X-RateLimit-Limit": String(MOBILE_API_MAX_HITS),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/mobile/:path*"],
};
