import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope, type ResolvedBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { resolveAuthoritativeStudentPaidFee } from "@/lib/payments-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { hasPermissionInList } from "@/types/roles";
import type { StudentStatus } from "@/types/student";

type StudentRow = {
  id: string;
  school_id: string;
  full_name: string;
  class_name: string;
  section: string | null;
  phone: string | null;
  address: string | null;
  total_fee: number | null;
  paid_fee: number | null;
  discount_value: number | null;
  remaining_fee?: number | null;
  status: StudentStatus | null;
};

type TransferType = "class" | "section" | "transferred";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function hasOwn(input: Record<string, unknown> | null, key: string) {
  return Boolean(input) && Object.prototype.hasOwnProperty.call(input, key);
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRequiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown): StudentStatus | null {
  switch (value) {
    case "active":
    case "transferred":
    case "suspended":
    case "graduated":
    case "withdrawn":
    case "archived":
    case "deleted":
      return value;
    default:
      return null;
  }
}

function parseNonNegativeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeTransferType(value: unknown): TransferType | null {
  if (value === "class" || value === "section" || value === "transferred") {
    return value;
  }
  return null;
}

async function requireStudentPermission(req: NextRequest, permission: "edit_students" | "delete_students") {
  const session = await verifyRBACSession(req.cookies.get(RBAC_COOKIE_NAME)?.value);
  if (!session?.userActive) {
    return { ok: false as const, status: 401, message: "يجب تسجيل الدخول أولاً." };
  }

  if (!hasPermissionInList(session.permissions, permission)) {
    return {
      ok: false as const,
      status: 403,
      message: permission === "delete_students" ? "لا تملك صلاحية حذف الطلاب." : "لا تملك صلاحية تعديل بيانات الطلاب.",
    };
  }

  return { ok: true as const, session };
}

async function resolveStudentContext(
  req: NextRequest,
  schoolId: string | null,
  permission: "edit_students" | "delete_students",
  requestedBranchId?: string | null,
) {
  // Run permission check and auth context resolution in parallel
  const [permissionCheck, context] = await Promise.all([
    requireStudentPermission(req, permission),
    resolveSchoolScopedActorContext(
      schoolId,
      {
        allowedRoles: ["super_admin", "admin", "employee"],
        roleDeniedMessage: "إدارة الطلاب متاحة ضمن نطاق المدرسة الحالية فقط.",
      },
      req.headers.get("authorization"),
    ),
  ]);

  if (!permissionCheck.ok) {
    return permissionCheck;
  }

  if (!context.ok) {
    return {
      ok: false as const,
      status: "status" in context ? context.status : 500,
      message: "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
    };
  }

  const branchScope = resolveBranchScope(
    context.value,
    requestedBranchId,
    "لا يمكنك الوصول إلى بيانات هذا الفرع.",
  );
  if (!branchScope.ok) {
    return {
      ok: false as const,
      status: branchScope.status,
      message: branchScope.message,
    };
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: `students-${permission}`,
    windowMs: 60_000,
    maxHits: 90,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) {
    return {
      ok: false as const,
      status: 429,
      message: "تم تجاوز عدد المحاولات المسموح بها مؤقتاً. حاول مرة أخرى بعد قليل.",
      response: rateLimited,
    };
  }

  return {
    ok: true as const,
    value: {
      actorUserId: context.value.actorUserId,
      targetSchoolId: context.value.targetSchoolId,
      serviceSupabase: createServiceSupabaseClient(),
      actorRole: permissionCheck.session.role,
      branchScope: branchScope.value,
    },
  };
}

async function fetchStudent(
  serviceSupabase: ReturnType<typeof createServiceSupabaseClient>,
  studentId: string,
  schoolId: string,
  branchScope: ResolvedBranchScope,
) {
  const { data, error } = await applyBranchScopeToQuery(
    serviceSupabase
      .from("students")
      .select("id, school_id, full_name, class_name, section, phone, address, total_fee, paid_fee, discount_value, status")
      .eq("id", studentId)
      .eq("school_id", schoolId),
    branchScope,
  ).maybeSingle<StudentRow>();

  if (error || !data?.id) {
    return null;
  }

  return data;
}

