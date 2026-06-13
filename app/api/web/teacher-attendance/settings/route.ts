import { NextRequest, NextResponse } from "next/server";

import { attendanceSettingsSchema } from "@/lib/api-schemas";
import { resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";

const DEFAULT_SETTINGS = {
  work_start_time: "08:00",
  work_end_time: "15:00",
  late_threshold_minutes: 15,
  work_days: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
  absent_deduction_type: "none",
  absent_deduction_amount: null,
  late_deduction_type: "none",
  late_deduction_amount: null,
  max_late_days_before_absent: 3,
};

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إعدادات الحضور متاحة ضمن نطاق المدرسة فقط.",
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
    return jsonError("ليس لديك صلاحية عرض إعدادات الحضور.", 403);
  }

  try {
    let q = actorSupabase
      .from("attendance_settings")
      .select("*")
      .eq("school_id", targetSchoolId);

    const branchId = branchScope.value.branchId;
    if (branchId) {
      q = q.eq("branch_id", branchId);
    } else {
      q = q.is("branch_id", null);
    }

    const { data, error } = await q.maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      settings: data ?? { ...DEFAULT_SETTINGS, school_id: targetSchoolId, branch_id: branchId ?? null },
    });
  } catch (error) {
    logRouteError("teacher-attendance-settings-get", error, {
      actorUserId,
      schoolId: targetSchoolId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر تحميل إعدادات الحضور. حاول مرة أخرى بعد قليل.", 500);
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = attendanceSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error, "تحقق من إعدادات الحضور ثم أعد المحاولة.");
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.school_id,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "تعديل إعدادات الحضور متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value, parsed.data.branch_id ?? null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canManage] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teacher-attendance",
      windowMs: 60_000,
      maxHits: 60,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "manage_attendance_settings"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canManage) {
    return jsonError("ليس لديك صلاحية تعديل إعدادات الحضور.", 403);
  }

  try {
    const branchId = branchScope.value.branchId ?? parsed.data.branch_id ?? null;

    const { data, error } = await actorSupabase
      .from("attendance_settings")
      .upsert(
        {
          school_id: targetSchoolId,
          branch_id: branchId,
          work_start_time: parsed.data.work_start_time,
          work_end_time: parsed.data.work_end_time,
          late_threshold_minutes: parsed.data.late_threshold_minutes,
          work_days: parsed.data.work_days,
          absent_deduction_type: parsed.data.absent_deduction_type,
          absent_deduction_amount: parsed.data.absent_deduction_amount ?? null,
          late_deduction_type: parsed.data.late_deduction_type,
          late_deduction_amount: parsed.data.late_deduction_amount ?? null,
          max_late_days_before_absent: parsed.data.max_late_days_before_absent,
        },
        { onConflict: "school_id,branch_id" },
      )
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Attendance settings upsert failed");
    }

    return NextResponse.json({ ok: true, settings: data });
  } catch (error) {
    logRouteError("teacher-attendance-settings-put", error, {
      actorUserId,
      schoolId: targetSchoolId,
      requestId: req.headers.get("x-request-id"),
    });
    return jsonError("تعذر حفظ إعدادات الحضور. حاول مرة أخرى بعد قليل.", 500);
  }
}
