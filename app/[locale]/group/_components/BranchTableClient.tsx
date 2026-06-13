"use client";

import React, { useState, useEffect } from "react";
import type { SchoolManagerBranchSummary } from "@/lib/school-manager/overview";

type Locale = "ar" | "en";

interface Props {
  locale: Locale;
  branches: SchoolManagerBranchSummary[];
  schoolId: string;
}

interface BranchDashboardData {
  classes: Array<{ id: string; name: string; grade: number | null; section: string | null }>;
  loading: boolean;
  error: boolean;
}

function fmtIQD(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} مليار`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} مليون`;
  return n.toLocaleString("en-US");
}

function fmtNum(n: number) {
  return n.toLocaleString("en-US");
}

function MiniRing({ pct, size = 28, stroke = 3 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, pct) / 100) * circ;
  const color = pct >= 75 ? "#059669" : pct >= 40 ? "#d97706" : "#dc2626";
  return (
    <svg width={size} height={size} className="shrink-0" style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function RateBar({ value }: { value: number }) {
  const color = value >= 75 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-red-500";
  const textColor = value >= 75 ? "text-emerald-600" : value >= 40 ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex min-w-[140px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className={`w-12 text-end font-mono text-[13px] font-bold tabular-nums ${textColor}`}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-yellow-100 font-mono text-xs font-black text-yellow-700">{rank}</span>;
  if (rank === 2)
    return <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-200 font-mono text-xs font-black text-gray-600">{rank}</span>;
  if (rank === 3)
    return <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-orange-100 font-mono text-xs font-black text-orange-700">{rank}</span>;
  return <span className="inline-flex h-6 w-6 items-center justify-center font-mono text-xs font-semibold text-gray-400">{rank}</span>;
}

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2 || data.every((v) => v === 0)) {
    return <span className="inline-block w-[70px]" />;
  }
  const min = Math.min(...data) - 1;
  const max = Math.max(...data) + 1;
  const range = max - min || 1;
  const W = 70, H = 20;
  const step = W / (data.length - 1);
  const pts: [number, number][] = data.map((v, i) => [
    i * step,
    H - ((v - min) / range) * H,
  ]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i - 1][0] + pts[i][0]) / 2;
    d += ` C${cpx},${pts[i - 1][1]} ${cpx},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`;
  }
  const areaD = `${d} L${pts[pts.length - 1][0]},${H} L0,${H} Z`;
  const isUp = data[data.length - 1] >= data[data.length - 2];
  const lineColor = isUp ? "#059669" : "#dc2626";
  // Use index-based gradient ID to avoid conflicts
  const gradId = `spkG${data.reduce((a, v) => a + v, 0).toFixed(0)}`;
  return (
    <div className="inline-flex items-center gap-1">
      <svg width={W} height={H} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={d} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinecap="round" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.5} fill={lineColor} />
      </svg>
      <span style={{ fontSize: 9, fontWeight: 800, color: lineColor }}>
        {isUp ? "▲" : "▼"}
      </span>
    </div>
  );
}

