"use client";

import { supabase } from "@/lib/supabase";

async function resolveAccessToken(timeoutMs = 5_000) {
  type SessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>;
  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(null), timeoutMs);
  });
  const sessionTokenPromise: Promise<string | null> = supabase.auth
    .getSession()
    .then((result: SessionResult) => result.data.session?.access_token ?? null)
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
