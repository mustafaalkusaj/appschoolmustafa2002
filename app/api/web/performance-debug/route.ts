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

  // Diagnostic 1: Count students
  const t1Start = performance.now();
  const { data: studentCount, error: err1 } = await actorSupabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("school_id", targetSchoolId)
    .neq("status", "deleted");
  const t1End = performance.now();
  const studentsSize = JSON.stringify({ count: studentCount?.length || 0 }).length;
  metrics.push({
    endpoint: "diagnostic/students_count",
    totalTimeMs: Math.round(t1End - t1Start),
    authTimeMs,
    dataTimeMs: Math.round(t1End - t1Start),
    responseSize: studentsSize,
    timestamp: new Date().toISOString(),
    statusCode: err1 ? 500 : 200,
    details: err1 ? err1.message : `Found ${studentCount?.length || 0} students`,
  });

  // Diagnostic 2: Count payments
  const t2Start = performance.now();
  const { data: paymentCount, error: err2 } = await actorSupabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("school_id", targetSchoolId);
  const t2End = performance.now();
  const paymentsSize = JSON.stringify({ count: paymentCount?.length || 0 }).length;
  metrics.push({
    endpoint: "diagnostic/payments_count",
    totalTimeMs: Math.round(t2End - t2Start),
    authTimeMs,
    dataTimeMs: Math.round(t2End - t2Start),
    responseSize: paymentsSize,
    timestamp: new Date().toISOString(),
    statusCode: err2 ? 500 : 200,
    details: err2 ? err2.message : `Found ${paymentCount?.length || 0} payments`,
  });

  // Diagnostic 3: Count attendance records (today)
  const today = new Date().toISOString().slice(0, 10);
  const t3Start = performance.now();
  const { data: attendanceCount, error: err3 } = await actorSupabase
    .from("attendance_records")
    .select("id", { count: "exact", head: true })
    .eq("school_id", targetSchoolId)
    .eq("attendance_date", today);
  const t3End = performance.now();
  const attendanceSize = JSON.stringify({ count: attendanceCount?.length || 0 }).length;
  metrics.push({
    endpoint: "diagnostic/attendance_count_today",
    totalTimeMs: Math.round(t3End - t3Start),
    authTimeMs,
    dataTimeMs: Math.round(t3End - t3Start),
    responseSize: attendanceSize,
    timestamp: new Date().toISOString(),
    statusCode: err3 ? 500 : 200,
    details: err3 ? err3.message : `Found ${attendanceCount?.length || 0} attendance records today`,
  });

  // Diagnostic 4: Count class fees
  const t4Start = performance.now();
  const { data: classFeesCount, error: err4 } = await actorSupabase
    .from("class_fees")
    .select("id", { count: "exact", head: true })
    .eq("school_id", targetSchoolId);
  const t4End = performance.now();
  const classFeesSize = JSON.stringify({ count: classFeesCount?.length || 0 }).length;
  metrics.push({
    endpoint: "diagnostic/class_fees_count",
    totalTimeMs: Math.round(t4End - t4Start),
    authTimeMs,
    dataTimeMs: Math.round(t4End - t4Start),
    responseSize: classFeesSize,
    timestamp: new Date().toISOString(),
    statusCode: err4 ? 500 : 200,
    details: err4 ? err4.message : `Found ${classFeesCount?.length || 0} class fee records`,
  });

  // Diagnostic 5: Simulate reports/overview query (with service role to get actual timing)
  const t5Start = performance.now();
  let t5QueryStart = performance.now();
  const dataSupabase = createServiceSupabaseClient();

  const [studentsResult, paymentsResult, expensesResult] = await Promise.all([
    dataSupabase
      .from("students")
      .select("id, class_name, total_fee, paid_fee, discount_value, status")
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted"),
    dataSupabase
      .from("payments")
      .select("id, amount, created_at")
      .eq("school_id", targetSchoolId),
    dataSupabase
      .from("expenses")
      .select("id, amount")
      .eq("school_id", targetSchoolId),
  ]);

  let t5QueryEnd = performance.now();
  const t5End = performance.now();

  const reportsPayload = {
    students: (studentsResult.data || []).length,
    payments: (paymentsResult.data || []).length,
    expenses: (expensesResult.data || []).length,
  };
  const reportsSize = JSON.stringify(reportsPayload).length;

  metrics.push({
    endpoint: "api/web/reports/overview",
    totalTimeMs: Math.round(t5End - t5Start),
    authTimeMs,
    dataTimeMs: Math.round(t5QueryEnd - t5QueryStart),
    responseSize: reportsSize,
    timestamp: new Date().toISOString(),
    statusCode: studentsResult.error || paymentsResult.error || expensesResult.error ? 500 : 200,
    details: `Students: ${(studentsResult.data || []).length}, Payments: ${(paymentsResult.data || []).length}, Expenses: ${(expensesResult.data || []).length}`,
  });

  const tEnd = performance.now();
  const totalOverallMs = Math.round(tEnd - t0);

  console.log("[performance-debug] Diagnostic results", {
    schoolId: targetSchoolId,
    totalOverallMs,
    metricsCount: metrics.length,
    metrics: metrics.map(m => ({
      endpoint: m.endpoint,
      totalTimeMs: m.totalTimeMs,
      authTimeMs: m.authTimeMs,
      dataTimeMs: m.dataTimeMs,
      responseSize: m.responseSize,
    })),
  });

  return NextResponse.json(
    {
      ok: true,
      schoolId: targetSchoolId,
      timestamp: new Date().toISOString(),
      totalOverallMs,
      authTimeMs,
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
