import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, studentId, schoolId, className } = ctx;

  const [studentRes, attendanceRes, examsRes, behaviorRes, paymentsRes] =
    await Promise.all([
      supabase
        .from("students")
        .select("full_name, total_fee, paid_fee, discount_value")
        .eq("id", studentId)
        .eq("school_id", schoolId)
        .maybeSingle(),

      supabase
        .from("attendance_records")
        .select("status")
        .eq("student_id", studentId)
        .eq("school_id", schoolId),

      supabase
        .from("exams")
        .select("id")
        .eq("school_id", schoolId)
        .eq("class_name", className ?? "")
        .gte("starts_at", new Date().toISOString()),

      supabase
        .from("behavior_logs")
        .select("points")
        .eq("student_id", studentId)
        .eq("school_id", schoolId),

      supabase
        .from("payments")
        .select("amount")
        .eq("student_id", studentId)
        .eq("school_id", schoolId)
        .is("deleted_at", null),
    ]);

  const student = studentRes.data as Record<string, unknown> | null;
  const attendanceRows = (attendanceRes.data ?? []) as Array<{
    status: string;
  }>;
  const totalDays = attendanceRows.length;
  const presentDays = attendanceRows.filter(
    (r) => r.status === "present" || r.status === "late",
  ).length;
  const attendanceRate =
    totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

  const behaviorRows = (behaviorRes.data ?? []) as Array<{ points: number }>;
  const behaviorPoints = behaviorRows.reduce(
    (sum, r) => sum + (r.points ?? 0),
    0,
  );

  const totalFee = Number(student?.total_fee) || 0;
  const discount = Number(student?.discount_value) || 0;
  const paidPayments = (paymentsRes.data ?? []) as Array<{ amount: number }>;
  const totalPaid = paidPayments.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0,
  );
  const remaining = Math.max(0, totalFee - discount - totalPaid);

  return NextResponse.json({
    ok: true,
    data: {
      student_name: (student?.full_name as string) ?? null,
      class_name: className,
      attendance_rate: attendanceRate,
      upcoming_exams: (examsRes.data ?? []).length,
      behavior_points: behaviorPoints,
      remaining_balance: remaining,
    },
  });
}
