import { NextResponse } from "next/server";

import { DEFAULT_ADMIN_INFRASTRUCTURE, isMissingTableError } from "@/lib/admin-infrastructure";
import { DEFAULT_COMPAT, detectAppSchemaCompatWithClient } from "@/lib/schema-compat";
import { createRouteSupabaseClient, createServiceSupabaseClient, getRouteAuthenticatedUser } from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: Request) {
  try {
    const actorSupabase = await createRouteSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await getRouteAuthenticatedUser(actorSupabase, request.headers.get("authorization"));

    if (authError || !user?.id) {
      return jsonError("يجب تسجيل الدخول أولاً.", 401);
    }

    const { data: actorProfile, error: actorProfileError } = await actorSupabase
      .from("user_profiles")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (actorProfileError || !actorProfile || actorProfile.is_active === false) {
      return jsonError("ليس لديك صلاحية الوصول إلى هذا المورد.", 403);
    }

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
