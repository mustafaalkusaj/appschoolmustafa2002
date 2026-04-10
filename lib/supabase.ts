import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env/public";

let cachedSupabase: any = null;

export const getSupabase = () => {
  if (cachedSupabase) return cachedSupabase;
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  cachedSupabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return cachedSupabase;
};

// For backward compatibility while refactoring
export const supabase = typeof window !== 'undefined' ? getSupabase() : null;