async function validateClassExists(
  serviceSupabase: ReturnType<typeof createServiceSupabaseClient>,
  className: string,
  schoolId: string,
  branchScope: ResolvedBranchScope,
): Promise<boolean> {
  // Check class_fees first (common path), then fall back to classes table
  const { data: feeData } = await applyBranchScopeToQuery(
    serviceSupabase
      .from("class_fees")
      .select("class_name")
      .eq("class_name", className)
      .eq("school_id", schoolId),
    branchScope,
  ).maybeSingle<{ class_name: string }>();

  if (feeData) return true;

  // A class may exist without a fee entry — check the classes table
  let classesQuery = serviceSupabase
    .from("classes")
    .select("id")
    .eq("school_id", schoolId)
    .eq("grade", className)
    .limit(1);

  if (branchScope.branchId) {
    classesQuery = classesQuery.eq("branch_id", branchScope.branchId);
  } else if (branchScope.branchIds.length > 0) {
    classesQuery = classesQuery.in("branch_id", branchScope.branchIds);
  }

  const { data: classData } = await classesQuery.maybeSingle<{ id: string }>();
  return !!classData;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;
  const requestedBranchId = typeof body?.branch_id === "string" ? body.branch_id : null;

  const context = await resolveStudentContext(req, schoolId, "edit_students", requestedBranchId);
  if (!context.ok) {
    if ("response" in context && context.response) return context.response;
    return jsonError(context.message, context.status);
  }

  const { serviceSupabase, targetSchoolId, actorRole, branchScope } = context.value;
  const currentStudent = await fetchStudent(serviceSupabase, studentId, targetSchoolId, branchScope);
  if (!currentStudent) {
    return jsonError("الطالب المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  // Check if this is a transfer operation
  const transferType = normalizeTransferType(body?.transfer_type);
  if (transferType) {
    // Handle transfer operations
    if (transferType === "class") {
      const targetClassName = normalizeRequiredText(body?.target_class_name);
      if (!targetClassName) {
        return jsonError("اسم الصف المستهدف مطلوب للنقل بين الصفوف.", 400);
      }

      // Validate target class exists in branch
      const classExists = await validateClassExists(serviceSupabase, targetClassName, targetSchoolId, branchScope);
      if (!classExists) {
        return jsonError("الصف المستهدف غير موجود أو غير متاح ضمن فرعك.", 400);
      }

      const targetSection = normalizeOptionalText(body?.target_section);

      const { data, error } = await applyBranchScopeToQuery(
        serviceSupabase
          .from("students")
          .update({
            class_name: targetClassName,
            section: targetSection,
            status: "active" satisfies StudentStatus,
          })
          .eq("id", studentId)
          .eq("school_id", targetSchoolId),
        branchScope,
      )
        .select("id, school_id, full_name, class_name, section, phone, address, total_fee, paid_fee, discount_value, status")
        .maybeSingle<StudentRow>();

      if (error || !data?.id) {
        return jsonError(error?.message || "تعذر نقل الطالب إلى الصف الجديد.", 500);
      }

      invalidateSchoolCacheDomains(targetSchoolId, ["dashboard-overview", "payments-meta", "reports-overview"]);
      return NextResponse.json({ ok: true, student: data });
    }

    if (transferType === "section") {
      const targetSection = normalizeRequiredText(body?.target_section);
      if (!targetSection) {
        return jsonError("اسم الشعبة المستهدفة مطلوب للنقل بين الشعب.", 400);
      }

      const { data, error } = await applyBranchScopeToQuery(
        serviceSupabase
          .from("students")
          .update({
            section: targetSection,
            status: "active" satisfies StudentStatus,
          })
          .eq("id", studentId)
          .eq("school_id", targetSchoolId),
        branchScope,
      )
        .select("id, school_id, full_name, class_name, section, phone, address, total_fee, paid_fee, discount_value, status")
        .maybeSingle<StudentRow>();

      if (error || !data?.id) {
        return jsonError(error?.message || "تعذر نقل الطالب إلى الشعبة الجديدة.", 500);
      }

      invalidateSchoolCacheDomains(targetSchoolId, ["dashboard-overview", "payments-meta", "reports-overview"]);
      return NextResponse.json({ ok: true, student: data });
    }

    if (transferType === "transferred") {
      // Mark student as transferred, optionally update class/section if provided
      const targetClassName = normalizeOptionalText(body?.target_class_name);
      const targetSection = normalizeOptionalText(body?.target_section);

      const updatePayload: Partial<StudentRow> = {
        status: "transferred" satisfies StudentStatus,
      };

      if (targetClassName) {
        const classExists = await validateClassExists(serviceSupabase, targetClassName, targetSchoolId, branchScope);
        if (!classExists) {
          return jsonError("الصف المستهدف غير موجود أو غير متاح ضمن فرعك.", 400);
        }
        updatePayload.class_name = targetClassName;
      }

      if (targetSection) {
        updatePayload.section = targetSection;
      }

      const { data, error } = await applyBranchScopeToQuery(
        serviceSupabase
          .from("students")
          .update(updatePayload)
          .eq("id", studentId)
          .eq("school_id", targetSchoolId),
        branchScope,
      )
        .select("id, school_id, full_name, class_name, section, phone, address, total_fee, paid_fee, discount_value, status")
        .maybeSingle<StudentRow>();

      if (error || !data?.id) {
        return jsonError(error?.message || "تعذر نقل الطالب إلى المنقولون.", 500);
      }

      invalidateSchoolCacheDomains(targetSchoolId, ["dashboard-overview", "payments-meta", "reports-overview"]);
      return NextResponse.json({ ok: true, student: data });
    }
  }

  // Standard edit operation (non-transfer)
  const nextFullName = hasOwn(body, "full_name") ? normalizeRequiredText(body?.full_name) : currentStudent.full_name;
  const nextClassName = hasOwn(body, "class_name") ? normalizeRequiredText(body?.class_name) : currentStudent.class_name;
  const nextSection = hasOwn(body, "section") ? normalizeOptionalText(body?.section) : currentStudent.section;
  const nextPhone = hasOwn(body, "phone") ? normalizeOptionalText(body?.phone) : currentStudent.phone;
  const nextAddress = hasOwn(body, "address") ? normalizeOptionalText(body?.address) : currentStudent.address;
  const nextStatus = hasOwn(body, "status") ? normalizeStatus(body?.status) : currentStudent.status ?? "active";

  const nextTotalFee = hasOwn(body, "total_fee")
    ? parseNonNegativeNumber(body?.total_fee)
    : Number(currentStudent.total_fee ?? 0);
  const requestedPaidFee = hasOwn(body, "paid_fee")
    ? parseNonNegativeNumber(body?.paid_fee)
    : Number(currentStudent.paid_fee ?? 0);
  const nextDiscount = hasOwn(body, "discount_value")
    ? parseNonNegativeNumber(body?.discount_value)
    : Number(currentStudent.discount_value ?? 0);

  if (!nextFullName || nextFullName.length < 2) {
    return jsonError("الاسم الكامل مطلوب ويجب أن يكون من حرفين على الأقل.", 400);
  }

  if (!nextClassName) {
    return jsonError("اسم الصف مطلوب.", 400);
  }

  if (nextStatus === null) {
    return jsonError("حالة الطالب غير صالحة.", 400);
  }

  if (nextTotalFee === null || requestedPaidFee === null || nextDiscount === null) {
    return jsonError("الرسوم والمدفوع والخصم يجب أن تكون أرقاماً صحيحة تساوي صفراً أو أكثر.", 400);
  }

  if (nextDiscount > nextTotalFee) {
    return jsonError("الخصم لا يمكن أن يكون أكبر من إجمالي الرسوم.", 400);
  }

  const currentTotalFee = Number(currentStudent.total_fee ?? 0);
  const currentDiscount = Number(currentStudent.discount_value ?? 0);
  if (
    actorRole === "employee" &&
    ((hasOwn(body, "total_fee") && nextTotalFee !== currentTotalFee) ||
      (hasOwn(body, "discount_value") && nextDiscount !== currentDiscount))
  ) {
    return jsonError("لا تملك صلاحية تعديل إجمالي الرسوم أو الخصم مباشرة.", 403);
  }

  let nextPaidFee = requestedPaidFee;
  try {
    nextPaidFee = await resolveAuthoritativeStudentPaidFee(
      serviceSupabase,
      targetSchoolId,
      studentId,
      requestedPaidFee,
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر التحقق من إجمالي دفعات الطالب الحالية.", 500);
  }

  const netFeeAfterDiscount = Math.max(nextTotalFee - nextDiscount, 0);
  if (nextPaidFee > netFeeAfterDiscount) {
    return jsonError("المدفوع الفعلي لا يمكن أن يكون أكبر من الرسوم بعد الخصم.", 400);
  }

  const updatePayload: Partial<StudentRow> = {
    full_name: nextFullName,
    class_name: nextClassName,
    section: nextSection,
    phone: nextPhone,
    address: nextAddress,
    total_fee: nextTotalFee,
    paid_fee: nextPaidFee,
    discount_value: nextDiscount,
    status: nextStatus,
  };

  const { data, error } = await applyBranchScopeToQuery(
    serviceSupabase
      .from("students")
      .update(updatePayload)
      .eq("id", studentId)
      .eq("school_id", targetSchoolId),
    branchScope,
  )
    .select("id, school_id, full_name, class_name, section, phone, address, total_fee, paid_fee, discount_value, status")
    .maybeSingle<StudentRow>();

  if (error || !data?.id) {
    return jsonError(error?.message || "تعذر تحديث بيانات الطالب.", 500);
  }

  invalidateSchoolCacheDomains(targetSchoolId, ["dashboard-overview", "payments-meta", "reports-overview"]);

  return NextResponse.json({ ok: true, student: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;
  const requestedBranchId = typeof body?.branch_id === "string" ? body.branch_id : null;
  const forceDelete = body?.force_delete === true;

  const context = await resolveStudentContext(req, schoolId, "delete_students", requestedBranchId);
  if (!context.ok) {
    if ("response" in context && context.response) return context.response;
    return jsonError(context.message, context.status);
  }

  const { serviceSupabase, targetSchoolId, branchScope } = context.value;
  const currentStudent = await fetchStudent(serviceSupabase, studentId, targetSchoolId, branchScope);
  if (!currentStudent) {
    return jsonError("الطالب المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  const deleteQuery = forceDelete || currentStudent.status === "deleted"
    ? applyBranchScopeToQuery(
        serviceSupabase
          .from("students")
          .delete()
          .eq("id", studentId)
          .eq("school_id", targetSchoolId),
        branchScope,
      )
    : applyBranchScopeToQuery(
        serviceSupabase
          .from("students")
          .update({ status: "deleted" satisfies StudentStatus })
          .eq("id", studentId)
          .eq("school_id", targetSchoolId),
        branchScope,
      );

  const { data, error } = await deleteQuery
    .select("id, school_id, full_name, class_name, section, phone, address, total_fee, paid_fee, discount_value, status")
    .maybeSingle<StudentRow>();

  if (error || !data?.id) {
    return jsonError(error?.message || "تعذر حذف الطالب.", 500);
  }

  invalidateSchoolCacheDomains(targetSchoolId, ["dashboard-overview", "payments-meta", "reports-overview"]);

  return NextResponse.json({ ok: true, student: data, hardDeleted: forceDelete || currentStudent.status === "deleted" });
}
