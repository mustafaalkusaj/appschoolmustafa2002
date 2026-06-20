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
    if (updates.length > 50) return jsonError("لا يمكن تحديث أكثر من 50 إعداداً في طلب واحد.", 400);

    for (const u of updates) {
      if (!u.key || typeof u.key !== "string" || u.key.trim().length === 0) {
        return jsonError("كل تحديث يجب أن يحتوي على key صالح.", 400);
      }
      if (typeof u.value !== "string") {
        return jsonError(`قيمة الإعداد "${u.key}" يجب أن تكون نصاً.`, 400);
      }
    }

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
