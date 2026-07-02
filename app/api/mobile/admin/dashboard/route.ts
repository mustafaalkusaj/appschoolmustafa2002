import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  resolveMobileRouteContextAny,
} from "@/lib/mobile-api-admin";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req, "admin");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId } = context.value;

  const [students, teachers, classes, payments] = await Promise.all([
    serviceSupabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    serviceSupabase
      .from("teachers")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    serviceSupabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId),
    serviceSupabase
      .from("payments")
      .select("amount")
      .eq("school_id", schoolId)
      .eq("status", "paid"),
  ]);

  const totalRevenue = (payments.data ?? []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0,
  );

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    studentsCount: students.count ?? 0,
    teachersCount: teachers.count ?? 0,
    classesCount: classes.count ?? 0,
    totalRevenue,
  });
}
