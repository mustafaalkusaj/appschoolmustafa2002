import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import {
  upsertGradeType,
  deleteGradeType,
} from "@/lib/grades/grade-types-server";
import type { GradeCategory } from "@/lib/grades/types";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (isFinite(n) && n > 0) return n;
  }
  return fallback;
}

function normalizeBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function normalizeInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    if (isFinite(n)) return n;
  }
  return fallback;
}

const VALID_CATEGORIES: GradeCategory[] = [
  "quiz",
  "homework",
  "monthly",
  "midterm",
  "final",
  "oral",
  "project",
  "participation",
  "other",
];

async function resolveContext(
  req: NextRequest,
  schoolId: string | null,
  namespace: string,
  maxHits: number,
) {
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة أنواع الدرجات متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return {
      ok: false as const,
      response: jsonError(
        "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
        "status" in context ? context.status : 500,
      ),
    };
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace,
    windowMs: 60_000,
    maxHits,
    identifier: context.value.actorUserId,
  });

  if (rateLimited) {
    return { ok: false as const, response: rateLimited };
  }

  return { ok: true as const, value: context.value };
}

// PUT — create or update a grade type
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: gradeTypeId } = await params;

  if (!gradeTypeId || typeof gradeTypeId !== "string" || gradeTypeId.trim().length === 0) {
    return jsonError("معرّف نوع الدرجة مطلوب.", 400);
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return jsonError("جسم الطلب غير صالح.", 400);
  }

  const schoolId = normalizeString(body.school_id);
  if (!schoolId) {
    return jsonError("school_id مطلوب.", 400);
  }

  const name = normalizeString(body.name);
  if (!name) {
    return jsonError("name (اسم نوع الدرجة) مطلوب.", 400);
  }

  const nameAr = normalizeString(body.name_ar) ?? name;

  const context = await resolveContext(req, schoolId, "grades-types-write", 30);
  if (!context.ok) {
    return context.response;
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_grade_schemes");
  if (!canManage) {
    return jsonError("ليس لديك صلاحية تعديل أنواع الدرجات.", 403);
  }

  // Validate category
  const rawCategory = normalizeString(body.category) ?? "other";
  const category = VALID_CATEGORIES.includes(rawCategory as GradeCategory)
    ? (rawCategory as GradeCategory)
    : "other";

  const input = {
    id: gradeTypeId.trim(),
    name,
    name_ar: nameAr,
    name_en: normalizeString(body.name_en) ?? "",
    category,
    default_max_score: normalizePositiveNumber(body.default_max_score, 10),
    is_active: normalizeBool(body.is_active, true),
    sort_order: normalizeInt(body.sort_order, 0),
  };

  const result = await upsertGradeType(actorSupabase, targetSchoolId, input);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, gate: result.gate, error: { message: result.message ?? "تعذر تحديث نوع الدرجة." } },
      { status: result.gate.code === "missing_table" ? 503 : 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    gate: result.gate,
    gradeType: result.gradeType,
    message: result.message,
  });
}

// DELETE — delete a grade type
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: gradeTypeId } = await params;

  if (!gradeTypeId || typeof gradeTypeId !== "string" || gradeTypeId.trim().length === 0) {
    return jsonError("معرّف نوع الدرجة مطلوب.", 400);
  }

  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveContext(req, schoolId, "grades-types-write", 30);
  if (!context.ok) {
    return context.response;
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_grade_schemes");
  if (!canManage) {
    return jsonError("ليس لديك صلاحية حذف أنواع الدرجات.", 403);
  }

  const result = await deleteGradeType(actorSupabase, targetSchoolId, gradeTypeId.trim());

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, gate: result.gate, error: { message: result.message ?? "تعذر حذف نوع الدرجة." } },
      { status: result.gate.code === "missing_table" ? 503 : 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    gate: result.gate,
    message: result.message,
  });
}
