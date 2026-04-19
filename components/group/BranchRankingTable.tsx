"use client";
import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface BranchStat {
  id: string;
  name: string;
  students: number;
  collected: number;
  expenses: number;
  net: number;
  collectionRate: number;
  prevCollected: number;
}

function fmtIQD(n: number) { return n.toLocaleString("ar-IQ") + " د.ع"; }

const MEDALS = ["🥇", "🥈", "🥉"];

export function BranchRankingTable({ branches }: { branches: BranchStat[] }) {
  const [sortKey, setSortKey] = useState<keyof BranchStat>("collectionRate");
  const [asc, setAsc] = useState(false);

  const sorted = [...branches].sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number);
    return asc ? diff : -diff;
  });

  const toggleSort = (key: keyof BranchStat) => {
    if (sortKey === key) setAsc(!asc);
    else { setSortKey(key); setAsc(false); }
  };

  const Th = ({ k, label }: { k: keyof BranchStat; label: string }) => (
    <th
      className="p-3 text-right text-xs font-semibold text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
      onClick={() => toggleSort(k)}
    >
      <span className="flex items-center justify-end gap-1">
        {label}
        {sortKey === k ? (asc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
      </span>
    </th>
  );

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] overflow-hidden print:border-0">
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-bold text-[var(--text-primary)]">ترتيب الفروع</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--surface-muted)]">
            <tr>
              <th className="p-3 text-right text-xs font-semibold text-[var(--text-muted)]">الترتيب</th>
              <th className="p-3 text-right text-xs font-semibold text-[var(--text-muted)]">الفرع</th>
              <Th k="students" label="الطلاب" />
              <Th k="collected" label="الإيرادات" />
              <Th k="expenses" label="المصاريف" />
              <Th k="net" label="الصافي" />
              <Th k="collectionRate" label="نسبة التحصيل" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((b, i) => {
              const delta = b.collected - b.prevCollected;
              return (
                <tr key={b.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors">
                  <td className="p-3 text-lg">{MEDALS[i] ?? i + 1}</td>
                  <td className="p-3 font-semibold text-[var(--text-primary)]">{b.name}</td>
                  <td className="p-3 text-center">{b.students.toLocaleString("ar-IQ")}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={delta >= 0 ? "text-emerald-500 text-xs" : "text-rose-500 text-xs"}>{delta >= 0 ? "↑" : "↓"}</span>
                      <span className="text-emerald-600 font-semibold">{fmtIQD(b.collected)}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center text-rose-500 font-semibold">{fmtIQD(b.expenses)}</td>
                  <td className={`p-3 text-center font-bold ${b.net >= 0 ? "text-violet-600" : "text-rose-600"}`}>{fmtIQD(b.net)}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${b.collectionRate >= 90 ? "bg-emerald-100 text-emerald-700" : b.collectionRate >= 70 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                      {b.collectionRate}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
