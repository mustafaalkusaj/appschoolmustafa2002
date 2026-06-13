import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import {
  fetchGradeTypes,
  upsertGradeType,
} from "@/lib/grades/grade-types-server";
import type { GradeType, GradeCategory } from "@/lib/grades/types";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (isFinite(n) && n >= 0) return n;
  }
  return fallback;
}

function normalizeBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

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

// GET — fetch grade types for the school (replaces old schemes endpoint)
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const schoolId = params.get("schoolId");

  const context = await resolveContext(req, schoolId, "grade-types-read", 120);
  if (!context.ok) {
    return context.response;
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const canView = await routeUserHasPermission(actorSupabase, actorUserId, "view_grades");
  if (!canView) {
    return jsonError("ليس لديك صلاحية عرض أنواع الدرجات.", 403);
  }

  const activeOnly = params.get("activeOnly") === "true";
  const result = await fetchGradeTypes(actorSupabase, targetSchoolId, activeOnly);

  return NextResponse.json({
    ok: result.ok,
    gate: result.gate,
    // Keep "schemes" key for backward compat with useGradesData, plus new key
    schemes: result.gradeTypes,
    gradeTypes: result.gradeTypes,
    count: result.gradeTypes.length,
  });
}

// POST — create or update a grade type
export async function POST(req: NextRequest) {
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

  const context = await resolveContext(req, schoolId, "grade-types-write", 30);
  if (!context.ok) {
    return context.response;
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_grade_schemes");
  if (!canManage) {
    return jsonError("ليس لديك صلاحية إدارة أنواع الدرجات.", 403);
  }

  const input: Partial<GradeType> & { name: string } = {
    id: normalizeString(body.id) ?? undefined,
    name,
    name_ar: normalizeString(body.name_ar) ?? name,
    name_en: normalizeString(body.name_en) ?? "",
    category: (normalizeString(body.category) as GradeCategory) ?? "other",
    default_max_score: normalizePositiveNumber(body.default_max_score, 10),
    is_active: normalizeBool(body.is_active, true),
    sort_order: normalizePositiveNumber(body.sort_order, 99),
  };

  const result = await upsertGradeType(actorSupabase, targetSchoolId, input);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, gate: result.gate, error: { message: result.message ?? "تعذر حفظ نوع الدرجة." } },
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
