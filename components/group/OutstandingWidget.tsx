"use client";

interface OutstandingStudent { id: string; full_name: string | null; branch_id: string | null; remaining_fee: number; }
interface BranchStat { id: string; name: string; students: number; collected: number; expenses: number; net: number; collectionRate: number; prevCollected: number; expected: number; }

function fmtIQD(n: number) { return n.toLocaleString("ar-IQ-u-nu-latn") + " د.ع"; }

export function OutstandingWidget({ outstanding, branches, branchMap }: {
  outstanding: OutstandingStudent[];
  branches: BranchStat[];
  branchMap: Record<string, string>;
}) {
  const totalOutstanding = outstanding.reduce((s, s2) => s + s2.remaining_fee, 0);
  const top3 = outstanding.slice(0, 3);

  const byBranch = branches.map((b) => ({
    name: b.name,
    total: outstanding.filter((s) => s.branch_id === b.id).reduce((sum, s) => sum + s.remaining_fee, 0),
  })).filter((b) => b.total > 0);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[var(--text-primary)]">الأرصدة المعلقة</h3>
        <span className="text-base font-black text-rose-600">{fmtIQD(totalOutstanding)}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">أعلى الطلاب غير المدفوعين</p>
          <div className="space-y-2">
            {top3.map((s) => (
              <div key={s.id} className="flex justify-between items-center py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{s.full_name ?? "—"}</p>
                  <p className="text-xs text-[var(--text-muted)]">{s.branch_id ? branchMap[s.branch_id] : ""}</p>
                </div>
                <span className="text-sm font-bold text-rose-600">{fmtIQD(s.remaining_fee)}</span>
              </div>
            ))}
            {top3.length === 0 && <p className="text-sm text-[var(--text-muted)]">لا توجد أرصدة معلقة</p>}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">الرصيد المعلق بالفرع</p>
          <div className="space-y-2">
            {byBranch.map((b) => (
              <div key={b.name} className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-primary)]">{b.name}</span>
                <span className="text-sm font-bold text-rose-500">{fmtIQD(b.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
