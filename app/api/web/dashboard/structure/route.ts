import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { dashboardOverviewQuerySchema } from "@/lib/api-schemas";
import {
  deleteDashboardClass,
  deleteDashboardSection,
  loadDashboardStructure,
  saveDashboardClass,
  saveDashboardSection,
} from "@/lib/dashboard-admin-server";
import { resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, jsonValidationError, logRouteError } from "@/lib/route-utils";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";
import { createRouteSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase-server";

const baseMutationSchema = z.object({
  school_id: z.string().trim().uuid("معرّف المدرسة غير صالح."),
  branch_id: z.string().trim().uuid("معرّف الفرع غير صالح.").optional().nullable(),
  branch_scoped: z.boolean().optional().default(false),
});

const saveClassSchema = baseMutationSchema.extend({
  action: z.literal("save_class"),
  // editing_class_id may be a legacy synthetic id like "legacy:grade" — accept any non-empty string
  editing_class_id: z.string().trim().min(1).optional().nullable(),
  legacy_class_ids: z.array(z.string().trim()).optional().default([]),
  name: z.string().trim().min(1, "اسم الصف مطلوب."),
  sections: z.array(z.string()).optional().default([]),
});

const deleteClassSchema = baseMutationSchema.extend({
  action: z.literal("delete_class"),
  // class_id may be a legacy synthetic id like "legacy:grade" — actual deletion uses legacy_class_ids
  class_id: z.string().trim().min(1, "معرّف الصف مطلوب."),
  legacy_class_ids: z.array(z.string().trim()).optional().default([]),
});

const saveSectionSchema = baseMutationSchema.extend({
  action: z.literal("save_section"),
  section_id: z.string().trim().uuid("معرّف الشعبة غير صالح.").optional().nullable(),
  // class_id may be a legacy synthetic id like "legacy:grade"
  class_id: z.string().trim().min(1, "معرّف الصف مطلوب."),
  class_name: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1, "اسم الشعبة مطلوب."),
});

const deleteSectionSchema = baseMutationSchema.extend({
  action: z.literal("delete_section"),
  section_id: z.string().trim().uuid("معرّف الشعبة غير صالح."),
});

const structureMutationSchema = z.discriminatedUnion("action", [
  saveClassSchema,
  deleteClassSchema,
  saveSectionSchema,
  deleteSectionSchema,
]);

async function hasAnyStructureManagementPermission(
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

export async function GET(req: NextRequest) {
  const parsed = dashboardOverviewQuerySchema.safeParse({
    schoolId: req.nextUrl.searchParams.get("schoolId"),
    branchId: req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id"),
  });

  if (!parsed.success) {
    return jsonValidationError(parsed.error, "معايير تحميل الصفوف والشعب غير صالحة.");
  }

  const branchScoped = req.nextUrl.searchParams.get("branchScoped") === "1";
  const context = await resolveSchoolScopedActorContext(
    parsed.data.schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة الصفوف والشعب متاحة ضمن نطاق المدرسة الحالية فقط.",
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
    namespace: "dashboard-structure-read",
    windowMs: 60_000,
    maxHits: 120,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  let effectiveBranchId: string | null = null;
  if (branchScoped) {
    const branchScope = resolveBranchScope(context.value, parsed.data.branchId ?? null);
    if (!branchScope.ok) {
      return jsonError(branchScope.message, branchScope.status);
    }
    effectiveBranchId = branchScope.value.branchId ?? parsed.data.branchId ?? null;
  }

  try {
    const serviceSupabase = createServiceSupabaseClient();
    const payload = await loadDashboardStructure(serviceSupabase, {
      schoolId: context.value.targetSchoolId,
      branchId: effectiveBranchId,
      branchScoped,
    });

    return NextResponse.json({
      ok: true,
      classes: payload.classes,
      sections: payload.sections,
    });
  } catch (error) {
    logRouteError("dashboard-structure-read", error, {
      actorUserId: context.value.actorUserId,
      schoolId: context.value.targetSchoolId,
      branchId: effectiveBranchId,
    });
    return jsonError("تعذر تحميل الصفوف والشعب حالياً. حاول مرة أخرى بعد قليل.", 500);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = structureMutationSchema.safeParse(body);

  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const context = await resolveSchoolScopedActorContext(
    parsed.data.school_id,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة الصفوف والشعب متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const canManage = await hasAnyStructureManagementPermission(context.value.actorUserId, context.value.actorSupabase);
  if (!canManage) {
    return jsonError("لا تملك صلاحية إدارة الصفوف والشعب.", 403);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "dashboard-structure-write",
    windowMs: 60_000,
    maxHits: 60,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  // Only resolve branch when explicitly branch-scoped — never trust raw branch_id from body
  let effectiveBranchId: string | null = null;
  if (parsed.data.branch_scoped) {
    const branchScope = resolveBranchScope(context.value, parsed.data.branch_id ?? null);
    if (!branchScope.ok) {
      return jsonError(branchScope.message, branchScope.status);
    }
    effectiveBranchId = branchScope.value.branchId ?? null;
  }

  const serviceSupabase = createServiceSupabaseClient();

  try {
    switch (parsed.data.action) {
      case "save_class":
        await saveDashboardClass(serviceSupabase, {
          schoolId: context.value.targetSchoolId,
          branchId: effectiveBranchId,
          branchScoped: parsed.data.branch_scoped,
          editingClassId: parsed.data.editing_class_id,
          legacyClassIds: parsed.data.legacy_class_ids,
          name: parsed.data.name,
          sections: parsed.data.sections,
        });
        break;
      case "delete_class":
        await deleteDashboardClass(serviceSupabase, {
          schoolId: context.value.targetSchoolId,
          branchId: effectiveBranchId,
          branchScoped: parsed.data.branch_scoped,
          classId: parsed.data.class_id,
          legacyClassIds: parsed.data.legacy_class_ids,
        });
        break;
      case "save_section":
        await saveDashboardSection(serviceSupabase, {
          schoolId: context.value.targetSchoolId,
          branchId: effectiveBranchId,
          branchScoped: parsed.data.branch_scoped,
          classId: parsed.data.class_id,
          className: parsed.data.class_name,
          sectionId: parsed.data.section_id,
          name: parsed.data.name,
        });
        break;
      case "delete_section":
        await deleteDashboardSection(serviceSupabase, {
          schoolId: context.value.targetSchoolId,
          branchId: effectiveBranchId,
          branchScoped: parsed.data.branch_scoped,
          sectionId: parsed.data.section_id,
        });
        break;
      default:
        return jsonError("إجراء غير مدعوم.", 400);
    }

    invalidateSchoolCacheDomains(context.value.targetSchoolId, ["dashboard-overview", "dashboard-structure"]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logRouteError("dashboard-structure-write", error, {
      actorUserId: context.value.actorUserId,
      schoolId: context.value.targetSchoolId,
      branchId: effectiveBranchId,
      action: parsed.data.action,
    });

    return jsonError(
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : "تعذر حفظ إعدادات الصفوف والشعب حالياً. حاول مرة أخرى بعد قليل.",
      500,
    );
  }
}
