import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { BranchSummaryCard } from "@/components/group/BranchSummaryCard";
import { GroupTotalsBar } from "@/components/group/GroupTotalsBar";
import { BranchBarChart } from "@/components/group/BranchBarChart";
import { ExportDropdown } from "@/components/group/ExportDropdown";

interface BranchStat {
  id: string;
  name: string;
  students: number;
  collected: number;
  expenses: number;
  net: number;
}

interface Totals {
  students: number;
  collected: number;
  expenses: number;
  net: number;
}

interface GroupData {
  group: { id: string; name: string; logo_url: string | null };
  branches: BranchStat[];
  totals: Totals;
}

interface RedirectData {
  redirect: true;
  scope: string;
}

async function getGroupData(userId: string): Promise<GroupData | RedirectData | null> {
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
  if (profile.role === "super_admin") return { redirect: true, scope: "super_admin" };
  if (profile.scope !== "group" || !profile.group_id) return { redirect: true, scope: profile.scope as string };

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

  const branchStats: BranchStat[] = await Promise.all(
    (branches ?? []).map(async (branch) => {
      const [studentsRes, paymentsRes, expensesRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("branch_id", branch.id).neq("status", "deleted"),
        supabase.from("payments").select("amount").eq("branch_id", branch.id),
        supabase.from("expenses").select("amount").eq("branch_id", branch.id),
      ]);
      const collected = (paymentsRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const expenses = (expensesRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      return { id: branch.id, name: branch.name, students: studentsRes.count ?? 0, collected, expenses, net: collected - expenses };
    })
  );

  const totals = branchStats.reduce(
    (acc, b) => ({ students: acc.students + b.students, collected: acc.collected + b.collected, expenses: acc.expenses + b.expenses, net: acc.net + b.net }),
    { students: 0, collected: 0, expenses: 0, net: 0 }
  );

  return { group, branches: branchStats, totals };
}

export default async function GroupDashboardPage() {
  // Use Supabase auth to get current user
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/ar/login");

  const data = await getGroupData(user.id);
  if (!data) redirect("/ar/login");
  if ("redirect" in data) redirect("/ar/dashboard");

  const { group, branches, totals } = data;

  return (
    <div dir="rtl" className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 print:flex-col print:items-start">
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">لوحة مجموعة {group.name}</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {branches.length} فرع · تحديث {new Date().toLocaleDateString("ar-IQ")}
            </p>
          </div>
          <ExportDropdown groupId={group.id} />
        </div>

        {/* Branch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <BranchSummaryCard key={branch.id} {...branch} />
          ))}
        </div>

        {/* Grand Totals */}
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">المجاميع الكلية</h2>
          <GroupTotalsBar totals={totals} />
        </div>

        {/* Chart */}
        {branches.length > 0 && (
          <BranchBarChart branches={branches} />
        )}

        {/* Print-only table */}
        <div className="hidden print:block">
          <table className="w-full border-collapse text-sm mt-8">
            <thead>
              <tr style={{ backgroundColor: "#7C3AED", color: "white" }}>
                <th className="border p-2">الفرع</th>
                <th className="border p-2">الطلاب</th>
                <th className="border p-2">الإيرادات</th>
                <th className="border p-2">المصاريف</th>
                <th className="border p-2">الصافي</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td className="border p-2">{b.name}</td>
                  <td className="border p-2 text-center">{b.students}</td>
                  <td className="border p-2 text-center">{b.collected.toLocaleString("ar-IQ")} د.ع</td>
                  <td className="border p-2 text-center">{b.expenses.toLocaleString("ar-IQ")} د.ع</td>
                  <td className="border p-2 text-center">{b.net.toLocaleString("ar-IQ")} د.ع</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-violet-50">
                <td className="border p-2">المجموع</td>
                <td className="border p-2 text-center">{totals.students}</td>
                <td className="border p-2 text-center">{totals.collected.toLocaleString("ar-IQ")} د.ع</td>
                <td className="border p-2 text-center">{totals.expenses.toLocaleString("ar-IQ")} د.ع</td>
                <td className="border p-2 text-center">{totals.net.toLocaleString("ar-IQ")} د.ع</td>
              </tr>
            </tfoot>
          </table>
          <p className="text-xs text-gray-400 mt-4 text-center">تم الإنشاء بواسطة منظومة إدارة المدارس · {new Date().toLocaleDateString("ar-IQ")}</p>
        </div>
      </div>

      <style>{`
        @media print {
          nav, aside, header { display: none !important; }
          .hidden { display: block !important; }
        }
      `}</style>
    </div>
  );
}
