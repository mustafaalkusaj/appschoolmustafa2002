import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { applyBranchScopeToQuery, resolveBranchIdForWrite, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext, tableHasColumn } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

// Whitelist + validate each lecture row. Anything outside these fields is
// dropped (school_id / branch_id are forced server-side, never trusted here).
const MAX_LECTURE_PRICE = 100_000_000; // sane upper bound (integer minor units)

const lectureRowSchema = z
  .object({
    teacher_id: z.string().uuid(),
    grade: z.string().trim().min(1).max(100),
    section: z.string().trim().max(100).nullish(),
    // period column is integer
    period: z.coerce.number().int().nullish(),
    // real DB values are 'morning' | 'evening'
    session_type: z.enum(["morning", "evening"]).nullish(),
    lecture_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاريخ غير صالح"),
    price: z.coerce.number().int().min(0).max(MAX_LECTURE_PRICE),
  });
// unknown keys are stripped (whitelist) rather than rejected, so an extra
// client field never 400s a valid lecture import.

const lectureRowsSchema = z.array(lectureRowSchema).min(1).max(1000);

function extractMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) {
    return null;
  }

  const start = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const endDate = new Date(year, monthNumber, 0).getDate();
  const end = `${year}-${String(monthNumber).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`;
  return { from: start, to: end };
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const view = req.nextUrl.searchParams.get("view")?.trim() || "calendar";
  const month = req.nextUrl.searchParams.get("month")?.trim() || "";
  const teacherId = req.nextUrl.searchParams.get("teacherId")?.trim() || "";

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "بيانات المحاضرات متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "salaries-lectures",
    windowMs: 60_000,
    maxHits: 120,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const canManageSalaries = await routeUserHasPermission(
    context.value.actorSupabase,
    context.value.actorUserId,
    "manage_salaries",
  );
  if (!canManageSalaries) {
    return jsonError("ليس لديك صلاحية الوصول إلى بيانات المحاضرات.", 403);
  }

  if (view === "list") {
    const date = req.nextUrl.searchParams.get("date")?.trim() || "";
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return jsonError("التاريخ مطلوب ويجب أن يكون بالصيغة YYYY-MM-DD.", 400);
    }
    const { data, error } = await applyBranchScopeToQuery(
      context.value.actorSupabase
        .from("daily_lectures")
        .select("id, teacher_id, grade, section, period, session_type, lecture_date, price, teachers(id, full_name)")
        .eq("school_id", context.value.targetSchoolId)
        .eq("lecture_date", date)
        .order("teacher_id")
        .order("grade")
        .order("period"),
      branchScope.value,
    );
    if (error) return jsonError(error.message || "تعذر تحميل المحاضرات.", 500);
    const records = (data ?? []).map((r) => {
      const t = Array.isArray(r.teachers) ? r.teachers[0] : r.teachers;
      return { id: r.id, teacher_id: r.teacher_id, teacher_name: t?.full_name ?? "—", grade: r.grade, section: r.section, period: r.period, session_type: r.session_type, lecture_date: r.lecture_date, price: r.price };
    });
    return NextResponse.json({ ok: true, records });
  }

  const range = extractMonthRange(month);
  if (!range) {
    return jsonError("الشهر المطلوب غير صالح.", 400);
  }

  if (view === "summary") {
    if (!teacherId) {
      return jsonError("الأستاذ المطلوب غير صالح.", 400);
    }

    const hasLecturePrice = await tableHasColumn(context.value.actorSupabase, "teachers", "lecture_price").catch(() => false);
    const [{ data: teacher, error: teacherError }, { data: lectures, error: lecturesError }] = await Promise.all([
      applyBranchScopeToQuery(
        context.value.actorSupabase
          .from("teachers")
          .select((hasLecturePrice ? "id, lecture_price" : "id") as unknown as "id, lecture_price")
          .eq("id", teacherId)
          .eq("school_id", context.value.targetSchoolId),
        branchScope.value,
      ).maybeSingle(),
      applyBranchScopeToQuery(
        context.value.actorSupabase
          .from("daily_lectures")
          .select("price")
          .eq("teacher_id", teacherId)
          .eq("school_id", context.value.targetSchoolId)
          .gte("lecture_date", range.from)
          .lte("lecture_date", range.to),
        branchScope.value,
      ),
    ]);

    if (teacherError || !teacher?.id) {
      return jsonError("الأستاذ المطلوب غير موجود ضمن المدرسة الحالية.", 404);
    }

    if (lecturesError) {
      return jsonError(lecturesError.message || "تعذر تحميل ملخص محاضرات الأستاذ.", 500);
    }

    const fallbackPrice = Number(teacher.lecture_price ?? 0);
    const summary = (lectures ?? []).reduce(
      (acc, lecture) => {
        const price = Math.max(0, Number(lecture.price ?? 0) || fallbackPrice);
        acc.count += 1;
        acc.total += price;
        return acc;
      },
      { count: 0, total: 0 },
    );

    return NextResponse.json({
      ok: true,
      summary,
    });
  }

  const { data, error } = await applyBranchScopeToQuery(
    context.value.actorSupabase
      .from("daily_lectures")
      .select("lecture_date")
      .eq("school_id", context.value.targetSchoolId)
      .gte("lecture_date", range.from)
      .lte("lecture_date", range.to)
      .order("lecture_date", { ascending: false }),
    branchScope.value,
  );

  if (error) {
    return jsonError(error.message || "تعذر تحميل تقويم المحاضرات.", 500);
  }

  const dates = Array.from(new Set((data ?? []).map((item) => item.lecture_date).filter(Boolean)));
  return NextResponse.json({
    ok: true,
    dates,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { schoolId?: string; branchId?: string; rows?: unknown[] } | null;

  if (!body?.schoolId || !Array.isArray(body.rows) || body.rows.length === 0) {
    return jsonError("بيانات غير صالحة.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    body.schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "تسجيل المحاضرات متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const branchScope = resolveBranchScope(context.value, body.branchId ?? null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "salaries-lectures",
    windowMs: 60_000,
    maxHits: 120,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManageSalaries = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManageSalaries) {
    return jsonError("ليس لديك صلاحية تسجيل المحاضرات.", 403);
  }

  // Branch isolation: force branch_id from resolved scope — ignore any branch_id in row data
  const writeBranch = resolveBranchIdForWrite(branchScope.value, body.branchId ?? null);
  if (!writeBranch.ok) {
    return jsonError(writeBranch.message, writeBranch.status);
  }

  // Strip server-controlled keys before validation, then validate + whitelist
  // every row. Reject the whole payload on any invalid row (negative/huge
  // price, bad date, unknown columns, wrong session_type, etc.).
  const sanitizedInput = body.rows.map((r) => {
    const { school_id: _s, branch_id: _b, id: _id, ...rest } = (r ?? {}) as Record<string, unknown>;
    void _s; void _b; void _id;
    return rest;
  });

  const parsedRows = lectureRowsSchema.safeParse(sanitizedInput);
  if (!parsedRows.success) {
    return jsonError("بيانات المحاضرات غير صالحة.", 400);
  }

  const rows = parsedRows.data.map((r) => ({
    ...r,
    school_id: targetSchoolId,
    ...(writeBranch.value !== null ? { branch_id: writeBranch.value } : {}),
  }));

  const { data, error } = await actorSupabase.from("daily_lectures").insert(rows).select("id");
  if (error) {
    return jsonError(error.message || "تعذر تسجيل المحاضرات.", 500);
  }

  return NextResponse.json({ ok: true, count: data?.length ?? 0 });
}
