import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req, "super_admin");
  if (!context.ok) return context.response;

  const { serviceSupabase } = context.value;

  const [schoolsRes, studentsRes, teachersRes] = await Promise.all([
    serviceSupabase.from("schools").select("id", { count: "exact", head: true }),
    serviceSupabase.from("students").select("id", { count: "exact", head: true }),
    serviceSupabase.from("teachers").select("id", { count: "exact", head: true }),
  ]);

  if (schoolsRes.error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(schoolsRes.error, "schools"),
      stats: null,
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    stats: {
      totalSchools: schoolsRes.count ?? 0,
      totalStudents: studentsRes.count ?? 0,
      totalTeachers: teachersRes.count ?? 0,
    },
  });
}
