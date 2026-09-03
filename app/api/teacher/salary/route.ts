import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, teacherId, schoolId } = ctx;

  const { data, error } = await supabase
    .from("salaries")
    .select(
      "id, month, gross_salary, deductions, net_salary, is_paid, paid_at, notes",
    )
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .order("month", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  /* Page expects { records: SalaryRecord[] } with:
     base_salary (not gross_salary), status (not is_paid), year (derived) */
  const records = (data ?? []).map((row: Record<string, unknown>) => {
    const monthStr = String(row.month ?? "");
    const yearPart = monthStr.includes("-")
      ? Number(monthStr.split("-")[0])
      : new Date(monthStr).getFullYear() || 0;

    return {
      id: row.id,
      month: monthStr,
      year: yearPart,
      base_salary: row.gross_salary ?? 0,
      deductions: row.deductions ?? 0,
      net_salary: row.net_salary ?? 0,
      status: row.is_paid ? "paid" : "pending",
    };
  });

  return NextResponse.json({
    ok: true,
    data: { records },
  });
}
