import type { SessionUser } from "@/lib/types";

export const SESSION_COOKIE = "saas_session";

export function serializeSession(session: SessionUser): string {
  return encodeURIComponent(JSON.stringify(session));
}

export function parseSessionValue(cookieValue: string | undefined): SessionUser | null {
  if (!cookieValue) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(cookieValue)) as SessionUser;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: Request): SessionUser | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${SESSION_COOKIE}=`));

  const raw = sessionCookie?.split("=").slice(1).join("=");
  return parseSessionValue(raw);
}

export function defaultCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  };
}
