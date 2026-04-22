import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .trim()
    .optional(),
  SUPABASE_URL: z.string().trim().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().optional(),
  SUPABASE_ANON_KEY: z.string().trim().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().trim().optional(),
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

  const envValues = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  };

  const parsed = publicEnvSchema.safeParse(envValues);

  if (!parsed.success) {
    const formatted = parsed.error.issues.map((issue) => issue.message).join(" ");
    throw new Error(`Invalid public environment configuration. ${formatted}`.trim());
  }

  const supabaseUrl =
    parsed.data.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    parsed.data.SUPABASE_URL?.trim() ||
    "";

  if (!supabaseUrl) {
    throw new Error(
      "Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL (or legacy SUPABASE_URL).",
    );
  }

  if (!/^https?:\/\/.+$/.test(supabaseUrl)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  const supabaseAnonKey =
    parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    parsed.data.SUPABASE_ANON_KEY?.trim() ||
    parsed.data.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "";

  if (!supabaseAnonKey) {
    throw new Error(
      "Missing Supabase public key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy SUPABASE_ANON_KEY/SUPABASE_PUBLISHABLE_KEY).",
    );
  }

  cachedPublicEnv = {
    supabaseUrl,
    supabaseAnonKey,
  };

  return cachedPublicEnv;
}
