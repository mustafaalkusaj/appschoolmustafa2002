import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

const EMPTY_SETTINGS = {
  receipt_footer_text: "",
  receipt_address: "",
  receipt_tax_number: "",
};

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إعدادات الإيصالات متاحة للإدارة فقط.",
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
    namespace: "dashboard-receipt-settings-read",
    windowMs: 60_000,
    maxHits: 60,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  try {
    const { data, error } = await context.value.actorSupabase
      .from("schools")
      .select("receipt_footer_text, receipt_address, receipt_tax_number")
      .eq("id", context.value.targetSchoolId)
      .maybeSingle();

    if (error) {
      // Columns may not exist yet — return empty defaults gracefully
      return NextResponse.json({
        ok: true,
        settings: EMPTY_SETTINGS,
      });
    }

    return NextResponse.json({
      ok: true,
      settings: {
        receipt_footer_text: (data as Record<string, unknown> | null)?.receipt_footer_text ?? "",
        receipt_address: (data as Record<string, unknown> | null)?.receipt_address ?? "",
        receipt_tax_number: (data as Record<string, unknown> | null)?.receipt_tax_number ?? "",
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
      roleDeniedMessage: "تعديل إعدادات الإيصالات متاح للإدارة فقط.",
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
    namespace: "dashboard-receipt-settings-write",
    windowMs: 60_000,
    maxHits: 20,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const receipt_footer_text =
    typeof body?.receipt_footer_text === "string" ? body.receipt_footer_text.slice(0, 300) : "";
  const receipt_address =
    typeof body?.receipt_address === "string" ? body.receipt_address.trim() : "";
  const receipt_tax_number =
    typeof body?.receipt_tax_number === "string" ? body.receipt_tax_number.trim() : "";

  try {
    const { error } = await context.value.actorSupabase
      .from("schools")
      .update({ receipt_footer_text, receipt_address, receipt_tax_number })
      .eq("id", context.value.targetSchoolId);

    if (error) {
      // Columns don't exist yet — skip gracefully
      return NextResponse.json({
        ok: true,
        skipped: true,
        settings: { receipt_footer_text, receipt_address, receipt_tax_number },
      });
    }

    return NextResponse.json({
      ok: true,
      settings: { receipt_footer_text, receipt_address, receipt_tax_number },
    });
  } catch {
    return NextResponse.json({
      ok: true,
      skipped: true,
      settings: { receipt_footer_text, receipt_address, receipt_tax_number },
    });
  }
}