function ExpandedDetail({
  branch,
  dashData,
}: {
  branch: SchoolManagerBranchSummary;
  dashData: BranchDashboardData | null;
}) {
  const net = branch.totalIncomes - branch.totalExpenses;

  const financialGroups: Array<{
    title: string;
    accent: string;
    borderColor: string;
    items: [string, string, string?][];
  }> = [
    {
      title: "الرسوم",
      accent: "text-blue-600",
      borderColor: "border-blue-600",
      items: [
        ["قبل الخصم", fmtIQD(branch.totalFeesBeforeDiscount)],
        ["بعد الخصم", fmtIQD(branch.totalFeesAfterDiscount)],
        ["الخصم", fmtIQD(branch.totalDiscount)],
      ],
    },
    {
      title: "التحصيل",
      accent: "text-emerald-600",
      borderColor: "border-emerald-600",
      items: [
        ["المدفوع", fmtIQD(branch.totalPaid), "text-emerald-600"],
        ["المحوّل", fmtIQD(branch.transferredPaid)],
        ["المدفوع + المحوّل", fmtIQD(branch.totalPaidWithTransferred)],
        ["المتبقي", fmtIQD(branch.totalRemaining), branch.totalRemaining > 0 ? "text-red-600" : "text-emerald-600"],
      ],
    },
    {
      title: "المالية",
      accent: "text-amber-600",
      borderColor: "border-amber-600",
      items: [
        ["المصروفات", fmtIQD(branch.totalExpenses)],
        ["الإيرادات", fmtIQD(branch.totalIncomes)],
        ["الصافي", fmtIQD(net), net >= 0 ? "text-emerald-600" : "text-red-600"],
      ],
    },
    {
      title: "الأعداد",
      accent: "text-gray-500",
      borderColor: "border-gray-300",
      items: [
        ["الطلاب", fmtNum(branch.studentsCount)],
        ["المعلمين", fmtNum(branch.teachersCount)],
        ["المحوّلين", fmtNum(branch.transferredCount)],
      ],
    },
  ];

  return (
    <tr>
      <td colSpan={11} className="border-b border-gray-200 bg-gray-50 p-0">
        <div className="space-y-5 p-5">
          {/* Financial data grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {financialGroups.map((g) => (
              <div key={g.title} className="rounded-md border border-gray-200 bg-white p-3">
                <div className={`mb-2 border-b-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider ${g.accent} ${g.borderColor}`}>
                  {g.title}
                </div>
                {g.items.map(([label, value, color]) => (
                  <div key={label} className="flex items-center justify-between border-b border-gray-50 py-1 last:border-b-0">
                    <span className="text-[11px] text-gray-500">{label}</span>
                    <span className={`font-mono text-[12px] font-bold tabular-nums ${color ?? "text-gray-800"}`}>{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Teachers by subject */}
          {branch.teachersBySubject.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">الأساتذة حسب المادة</span>
                <span className="font-mono text-[11px] font-bold text-gray-500">({fmtNum(branch.teachersCount)} أستاذ)</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="flex flex-wrap gap-2">
                {branch.teachersBySubject.map(({ subject, count }) => (
                  <div
                    key={subject}
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-[12px] font-semibold text-gray-700"
                  >
                    {subject}
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 font-mono text-[10px] font-black text-white">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classes */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">الصفوف</span>
              {dashData && !dashData.loading && (
                <span className="font-mono text-[11px] font-bold text-gray-500">({dashData.classes.length} صف)</span>
              )}
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            {!dashData || dashData.loading ? (
              <div className="flex items-center gap-2 text-[12px] text-gray-400">
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                جارٍ التحميل...
              </div>
            ) : dashData.error ? (
              <span className="text-[12px] text-gray-400">تعذّر تحميل الصفوف</span>
            ) : dashData.classes.length === 0 ? (
              <span className="text-[12px] text-gray-400">لا توجد صفوف مسجّلة</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {dashData.classes.map((cls) => (
                  <span
                    key={cls.id}
                    className="inline-flex items-center rounded border border-gray-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-gray-700"
                  >
                    {cls.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

export function BranchTableClient({ locale, branches, schoolId }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dashCache, setDashCache] = useState<Record<string, BranchDashboardData>>({});
  const [sortKey, setSortKey] = useState<string>("paidPercentage");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!expandedId) return;
    if (dashCache[expandedId]) return;
    const branchId = expandedId;
    setDashCache((prev) => ({ ...prev, [branchId]: { classes: [], loading: true, error: false } }));
    fetch(`/api/web/branch/dashboard?schoolId=${schoolId}&branchId=${branchId}`)
      .then((r) => r.json())
      .then((data) => {
        setDashCache((prev) => ({
          ...prev,
          [branchId]: { classes: Array.isArray(data.classes) ? data.classes : [], loading: false, error: false },
        }));
      })
      .catch(() => {
        setDashCache((prev) => ({ ...prev, [branchId]: { classes: [], loading: false, error: true } }));
      });
  }, [expandedId, schoolId, dashCache]);

  if (branches.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-400">
        {locale === "ar" ? "لا توجد فروع نشطة" : "No active branches"}
      </div>
    );
  }

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = branches.filter((b) =>
    search === "" || b.branchName.includes(search)
  );

  const sorted = [...filtered].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortKey] as number;
    const bv = (b as Record<string, unknown>)[sortKey] as number;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const arrow = (key: string) => {
    if (sortKey !== key) return <span className="opacity-25 text-[9px]">⇅</span>;
    return <span className="text-[9px] text-blue-600">{sortDir === "desc" ? "↓" : "↑"}</span>;
  };

  const cols: Array<{ key: string | null; label: string; sortable: boolean; align?: string; w?: string }> = [
    { key: null, label: "#", sortable: false, align: "center", w: "w-10" },
    { key: null, label: locale === "ar" ? "الفرع" : "Branch", sortable: false },
    { key: "paidPercentage", label: locale === "ar" ? "نسبة التحصيل" : "Rate", sortable: true, w: "w-[18%]" },
    { key: null, label: locale === "ar" ? "الترند" : "Trend", sortable: false, align: "center", w: "w-24" },
    { key: "totalFeesAfterDiscount", label: locale === "ar" ? "الرسوم" : "Fees", sortable: true, align: "end" },
    { key: "totalPaid", label: locale === "ar" ? "المحصّل" : "Collected", sortable: true, align: "end" },
    { key: "totalRemaining", label: locale === "ar" ? "المتبقي" : "Remaining", sortable: true, align: "end" },
    { key: "studentsCount", label: locale === "ar" ? "الطلاب" : "Students", sortable: true, align: "center", w: "w-20" },
    { key: "teachersCount", label: locale === "ar" ? "المعلمين" : "Teachers", sortable: true, align: "center", w: "w-20" },
    { key: "totalExpenses", label: locale === "ar" ? "المصروفات" : "Expenses", sortable: true, align: "end" },
    { key: null, label: "", sortable: false, w: "w-10" },
  ];

  const thBase = "px-3 py-2.5 text-[11px] font-semibold text-gray-400 border-b-2 border-gray-200 whitespace-nowrap select-none";
  const tdBase = "px-3 py-3.5 border-b border-gray-100 font-mono text-[15px] font-semibold tabular-nums text-gray-800 align-middle";

  // Compute totals
  const totFees = branches.reduce((s, b) => s + b.totalFeesAfterDiscount, 0);
  const totPaid = branches.reduce((s, b) => s + b.totalPaid, 0);
  const totRem = branches.reduce((s, b) => s + b.totalRemaining, 0);
  const totExp = branches.reduce((s, b) => s + b.totalExpenses, 0);
  const totStudents = branches.reduce((s, b) => s + b.studentsCount, 0);
  const totTeachers = branches.reduce((s, b) => s + b.teachersCount, 0);
  const realPct = totFees > 0 ? Math.round((totPaid / totFees) * 1000) / 10 : 0;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Table header with search */}
      <div className="flex items-end justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-[17px] font-bold text-gray-900">
            {locale === "ar" ? "أداء الفروع" : "Branch Performance"}
          </h2>
          <p className="mt-0.5 text-[12px] text-gray-400">
            {locale === "ar" ? "اضغط على العمود للترتيب — " : "Click column to sort — "}
            {filtered.length} {locale === "ar" ? "فرع" : "branches"}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <span className="text-[14px] text-gray-400">🔍</span>
          <input
            type="text"
            placeholder={locale === "ar" ? "بحث عن فرع..." : "Search branch..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-36 border-none bg-transparent text-[12px] text-gray-800 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th
                  key={i}
                  onClick={c.sortable && c.key ? () => handleSort(c.key!) : undefined}
                  className={`${thBase} ${c.w ?? ""} text-${c.align ?? "start"} ${c.sortable ? "cursor-pointer hover:text-blue-600 transition-colors" : "cursor-default"}`}
                >
                  {c.label}
                  {c.sortable && c.key && (
                    <span className="ms-1">{arrow(c.key)}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((b, i) => {
              const id = b.branchId ?? b.branchName;
              const isOpen = expandedId === id;
              return (
                <React.Fragment key={id}>
                  <tr
                    onClick={() => setExpandedId(isOpen ? null : id)}
                    className={`cursor-pointer transition-colors ${isOpen ? "bg-blue-50/60" : "hover:bg-gray-50"}`}
                  >
                    <td className={`${tdBase} text-center`}><RankBadge rank={i + 1} /></td>
                    <td className={`${tdBase} font-sans`}>
                      <div className="flex items-center gap-2">
                        <MiniRing pct={b.paidPercentage} size={26} stroke={2.5} />
                        <span className="text-[15px] font-bold text-gray-900">{b.branchName}</span>
                      </div>
                    </td>
                    <td className={tdBase}><RateBar value={b.paidPercentage} /></td>
                    <td className={`${tdBase} text-center`}>
                      <Sparkline data={b.monthlyPayments} />
                    </td>
                    <td className={`${tdBase} text-end`}>{fmtIQD(b.totalFeesAfterDiscount)}</td>
                    <td className={`${tdBase} text-end text-emerald-600`}>{fmtIQD(b.totalPaid)}</td>
                    <td className={`${tdBase} text-end text-red-600`}>{fmtIQD(b.totalRemaining)}</td>
                    <td className={`${tdBase} text-center`}>{b.studentsCount.toLocaleString()}</td>
                    <td className={`${tdBase} text-center`}>{b.teachersCount}</td>
                    <td className={`${tdBase} text-end`}>{fmtIQD(b.totalExpenses)}</td>
                    <td className={`${tdBase} text-center`}>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-[12px] text-gray-400 transition-all duration-200 ${isOpen ? "bg-blue-100 text-blue-600 rotate-180" : ""}`}
                        style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-flex" }}
                      >
                        ▾
                      </span>
                    </td>
                  </tr>
                  {isOpen && (
                    <ExpandedDetail
                      key={`${id}-detail`}
                      branch={b}
                      dashData={dashCache[id] ?? null}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* Totals row */}
            {branches.length > 1 && (
              <tr className="bg-gray-50">
                <td className={`${tdBase} border-b-0`}></td>
                <td className={`${tdBase} border-b-0 font-sans text-[15px] font-black text-gray-900`}>
                  {locale === "ar" ? "الإجمالي" : "Total"}
                </td>
                <td className={`${tdBase} border-b-0`}><RateBar value={realPct} /></td>
                <td className={`${tdBase} border-b-0`}></td>
                <td className={`${tdBase} border-b-0 text-end font-black`}>{fmtIQD(totFees)}</td>
                <td className={`${tdBase} border-b-0 text-end font-black text-emerald-600`}>{fmtIQD(totPaid)}</td>
                <td className={`${tdBase} border-b-0 text-end font-black text-red-600`}>{fmtIQD(totRem)}</td>
                <td className={`${tdBase} border-b-0 text-center font-black`}>{totStudents.toLocaleString()}</td>
                <td className={`${tdBase} border-b-0 text-center font-black`}>{totTeachers}</td>
                <td className={`${tdBase} border-b-0 text-end font-black`}>{fmtIQD(totExp)}</td>
                <td className={`${tdBase} border-b-0`}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
