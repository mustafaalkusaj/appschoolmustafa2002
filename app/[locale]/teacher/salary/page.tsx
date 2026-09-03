"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Banknote,
  TrendingDown,
  Wallet,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { TeacherShell } from "@/components/TeacherShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface SalaryRecord {
  id: string;
  month: string;
  year: number;
  base_salary: number;
  deductions: number;
  net_salary: number;
  status: "paid" | "pending" | "processing";
}

const STATUS_MAP: Record<
  SalaryRecord["status"],
  { ar: string; en: string; variant: "success" | "warning" | "info" }
> = {
  paid: { ar: "مدفوع", en: "Paid", variant: "success" },
  pending: { ar: "قيد الانتظار", en: "Pending", variant: "warning" },
  processing: { ar: "قيد المعالجة", en: "Processing", variant: "info" },
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US");
}

export default function TeacherSalaryPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJsonWithAuthorizedSession("/api/teacher/salary")
      .then((res) => {
        if (res.response.ok) {
          setRecords((res.payload as any)?.data?.records ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <TeacherShell
      currentPath="/teacher/salary"
      titleAr="الراتب"
      titleEn="Salary"
    >
      <div className="space-y-4 max-w-3xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[120px] rounded-[var(--card-radius)] bg-[var(--card-bg)] border border-[var(--card-border)] animate-pulse"
              />
            ))}
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={<Banknote className="h-12 w-12 text-[var(--text-tertiary)]" />}
            title={t("لا توجد سجلات رواتب", "No salary records")}
          />
        ) : (
          <div className="space-y-3">
            {records.map((rec) => {
              const st = STATUS_MAP[rec.status] ?? STATUS_MAP.pending;
              return (
                <Card key={rec.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm sm:text-base">
                        {rec.month} {rec.year}
                      </CardTitle>
                      <Badge variant={st.variant} size="sm">
                        {isAr ? st.ar : st.en}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      {/* Base salary */}
                      <div className="flex flex-col items-center gap-1 rounded-lg bg-[var(--surface-soft)] p-2.5">
                        <Banknote className="h-4 w-4 text-[var(--primary)]" />
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {t("الأساسي", "Base")}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]" dir="ltr">
                          {formatCurrency(rec.base_salary)}
                        </span>
                      </div>
                      {/* Deductions */}
                      <div className="flex flex-col items-center gap-1 rounded-lg bg-[var(--danger)]/[0.06] p-2.5">
                        <TrendingDown className="h-4 w-4 text-[var(--danger)]" />
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {t("الخصومات", "Deductions")}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-[var(--danger)]" dir="ltr">
                          -{formatCurrency(rec.deductions)}
                        </span>
                      </div>
                      {/* Net */}
                      <div className="flex flex-col items-center gap-1 rounded-lg bg-[var(--success)]/[0.06] p-2.5">
                        <Wallet className="h-4 w-4 text-[var(--success)]" />
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {t("الصافي", "Net")}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-[var(--success)]" dir="ltr">
                          {formatCurrency(rec.net_salary)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TeacherShell>
  );
}
