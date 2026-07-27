import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;
    const url = new URL(req.url);

    const search = url.searchParams.get("search") ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(
      200,
      Math.max(1, Number(url.searchParams.get("limit") ?? "50")),
    );

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Try student_payments table first
    try {
      let paymentsQuery = (
        serviceSupabase as unknown as {
          from: (table: string) => ReturnType<typeof serviceSupabase.from>;
        }
      )
        .from("student_payments")
        .select(
          "id, student_id, full_name, class_name, section, total_fee, paid_fee, remaining_fee",
          { count: "exact" },
        )
        .eq("school_id", schoolId);

      if (search.trim()) {
        paymentsQuery = paymentsQuery.ilike("full_name", `%${search.trim()}%`);
      }

      const { data, error, count } = await paymentsQuery
        .order("remaining_fee", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const items = ((data ?? []) as unknown as Record<string, unknown>[]).map(
        (p) => ({
          id: p.id as string,
          student_id: (p.student_id as string | null) ?? null,
          full_name: (p.full_name as string | null) ?? "",
          class_name: (p.class_name as string | null) ?? null,
          section: (p.section as string | null) ?? null,
          total_fee: Number(p.total_fee ?? 0),
          paid_fee: Number(p.paid_fee ?? 0),
          remaining_fee: Number(p.remaining_fee ?? 0),
        }),
      );

      return NextResponse.json({
        ok: true,
        items,
        total: count ?? 0,
        page,
        limit,
      });
    } catch {
      // student_payments table not available — fall back to students table
    }

    // Fallback: query students table directly
    let studentsQuery = serviceSupabase
      .from("students")
      .select(
        "id, full_name, class_name, section, total_fee, paid_fee, remaining_fee",
        { count: "exact" },
      )
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .order("remaining_fee", { ascending: false })
      .range(from, to);

    if (search.trim()) {
      studentsQuery = studentsQuery.ilike("full_name", `%${search.trim()}%`);
    }

    const { data, error, count } = await studentsQuery;

    if (error) throw error;

    const items = (data ?? []).map((s) => ({
      id: s.id as string,
      student_id: s.id as string,
      full_name: (s.full_name as string | null) ?? "",
      class_name: (s.class_name as string | null) ?? null,
      section: (s.section as string | null) ?? null,
      total_fee: Number((s as Record<string, unknown>).total_fee ?? 0),
      paid_fee: Number((s as Record<string, unknown>).paid_fee ?? 0),
      remaining_fee: Number((s as Record<string, unknown>).remaining_fee ?? 0),
    }));

    return NextResponse.json({
      ok: true,
      items,
      total: count ?? 0,
      page,
      limit,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

const PAYMENT_METHODS = new Set(["cash", "bank_transfer", "check"]);

/**
 * Record a student payment from the admin app.
 *
 * All money logic — receipt-number sequence, duplicate detection, paid-in-full
 * guard and the paid/remaining fee recompute — lives in `create_payment_atomic`,
 * the same RPC the web dashboard calls. None of it is reimplemented here.
 *
 * Auth uses `resolveAdminMobileRouteContext` because most mobile admins have no
 * `user_profiles` row, so the web route's `routeUserHasPermission` check would
 * reject them.
 */
export async function POST(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;

    const body = (await req.json().catch(() => null)) as {
      student_id?: unknown;
      amount?: unknown;
      payment_method?: unknown;
      notes?: unknown;
      manual_receipt_number?: unknown;
    } | null;

    const studentId =
      typeof body?.student_id === "string" ? body.student_id.trim() : "";
    const amount = Number(body?.amount);
    const paymentMethod =
      typeof body?.payment_method === "string" &&
      PAYMENT_METHODS.has(body.payment_method)
        ? body.payment_method
        : "cash";
    const notes =
      typeof body?.notes === "string" && body.notes.trim()
        ? body.notes.trim().slice(0, 1000)
        : null;
    const manualReceiptNumber =
      typeof body?.manual_receipt_number === "string" &&
      body.manual_receipt_number.trim()
        ? body.manual_receipt_number.trim().slice(0, 80)
        : null;

    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: "لم يتم تحديد الطالب." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "المبلغ غير صالح." },
        { status: 400 },
      );
    }

    // The service client bypasses RLS: confirm the student is in this school.
    const { data: student, error: studentError } = await serviceSupabase
      .from("students")
      .select("id, branch_id")
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .is("deleted_at", null)
      .maybeSingle();

    if (studentError || !student?.id) {
      return NextResponse.json(
        { ok: false, error: "الطالب غير موجود ضمن مدرستك." },
        { status: 404 },
      );
    }

    const { data: rows, error: rpcError } = await serviceSupabase.rpc(
      "create_payment_atomic",
      {
        p_school_id: schoolId,
        p_student_id: studentId,
        // The student's own branch is the correct scope for the payment; null
        // when the school has not been split into branches.
        p_branch_id: (student as { branch_id: string | null }).branch_id ?? null,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_notes: notes,
        p_created_at: new Date().toISOString(),
        // Let the DB sequence own the canonical receipt number; a client-supplied
        // one would race and hit the unique constraint.
        p_receipt_number: null,
        p_manual_receipt_number: manualReceiptNumber,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    );

    if (rpcError) {
      if ((rpcError as { code?: string }).code === "23505") {
        return NextResponse.json(
          { ok: false, error: "تم تسجيل هذه الدفعة مسبقاً." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { ok: false, error: "تعذر تسجيل الدفعة. حاول مرة أخرى." },
        { status: 500 },
      );
    }

    const row = (Array.isArray(rows) ? rows[0] : null) as {
      id?: string;
      receipt_number?: string | null;
      paid_fee_after?: number | null;
      remaining_fee_after?: number | null;
      error_code?: string | null;
    } | null;

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "تعذر تسجيل الدفعة. حاول مرة أخرى." },
        { status: 500 },
      );
    }

    if (row.error_code === "STUDENT_NOT_FOUND") {
      return NextResponse.json(
        { ok: false, error: "الطالب غير موجود ضمن مدرستك." },
        { status: 404 },
      );
    }

    if (row.error_code === "DUPLICATE_PAYMENT") {
      return NextResponse.json(
        { ok: false, error: "تم تسجيل هذه الدفعة مسبقاً." },
        { status: 409 },
      );
    }

    if (row.error_code === "PAID_IN_FULL") {
      return NextResponse.json(
        { ok: false, error: "الرسوم مسددة بالكامل." },
        { status: 409 },
      );
    }

    if (row.error_code) {
      return NextResponse.json(
        { ok: false, error: "تعذر تسجيل الدفعة. حاول مرة أخرى." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      id: row.id ?? null,
      receipt_number: row.receipt_number ?? null,
      paid_fee: Number(row.paid_fee_after ?? 0),
      remaining_fee: Number(row.remaining_fee_after ?? 0),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
