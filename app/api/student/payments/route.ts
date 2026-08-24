import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, studentId, schoolId } = ctx;

  const [studentRes, paymentsRes] = await Promise.all([
    supabase
      .from("students")
      .select("total_fee, paid_fee, discount_value")
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .maybeSingle(),

    supabase
      .from("payments")
      .select("id, amount, notes, created_at")
      .eq("student_id", studentId)
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (paymentsRes.error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const student = studentRes.data as Record<string, unknown> | null;
  const totalFee = Number(student?.total_fee) || 0;
  const discount = Number(student?.discount_value) || 0;

  const rows = (paymentsRes.data ?? []) as Array<Record<string, unknown>>;
  const totalPaid = rows.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0,
  );
  const remaining = Math.max(0, totalFee - discount - totalPaid);

  return NextResponse.json({
    ok: true,
    data: {
      summary: {
        total: totalFee - discount,
        paid: totalPaid,
        remaining,
      },
      payments: rows.map((p) => ({
        id: p.id as string,
        amount: Number(p.amount) || 0,
        paid_date: ((p.created_at as string) ?? "").slice(0, 10) || null,
        status: "paid" as const,
        description: (p.notes as string) ?? null,
      })),
    },
  });
}
