import { NextRequest, NextResponse } from "next/server";

import {
  teacherAttendanceBulkSchema,
} from "@/lib/api-schemas";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const date = req.nextUrl.searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonError("التاريخ مطلوب ويجب أن يكون بالصيغة YYYY-MM-DD.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "سجلات حضور الأساتذة متاحة ضمن نطاق المدرسة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canView] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teacher-attendance",
      windowMs: 60_000,
      maxHits: 60,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "view_teacher_attendance"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canView) {
    return jsonError("ليس لديك صلاحية عرض حضور الأساتذة.", 403);
  }

  try {
    let q = applyBranchScopeToQuery(
      actorSupabase
        .from("teacher_attendance")
        .select(
          "id, teacher_id, attendance_date, status, check_in_time, check_out_time, notes, created_at, teachers(id, full_name, subject)",
        )
        .eq("school_id", targetSchoolId)
        .eq("attendance_date", date),
      branchScope.value,
    );

    const { data, error } = await q.order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, records: data ?? [] });
  } catch (error) {
    logRouteError("teacher-attendance-list", error, {
      actorUserId,
      schoolId: targetSchoolId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحميل سجلات حضور الأساتذة.", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = teacherAttendanceBulkSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error, "تحقق من البيانات المرسلة ثم أعد المحاولة.");
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "تسجيل حضور الأساتذة متاح ضمن نطاق المدرسة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value, parsed.data.branchId ?? null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canTake] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teacher-attendance",
      windowMs: 60_000,
      maxHits: 60,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "take_teacher_attendance"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canTake) {
    return jsonError("ليس لديك صلاحية تسجيل حضور الأساتذة.", 403);
  }

  try {
    const branchId = branchScope.value.branchId ?? parsed.data.branchId ?? null;

    const upsertRows = parsed.data.records.map((rec) => ({
      school_id: targetSchoolId,
      branch_id: branchId,
      teacher_id: rec.teacher_id,
      attendance_date: parsed.data.date,
      status: rec.status,
      check_in_time: rec.check_in_time ?? null,
      check_out_time: rec.check_out_time ?? null,
      notes: rec.notes ?? null,
    }));

    const { data, error } = await actorSupabase
      .from("teacher_attendance")
      .upsert(upsertRows, {
        onConflict: "school_id,teacher_id,attendance_date",
        ignoreDuplicates: false,
      })
      .select("id, teacher_id, attendance_date, status, check_in_time, check_out_time, notes");

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, records: data ?? [] });
  } catch (error) {
    logRouteError("teacher-attendance-bulk-save", error, {
      actorUserId,
      schoolId: targetSchoolId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر حفظ سجلات الحضور. حاول مرة أخرى بعد قليل.", 500);
  }
}
