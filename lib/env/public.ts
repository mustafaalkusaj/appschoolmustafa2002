import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .trim()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().optional(),
});

export type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

let cachedPublicEnv: PublicEnv | null = null;

export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) {
    return cachedPublicEnv;
  }

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!parsed.success) {
    const formatted = parsed.error.issues.map((issue) => issue.message).join(" ");
    throw new Error(`Invalid public environment configuration. ${formatted}`.trim());
  }

  const supabaseAnonKey =
    parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "";

  if (!supabaseAnonKey) {
    throw new Error(
      "Missing Supabase public key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  cachedPublicEnv = {
    supabaseUrl: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey,
  };

  return cachedPublicEnv;
}

