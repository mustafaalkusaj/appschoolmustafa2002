import { NextRequest, NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/admin-infrastructure";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "بيانات الدفعات متاحة ضمن نطاق المدرسة الحالية فقط.",
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
  const [studentsResult, paymentIndexResult, archivesResult] = await Promise.allSettled([
    actorSupabase
      .from("students")
      .select("id, school_id, full_name, class_name, section, phone, address, total_fee, paid_fee, discount_value, remaining_fee, status")
      .eq("school_id", targetSchoolId)
      .order("full_name"),
    actorSupabase
      .from("payments")
      .select("student_id, created_at")
      .eq("school_id", targetSchoolId),
    actorSupabase
      .from("account_archives")
      .select("id, school_id, archive_year, total_students, total_payments, total_amount, data, archive_date")
      .eq("school_id", targetSchoolId)
      .order("archive_year", { ascending: false })
      .order("archive_date", { ascending: false }),
  ]);

  if (studentsResult.status !== "fulfilled" || studentsResult.value.error) {
    return jsonError(
      studentsResult.status === "fulfilled"
        ? studentsResult.value.error?.message || "تعذر تحميل الطلاب."
        : "تعذر تحميل الطلاب.",
      500,
    );
  }

  const archivesError = archivesResult.status === "fulfilled" ? archivesResult.value.error : null;
  const archivesMissing = Boolean(archivesError && isMissingTableError(archivesError, "account_archives"));
  const paymentIndexError = paymentIndexResult.status === "fulfilled" ? paymentIndexResult.value.error : null;
  const paymentIndexRows =
    paymentIndexResult.status === "fulfilled" && !paymentIndexResult.value.error
      ? ((paymentIndexResult.value.data ?? []) as Array<{
          student_id: string | null;
          created_at: string | null;
        }>)
      : [];

  const paymentCountsByStudent = paymentIndexRows.reduce<Record<string, number>>((acc, row) => {
    if (typeof row.student_id !== "string" || !row.student_id) return acc;
    acc[row.student_id] = (acc[row.student_id] ?? 0) + 1;
    return acc;
  }, {});

  const paymentYears = Array.from(
    new Set(
      paymentIndexRows
        .map((row) => {
          const value = row.created_at ? new Date(row.created_at).getFullYear() : null;
          return Number.isFinite(value) ? value : null;
        })
        .filter((value): value is number => typeof value === "number"),
    ),
  ).sort((left, right) => right - left);

  return NextResponse.json({
    ok: true,
    students: studentsResult.value.data ?? [],
    paymentCountsByStudent,
    paymentYears,
    totalPaymentCount: paymentIndexRows.length,
    archives: archivesMissing || archivesResult.status !== "fulfilled" ? [] : archivesResult.value.data ?? [],
    archiveNotice: [
      paymentIndexError
        ? paymentIndexError.message || "تعذر تحميل فهرس الدفعات الكامل، لذلك عُرضت القائمة بدون العدادات الزمنية."
        : paymentIndexResult.status !== "fulfilled"
          ? "تعذر تحميل فهرس الدفعات الكامل، لذلك عُرضت القائمة بدون العدادات الزمنية."
          : "",
      archivesMissing
        ? "جدول الأرشيف السنوي غير موجود بعد. نفّذ ملف database_setup.sql في Supabase."
        : archivesError
          ? "تعذر تحميل الأرشيف السنوي للحسابات."
          : "",
    ]
      .filter(Boolean)
      .join(" "),
  });
}
