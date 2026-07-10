import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database.types";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

let cachedSupabase: BrowserSupabaseClient | null = null;

export const getSupabase = () => {
  if (cachedSupabase) return cachedSupabase;
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  cachedSupabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return cachedSupabase;
};

// For backward compatibility while refactoring
export const supabase = typeof window !== "undefined" ? getSupabase() : null;
