import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

const EMPTY_SETTINGS = {
  late_payment_grace_days: 0,
  late_payment_penalty_pct: 0,
  max_penalty_pct: 0,
  discount_early_pct: 0,
};

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إعدادات الرسوم والغرامات متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "dashboard-fee-settings-read",
    windowMs: 60_000,
    maxHits: 60,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  try {
    const { data, error } = await context.value.actorSupabase
      .from("schools")
      .select(
        "late_payment_grace_days, late_payment_penalty_pct, max_penalty_pct, discount_early_pct",
      )
      .eq("id", context.value.targetSchoolId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: true, settings: EMPTY_SETTINGS });
    }

    const row = data as Record<string, unknown> | null;
    return NextResponse.json({
      ok: true,
      settings: {
        late_payment_grace_days: Number(row?.late_payment_grace_days ?? 0),
        late_payment_penalty_pct: Number(row?.late_payment_penalty_pct ?? 0),
        max_penalty_pct: Number(row?.max_penalty_pct ?? 0),
        discount_early_pct: Number(row?.discount_early_pct ?? 0),
      },
    });
  } catch {
    return NextResponse.json({ ok: true, settings: EMPTY_SETTINGS });
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";

  if (!schoolId) return jsonError("معرف المدرسة مطلوب.", 400);

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "تعديل إعدادات الرسوم والغرامات متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "dashboard-fee-settings-write",
    windowMs: 60_000,
    maxHits: 20,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const late_payment_grace_days = Math.min(30, Math.max(0, Number(body?.late_payment_grace_days ?? 0)));
  const late_payment_penalty_pct = Math.min(100, Math.max(0, Number(body?.late_payment_penalty_pct ?? 0)));
  const max_penalty_pct = Math.min(100, Math.max(0, Number(body?.max_penalty_pct ?? 0)));
  const discount_early_pct = Math.min(50, Math.max(0, Number(body?.discount_early_pct ?? 0)));

  const settings = {
    late_payment_grace_days,
    late_payment_penalty_pct,
    max_penalty_pct,
    discount_early_pct,
  };

  try {
    const { error } = await context.value.actorSupabase
      .from("schools")
      .update(settings)
      .eq("id", context.value.targetSchoolId);

    if (error) {
      return NextResponse.json({ ok: true, skipped: true, settings });
    }

    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ ok: true, skipped: true, settings });
  }
}
