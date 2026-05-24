import { NextRequest, NextResponse } from "next/server";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { jsonError, logRouteError } from "@/lib/route-utils";

const ALLOWED_DOC_TYPES = [
  "national_id",
  "passport",
  "certificate",
  "contract",
  "other",
] as const;

type DocType = (typeof ALLOWED_DOC_TYPES)[number];

function isValidDocType(value: unknown): value is DocType {
  return ALLOWED_DOC_TYPES.includes(value as DocType);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة الأساتذة متاحة ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value, null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId } = context.value;

  const [rateLimited, canViewTeachers] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teachers-documents-get",
      windowMs: 60_000,
      maxHits: 120,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "view_teachers"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canViewTeachers) {
    return jsonError("ليس لديك صلاحية عرض الأساتذة.", 403);
  }

  // Branch isolation: verify teacher belongs to this school and branch
  const { data: teacherCheck } = await applyBranchScopeToQuery(
    actorSupabase.from("teachers").select("id")
      .eq("id", teacherId).eq("school_id", context.value.targetSchoolId),
    branchScope.value,
  ).maybeSingle();
  if (!teacherCheck) {
    return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const { data, error } = await actorSupabase
      .from("teacher_documents")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (error) {
      // Table may not exist yet — return empty list gracefully
      if (
        error.code === "42P01" ||
        error.message?.includes("does not exist")
      ) {
        return NextResponse.json({ ok: true, documents: [] });
      }
      logRouteError("teachers-documents-get", error, { teacherId });
      return jsonError("تعذر تحميل الوثائق.", 500);
    }

    return NextResponse.json({ ok: true, documents: data ?? [] });
  } catch (error) {
    logRouteError("teachers-documents-get", error, { teacherId });
    return jsonError("تعذر تحميل الوثائق.", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id : null;

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إضافة الوثائق متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value, null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canManageTeachers] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teachers-documents-post",
      windowMs: 60_000,
      maxHits: 40,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "manage_teachers"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canManageTeachers) {
    return jsonError("ليس لديك صلاحية إدارة الأساتذة.", 403);
  }

  // Branch isolation: verify teacher belongs to this school and branch
  const { data: teacherCheckPost } = await applyBranchScopeToQuery(
    actorSupabase.from("teachers").select("id")
      .eq("id", teacherId).eq("school_id", targetSchoolId),
    branchScope.value,
  ).maybeSingle();
  if (!teacherCheckPost) {
    return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const doc_type = isValidDocType(body?.doc_type) ? body.doc_type : "other";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const expiry_date =
      typeof body?.expiry_date === "string" && body.expiry_date.trim().length > 0
        ? body.expiry_date.trim()
        : null;
    const notes =
      typeof body?.notes === "string" && body.notes.trim().length > 0
        ? body.notes.trim()
        : null;
    const image_url =
      typeof body?.image_url === "string" && body.image_url.trim().length > 0
        ? body.image_url.trim()
        : null;

    if (!title) {
      return jsonError("عنوان الوثيقة مطلوب.", 400);
    }

    const { data, error } = await actorSupabase
      .from("teacher_documents")
      .insert({
        teacher_id: teacherId,
        school_id: targetSchoolId,
        doc_type,
        title,
        expiry_date,
        notes,
        image_url,
      })
      .select("*")
      .single();

    if (error || !data) {
      logRouteError("teachers-documents-post", error, {
        teacherId,
        actorUserId,
        schoolId: targetSchoolId,
      });
      return jsonError(error?.message || "تعذر إضافة الوثيقة.", 500);
    }

    return NextResponse.json({ ok: true, document: data }, { status: 201 });
  } catch (error) {
    logRouteError("teachers-documents-post", error, {
      teacherId,
      actorUserId,
      schoolId: targetSchoolId,
    });
    return jsonError("تعذر إضافة الوثيقة.", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const { teacherId } = await params;
  const documentId = req.nextUrl.searchParams.get("documentId");
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  if (!documentId) {
    return jsonError("معرّف الوثيقة مطلوب.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "حذف الوثائق متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value, null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const [rateLimited, canManageTeachers] = await Promise.all([
    enforceRateLimit(req, {
      namespace: "teachers-documents-delete",
      windowMs: 60_000,
      maxHits: 40,
      identifier: actorUserId,
    }),
    routeUserHasPermission(actorSupabase, actorUserId, "manage_teachers"),
  ]);

  if (rateLimited) return rateLimited;
  if (!canManageTeachers) {
    return jsonError("ليس لديك صلاحية إدارة الأساتذة.", 403);
  }

  // Branch isolation: verify teacher belongs to this school and branch
  const { data: teacherCheckDelete } = await applyBranchScopeToQuery(
    actorSupabase.from("teachers").select("id")
      .eq("id", teacherId).eq("school_id", targetSchoolId),
    branchScope.value,
  ).maybeSingle();
  if (!teacherCheckDelete) {
    return jsonError("المعلم غير موجود ضمن المدرسة الحالية.", 404);
  }

  try {
    const { error } = await actorSupabase
      .from("teacher_documents")
      .delete()
      .eq("id", documentId)
      .eq("teacher_id", teacherId)
      .eq("school_id", targetSchoolId);

    if (error) {
      logRouteError("teachers-documents-delete", error, {
        teacherId,
        documentId,
        actorUserId,
        schoolId: targetSchoolId,
      });
      return jsonError("تعذر حذف الوثيقة.", 500);
    }

    return NextResponse.json({ ok: true, documentId });
  } catch (error) {
    logRouteError("teachers-documents-delete", error, {
      teacherId,
      documentId,
      actorUserId,
      schoolId: targetSchoolId,
    });
    return jsonError("تعذر حذف الوثيقة.", 500);
  }
}
