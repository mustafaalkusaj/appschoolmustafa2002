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
    const category = req.nextUrl.searchParams.get("category");

    let query = context.value.dataSupabase
      .from("global_settings")
      .select("*")
      .order("category", { ascending: true })
      .order("key", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") return NextResponse.json({ ok: true, settings: [], tableMissing: true });
      throw error;
    }

    return NextResponse.json({ ok: true, settings: data ?? [] });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "تعذر تحميل الإعدادات.", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح.", "status" in context ? context.status : 500);
  }

  try {
    const body = await req.json();
    const { updates } = body as { updates?: Array<{ key: string; value: string }> };

    if (!Array.isArray(updates) || updates.length === 0) return jsonError("updates مطلوب.", 400);

    const results = await Promise.allSettled(
      updates.map((u) =>
        context.value.dataSupabase
          .from("global_settings")
          .update({
            value: u.value,
            updated_by: context.value.actorUserId,
            updated_at: new Date().toISOString(),
          })
          .eq("key", u.key)
      ),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;

    return NextResponse.json({ ok: true, succeeded, total: updates.length });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "تعذر تحديث الإعدادات.", 500);
  }
}
