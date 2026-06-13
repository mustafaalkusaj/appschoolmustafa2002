"use client";

import { supabase } from "@/lib/supabase";

async function resolveAccessToken(timeoutMs = 5_000) {
  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(null), timeoutMs);
  });
  // Use refreshSession() instead of getSession() to ensure the token is valid
  // and automatically refreshed when expired. getSession() returns a cached
  // token from localStorage that may be expired without triggering a refresh,
  // causing supabase.auth.getUser(token) to fail on the server with an auth
  // error, which then falls back to cookie-based auth that may also be absent.
  const sessionTokenPromise: Promise<string | null> = supabase.auth
    .getSession()
    .then(async (result: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      const session = result.data.session;
      if (!session) return null;
      // If token is expired or expiring within 30 seconds, refresh it
      const expiresAt = session.expires_at ?? 0;
      const nowSec = Math.floor(Date.now() / 1000);
      if (expiresAt - nowSec < 30) {
        const refreshed = await supabase.auth.refreshSession().catch(() => null);
        return refreshed?.data.session?.access_token ?? null;
      }
      return session.access_token ?? null;
    })
    .catch(() => null);

  try {
    return await Promise.race([sessionTokenPromise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

function mergeHeaders(baseHeaders: HeadersInit | undefined, extraHeaders: HeadersInit) {
  const headers = new Headers(baseHeaders);
  const incoming = new Headers(extraHeaders);
  incoming.forEach((value, key) => {
    headers.set(key, value);
  });
  return headers;
}

export async function buildAuthorizedHeaders(headers?: HeadersInit) {
  const mergedHeaders = new Headers(headers);
  const accessToken = await resolveAccessToken();

  if (accessToken) {
    mergedHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  return mergedHeaders;
}

export async function fetchWithAuthorizedSession(input: RequestInfo | URL, init?: RequestInit) {
  const headers = await buildAuthorizedHeaders(init?.headers);
  return fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
    cache: init?.cache ?? "no-store",
  });
}

export async function fetchJsonWithAuthorizedSession<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ response: Response; payload: T | null }> {
  const response = await fetchWithAuthorizedSession(input, init);
  const payload = (await response.json().catch(() => null)) as T | null;
  return { response, payload };
}

export function withJsonHeaders(headers?: HeadersInit) {
  return mergeHeaders(headers, { "Content-Type": "application/json" });
}
