import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env/public";
import { getServerEnv } from "@/lib/env/server";
import type { Database } from "@/types/database.types";

export async function createRouteSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

export interface PendingCookie {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

export async function createRouteSupabaseClientWithCookies() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  const cookieStore = await cookies();
  const pendingCookies: PendingCookie[] = [];

  const client = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options });
          try {
            cookieStore.set(name, value, options);
          } catch {
            // ignored in Server Components
          }
        });
      },
    },
  });

  return { client, pendingCookies };
}

export function applyPendingCookies(
  response: NextResponse,
  pending: PendingCookie[],
) {
  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, options as Record<string, unknown>);
  }
}

let _serviceClient: ReturnType<typeof createClient<Database>> | null = null;

export function createServiceSupabaseClient() {
  if (_serviceClient) return _serviceClient;

  const { supabaseUrl } = getPublicEnv();
  const { serviceRoleKey } = getServerEnv();

  if (!serviceRoleKey) {
    throw new Error("Missing Supabase env vars (SUPABASE_SERVICE_ROLE_KEY).");
  }

  _serviceClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _serviceClient;
}

function extractBearerToken(
  authHeader: string | null | undefined,
): string | null {
  if (!authHeader) return null;
  const value = authHeader.trim();
  if (!value.toLowerCase().startsWith("bearer ")) return null;
  const token = value.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function getRouteAuthenticatedUser(
  supabase: Awaited<ReturnType<typeof createRouteSupabaseClient>>,
  authHeader: string | null | undefined,
) {
  const token = extractBearerToken(authHeader);

  if (token) {
    const tokenResult = await supabase.auth.getUser(token);
    if (!tokenResult.error && tokenResult.data.user?.id) {
      return tokenResult;
    }
  }

  return supabase.auth.getUser();
}
