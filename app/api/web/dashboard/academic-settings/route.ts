import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

const EMPTY_SETTINGS = {
  semester1_start: "",
  semester1_end: "",
  semester2_start: "",
  semester2_end: "",
  academic_year_label: "",
};

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إعدادات التقويم الدراسي متاحة للإدارة فقط.",
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
    namespace: "dashboard-academic-settings-read",
    windowMs: 60_000,
    maxHits: 60,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  try {
    const { data, error } = await context.value.actorSupabase
      .from("schools")
      .select(
        "semester1_start, semester1_end, semester2_start, semester2_end, academic_year_label",
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
        semester1_start: row?.semester1_start ?? "",
        semester1_end: row?.semester1_end ?? "",
        semester2_start: row?.semester2_start ?? "",
        semester2_end: row?.semester2_end ?? "",
        academic_year_label: row?.academic_year_label ?? "",
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
      roleDeniedMessage: "تعديل إعدادات التقويم الدراسي متاح للإدارة فقط.",
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
    namespace: "dashboard-academic-settings-write",
    windowMs: 60_000,
    maxHits: 20,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const semester1_start =
    typeof body?.semester1_start === "string" ? body.semester1_start.trim() : "";
  const semester1_end =
    typeof body?.semester1_end === "string" ? body.semester1_end.trim() : "";
  const semester2_start =
    typeof body?.semester2_start === "string" ? body.semester2_start.trim() : "";
  const semester2_end =
    typeof body?.semester2_end === "string" ? body.semester2_end.trim() : "";
  const academic_year_label =
    typeof body?.academic_year_label === "string" ? body.academic_year_label.trim() : "";

  const settings = {
    semester1_start: semester1_start || null,
    semester1_end: semester1_end || null,
    semester2_start: semester2_start || null,
    semester2_end: semester2_end || null,
    academic_year_label: academic_year_label || null,
  };

  try {
    const { error } = await context.value.actorSupabase
      .from("schools")
      .update(settings)
      .eq("id", context.value.targetSchoolId);

    if (error) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        settings: { semester1_start, semester1_end, semester2_start, semester2_end, academic_year_label },
      });
    }

    return NextResponse.json({
      ok: true,
      settings: { semester1_start, semester1_end, semester2_start, semester2_end, academic_year_label },
    });
  } catch {
    return NextResponse.json({
      ok: true,
      skipped: true,
      settings: { semester1_start, semester1_end, semester2_start, semester2_end, academic_year_label },
    });
  }
}
