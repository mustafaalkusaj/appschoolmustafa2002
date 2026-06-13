"use client";

import { useEffect, useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface StudentSummary {
  id: string;
  full_name: string;
  class_name: string | null;
  section: string | null;
  status: string | null;
  total_fee: number | null;
  paid_fee: number | null;
  remaining_fee: number | null;
}

interface GradeEntry {
  id: string;
  student_id: string;
  subject: string | null;
  score: number | null;
  max_score: number | null;
  created_at: string | null;
}

interface AttendanceStat {
  student_id: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

interface PaymentEntry {
  id: string;
  student_id: string;
  amount: number | null;
  payment_method: string | null;
  created_at: string | null;
  receipt_number: string | null;
}

interface BehaviorEntry {
  id: string;
  student_id: string;
  type: string | null;
  category: string | null;
  description: string | null;
  points: number | null;
  created_at: string | null;
}

interface DashboardData {
  ok: boolean;
  students: StudentSummary[];
  grades: GradeEntry[];
  attendance_stats: AttendanceStat[];
  payments: PaymentEntry[];
  behavior: BehaviorEntry[];
  message?: string;
}

function ParentDashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<DashboardData>(
        "/api/web/parent/dashboard"
      );
      if (payload?.ok) {
        setData(payload);
      } else {
        setError(payload?.message ?? "تعذر جلب البيانات");
      }
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-[var(--danger)] text-lg">{error}</p>
        <button
          onClick={() => void fetchData()}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!data || data.students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-5xl">👨‍👧</div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">لا يوجد طلاب مرتبطين</h2>
        <p className="text-[var(--text-muted)]">تواصل مع إدارة المدرسة لربط حسابك بطالب.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">لوحة ولي الأمر</h1>

      {data.students.map((student) => {
        const studentGrades = data.grades.filter((g) => g.student_id === student.id);
        const studentAttendance = data.attendance_stats.find((a) => a.student_id === student.id);
        const studentPayments = data.payments.filter((p) => p.student_id === student.id);
        const studentBehavior = data.behavior.filter((b) => b.student_id === student.id);

        return (
          <div key={student.id} className="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-sm overflow-hidden">
            {/* Student header */}
            <div className="bg-gradient-to-l from-[var(--primary)] to-[var(--primary-hover)] p-5 text-white">
              <h2 className="text-lg font-bold">{student.full_name}</h2>
              <p className="text-sm opacity-80">
                {student.class_name ?? "—"}
                {student.section ? ` / ${student.section}` : ""}
              </p>
            </div>

            {/* Summary cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
              {/* Attendance */}
              <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-soft)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📋</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">الحضور (30 يوم)</span>
                </div>
                {studentAttendance ? (
                  <div className="space-y-1">
                    <div className="text-2xl font-black text-[var(--primary)]">
                      {studentAttendance.percentage}%
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      حاضر: {studentAttendance.present} | غائب: {studentAttendance.absent} | متأخر: {studentAttendance.late}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">لا توجد بيانات</p>
                )}
              </div>

              {/* Grades */}
              <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-soft)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🎓</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">آخر الدرجات</span>
                </div>
                {studentGrades.length > 0 ? (
                  <div className="space-y-1">
                    {studentGrades.slice(0, 3).map((g) => (
                      <div key={g.id} className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">{g.subject ?? "—"}</span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {g.score ?? 0}/{g.max_score ?? 100}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">لا توجد درجات</p>
                )}
              </div>

              {/* Payments */}
              <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-soft)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💳</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">المدفوعات</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">المبلغ الكلي</span>
                    <span className="font-bold">{(student.total_fee ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">المدفوع</span>
                    <span className="font-bold text-green-600">{(student.paid_fee ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-muted)]">المتبقي</span>
                    <span className="font-bold text-[var(--danger)]">{(student.remaining_fee ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Behavior */}
              <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-soft)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📋</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">سجل السلوك</span>
                </div>
                {studentBehavior.length > 0 ? (
                  <div className="space-y-1">
                    {studentBehavior.slice(0, 3).map((b) => (
                      <div key={b.id} className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">{b.category ?? b.type ?? "—"}</span>
                        <span className={`font-bold ${(b.points ?? 0) >= 0 ? "text-green-600" : "text-[var(--danger)]"}`}>
                          {(b.points ?? 0) > 0 ? "+" : ""}{b.points ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">لا توجد سجلات</p>
                )}
              </div>
            </div>

            {/* Recent payments table */}
            {studentPayments.length > 0 && (
              <div className="border-t border-[var(--border)] p-5">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">آخر المدفوعات</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[var(--text-muted)] text-xs">
                        <th className="text-start pb-2">التاريخ</th>
                        <th className="text-start pb-2">المبلغ</th>
                        <th className="text-start pb-2">الطريقة</th>
                        <th className="text-start pb-2">رقم الوصل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPayments.map((p) => (
                        <tr key={p.id} className="border-t border-[var(--border)]">
                          <td className="py-2">
                            {p.created_at
                              ? new Date(p.created_at).toLocaleDateString("ar-IQ-u-nu-latn")
                              : "—"}
                          </td>
                          <td className="py-2 font-bold">{(p.amount ?? 0).toLocaleString()}</td>
                          <td className="py-2">{p.payment_method ?? "—"}</td>
                          <td className="py-2">{p.receipt_number ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ParentDashboardPage() {
  return (
    <ProtectedRoute roles={["parent"]}>
      <ParentDashboardContent />
    </ProtectedRoute>
  );
}
