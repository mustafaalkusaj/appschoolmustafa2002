"use client";

import { supabase } from "@/lib/supabase";

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
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    mergedHeaders.set("Authorization", `Bearer ${session.access_token}`);
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
