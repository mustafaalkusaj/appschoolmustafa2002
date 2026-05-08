import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

const RECEIPT_COLS = [
  "decoration_top_left",
  "decoration_top_right",
  "decoration_bottom_left",
  "decoration_bottom_right",
  "background_pattern_url",
  "emblem_url",
  "thank_you_text",
  "footer_note",
  "primary_color",
  "accent_color",
  "page_size",
];

const SCHOOL_SELECT = ["school_id", ...RECEIPT_COLS].join(",");
const BRANCH_SELECT = ["branch_id", ...RECEIPT_COLS].join(",");

type ReceiptRow = Record<string, string | null>;

function mergeConfigs(base: ReceiptRow | null, override: ReceiptRow | null): ReceiptRow | null {
  if (!base && !override) return null;
  if (!override) return base;
  if (!base) return override;
  const merged: ReceiptRow = { ...base };
  for (const key of RECEIPT_COLS) {
    if (override[key] !== null && override[key] !== undefined) {
      merged[key] = override[key];
    }
  }
  return merged;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const branchId = req.nextUrl.searchParams.get("branchId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إعدادات الإيصال متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;

  // Fetch school-level config
  const { data: schoolData, error: schoolError } = await actorSupabase
    .from("school_receipt_config")
    .select(SCHOOL_SELECT)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (schoolError) {
    if (schoolError.code === "42P01" || /does not exist/i.test(schoolError.message)) {
      return NextResponse.json({ ok: true, config: null });
    }
    return jsonError(schoolError.message || "تعذر تحميل إعدادات الإيصال.", 500);
  }

  // If branchId provided, fetch branch override and merge (branch wins per field)
  if (branchId) {
    const { data: branchData, error: branchError } = await actorSupabase
      .from("branch_receipt_config")
      .select(BRANCH_SELECT)
      .eq("branch_id", branchId)
      .maybeSingle();

    if (branchError && branchError.code !== "42P01" && !/does not exist/i.test(branchError.message)) {
      return jsonError(branchError.message || "تعذر تحميل إعدادات إيصال الفرع.", 500);
    }

    const merged = mergeConfigs(schoolData as ReceiptRow | null, branchData as ReceiptRow | null);
    return NextResponse.json({ ok: true, config: merged });
  }

  return NextResponse.json({ ok: true, config: schoolData ?? null });
}
