import { NextResponse } from "next/server";

import { DEFAULT_ADMIN_INFRASTRUCTURE, isMissingTableError } from "@/lib/admin-infrastructure";
import { DEFAULT_COMPAT, detectAppSchemaCompatWithClient } from "@/lib/schema-compat";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const serviceSupabase = createServiceSupabaseClient();
    const compat = await detectAppSchemaCompatWithClient(serviceSupabase);
    return NextResponse.json({ ok: true, compat });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingTableError(error)) {
      return NextResponse.json({ ok: true, compat: DEFAULT_COMPAT, infrastructure: DEFAULT_ADMIN_INFRASTRUCTURE });
    }

    return NextResponse.json(
      { ok: false, compat: DEFAULT_COMPAT, error: message || "Failed to detect schema compatibility." },
      { status: 200 },
    );
  }
}
