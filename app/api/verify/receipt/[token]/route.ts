import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRateLimitClientIp } from "@/lib/rate-limit";

const tokenSchema = z.string().uuid();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) {
    return NextResponse.json({ error: "رمز التحقق غير صالح." }, { status: 400 });
  }

  const ip = getRateLimitClientIp(req);
  const rateLimited = await enforceRateLimit(req, {
    namespace: "verify-receipt",
    windowMs: 60_000,
    maxHits: 30,
    identifier: ip,
  });
  if (rateLimited) return rateLimited;

  try {
    const supabase = createServiceSupabaseClient();

    const { data: payment, error } = await supabase
      .from("payments")
      .select(`
        id,
        amount,
        created_at,
        receipt_number,
        verification_token,
        student_id,
        students (
          full_name,
          class_name,
          school_id,
          schools (
            name
          )
        )
      `)
      .eq("verification_token", parsed.data)
      .maybeSingle();

    if (error) throw error;

    if (!payment) {
      return NextResponse.json(
        { error: "الإيصال غير موجود أو غير صالح." },
        { status: 404 },
      );
    }

    const student = Array.isArray(payment.students)
      ? payment.students[0]
      : payment.students;
    const school = student && !Array.isArray(student.schools)
      ? student.schools
      : (Array.isArray(student?.schools) ? student.schools[0] : null);

    return NextResponse.json({
      student_name: student?.full_name ?? null,
      class_name: student?.class_name ?? null,
      amount: Number(payment.amount) || 0,
      payment_date: payment.created_at,
      receipt_number: payment.receipt_number ?? null,
      school_name: (school as { name?: string } | null)?.name ?? null,
    });
  } catch (err) {
    console.error("[verify-receipt] error:", err);
    return NextResponse.json(
      { error: "تعذر التحقق من الإيصال." },
      { status: 500 },
    );
  }
}
