import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { BranchSummaryCard } from "@/components/group/BranchSummaryCard";
import { GroupTotalsBar } from "@/components/group/GroupTotalsBar";
import { BranchBarChart } from "@/components/group/BranchBarChart";
import { ExportDropdown } from "@/components/group/ExportDropdown";
import { BranchRankingTable } from "@/components/group/BranchRankingTable";
import { StudentDistributionChart } from "@/components/group/charts/StudentDistributionChart";
import { MonthlyTrendChart } from "@/components/group/charts/MonthlyTrendChart";
import { AlertsPanel } from "@/components/group/AlertsPanel";
import { OutstandingWidget } from "@/components/group/OutstandingWidget";

// --- Types ---
interface BranchStat {
  id: string;
  name: string;
  students: number;
  collected: number;
  expenses: number;
  net: number;
  expected: number;
  collectionRate: number;
  prevCollected: number;
}

interface Alert {
  id: string;
  branch_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface OutstandingStudent {
  id: string;
  full_name: string | null;
  branch_id: string | null;
  remaining_fee: number;
}

// --- Data fetching ---
async function getGroupDashboardData(userId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("scope, group_id, role")
    .eq("id", userId)
    .single();

  if (!profile) return null;
  if (profile.role === "super_admin") return { redirect: true };
  if (profile.scope !== "group" || !profile.group_id) return { redirect: true };

  const { data: group } = await supabase
    .from("school_groups")
    .select("id, name, logo_url")
    .eq("id", profile.group_id)
    .single();

  if (!group) return null;

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("group_id", group.id)
    .eq("is_active", true)
    .order("name");

  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  // Fetch last 6 months for trend
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);

  const branchStats: BranchStat[] = await Promise.all(
    (branches ?? []).map(async (branch) => {
      const [studentsRes, paymentsRes, expensesRes, prevPaymentsRes, feesRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("branch_id", branch.id).neq("status", "deleted"),
        supabase.from("payments").select("amount").eq("branch_id", branch.id),
        supabase.from("expenses").select("amount").eq("branch_id", branch.id),
        supabase.from("payments").select("amount").eq("branch_id", branch.id).like("created_at", `${prevMonth}%`),
        supabase.from("students").select("total_fee").eq("branch_id", branch.id).neq("status", "deleted"),
      ]);
      const collected = (paymentsRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const expenses = (expensesRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const prevCollected = (prevPaymentsRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const expected = (feesRes.data ?? []).reduce((s, r) => s + Number(r.total_fee ?? 0), 0);
      const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
      return {
        id: branch.id,
        name: branch.name,
        students: studentsRes.count ?? 0,
        collected,
        expenses,
        net: collected - expenses,
        expected,
        collectionRate,
        prevCollected,
      };
    })
  );

  // Monthly trend (last 6 months)
  const { data: trendData } = await supabase
    .from("payments")
    .select("amount, created_at")
    .in("branch_id", (branches ?? []).map((b) => b.id))
    .gte("created_at", sixMonthsAgo);

  const monthlyMap: Record<string, number> = {};
  (trendData ?? []).forEach((p) => {
    const month = String(p.created_at).slice(0, 7);
    monthlyMap[month] = (monthlyMap[month] ?? 0) + Number(p.amount ?? 0);
  });
  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("ar-IQ", { month: "short", year: "numeric" });
    return { month: label, collected: monthlyMap[key] ?? 0 };
  });

