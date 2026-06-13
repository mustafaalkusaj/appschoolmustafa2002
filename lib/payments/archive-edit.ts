import { calculateStudentRemainingFee } from "@/lib/students/financials";

// Pure helpers for editing a yearly account archive snapshot. Kept free of any
// I/O so the sanitization + recompute rules can be unit-tested directly.

// Maximum rows allowed inside an edited snapshot — guards against abusive payloads.
export const MAX_ARCHIVE_ROWS = 20_000;
export const ALLOWED_PAYMENT_METHODS = new Set(["cash", "bank_transfer", "check"]);

export interface ArchiveSnapshotStudent {
  id: string;
  full_name: string;
  class_name: string;
  total_fee: number;
  paid_fee: number;
  discount_value: number;
  remaining_fee: number;
  status: string;
  phone: string;
}

export interface ArchiveSnapshotPayment {
  id: string;
  student_id: string;
  amount: number;
  payment_method: string;
  notes: string;
  created_at: string;
  receipt_number: string;
  manual_receipt_number: string;
}

export interface EditedArchiveSnapshot {
  snapshot: {
    year: number;
    payments: ArchiveSnapshotPayment[];
    students: ArchiveSnapshotStudent[];
    summary: {
      total_students: number;
      total_payments: number;
      total_amount: number;
      student_promotion: unknown;
    };
  };
  totals: {
    total_students: number;
    total_payments: number;
    total_amount: number;
  };
}

export function asText(value: unknown, max = 500): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export function asNonNegativeInt(value: unknown): number {
  const n = Math.trunc(Number(value ?? 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function asInt(value: unknown): number {
  const n = Math.trunc(Number(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

export function sanitizeArchiveStudents(rows: unknown[]): ArchiveSnapshotStudent[] {
  return rows.map((row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const total_fee = asNonNegativeInt(r.total_fee);
    const paid_fee = asNonNegativeInt(r.paid_fee);
    const discount_value = asNonNegativeInt(r.discount_value);
    return {
      id: asText(r.id, 100),
      full_name: asText(r.full_name, 200),
      class_name: asText(r.class_name, 100),
      total_fee,
      paid_fee,
      discount_value,
      // Match the live `remaining_fee` generated column: total - paid - discount, floored at 0.
      remaining_fee: calculateStudentRemainingFee({ total_fee, paid_fee, discount_value }),
      status: asText(r.status, 50),
      phone: asText(r.phone, 50),
    };
  });
}

export function sanitizeArchivePayments(rows: unknown[], fallbackDate: string): ArchiveSnapshotPayment[] {
  return rows.map((row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const method = asText(r.payment_method, 50);
    return {
      id: asText(r.id, 100),
      student_id: asText(r.student_id, 100),
      amount: asInt(r.amount),
      payment_method: ALLOWED_PAYMENT_METHODS.has(method) ? method : "cash",
      notes: asText(r.notes, 1000),
      created_at: asText(r.created_at, 40) || fallbackDate,
      receipt_number: asText(r.receipt_number, 100),
      manual_receipt_number: asText(r.manual_receipt_number, 100),
    };
  });
}

export interface BuildEditedArchiveParams {
  archiveYear: number;
  existingSummary: Record<string, unknown> | null;
  students: unknown[];
  payments: unknown[];
  now: string;
}

export function buildEditedArchiveSnapshot(params: BuildEditedArchiveParams): EditedArchiveSnapshot {
  const students = sanitizeArchiveStudents(params.students);
  const payments = sanitizeArchivePayments(params.payments, params.now);
  const total_amount = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const total_students = students.length;
  const total_payments = payments.length;

  return {
    snapshot: {
      year: params.archiveYear,
      payments,
      students,
      summary: {
        total_students,
        total_payments,
        total_amount,
        student_promotion: params.existingSummary?.student_promotion ?? null,
      },
    },
    totals: { total_students, total_payments, total_amount },
  };
}
