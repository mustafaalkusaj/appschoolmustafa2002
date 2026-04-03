import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env/public";

const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
