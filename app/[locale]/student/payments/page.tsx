"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface PaymentRecord {
  id: string;
  amount: number;
  paid_date: string | null;
  status: "paid" | "pending" | "overdue";
  description: string | null;
}

interface PaymentSummary {
  total: number;
  paid: number;
  remaining: number;
}

const STATUS_CONFIG: Record<string, { ar: string; en: string; color: string }> = {
  paid: { ar: "مدفوع", en: "Paid", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  pending: { ar: "معلّق", en: "Pending", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  overdue: { ar: "متأخر", en: "Overdue", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

export default function StudentPaymentsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/student/payments")
      .then((res) => {
        if (res.response.ok) {
          const d = (res.payload as any)?.data;
          setPayments(d?.payments ?? []);
          setSummary(d?.summary ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `${n.toLocaleString()} IQD`;

  return (
    <StudentShell
      currentPath="/student/payments"
      titleAr="الأقساط"
      titleEn="Payments"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground">{isAr ? "الإجمالي" : "Total"}</p>
                  <p className="text-lg font-bold mt-1">{fmt(summary.total)}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground">{isAr ? "المدفوع" : "Paid"}</p>
                  <p className="text-lg font-bold mt-1 text-emerald-600">{fmt(summary.paid)}</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-xs text-muted-foreground">{isAr ? "المتبقي" : "Remaining"}</p>
                  <p className={`text-lg font-bold mt-1 ${summary.remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {fmt(summary.remaining)}
                  </p>
                </div>
              </div>
            )}

            {payments.length === 0 ? (
              <div className="rounded-xl border p-8 text-center text-muted-foreground">
                <p className="text-4xl mb-2">💳</p>
                <p>{isAr ? "لا توجد دفعات" : "No payments recorded"}</p>
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-start font-medium">{isAr ? "الوصف" : "Description"}</th>
                        <th className="px-4 py-3 text-start font-medium">{isAr ? "المبلغ" : "Amount"}</th>
                        <th className="px-4 py-3 text-start font-medium">{isAr ? "التاريخ" : "Date"}</th>
                        <th className="px-4 py-3 text-start font-medium">{isAr ? "الحالة" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payments.map((p) => {
                        const st = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;
                        return (
                          <tr key={p.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3">{p.description ?? "—"}</td>
                            <td className="px-4 py-3 font-medium">{fmt(p.amount)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{p.paid_date ?? "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                                {isAr ? st.ar : st.en}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StudentShell>
  );
}
