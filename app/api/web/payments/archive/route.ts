import { NextRequest, NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/admin-infrastructure";
import { compressArchiveData, decompressArchiveData } from "@/lib/payments/archive-compression";
import { applyBranchScopeToQuery, resolveBranchScope, resolveBranchIdForWrite } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { buildStudentPromotionPlan } from "@/lib/students/promotion";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const archiveId = req.nextUrl.searchParams.get("archiveId") ?? "";
  const schoolId = req.nextUrl.searchParams.get("schoolId") ?? "";
  const branchIdParam = req.nextUrl.searchParams.get("branchId") ?? "";

  if (!UUID_REGEX.test(archiveId)) {
    return jsonError("معرّف الأرشيف غير صالح.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "بيانات الأرشيف متاحة ضمن المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const branchScope = resolveBranchScope(context.value, branchIdParam || null);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  let query = actorSupabase
    .from("account_archives")
    .select("id, school_id, branch_id, archive_year, total_students, total_payments, total_amount, data, archive_date")
    .eq("id", archiveId)
    .eq("school_id", targetSchoolId);

  if (branchScope.value.branchIds.length === 1) {
    query = query.eq("branch_id", branchScope.value.branchIds[0]);
  }

  const { data: archive, error } = await query.maybeSingle();

  if (error || !archive) {
    return jsonError("تعذر العثور على الأرشيف المطلوب.", 404);
  }

  return NextResponse.json({
    ok: true,
    archive: {
      id: archive.id,
      school_id: archive.school_id,
      branch_id: archive.branch_id,
      archive_year: archive.archive_year,
      archive_date: archive.archive_date,
      total_students: archive.total_students,
      total_payments: archive.total_payments,
      total_amount: archive.total_amount,
      data: archive.data === null || archive.data === undefined ? null : decompressArchiveData(archive.data),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const archiveYear = Number(body?.archive_year ?? 0);
  const requestedBranchId = typeof body?.branch_id === "string" ? body.branch_id.trim() || null : null;

  const currentYear = new Date().getFullYear();
  if (!schoolId || !Number.isInteger(archiveYear) || archiveYear <= 0 || archiveYear > currentYear) {
    return jsonError("بيانات الأرشفة غير مكتملة أو السنة غير صالحة.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "أرشفة الحسابات متاحة ضمن المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const canArchivePayments = await routeUserHasPermission(actorSupabase, actorUserId, "delete_payments");
  if (!canArchivePayments) {
    return jsonError("ليس لديك صلاحية أرشفة الحسابات.", 403);
  }

  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const branchIdResult = resolveBranchIdForWrite(branchScope.value, requestedBranchId);
  if (!branchIdResult.ok) {
    return jsonError(branchIdResult.message, branchIdResult.status);
  }
  const archiveBranchId = branchIdResult.value;

  // Enforce max 5 archives per (school, branch) scope
  const MAX_ARCHIVES = 5;
  const archiveCountQuery = actorSupabase
    .from("account_archives")
    .select("id", { count: "exact", head: true })
    .eq("school_id", targetSchoolId);

  const { count: archiveCount } = archiveBranchId
    ? await archiveCountQuery.eq("branch_id", archiveBranchId)
    : await archiveCountQuery.is("branch_id", null);

  if ((archiveCount ?? 0) >= MAX_ARCHIVES) {
    // Allow update of an existing year — only block truly new archives
    const existingQuery = actorSupabase
      .from("account_archives")
      .select("id")
      .eq("school_id", targetSchoolId)
      .eq("archive_year", archiveYear);

    const { data: existingForYear } = archiveBranchId
      ? await existingQuery.eq("branch_id", archiveBranchId).maybeSingle()
      : await existingQuery.is("branch_id", null).maybeSingle();

    if (!existingForYear) {
      return jsonError(
        `وصل عدد الأرشيفات للحد الأقصى (${MAX_ARCHIVES} سنوات). يرجى حذف أرشيف قديم للمتابعة.`,
        400,
      );
    }
  }

  const fromDate = `${archiveYear}-01-01`;
  const toDate = `${archiveYear}-12-31`;

  const { data: yearPayments, error: paymentsError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("payments")
      .select("id, student_id, amount, payment_method, notes, created_at, receipt_number, manual_receipt_number")
      .eq("school_id", targetSchoolId)
      .gte("created_at", fromDate)
      .lte("created_at", `${toDate}T23:59:59.999Z`)
      .order("created_at", { ascending: false }),
    branchScope.value,
  );

  if (paymentsError) {
    return jsonError(paymentsError.message || "تعذر تحميل دفعات السنة المطلوبة.", 500);
  }

  if (!yearPayments || yearPayments.length === 0) {
    return jsonError("لا توجد دفعات مسجلة في السنة المحددة لإنشاء أرشيف سنوي.", 400);
  }

  const studentIds = Array.from(new Set(yearPayments.map((payment) => payment.student_id).filter(Boolean)));
  const { data: archiveStudents, error: studentsError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id, full_name, class_name, total_fee, paid_fee, remaining_fee, discount_value, status, phone")
      .eq("school_id", targetSchoolId)
      .in("id", studentIds),
    branchScope.value,
  );

  if (studentsError) {
    return jsonError(studentsError.message || "تعذر تحميل بيانات الطلاب للأرشفة.", 500);
  }

  const totalAmount = yearPayments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const { data: promotableStudents, error: promotableStudentsError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id, class_name, status")
      .eq("school_id", targetSchoolId)
      .not("status", "in", "(deleted,withdrawn,archived,graduated)"),
    branchScope.value,
  );

  if (promotableStudentsError) {
    return jsonError(promotableStudentsError.message || "تعذر تجهيز خطة ترحيل الطلاب قبل الأرشفة.", 500);
  }

  const promotionPlan = buildStudentPromotionPlan(
    ((promotableStudents ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? ""),
      class_name: typeof row.class_name === "string" ? row.class_name : null,
    })),
  );

  const snapshot = {
    year: archiveYear,
    payments: yearPayments,
    students: archiveStudents ?? [],
    summary: {
      total_students: studentIds.length,
      total_payments: yearPayments.length,
      total_amount: totalAmount,
      student_promotion: promotionPlan.summary,
    },
  };

  const payload = {
    school_id: targetSchoolId,
    branch_id: archiveBranchId,
    archive_year: archiveYear,
    total_students: studentIds.length,
    total_payments: yearPayments.length,
    total_amount: totalAmount,
    data: compressArchiveData(snapshot),
    archive_date: new Date().toISOString(),
  };

  const existingQuery = actorSupabase
    .from("account_archives")
    .select("id")
    .eq("school_id", targetSchoolId)
    .eq("archive_year", archiveYear)
    .order("archive_date", { ascending: false })
    .limit(1);

  const { data: existingArchive, error: existingError } = archiveBranchId
    ? await existingQuery.eq("branch_id", archiveBranchId).maybeSingle()
    : await existingQuery.is("branch_id", null).maybeSingle();

  if (existingError && !isMissingTableError(existingError, "account_archives")) {
    return jsonError(existingError.message || "تعذر التحقق من الأرشيف الحالي.", 500);
  }

  if (existingError && isMissingTableError(existingError, "account_archives")) {
    return jsonError("جدول الأرشيف السنوي غير موجود بعد. نفّذ ملف database_setup.sql في Supabase.", 500);
  }

  // Run student promotion BEFORE saving archive — if promotion fails, nothing is persisted
  if (promotionPlan.updates.length > 0) {
    const groups = new Map<string, string[]>();
    for (const update of promotionPlan.updates) {
      const current = groups.get(update.toClassName) ?? [];
      current.push(update.id);
      groups.set(update.toClassName, current);
    }

    for (const [toClassName, studentIdsForClass] of Array.from(groups.entries())) {
      const { error: promotionError } = await actorSupabase
        .from("students")
        .update({ class_name: toClassName })
        .eq("school_id", targetSchoolId)
        .in("id", studentIdsForClass);

      if (promotionError) {
        return jsonError("تعذر ترحيل الطلاب إلى الصف التالي. لم يُحفظ الأرشيف.", 500);
      }
    }
  }

  const writeResult = existingArchive?.id
    ? await actorSupabase
        .from("account_archives")
        .update(payload)
        .eq("id", existingArchive.id)
        .eq("school_id", targetSchoolId)
        .select("*")
        .single()
    : await actorSupabase.from("account_archives").insert(payload).select("*").single();

  if (writeResult.error || !writeResult.data) {
    return jsonError(writeResult.error?.message || "تعذر حفظ الأرشيف السنوي.", 500);
  }

  invalidateSchoolCacheDomains(targetSchoolId, ["dashboard-overview", "payments-meta", "reports-overview"]);

  return NextResponse.json({
    ok: true,
    archive: writeResult.data,
    created: !existingArchive?.id,
    promotion: {
      ...promotionPlan.summary,
      preview: promotionPlan.updates.slice(0, 10),
    },
  });
}
