import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteDashboardClassFee,
  saveDashboardClassFee,
} from "@/lib/dashboard-admin-server";
import { resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";
import { createRouteSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";

const baseFeeSchema = z.object({
  school_id: z.string().trim().uuid("معرّف المدرسة غير صالح."),
  branch_id: z.string().trim().uuid("معرّف الفرع غير صالح.").optional().nullable(),
  branch_scoped: z.boolean().optional().default(false),
});

const saveFeeSchema = baseFeeSchema.extend({
  action: z.literal("save"),
  fee_id: z.string().trim().uuid("معرّف القسط غير صالح.").optional().nullable(),
  class_name: z.string().trim().min(1, "اسم الصف مطلوب."),
  total_fee: z.coerce.number().finite("المبلغ غير صالح.").positive("المبلغ يجب أن يكون أكبر من صفر."),
  installments: z.coerce.number().int().min(1, "عدد الأقساط يجب أن يكون 1 على الأقل.").max(24),
  notes: z.string().optional().nullable(),
});

const deleteFeeSchema = baseFeeSchema.extend({
  action: z.literal("delete"),
  fee_id: z.string().trim().uuid("معرّف القسط غير صالح."),
});

const classFeeMutationSchema = z.discriminatedUnion("action", [saveFeeSchema, deleteFeeSchema]);

async function hasAnyFeeManagementPermission(
  actorUserId: string,
  actorSupabase: Awaited<ReturnType<typeof createRouteSupabaseClient>>,
) {
  const [canAddStudents, canEditStudents, canDeleteStudents] = await Promise.all([
    routeUserHasPermission(actorSupabase, actorUserId, "add_students"),
    routeUserHasPermission(actorSupabase, actorUserId, "edit_students"),
    routeUserHasPermission(actorSupabase, actorUserId, "delete_students"),
  ]);

  return canAddStudents || canEditStudents || canDeleteStudents;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = classFeeMutationSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.school_id,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة الأقساط متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const canManage = await hasAnyFeeManagementPermission(context.value.actorUserId, context.value.actorSupabase);
  if (!canManage) {
    return jsonError("لا تملك صلاحية إدارة الأقساط الدراسية.", 403);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "dashboard-class-fees-write",
    windowMs: 60_000,
    maxHits: 60,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  let effectiveBranchId = parsed.data.branch_id ?? null;
  if (parsed.data.branch_scoped) {
    const branchScope = resolveBranchScope(context.value, parsed.data.branch_id ?? null);
    if (!branchScope.ok) {
      return jsonError(branchScope.message, branchScope.status);
    }
    effectiveBranchId = branchScope.value.branchId ?? parsed.data.branch_id ?? null;
  }

  const serviceSupabase = createServiceSupabaseClient();

  try {
    if (parsed.data.action === "delete") {
      await deleteDashboardClassFee(serviceSupabase, {
        schoolId: context.value.targetSchoolId,
        branchId: effectiveBranchId,
        branchScoped: parsed.data.branch_scoped,
        feeId: parsed.data.fee_id,
      });
    } else {
      const result = await saveDashboardClassFee(serviceSupabase, {
        schoolId: context.value.targetSchoolId,
        branchId: effectiveBranchId,
        branchScoped: parsed.data.branch_scoped,
        feeId: parsed.data.fee_id,
        className: parsed.data.class_name,
        totalFee: parsed.data.total_fee,
        installments: parsed.data.installments,
        notes: parsed.data.notes,
      });

      if (result.status === "duplicate") {
        return NextResponse.json(
          {
            error: {
              message: "هذا الصف لديه قسط محفوظ مسبقاً. استخدم التعديل بدلاً من إضافة سجل جديد.",
            },
            existingFee: result.existingFee,
          },
          { status: 409 },
        );
      }
    }

    invalidateSchoolCacheDomains(context.value.targetSchoolId, ["dashboard-overview"]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logRouteError("dashboard-class-fees-write", error, {
      actorUserId: context.value.actorUserId,
      schoolId: context.value.targetSchoolId,
      branchId: effectiveBranchId,
      action: parsed.data.action,
    });

    return jsonError(
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "تعذر حفظ الأقساط الدراسية حالياً. حاول مرة أخرى بعد قليل.",
      500,
    );
  }
}
