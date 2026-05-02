import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { getTimings } from "@/lib/request-context-cache";

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
  const authTotalMs = Math.round(tAuthEnd - tAuthStart);
  const authPhaseTimings = getTimings();

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "Unauthorized",
      "status" in context ? context.status : 403,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const dataSupabase = createServiceSupabaseClient();

  // RUN DIAGNOSTICS IN PARALLEL
  const tDiagsStart = performance.now();
  const [
    { data: rlsStudents, error: rlsErr1, count: rlsCount1 },
    { data: rlsPayments, error: rlsErr2, count: rlsCount2 },
    { data: rlsAttendance, error: rlsErr3, count: rlsCount3 },
    { data: rlsClassFees, error: rlsErr4, count: rlsCount4 },
    { data: serviceStudents, error: srvErr1 },
    { data: servicePayments, error: srvErr2 },
    { data: serviceExpenses, error: srvErr3 },
    { data: serviceClassFees, error: srvErr4 },
  ] = await Promise.all([
    // RLS-scoped diagnostics (via actor context)
    actorSupabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted"),
    actorSupabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("school_id", targetSchoolId),
    actorSupabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("school_id", targetSchoolId)
      .eq("attendance_date", new Date().toISOString().slice(0, 10)),
    actorSupabase
      .from("class_fees")
      .select("*", { count: "exact", head: true })
      .eq("school_id", targetSchoolId),
    // Service-role diagnostics (bypass RLS, see real data)
    serviceStudents
      .from("students")
      .select("id, class_name, total_fee, paid_fee, discount_value, status")
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted"),
    servicePayments
      .from("payments")
      .select("id, amount, created_at")
      .eq("school_id", targetSchoolId),
    serviceExpenses
      .from("expenses")
      .select("id, amount")
      .eq("school_id", targetSchoolId),
    serviceClassFees
      .from("class_fees")
      .select("school_id, class_name, total_fee")
      .eq("school_id", targetSchoolId),
  ]);
  const tDiagsEnd = performance.now();
  const diagsParallelMs = Math.round(tDiagsEnd - tDiagsStart);

  const tEnd = performance.now();
  const totalOverallMs = Math.round(tEnd - t0);

  const diagnostics = {
    rlsScoped: {
      students: {
        count: rlsCount1 ?? 0,
        error: rlsErr1?.message || null,
      },
      payments: {
        count: rlsCount2 ?? 0,
        error: rlsErr2?.message || null,
      },
      attendance: {
        count: rlsCount3 ?? 0,
        error: rlsErr3?.message || null,
      },
      classFeesQuery: {
        count: rlsCount4 ?? 0,
        error: rlsErr4?.message || null,
      },
    },
    serviceRole: {
      students: {
        count: (serviceStudents || []).length,
        error: srvErr1?.message || null,
      },
      payments: {
        count: (servicePayments || []).length,
        error: srvErr2?.message || null,
      },
      expenses: {
        count: (serviceExpenses || []).length,
        error: srvErr3?.message || null,
      },
      classFeesQuery: {
        count: (serviceClassFees || []).length,
        error: srvErr4?.message || null,
      },
    },
  };

  console.log("[performance-debug] P1B diagnostic results", {
    schoolId: targetSchoolId,
    authTotalMs,
    authPhaseTimings,
    diagsParallelMs,
    totalOverallMs,
    diagnostics,
  });

  return NextResponse.json(
    {
      ok: true,
      schoolId: targetSchoolId,
      timestamp: new Date().toISOString(),
      timing: {
        authTotalMs,
        authPhaseTimings, // Record each phase duration + call count
        diagsParallelMs,
        totalOverallMs,
      },
      diagnostics,
      interpretation: {
        rlsVsService: "RLS-scoped returns filtered data. Service-role returns unfiltered. If RLS=0 but service>0, user has no access to that data via RLS.",
        authMemoization: authPhaseTimings["auth_cache_hit"]
          ? `Cache hit detected: ${authPhaseTimings["auth_cache_hit"].callCount} times`
          : "No cache hits detected. Memoization may not be working.",
        performance: `Auth: ${authTotalMs}ms, Diagnostics: ${diagsParallelMs}ms (parallel), Total: ${totalOverallMs}ms`,
      },
    },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Type": "application/json",
      },
    },
  );
}
