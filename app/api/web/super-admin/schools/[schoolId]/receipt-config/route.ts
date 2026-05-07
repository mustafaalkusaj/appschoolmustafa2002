import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

const URL_FIELDS = [
  "decoration_top_left",
  "decoration_top_right",
  "decoration_bottom_left",
  "decoration_bottom_right",
  "background_pattern_url",
  "emblem_url",
] as const;

const TEXT_FIELDS = ["thank_you_text", "footer_note"] as const;
const COLOR_FIELDS = ["primary_color", "accent_color"] as const;

const SELECT_COLS = [
  "school_id",
  ...URL_FIELDS,
  ...TEXT_FIELDS,
  ...COLOR_FIELDS,
  "updated_at",
].join(",");

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) return jsonError("معرف المدرسة غير صالح.", 400);

  const { dataSupabase } = context.value;
  const { data, error } = await dataSupabase
    .from("school_receipt_config")
    .select(SELECT_COLS)
    .eq("school_id", normalizedSchoolId)
    .maybeSingle();

  if (error) return jsonError(error.message || "تعذر تحميل إعدادات الإيصال.", 500);

  return NextResponse.json({ ok: true, config: data ?? null });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) return jsonError("معرف المدرسة غير صالح.", 400);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError("جسم الطلب غير صالح.", 400);

  const payload: Record<string, string | null> = {};

  for (const field of URL_FIELDS) {
    if (!(field in body)) continue;
    const value = asString(body[field]);
    if (value !== null && !isValidUrl(value)) {
      return jsonError(`الرابط غير صالح للحقل ${field}.`, 400);
    }
    payload[field] = value;
  }

  for (const field of TEXT_FIELDS) {
    if (!(field in body)) continue;
    const value = asString(body[field]);
    if (value !== null && value.length > 200) {
      return jsonError(`النص طويل جداً للحقل ${field} (الحد ٢٠٠ حرف).`, 400);
    }
    payload[field] = value;
  }

  for (const field of COLOR_FIELDS) {
    if (!(field in body)) continue;
    const value = asString(body[field]);
    if (value !== null && !isValidHexColor(value)) {
      return jsonError(`صيغة اللون غير صالحة للحقل ${field}.`, 400);
    }
    payload[field] = value;
  }

  if (Object.keys(payload).length === 0) {
    return jsonError("لا توجد بيانات للتحديث.", 400);
  }

  const { dataSupabase } = context.value;
  const { data, error } = await dataSupabase
    .from("school_receipt_config")
    .upsert(
      {
        school_id: normalizedSchoolId,
        ...payload,
        updated_by: context.value.actorUserId,
      },
      { onConflict: "school_id" },
    )
    .select(SELECT_COLS)
    .single();

  if (error) return jsonError(error.message || "تعذر حفظ إعدادات الإيصال.", 500);

  return NextResponse.json({ ok: true, config: data });
}
