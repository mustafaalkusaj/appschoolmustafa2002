import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

type DatasetType = "students" | "payments" | "expenses" | "salaries" | "all";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeDatasetType(value: string | null): DatasetType | null {
  if (value === "students" || value === "payments" || value === "expenses" || value === "salaries" || value === "all") {
    return value;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const dataset = normalizeDatasetType(req.nextUrl.searchParams.get("type"));

  if (!dataset) {
    return jsonError("نوع التقرير المطلوب غير صالح.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "التقارير متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const loadStudents = async () => {
    const { data, error } = await actorSupabase
      .from("students")
      .select("id, full_name, class_name, total_fee, paid_fee, remaining_fee, status, phone, address")
      .eq("school_id", targetSchoolId)
      .neq("status", "deleted")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  };

  const loadPayments = async () => {
    const { data, error } = await actorSupabase
      .from("payments")
      .select("id, amount, created_at, payment_method, receipt_number, notes, students(full_name,class_name)")
      .eq("school_id", targetSchoolId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((item) => ({
      ...item,
      students: normalizeRelation(item.students),
    }));
  };

  const loadExpenses = async () => {
    const { data, error } = await actorSupabase
      .from("expenses")
      .select("id, amount, expense_date, recipient, receipt_number, notes, expense_types(name)")
      .eq("school_id", targetSchoolId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((item) => ({
      ...item,
      expense_types: normalizeRelation(item.expense_types),
    }));
  };

  const loadSalaries = async () => {
    const { data, error } = await actorSupabase
      .from("salaries")
      .select("id, gross_salary, deductions, month, paid_at, is_paid, teachers(full_name,subject)")
      .eq("school_id", targetSchoolId)
      .order("paid_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((item) => ({
      ...item,
      teachers: normalizeRelation(item.teachers),
    }));
  };

  try {
    if (dataset === "students") {
      return NextResponse.json({ ok: true, students: await loadStudents() });
    }
    if (dataset === "payments") {
      return NextResponse.json({ ok: true, payments: await loadPayments() });
    }
    if (dataset === "expenses") {
      return NextResponse.json({ ok: true, expenses: await loadExpenses() });
    }
    if (dataset === "salaries") {
      return NextResponse.json({ ok: true, salaries: await loadSalaries() });
    }

    const [students, payments, expenses, salaries] = await Promise.all([
      loadStudents(),
      loadPayments(),
      loadExpenses(),
      loadSalaries(),
    ]);

    return NextResponse.json({
      ok: true,
      students,
      payments,
      expenses,
      salaries,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تجهيز بيانات التقرير المطلوبة.", 500);
  }
}
