import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

type DiagnosticMetric = {
  endpoint: string;
  totalTimeMs: number;
  authTimeMs: number;
  dataTimeMs: number;
  responseSize: number;
  timestamp: string;
  statusCode: number;
  details?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const t0 = performance.now();
  const tAuthStart = performance.now();

  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "Performance debug available for admins only.",
    },
    req.headers.get("authorization"),
  );

  const tAuthEnd = performance.now();
  const authTimeMs = Math.round(tAuthEnd - tAuthStart);

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "Unauthorized",
      "status" in context ? context.status : 403,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const metrics: DiagnosticMetric[] = [];

  // Run independent diagnostics in parallel
  const diag1Start = performance.now();
  const [
    { data: studentCount, error: err1 },
    { data: paymentCount, error: err2 },
    { data: attendanceCount, error: err3 },
    { data: classFeesData, error: err4 },
  ] = await Promise.all([
    // Diagnostic 1: Count students via RLS
    actorSupabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted"),
    // Diagnostic 2: Count payments via RLS
    actorSupabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("school_id", targetSchoolId),
    // Diagnostic 3: Count attendance records (today) via RLS
    actorSupabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("school_id", targetSchoolId)
      .eq("attendance_date", new Date().toISOString().slice(0, 10)),
    // Diagnostic 4: Get class_fees (check structure)
    actorSupabase
      .from("class_fees")
      .select("school_id, branch_id, class_name, total_fee", { count: "exact", head: true })
      .eq("school_id", targetSchoolId),
  ]);
  const diag1End = performance.now();
  const diagsParallelTimeMs = Math.round(diag1End - diag1Start);

  metrics.push({
    endpoint: "diagnostic/students_count",
    totalTimeMs: diagsParallelTimeMs,
    authTimeMs,
    dataTimeMs: diagsParallelTimeMs,
    responseSize: 11,
    timestamp: new Date().toISOString(),
    statusCode: err1 ? 500 : 200,
    details: err1 ? err1.message : `Found ${studentCount?.length || 0} students (via RLS)`,
  });

  metrics.push({
    endpoint: "diagnostic/payments_count",
    totalTimeMs: diagsParallelTimeMs,
    authTimeMs,
    dataTimeMs: diagsParallelTimeMs,
    responseSize: 11,
    timestamp: new Date().toISOString(),
    statusCode: err2 ? 500 : 200,
    details: err2 ? err2.message : `Found ${paymentCount?.length || 0} payments (via RLS)`,
  });

  metrics.push({
    endpoint: "diagnostic/attendance_count_today",
    totalTimeMs: diagsParallelTimeMs,
    authTimeMs,
    dataTimeMs: diagsParallelTimeMs,
    responseSize: 11,
    timestamp: new Date().toISOString(),
    statusCode: err3 ? 500 : 200,
    details: err3 ? err3.message : `Found ${attendanceCount?.length || 0} attendance records today (via RLS)`,
  });

  metrics.push({
    endpoint: "diagnostic/class_fees_structure",
    totalTimeMs: diagsParallelTimeMs,
    authTimeMs,
    dataTimeMs: diagsParallelTimeMs,
    responseSize: 11,
    timestamp: new Date().toISOString(),
    statusCode: err4 ? 500 : 200,
    details: err4 ? `Error: ${err4.message}` : `Found ${classFeesData?.length || 0} class_fees records (has school_id: ${classFeesData && classFeesData.length > 0})`,
  });

  // Diagnostic 5: Reports overview - break down by sub-query
  const dataSupabase = createServiceSupabaseClient();
  const t5Start = performance.now();

  const t5aStart = performance.now();
  const { data: studentsData, error: err5a } = await dataSupabase
    .from("students")
    .select("id, class_name, total_fee, paid_fee, discount_value, status")
    .eq("school_id", targetSchoolId)
    .neq("status", "deleted");
  const t5aEnd = performance.now();

  const t5bStart = performance.now();
  const { data: paymentsData, error: err5b } = await dataSupabase
    .from("payments")
    .select("id, amount, created_at")
    .eq("school_id", targetSchoolId);
  const t5bEnd = performance.now();

  const t5cStart = performance.now();
  const { data: expensesData, error: err5c } = await dataSupabase
    .from("expenses")
    .select("id, amount")
    .eq("school_id", targetSchoolId);
  const t5cEnd = performance.now();

  const t5dStart = performance.now();
  const { data: classFeesForReports, error: err5d } = await dataSupabase
    .from("class_fees")
    .select("school_id, class_name, total_fee")
    .eq("school_id", targetSchoolId);
  const t5dEnd = performance.now();

  const t5End = performance.now();

  metrics.push({
    endpoint: "api/web/reports/overview/students",
    totalTimeMs: Math.round(t5aEnd - t5aStart),
    authTimeMs,
    dataTimeMs: Math.round(t5aEnd - t5aStart),
    responseSize: JSON.stringify(studentsData || []).length,
    timestamp: new Date().toISOString(),
    statusCode: err5a ? 500 : 200,
    details: err5a ? err5a.message : `${(studentsData || []).length} students fetched`,
  });

  metrics.push({
    endpoint: "api/web/reports/overview/payments",
    totalTimeMs: Math.round(t5bEnd - t5bStart),
    authTimeMs,
    dataTimeMs: Math.round(t5bEnd - t5bStart),
    responseSize: JSON.stringify(paymentsData || []).length,
    timestamp: new Date().toISOString(),
    statusCode: err5b ? 500 : 200,
    details: err5b ? err5b.message : `${(paymentsData || []).length} payments fetched`,
  });

  metrics.push({
    endpoint: "api/web/reports/overview/expenses",
    totalTimeMs: Math.round(t5cEnd - t5cStart),
    authTimeMs,
    dataTimeMs: Math.round(t5cEnd - t5cStart),
    responseSize: JSON.stringify(expensesData || []).length,
    timestamp: new Date().toISOString(),
    statusCode: err5c ? 500 : 200,
    details: err5c ? err5c.message : `${(expensesData || []).length} expenses fetched`,
  });

  metrics.push({
    endpoint: "api/web/reports/overview/class_fees",
    totalTimeMs: Math.round(t5dEnd - t5dStart),
    authTimeMs,
    dataTimeMs: Math.round(t5dEnd - t5dStart),
    responseSize: JSON.stringify(classFeesForReports || []).length,
    timestamp: new Date().toISOString(),
    statusCode: err5d ? 500 : 200,
    details: err5d ? err5d.message : `${(classFeesForReports || []).length} class_fees fetched`,
  });

  const tEnd = performance.now();
  const totalOverallMs = Math.round(tEnd - t0);

  console.log("[performance-debug] Enhanced diagnostic results", {
    schoolId: targetSchoolId,
    authTimeMs,
    diagsParallelTimeMs,
    totalOverallMs,
    metricsCount: metrics.length,
    breakdown: {
      students: (studentsData || []).length,
      payments: (paymentsData || []).length,
      expenses: (expensesData || []).length,
      classFees: (classFeesForReports || []).length,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      schoolId: targetSchoolId,
      timestamp: new Date().toISOString(),
      authTimeMs,
      diagsParallelTimeMs,
      totalOverallMs,
      notes: {
        authBottleneck: `Auth took ${authTimeMs}ms. If > 500ms, RBAC cache missed. Check verifyRBACSession + resolveWebUserProfile.`,
        diagsParallel: `4 independent diagnostics ran in parallel (${diagsParallelTimeMs}ms). Not sequential.`,
        reportsBreakdown: "reports/overview queries broken down to identify slowest sub-query.",
      },
      metrics: metrics.sort((a, b) => b.totalTimeMs - a.totalTimeMs),
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Type": "application/json",
      },
    },
  );
}
