"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/lib/supabase";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { BranchOverviewChart } from "./_components/BranchOverviewChart";

function fmtCurrency(value: number) {
  return `${value.toLocaleString("en-US")} IQD`;
}

function fmtNum(value: number) {
  return value.toLocaleString("en-US");
}

type BranchStats = {
  branchName: string;
  branchLogoUrl: string | null;
  schoolName: string;
  studentsCount: number;
  totalFeesAfterDiscount: number;
  totalPaid: number;
  totalRemaining: number;
  totalExpenses: number;
  totalDiscount: number;
  paidPercentage: number;
};

function MetricTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-center"
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      <div className="text-xs font-black leading-6 text-[var(--text-secondary)]">{label}</div>
      <div className="mt-2 text-xl font-black text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

export default function BranchOverviewPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { profile } = useRole();

  const [stats, setStats] = useState<BranchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    const branchId = profile.branch_id;
    const schoolId = profile.school_id;

    if (!branchId || !schoolId) {
      setError("لا يوجد فرع مرتبط بحسابك. تواصل مع مدير المدرسة.");
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [branchRes, studentsRes, expensesRes] = await Promise.all([
          supabase
            .from("branches")
            .select("id, name, logo_url, schools(name)")
            .eq("id", branchId!)
            .maybeSingle(),
          supabase
            .from("students")
            .select("total_fee, paid_fee, remaining_fee, discount_value, status")
            .eq("branch_id", branchId!)
            .eq("school_id", schoolId!)
            .neq("status", "deleted"),
          supabase
            .from("expenses")
            .select("amount")
            .eq("branch_id", branchId!)
            .eq("school_id", schoolId!),
        ]);

        if (branchRes.error) throw branchRes.error;
        if (studentsRes.error) throw studentsRes.error;
        if (expensesRes.error) throw expensesRes.error;

        const branch = branchRes.data;
        const students = studentsRes.data ?? [];
        const expenses = expensesRes.data ?? [];

        const toNum = (v: unknown) => {
          const n = Number(v ?? 0);
          return Number.isFinite(n) ? n : 0;
        };

        let totalFeesBefore = 0;
        let totalDiscount = 0;
        let totalPaid = 0;
        let totalRemaining = 0;

        for (const s of students) {
          totalFeesBefore += toNum(s.total_fee);
          totalDiscount += toNum(s.discount_value);
          totalPaid += toNum(s.paid_fee);
          totalRemaining += toNum(s.remaining_fee);
        }

        const totalFeesAfterDiscount = Math.max(totalFeesBefore - totalDiscount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + toNum(e.amount), 0);
        const paidPercentage =
          totalFeesAfterDiscount > 0
            ? Math.round((totalPaid / totalFeesAfterDiscount) * 100)
            : 0;

        const schoolName =
          (branch?.schools as { name?: string | null } | null | undefined)?.name ?? "المدرسة";

        setStats({
          branchName: branch?.name ?? "الفرع",
          branchLogoUrl: (branch as { logo_url?: string | null } | null)?.logo_url ?? null,
          schoolName,
          studentsCount: students.length,
          totalFeesAfterDiscount,
          totalPaid,
          totalRemaining,
          totalExpenses,
          totalDiscount,
          paidPercentage,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "تعذر تحميل بيانات الفرع.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [profile]);

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <AppSidebar currentPath={pathname} />
      <div className="flex flex-1 flex-col">
        <AppShellTopbar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="sk h-20 w-full rounded-[24px]" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-6 py-8 text-center text-rose-700 font-bold">
              {error}
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
                {stats.branchLogoUrl ? (
                  <Image
                    src={stats.branchLogoUrl}
                    alt="شعار الفرع"
                    width={56}
                    height={56}
                    className="rounded-[16px] object-contain border border-[var(--border)] bg-white p-1"
                  />
                ) : (
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-[16px] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white text-2xl shadow-sm">
                    🏫
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-black text-[var(--text-primary)]">{stats.branchName}</h1>
                  <p className="mt-0.5 text-sm font-bold text-[var(--text-secondary)]">{stats.schoolName}</p>
                </div>
                <div className="me-auto" />
                <div className="hidden md:block text-left">
                  <div className="text-[10px] font-bold text-[var(--text-tertiary)]">آخر تحديث</div>
                  <div className="text-xs font-black text-[var(--text-secondary)]">
                    {new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ" : "en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date())}
                  </div>
                </div>
              </div>

              {/* Metric tiles */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricTile label="عدد الطلاب" value={fmtNum(stats.studentsCount)} accent="#3b82f6" />
                <MetricTile label="إجمالي الرسوم" value={fmtCurrency(stats.totalFeesAfterDiscount)} accent="#8b5cf6" />
                <MetricTile label="المبلغ المدفوع" value={fmtCurrency(stats.totalPaid)} accent="#10b981" />
                <MetricTile label="المبلغ المتبقي" value={fmtCurrency(stats.totalRemaining)} accent="#f59e0b" />
              </div>

              {/* Secondary tiles */}
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricTile label="إجمالي التخفيضات" value={fmtCurrency(stats.totalDiscount)} accent="#06b6d4" />
                <MetricTile label="إجمالي المصروفات" value={fmtCurrency(stats.totalExpenses)} accent="#ef4444" />
              </div>

              {/* Chart */}
              <BranchOverviewChart
                totalFeesAfterDiscount={stats.totalFeesAfterDiscount}
                totalPaid={stats.totalPaid}
                totalRemaining={stats.totalRemaining}
                totalExpenses={stats.totalExpenses}
                paidPercentage={stats.paidPercentage}
              />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
