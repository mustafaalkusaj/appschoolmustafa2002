import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "عرض تفاصيل الدفعات متاح ضمن المدرسة الحالية فقط.",
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

  // Load student FIRST to get real branch_id from DB (not client-provided)
  const { data: student, error: studentError } = await actorSupabase
    .from("students")
    .select("id, branch_id")
    .eq("id", studentId)
    .eq("school_id", targetSchoolId)
    .maybeSingle();

  if (studentError || !student?.id) {
    return jsonError("الطالب المطلوب غير موجود ضمن المدرسة الحالية.", 404);
  }

  // Validate actor has access to student's actual branch
  const studentBranchId = student.branch_id ?? undefined;
  const studentBranchScope = resolveBranchScope(context.value, studentBranchId);
  if (!studentBranchScope.ok) {
    return jsonError(studentBranchScope.message, studentBranchScope.status);
  }

  // Query payments using actor's allowed branches (matches POST endpoint logic)
  // This accounts for cross-branch payments like the backend does
  const actorBranchScope = resolveBranchScope(context.value);
  let paymentsQuery = actorSupabase
    .from("payments")
    .select("id, school_id, branch_id, student_id, amount, payment_method, notes, created_at, receipt_number, manual_receipt_number")
    .eq("school_id", targetSchoolId)
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (actorBranchScope.ok) {
    paymentsQuery = applyBranchScopeToQuery(paymentsQuery, actorBranchScope.value);
  }

  const { data, error } = await paymentsQuery;

  if (error) {
    return jsonError(error.message || "تعذر تحميل سجل دفعات الطالب.", 500);
  }

  return NextResponse.json({
    ok: true,
    payments: data ?? [],
  });
}
