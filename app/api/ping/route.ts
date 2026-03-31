import { NextResponse } from "next/server";

/**
 * Health-check endpoint — no authentication required.
 * Returns server timestamp and a lightweight Supabase connectivity probe.
 *
 * GET /api/ping
 * Response: { ok: boolean; pong: number; timestamp: string; supabase: "ok" | "error" | "unconfigured" }
 */
export async function GET() {
  const pong = Date.now();
  const timestamp = new Date().toISOString();

  // Lightweight Supabase connectivity probe
  let supabaseStatus: "ok" | "error" | "unconfigured" = "unconfigured";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const probeUrl = `${supabaseUrl}/rest/v1/`;
      const res = await fetch(probeUrl, {
        headers: { apikey: supabaseAnonKey },
        // Short timeout so a slow Supabase instance doesn't stall the health check
        signal: AbortSignal.timeout(3_000),
      });
      supabaseStatus = res.ok || res.status === 400 ? "ok" : "error";
    } catch {
      supabaseStatus = "error";
    }
  }

  return NextResponse.json(
    {
      ok: supabaseStatus !== "error",
      pong,
      timestamp,
      supabase: supabaseStatus,
    },
    {
      headers: {
        // Prevent caching of health-check responses
        "Cache-Control": "no-store",
      },
    },
  );
}
