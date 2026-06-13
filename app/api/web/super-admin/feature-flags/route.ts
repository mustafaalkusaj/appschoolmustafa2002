import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح.", "status" in context ? context.status : 500);
  }

  try {
    const schoolId = req.nextUrl.searchParams.get("school_id");

    let query = context.value.dataSupabase
      .from("school_feature_flags")
      .select("*")
      .order("feature_key", { ascending: true });

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") return NextResponse.json({ ok: true, flags: [], tableMissing: true });
      throw error;
    }

    return NextResponse.json({ ok: true, flags: data ?? [] });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "تعذر تحميل الميزات.", 500);
  }
}

export async function POST(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح.", "status" in context ? context.status : 500);
  }

  try {
    const body = await req.json();
    const { school_id, feature_key, is_enabled } = body as Record<string, unknown>;

    if (!school_id || typeof school_id !== "string") return jsonError("school_id مطلوب.", 400);
    if (!feature_key || typeof feature_key !== "string") return jsonError("feature_key مطلوب.", 400);

    const { data, error } = await context.value.dataSupabase
      .from("school_feature_flags")
      .upsert({
        school_id,
        feature_key,
        is_enabled: is_enabled === true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "school_id,feature_key" })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, flag: data });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "تعذر حفظ الميزة.", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح.", "status" in context ? context.status : 500);
  }

  try {
    const body = await req.json();
    const { updates } = body as { updates?: Array<{ school_id: string; feature_key: string; is_enabled: boolean }> };

    if (!Array.isArray(updates) || updates.length === 0) return jsonError("updates مطلوب.", 400);

    const results = await Promise.allSettled(
      updates.map((u) =>
        context.value.dataSupabase
          .from("school_feature_flags")
          .upsert({
            school_id: u.school_id,
            feature_key: u.feature_key,
            is_enabled: u.is_enabled,
            updated_at: new Date().toISOString(),
          }, { onConflict: "school_id,feature_key" })
      ),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;

    return NextResponse.json({ ok: true, succeeded, failed });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "تعذر التحديث الجماعي.", 500);
  }
}
