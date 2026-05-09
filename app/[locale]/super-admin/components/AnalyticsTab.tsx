"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { TrendingUp, Users, School, CreditCard, Activity, DollarSign, RefreshCw, PencilLine, Check, AlertTriangle } from "@/lib/icons";
import type { SchoolRecord, UserRecord, SubscriptionRecord } from "../_components";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { PLAN_LABELS } from "../_components/types";

// Exchange rate stored as "IQD per 100 USD" — e.g. 131000 means 100$ = 131,000 د.ع
const DEFAULT_RATE_PER_100 = 131000;
const STORAGE_PRICES     = "sa_school_prices_v2";
const STORAGE_COLLECTED  = "sa_school_collected_v1";
const STORAGE_RATE       = "sa_exchange_rate_v2";

interface SchoolCount {
  school_id: string;
  school_name: string;
  total_students: number;
}

function ls<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(val));
}

function usdToIqd(usd: number, ratePer100: number) { return usd * (ratePer100 / 100); }
function fmtUSD(v: number) { return `$${v.toLocaleString("en", { maximumFractionDigits: 0 })}`; }
function fmtIQD(v: number) { return `${Math.round(v).toLocaleString("ar-IQ")} د.ع`; }
function fmt(v: number, showIQD: boolean, rate: number) { return showIQD ? fmtIQD(usdToIqd(v, rate)) : fmtUSD(v); }

interface AnalyticsDashboardProps {
  schools: SchoolRecord[];
  users: UserRecord[];
  subscriptions: SubscriptionRecord[];
}

const ROLE_NAMES: Record<string, string> = { super_admin: "مسؤول عام", admin: "مسؤول", employee: "مستخدم" };
const PLAN_COLORS: Record<string, string> = { basic: "bg-blue-500", premium: "bg-purple-500", enterprise: "bg-amber-500" };
const ROLE_COLORS: Record<string, string> = { super_admin: "bg-red-500", admin: "bg-blue-500", employee: "bg-green-500" };

