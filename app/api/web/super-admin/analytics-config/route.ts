import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

// GET /api/web/super-admin/analytics-config
// Returns: { prices: Record<string,number>, collected: Record<string,number>, exchange_rate: number }
export async function GET(request: NextRequest) {
  const context = await resolveSuperAdminActorContext(request.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من الصلاحيات.",
      "status" in context ? context.status : 500,
    );
  }

  const db = context.value.dataSupabase;

  const { data, error } = await db
    .from("admin_kv_store")
    .select("key, value")
    .in("key", ["school_prices", "school_collected", "exchange_rate_per_100", "branch_prices"]);

  if (error) {
    return jsonError("تعذر تحميل إعدادات التحليلات.", 500);
  }

  const byKey = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));

  return NextResponse.json({
    prices:         (byKey["school_prices"]        as Record<string, number>) ?? {},
    collected:      (byKey["school_collected"]      as Record<string, number>) ?? {},
    exchange_rate:  (byKey["exchange_rate_per_100"] as number)                 ?? 131000,
    branch_prices:  (byKey["branch_prices"]         as Record<string, number>) ?? {},
  });
}

// PUT /api/web/super-admin/analytics-config
// Body: { key: "school_prices" | "school_collected" | "exchange_rate_per_100", value: unknown }
export async function PUT(request: NextRequest) {
  const context = await resolveSuperAdminActorContext(request.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من الصلاحيات.",
      "status" in context ? context.status : 500,
    );
  }

  const db = context.value.dataSupabase;

  let body: { key: string; value: unknown };
  try {
    body = await request.json() as { key: string; value: unknown };
  } catch {
    return jsonError("طلب غير صالح.", 400);
  }

  const allowedKeys = ["school_prices", "school_collected", "exchange_rate_per_100", "branch_prices"];
  if (!allowedKeys.includes(body.key)) {
    return jsonError("مفتاح غير مسموح به.", 400);
  }

  const { error } = await db
    .from("admin_kv_store")
    .upsert({ key: body.key, value: body.value, updated_at: new Date().toISOString() });

  if (error) {
    return jsonError("تعذر حفظ الإعدادات.", 500);
  }

  return NextResponse.json({ ok: true });
}