  // Alerts
  const { data: alerts } = await supabase
    .from("group_alerts")
    .select("id, branch_id, type, message, is_read, created_at")
    .eq("group_id", group.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(10);

  // Outstanding students (top 10 across all branches)
  const { data: outstanding } = await supabase
    .from("students")
    .select("id, full_name, branch_id, remaining_fee")
    .in("branch_id", (branches ?? []).map((b) => b.id))
    .gt("remaining_fee", 0)
    .order("remaining_fee", { ascending: false })
    .limit(10);

  const totals = branchStats.reduce(
    (acc, b) => ({
      students: acc.students + b.students,
      collected: acc.collected + b.collected,
      expenses: acc.expenses + b.expenses,
      net: acc.net + b.net,
    }),
    { students: 0, collected: 0, expenses: 0, net: 0 }
  );

  const totalExpected = branchStats.reduce((s, b) => s + b.expected, 0);
  const globalCollectionRate = totalExpected > 0 ? Math.round((totals.collected / totalExpected) * 100) : 0;

  return {
    group,
    branches: branchStats,
    totals,
    globalCollectionRate,
    trend,
    alerts: (alerts ?? []) as Alert[],
    outstanding: (outstanding ?? []) as OutstandingStudent[],
    branchMap: Object.fromEntries((branches ?? []).map((b) => [b.id, b.name])),
  };
}

function fmtIQD(n: number) {
  return n.toLocaleString("ar-IQ") + " د.ع";
}

export default async function GroupDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/ar/login");

  const data = await getGroupDashboardData(user.id);
  if (!data || "redirect" in data) redirect("/ar/dashboard");

  const { group, branches, totals, globalCollectionRate, trend, alerts, outstanding, branchMap } = data;

  return (
    <div dir="rtl" className="min-h-screen bg-[var(--background)] print:bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">لوحة مجموعة {group.name}</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">{branches.length} فرع · {new Date().toLocaleDateString("ar-IQ")}</p>
          </div>
          <ExportDropdown groupId={group.id} />
        </div>

        {/* [1] KPI Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "إجمالي الإيرادات", value: fmtIQD(totals.collected), color: "text-emerald-600" },
            { label: "إجمالي المصاريف", value: fmtIQD(totals.expenses), color: "text-rose-500" },
            { label: "الصافي الكلي", value: fmtIQD(totals.net), color: totals.net >= 0 ? "text-violet-700" : "text-rose-600" },
            { label: "نسبة التحصيل", value: `${globalCollectionRate}%`, color: globalCollectionRate >= 90 ? "text-emerald-600" : globalCollectionRate >= 70 ? "text-amber-500" : "text-rose-500" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
              <p className="text-xs text-[var(--text-muted)] mb-2">{kpi.label}</p>
              <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* [3] Branch Cards */}
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">ملخص الفروع</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <BranchSummaryCard key={branch.id} {...branch} />
            ))}
          </div>
        </div>

        {/* [4] Ranking Table */}
        <BranchRankingTable branches={branches} />

        {/* [5] Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
          <BranchBarChart branches={branches} />
          <StudentDistributionChart branches={branches} />
        </div>
        <MonthlyTrendChart trend={trend} />

        {/* [6] Alerts */}
        {alerts.length > 0 && (
          <AlertsPanel alerts={alerts} branchMap={branchMap} groupId={group.id} />
        )}

        {/* [7] Outstanding */}
        <OutstandingWidget outstanding={outstanding} branches={branches} branchMap={branchMap} />

        {/* [8] Grand Totals */}
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] mb-4">المجاميع الكلية</h2>
          <GroupTotalsBar totals={totals} />
        </div>

        {/* Print table */}
        <div className="hidden print:block mt-8">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: "#7C3AED", color: "white" }}>
                <th className="border p-2">الفرع</th><th className="border p-2">الطلاب</th>
                <th className="border p-2">الإيرادات</th><th className="border p-2">المصاريف</th>
                <th className="border p-2">الصافي</th><th className="border p-2">نسبة التحصيل</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td className="border p-2">{b.name}</td>
                  <td className="border p-2 text-center">{b.students}</td>
                  <td className="border p-2 text-center">{fmtIQD(b.collected)}</td>
                  <td className="border p-2 text-center">{fmtIQD(b.expenses)}</td>
                  <td className="border p-2 text-center">{fmtIQD(b.net)}</td>
                  <td className="border p-2 text-center">{b.collectionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-4 text-center">تم الإنشاء بواسطة النظام · {new Date().toLocaleDateString("ar-IQ")}</p>
        </div>

      </div>
      <style>{`@media print { .print\\:hidden { display: none !important; } .hidden.print\\:block { display: block !important; } }`}</style>
    </div>
  );
}
