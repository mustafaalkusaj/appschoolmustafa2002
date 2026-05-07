import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

const SELECT_COLS = [
  "school_id",
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
].join(",");

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
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

  const { data, error } = await actorSupabase
    .from("school_receipt_config")
    .select(SELECT_COLS)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || /does not exist/i.test(error.message)) {
      return NextResponse.json({ ok: true, config: null });
    }
    return jsonError(error.message || "تعذر تحميل إعدادات الإيصال.", 500);
  }

  return NextResponse.json({
    ok: true,
    config: data ?? null,
  });
}
