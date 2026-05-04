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

  // Resolve branch scope using student's REAL branch_id from DB
  const studentBranchId = student.branch_id ?? undefined;
  const branchScope = resolveBranchScope(context.value, studentBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const paymentsQuery = applyBranchScopeToQuery(
    actorSupabase
      .from("payments")
      .select("id, school_id, branch_id, student_id, amount, payment_method, notes, created_at, receipt_number, manual_receipt_number")
      .eq("school_id", targetSchoolId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
    branchScope.value,
  );
  const { data, error } = await paymentsQuery;

  if (error) {
    return jsonError(error.message || "تعذر تحميل سجل دفعات الطالب.", 500);
  }

  // TODO: Remove debug output after diagnosis of 4M vs 0 discrepancy
  const debugToken = req.headers.get("x-debug-token");
  const hasDebugAccess =
    context.value.actorRole === "super_admin" ||
    (debugToken && debugToken === process.env.PAYMENT_DEBUG_TOKEN);

  const paidBefore = (data ?? []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const debugInfo = hasDebugAccess
    ? {
        studentId,
        studentBranchId,
        branchScopeType: branchScope.value.branchId ? "single" : "multiple",
        branchIds: branchScope.value.branchIds,
        paymentRowsCount: (data ?? []).length,
        paidBefore,
        payments: data ?? [],
      }
    : undefined;

  console.log(
    "[payments-students-get] Payment rows returned:",
    debugInfo || "debug hidden"
  );

  return NextResponse.json({
    ok: true,
    payments: data ?? [],
    ...(debugInfo && { debug: debugInfo }),
  });
}
