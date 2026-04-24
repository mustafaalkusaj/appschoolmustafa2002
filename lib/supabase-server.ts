import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env/public";
import { getServerEnv } from "@/lib/env/server";

export async function createRouteSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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

export function createServiceSupabaseClient() {
  const { supabaseUrl } = getPublicEnv();
  const { serviceRoleKey } = getServerEnv();

  if (!serviceRoleKey) {
    throw new Error("Missing Supabase env vars (SUPABASE_SERVICE_ROLE_KEY).");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function extractBearerToken(authHeader: string | null | undefined): string | null {
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
