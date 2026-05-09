import { NextRequest, NextResponse } from "next/server";

import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { applyEffectiveSalaryDeductions, loadSchoolDeductionIndex } from "@/lib/salaries/effective-deductions";
import { buildSafeOrFilter } from "@/lib/supabase-query-helpers";

type DatasetType = "students" | "payments" | "expenses" | "salaries" | "all";
type StudentDatasetStatus = "active" | "transferred" | "suspended" | "deleted";

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

function normalizeStudentDatasetStatus(value: string | null): StudentDatasetStatus {
  if (value === "transferred" || value === "suspended" || value === "deleted") {
    return value;
  }
  return "active";
}

function normalizeSearchValue(value: string | null, maxLength = 80) {
  return (value || "")
    .replace(/[\u0000-\u001F\u007F,()%]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const dataset = normalizeDatasetType(req.nextUrl.searchParams.get("type"));
  const studentStatus = normalizeStudentDatasetStatus(req.nextUrl.searchParams.get("status"));
  const search = normalizeSearchValue(req.nextUrl.searchParams.get("search"));
  const className = normalizeSearchValue(req.nextUrl.searchParams.get("className"), 60);
  const sectionName = normalizeSearchValue(req.nextUrl.searchParams.get("sectionName"), 20);

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

  const requestedBranchId = req.nextUrl.searchParams.get("branchId") ?? req.nextUrl.searchParams.get("branch_id");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const canViewReports = await routeUserHasPermission(actorSupabase, actorUserId, "view_reports");
  if (!canViewReports) {
    return jsonError("ليس لديك صلاحية فتح بيانات التقارير.", 403);
  }
  const rateLimited = await enforceRateLimit(req, {
    namespace: "reports-dataset",
    windowMs: 60_000,
    maxHits: 45,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const loadStudents = async () => {
    let query = actorSupabase
      .from("students")
      .select("id, full_name, class_name, section, phone, address, total_fee, paid_fee, remaining_fee, discount_value, status, created_at")
      .eq("school_id", targetSchoolId);

    query = applyBranchScopeToQuery(query, branchScope.value).order("created_at", { ascending: false });

    if (studentStatus === "active") {
      query = query.in("status", ["active", "graduated", "archived", "withdrawn"]);
    } else {
      query = query.eq("status", studentStatus);
    }

    if (search) {
      query = query.or(buildSafeOrFilter(["full_name", "class_name"], search));
    }

    if (className) {
      query = query.eq("class_name", className);
    }

    if (sectionName) {
      query = query.eq("section", sectionName);
    }

    const { data, error } = await query.limit(10_000);
    if (error) throw error;
    const students = data ?? [];

    // Resolve fees from class_fees table
    const classNames = Array.from(
      new Set(
        students
          .map((s) => String(s.class_name ?? ""))
          .filter((c) => c.length > 0)
      )
    );

    const classFeeMap = new Map<string, number>();
    if (classNames.length > 0) {
      const { data: classFees } = await actorSupabase
        .from("class_fees")
        .select("class_name, total_fee")
        .eq("school_id", targetSchoolId)
        .in("class_name", classNames);

      (classFees ?? []).forEach((cf: any) => {
        if (cf.class_name && typeof cf.total_fee === "number") {
          classFeeMap.set(String(cf.class_name), cf.total_fee);
        }
      });
    }

    // Apply fee resolution: prefer class_fees, fallback to student.total_fee if > 0, else 0
    return students.map((student) => {
      const className = String(student.class_name ?? "");
      const classFeeTotal = classFeeMap.get(className);
      const studentTotal = Number(student.total_fee ?? 0);
      const totalFee = classFeeTotal ?? (studentTotal > 0 ? studentTotal : 0);

      const paidFee = Number(student.paid_fee ?? 0);
      const discountValue = Number(student.discount_value ?? 0);
      const remainingFee = Math.max(totalFee - paidFee - discountValue, 0);

      return {
        ...student,
        total_fee: totalFee,
        remaining_fee: remainingFee,
      };
    });
  };

  const loadPayments = async () => {
    const { data, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("payments")
        .select("id, amount, created_at, payment_method, receipt_number, notes, students(full_name,class_name)")
        .eq("school_id", targetSchoolId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10_000),
      branchScope.value,
    );
    if (error) throw error;
    return (data ?? []).map((item) => ({
      ...item,
      students: normalizeRelation(item.students),
    }));
  };

  const loadExpenses = async () => {
    const { data, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("expenses")
        .select("id, amount, expense_date, recipient, receipt_number, notes, expense_types(name)")
        .eq("school_id", targetSchoolId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10_000),
      branchScope.value,
    );
    if (error) throw error;
    return (data ?? []).map((item) => ({
      ...item,
      expense_types: normalizeRelation(item.expense_types),
    }));
  };

  const loadSalaries = async () => {
    const { data, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("salaries")
        .select("id, gross_salary, deductions, month, paid_at, is_paid, teachers(full_name,subject)")
        .eq("school_id", targetSchoolId)
        .order("paid_at", { ascending: false })
        .limit(10_000),
      branchScope.value,
    );
    if (error) throw error;
    const normalized = (data ?? []).map((item) => ({
      ...item,
      teachers: normalizeRelation(item.teachers),
    }));
    const deductionIndex = await loadSchoolDeductionIndex(actorSupabase, targetSchoolId);
    return applyEffectiveSalaryDeductions(normalized, deductionIndex);
  };

  try {
    const noStoreHeaders = {
      "Cache-Control": "private, no-store, max-age=0",
    };

    if (dataset === "students") {
      return NextResponse.json({ ok: true, students: await loadStudents() }, { headers: noStoreHeaders });
    }
    if (dataset === "payments") {
      return NextResponse.json({ ok: true, payments: await loadPayments() }, { headers: noStoreHeaders });
    }
    if (dataset === "expenses") {
      return NextResponse.json({ ok: true, expenses: await loadExpenses() }, { headers: noStoreHeaders });
    }
    if (dataset === "salaries") {
      return NextResponse.json({ ok: true, salaries: await loadSalaries() }, { headers: noStoreHeaders });
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
    }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تجهيز بيانات التقرير المطلوبة.", 500);
  }
}
