import { createRouteSupabaseClient } from "@/lib/supabase-server";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;
type SupabaseFromClient = Pick<RouteSupabaseClient, "from">;

export type SalaryDeductionRow = {
  teacher_id?: unknown;
  amount?: unknown;
  deduction_date?: unknown;
};

export type SalaryLike = {
  teacher_id?: unknown;
  month?: unknown;
  deductions?: unknown;
  gross_salary?: unknown;
};

function normalizeMoney(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeMonthKey(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const matched = trimmed.match(/^(\d{4}-\d{2})/);
  return matched ? matched[1] : null;
}

function buildTeacherMonthKey(teacherId: unknown, month: unknown) {
  const normalizedTeacherId = typeof teacherId === "string" ? teacherId : "";
  const normalizedMonth = normalizeMonthKey(month);
  if (!normalizedTeacherId || !normalizedMonth) return null;
  return `${normalizedTeacherId}:${normalizedMonth}`;
}

export function buildAdditionalDeductionsIndex(rows: SalaryDeductionRow[]) {
  const index = new Map<string, number>();

  for (const row of rows) {
    const key = buildTeacherMonthKey(row.teacher_id, row.deduction_date);
    if (!key) continue;
    index.set(key, (index.get(key) ?? 0) + normalizeMoney(row.amount));
  }

  return index;
}

export function getEffectiveSalaryDeductions(
  salary: Pick<SalaryLike, "teacher_id" | "month" | "deductions">,
  index: Map<string, number>,
) {
  const key = buildTeacherMonthKey(salary.teacher_id, salary.month);
  return normalizeMoney(salary.deductions) + (key ? index.get(key) ?? 0 : 0);
}

export function applyEffectiveSalaryDeductions<T extends SalaryLike>(
  salaries: T[],
  index: Map<string, number>,
): Array<T & { deductions: number }> {
  return salaries.map((salary) => ({
    ...salary,
    deductions: getEffectiveSalaryDeductions(salary, index),
  }));
}

export function calculateNetSalary(grossSalary: unknown, deductions: unknown) {
  return Math.max(0, normalizeMoney(grossSalary) - normalizeMoney(deductions));
}

export async function loadSchoolDeductionIndex(actorSupabase: SupabaseFromClient, schoolId: string) {
  const { data, error } = await actorSupabase
    .from("deductions")
    .select("teacher_id, amount, deduction_date")
    .eq("school_id", schoolId);

  if (error) {
    throw error;
  }

  return buildAdditionalDeductionsIndex((data ?? []) as SalaryDeductionRow[]);
}