export function AnalyticsTab({ schools, users, subscriptions }: AnalyticsDashboardProps) {
  const [studentCounts, setStudentCounts] = useState<SchoolCount[]>([]);
  const [loadingCounts, setLoadingCounts] = useState(true);

  const [prices,    setPrices]    = useState<Record<string, number>>(() => ls(STORAGE_PRICES, {}));
  const [collected, setCollected] = useState<Record<string, number>>(() => ls(STORAGE_COLLECTED, {}));
  const [ratePer100, setRatePer100] = useState<number>(() => ls(STORAGE_RATE, DEFAULT_RATE_PER_100));

  // Editing state
  const [editingPrice, setEditingPrice]     = useState<string | null>(null);
  const [editingCollect, setEditingCollect] = useState<string | null>(null);
  const [editingRate, setEditingRate]       = useState(false);
  const [priceInput,   setPriceInput]       = useState("");
  const [collectInput, setCollectInput]     = useState("");
  const [rateInput,    setRateInput]        = useState("");
  const [showIQD, setShowIQD] = useState(false);

  const fetchCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; schools?: SchoolCount[] }>(
        "/api/web/super-admin/student-counts",
      );
      if (response.ok && payload?.ok) setStudentCounts(payload.schools ?? []);
    } catch { /* silent */ } finally { setLoadingCounts(false); }
  }, []);

  useEffect(() => { void fetchCounts(); }, [fetchCounts]);

  // Price helpers
  const applyPrice = useCallback((id: string) => {
    const v = parseFloat(priceInput);
    if (!isNaN(v) && v >= 0) {
      const next = { ...prices, [id]: v };
      setPrices(next); lsSet(STORAGE_PRICES, next);
    }
    setEditingPrice(null);
  }, [priceInput, prices]);

  const applyCollected = useCallback((id: string) => {
    const v = parseFloat(collectInput);
    if (!isNaN(v) && v >= 0) {
      const next = { ...collected, [id]: v };
      setCollected(next); lsSet(STORAGE_COLLECTED, next);
    }
    setEditingCollect(null);
  }, [collectInput, collected]);

  const applyRate = useCallback(() => {
    const v = parseFloat(rateInput.replace(/,/g, ""));
    if (!isNaN(v) && v > 0) { setRatePer100(v); lsSet(STORAGE_RATE, v); }
    setEditingRate(false);
  }, [rateInput]);

  // Live price preview while editing
  const livePrice = useMemo(() => {
    if (!editingPrice) return null;
    const v = parseFloat(priceInput);
    if (isNaN(v)) return null;
    const students = studentCounts.find((s) => s.school_id === editingPrice)?.total_students ?? 0;
    return { students, price: v, total: students * v };
  }, [editingPrice, priceInput, studentCounts]);

  // Build rows
  const rows = useMemo(() => {
    const countMap = new Map(studentCounts.map((s) => [s.school_id, s.total_students]));
    return schools
      .filter((s) => !s.deleted_at)
      .map((school) => {
        const students       = countMap.get(school.id) ?? 0;
        const price          = prices[school.id] ?? 0;
        const monthlyUSD     = students * price;
        const yearlyUSD      = monthlyUSD * 12;
        const collectedUSD   = collected[school.id] ?? 0;
        const remainingUSD   = Math.max(0, monthlyUSD - collectedUSD);
        const sub = subscriptions.find((s) => s.school_id === school.id);
        return { school, students, price, monthlyUSD, yearlyUSD, collectedUSD, remainingUSD, sub };
      })
      .sort((a, b) => b.monthlyUSD - a.monthlyUSD);
  }, [schools, studentCounts, prices, collected, subscriptions]);

  const totals = useMemo(() => ({
    students:   rows.reduce((s, r) => s + r.students, 0),
    monthly:    rows.reduce((s, r) => s + r.monthlyUSD, 0),
    yearly:     rows.reduce((s, r) => s + r.yearlyUSD, 0),
    collected:  rows.reduce((s, r) => s + r.collectedUSD, 0),
    remaining:  rows.reduce((s, r) => s + r.remainingUSD, 0),
  }), [rows]);

  // General stats
  const stats = useMemo(() => {
    const active   = schools.filter((s) => s.is_active && !s.deleted_at).length;
    const total    = schools.filter((s) => !s.deleted_at).length;
    const uActive  = users.filter((u) => u.is_active).length;
    const planDist = subscriptions.filter((s) => s.status === "active")
      .reduce((a, s) => { a[s.plan] = (a[s.plan] || 0) + 1; return a; }, {} as Record<string, number>);
    const roleDist = users.reduce((a, u) => { a[u.role] = (a[u.role] || 0) + 1; return a; }, {} as Record<string, number>);
    const now = Date.now();
    const expiring = subscriptions.filter((s) => {
      if (!s.end_date) return false;
      const d = new Date(s.end_date).getTime() - now;
      return d >= 0 && d <= 30 * 86400000;
    }).length;
    return { active, total, uActive, totalUsers: users.length, activeSubs: subscriptions.filter((s) => s.status === "active").length, planDist, roleDist, expiring };
  }, [schools, users, subscriptions]);

  return (
    <div className="space-y-6">

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "المدارس النشطة",       value: `${stats.active}/${stats.total}`,            icon: School,        color: "#4f8cff", bg: "rgba(79,140,255,0.10)"  },
          { label: "المستخدمون النشطون",   value: `${stats.uActive}/${stats.totalUsers}`,       icon: Users,         color: "#22c55e", bg: "rgba(34,197,94,0.10)"   },
          { label: "الاشتراكات النشطة",    value: stats.activeSubs,                             icon: CreditCard,    color: "#a855f7", bg: "rgba(168,85,247,0.10)"  },
          { label: "ينتهي خلال 30 يوم",   value: `${stats.expiring} مدرسة`,                   icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.10)"  },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[var(--text-tertiary)] mb-1">{label}</p>
                <p className="text-2xl font-black text-[var(--text-primary)]">{value}</p>
              </div>
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px]" style={{ background: bg, color }}>
                <Icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Panel */}
      <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] overflow-hidden">

        {/* Panel header */}
        <div className="flex flex-col gap-4 border-b border-[var(--border)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)]">الإيرادات</h3>
              <p className="text-xs font-bold text-[var(--text-muted)]">سعر الطالب × عدد الطلاب لكل مدرسة</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* USD / IQD toggle */}
            <div className="flex overflow-hidden rounded-xl border border-[var(--border)] text-sm font-black">
              <button type="button" onClick={() => setShowIQD(false)}
                className={`px-4 py-2 transition-colors ${!showIQD ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"}`}>
                $ USD
              </button>
              <button type="button" onClick={() => setShowIQD(true)}
                className={`px-4 py-2 transition-colors ${showIQD ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"}`}>
                د.ع IQD
              </button>
            </div>

            {/* Exchange rate — per 100 USD */}
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
              <span className="text-xs font-bold text-[var(--text-muted)]">$100 =</span>
              {editingRate ? (
                <>
                  <input
                    type="number" autoFocus
                    className="w-28 bg-transparent text-sm font-black text-[var(--text-primary)] outline-none"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") applyRate(); if (e.key === "Escape") setEditingRate(false); }}
                  />
                  <button type="button" onClick={applyRate} className="text-[var(--primary)]"><Check size={14} /></button>
                </>
              ) : (
                <>
                  <span className="text-sm font-black text-[var(--text-primary)]">{ratePer100.toLocaleString("ar-IQ")} د.ع</span>
                  <button type="button" onClick={() => { setRateInput(String(ratePer100)); setEditingRate(true); }} className="text-[var(--text-muted)] hover:text-[var(--primary)]"><PencilLine size={13} /></button>
                </>
              )}
            </div>

            <button type="button" title="تحديث عدد الطلاب"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--primary)]"
              onClick={() => void fetchCounts()}>
              <RefreshCw size={14} className={loadingCounts ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[var(--border)] divide-x divide-x-reverse divide-[var(--border)]">
          {[
            { label: "الإيراد الشهري الكلي",   val: totals.monthly,   color: "text-emerald-600 dark:text-emerald-400" },
            { label: "الإيراد السنوي المتوقع",  val: totals.yearly,    color: "text-blue-600 dark:text-blue-400" },
            { label: "المبلغ المستحصل",         val: totals.collected, color: "text-violet-600 dark:text-violet-400" },
            { label: "المبلغ المتبقي",          val: totals.remaining, color: totals.remaining > 0 ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-muted)]" },
          ].map(({ label, val, color }) => (
            <div key={label} className="p-5 text-center">
              <p className="text-xs font-bold text-[var(--text-muted)] mb-2">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{fmt(val, showIQD, ratePer100)}</p>
              {showIQD && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{fmtUSD(val)}</p>}
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-[460px]">
          <table className="ui-table">
            <thead>
              <tr>
                <th>المدرسة</th>
                <th>الطلاب</th>
                <th>سعر الطالب</th>
                <th>الإيراد الشهري</th>
                <th>الإيراد السنوي</th>
                <th>المستحصل</th>
                <th>المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ school, students, price, monthlyUSD, yearlyUSD, collectedUSD, remainingUSD }) => (
                <tr key={school.id}>
                  {/* School */}
                  <td>
                    <div className="font-black text-[var(--text-primary)]">{school.name}</div>
                    <div className={`text-xs font-bold ${school.is_active ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                      {school.is_active ? "نشطة" : "موقوفة"}
                    </div>
                  </td>

                  {/* Students */}
                  <td className="font-black text-[var(--text-primary)]">
                    {loadingCounts
                      ? <span className="inline-block h-4 w-10 animate-pulse rounded bg-[var(--surface-muted)]" />
                      : students.toLocaleString("ar-IQ")}
                  </td>

                  {/* Price per student — editable with formula preview */}
                  <td>
                    {editingPrice === school.id ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-muted)] text-sm font-bold">$</span>
                          <input
                            type="number" min="0" step="0.5" autoFocus
                            className="w-20 rounded-lg border border-[var(--primary)] bg-[var(--surface-strong)] px-2 py-1 text-sm font-black text-[var(--text-primary)] outline-none"
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")  applyPrice(school.id);
                              if (e.key === "Escape") setEditingPrice(null);
                            }}
                          />
                          <button type="button" className="text-[var(--primary)]" onClick={() => applyPrice(school.id)}><Check size={14} /></button>
                        </div>
                        {livePrice && livePrice.students > 0 && (
                          <p className="text-[10px] font-black text-[var(--text-muted)]">
                            {livePrice.students.toLocaleString("ar-IQ")} × ${livePrice.price} = {fmtUSD(livePrice.total)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-black hover:bg-[var(--surface-muted)] transition-colors group"
                        onClick={() => { setEditingPrice(school.id); setPriceInput(String(price)); }}
                      >
                        <span className="text-[var(--text-primary)]">${price}</span>
                        <PencilLine size={11} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100" />
                      </button>
                    )}
                  </td>

                  {/* Monthly — with formula */}
                  <td>
                    {monthlyUSD > 0 ? (
                      <div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">{fmt(monthlyUSD, showIQD, ratePer100)}</span>
                        <p className="text-[10px] font-bold text-[var(--text-muted)]">
                          {students.toLocaleString("ar-IQ")} × ${price}
                        </p>
                      </div>
                    ) : <span className="text-[var(--text-muted)]">—</span>}
                  </td>

                  {/* Yearly */}
                  <td className={yearlyUSD > 0 ? "font-black text-blue-600 dark:text-blue-400" : "text-[var(--text-muted)]"}>
                    {yearlyUSD > 0 ? fmt(yearlyUSD, showIQD, ratePer100) : "—"}
                  </td>

                  {/* Collected — editable */}
                  <td>
                    {editingCollect === school.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[var(--text-muted)] text-xs">$</span>
                        <input
                          type="number" min="0" autoFocus
                          className="w-20 rounded-lg border border-[var(--primary)] bg-[var(--surface-strong)] px-2 py-1 text-sm font-black outline-none"
                          value={collectInput}
                          onChange={(e) => setCollectInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")  applyCollected(school.id);
                            if (e.key === "Escape") setEditingCollect(null);
                          }}
                        />
                        <button type="button" className="text-[var(--primary)]" onClick={() => applyCollected(school.id)}><Check size={14} /></button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-black hover:bg-[var(--surface-muted)] transition-colors group"
                        onClick={() => { setEditingCollect(school.id); setCollectInput(String(collectedUSD)); }}
                      >
                        <span className={collectedUSD > 0 ? "text-violet-600 dark:text-violet-400" : "text-[var(--text-muted)]"}>
                          {collectedUSD > 0 ? fmt(collectedUSD, showIQD, ratePer100) : "—"}
                        </span>
                        <PencilLine size={11} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100" />
                      </button>
                    )}
                  </td>

                  {/* Remaining */}
                  <td>
                    {monthlyUSD > 0 ? (
                      <span className={`font-black ${remainingUSD > 0 ? "text-amber-600 dark:text-amber-400" : "text-[var(--success)]"}`}>
                        {remainingUSD > 0 ? fmt(remainingUSD, showIQD, ratePer100) : "مكتمل ✓"}
                      </span>
                    ) : <span className="text-[var(--text-muted)]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>

            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-muted)]">
                  <td className="font-black text-[var(--text-primary)]">الإجمالي</td>
                  <td className="font-black">{totals.students.toLocaleString("ar-IQ")}</td>
                  <td />
                  <td className="font-black text-emerald-600 dark:text-emerald-400">{fmt(totals.monthly, showIQD, ratePer100)}</td>
                  <td className="font-black text-blue-600 dark:text-blue-400">{fmt(totals.yearly, showIQD, ratePer100)}</td>
                  <td className="font-black text-violet-600 dark:text-violet-400">{fmt(totals.collected, showIQD, ratePer100)}</td>
                  <td className={`font-black ${totals.remaining > 0 ? "text-amber-600 dark:text-amber-400" : "text-[var(--success)]"}`}>
                    {totals.remaining > 0 ? fmt(totals.remaining, showIQD, ratePer100) : "—"}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <p className="px-6 py-3 text-xs font-bold text-[var(--text-muted)] border-t border-[var(--border)]">
          انقر على أي قيمة لتعديلها. يُحفظ تلقائياً في المتصفح.
        </p>
      </div>

      {/* Plan + Role distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
          <h3 className="text-base font-black text-[var(--text-primary)] mb-4">توزيع الباقات (اشتراكات نشطة)</h3>
          {Object.keys(stats.planDist).length === 0
            ? <p className="text-sm font-bold text-[var(--text-muted)]">لا توجد اشتراكات نشطة</p>
            : <div className="space-y-3">
                {Object.entries(stats.planDist).map(([plan, count]) => {
                  const total = Object.values(stats.planDist).reduce((a, b) => a + b, 0);
                  const pct = Math.round((count / (total || 1)) * 100);
                  return (
                    <div key={plan}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-bold text-[var(--text-secondary)]">{PLAN_LABELS[plan as keyof typeof PLAN_LABELS] ?? plan}</span>
                        <span className="text-sm font-black text-[var(--text-primary)]">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--surface-muted)]">
                        <div className={`h-full rounded-full ${PLAN_COLORS[plan] ?? "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
          <h3 className="text-base font-black text-[var(--text-primary)] mb-4">توزيع أدوار المستخدمين</h3>
          <div className="space-y-3">
            {Object.entries(stats.roleDist).map(([role, count]) => {
              const pct = Math.round((count / (stats.totalUsers || 1)) * 100);
              return (
                <div key={role}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--text-secondary)]">{ROLE_NAMES[role] ?? role}</span>
                    <span className="text-sm font-black text-[var(--text-primary)]">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--surface-muted)]">
                    <div className={`h-full rounded-full ${ROLE_COLORS[role] ?? "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المدارس",       value: stats.total },
          { label: "إجمالي المستخدمين",    value: stats.totalUsers },
          { label: "إجمالي الاشتراكات",   value: subscriptions.length },
          { label: "معدل فعالية المدارس",  value: `${Math.round((stats.active / (stats.total || 1)) * 100)}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-[20px] border border-[var(--border)] bg-[var(--card-bg)] p-4 text-center shadow-[var(--card-shadow)]">
            <p className="text-xs font-bold text-[var(--text-tertiary)] mb-2">{label}</p>
            <p className="text-xl font-black text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
