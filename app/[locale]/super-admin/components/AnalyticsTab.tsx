"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { TrendingUp, Users, School, CreditCard, Activity, DollarSign, RefreshCw, PencilLine, Check, AlertTriangle } from "@/lib/icons";
import type { SchoolRecord, UserRecord, SubscriptionRecord } from "../_components";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { PLAN_LABELS } from "../_components/types";

const DEFAULT_EXCHANGE_RATE = 1310;
const STORAGE_PRICES = "sa_school_prices_v2";
const STORAGE_RATE = "sa_exchange_rate";

interface SchoolCount {
  school_id: string;
  school_name: string;
  total_students: number;
}

function loadPrices(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_PRICES) ?? "{}") as Record<string, number>; } catch { return {}; }
}
function savePrices(p: Record<string, number>) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_PRICES, JSON.stringify(p));
}
function loadRate(): number {
  if (typeof window === "undefined") return DEFAULT_EXCHANGE_RATE;
  const v = parseFloat(localStorage.getItem(STORAGE_RATE) ?? "");
  return isNaN(v) ? DEFAULT_EXCHANGE_RATE : v;
}
function saveRate(r: number) {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_RATE, String(r));
}

function fmtUSD(v: number) { return `$${v.toLocaleString("en", { maximumFractionDigits: 0 })}`; }
function fmtIQD(v: number) { return `${v.toLocaleString("ar-IQ")} د.ع`; }

interface AnalyticsDashboardProps {
  schools: SchoolRecord[];
  users: UserRecord[];
  subscriptions: SubscriptionRecord[];
}

export function AnalyticsTab({ schools, users, subscriptions }: AnalyticsDashboardProps) {
  const [studentCounts, setStudentCounts] = useState<SchoolCount[]>([]);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [prices, setPrices] = useState<Record<string, number>>(loadPrices);
  const [exchangeRate, setExchangeRate] = useState<number>(loadRate);
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(loadRate()));
  const [showIQD, setShowIQD] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");

  const fetchStudentCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; schools?: SchoolCount[] }>(
        "/api/web/super-admin/student-counts",
      );
      if (response.ok && payload?.ok) setStudentCounts(payload.schools ?? []);
    } catch { /* silent */ } finally { setLoadingCounts(false); }
  }, []);

  useEffect(() => { void fetchStudentCounts(); }, [fetchStudentCounts]);

  const applyRate = useCallback(() => {
    const v = parseFloat(rateInput);
    if (!isNaN(v) && v > 0) { setExchangeRate(v); saveRate(v); }
    setEditingRate(false);
  }, [rateInput]);

  const setSchoolPrice = useCallback((schoolId: string, val: number) => {
    const next = { ...prices, [schoolId]: val };
    setPrices(next);
    savePrices(next);
    setEditingPriceId(null);
  }, [prices]);

  const startEditPrice = useCallback((schoolId: string, current: number) => {
    setEditingPriceId(schoolId);
    setPriceInput(String(current));
  }, []);

  // Build per-school revenue rows
  const schoolRows = useMemo(() => {
    const countMap = new Map(studentCounts.map((s) => [s.school_id, s.total_students]));
    return schools
      .filter((s) => !s.deleted_at)
      .map((school) => {
        const students = countMap.get(school.id) ?? 0;
        const pricePerStudent = prices[school.id] ?? 0;
        const revenueUSD = students * pricePerStudent;
        const revenueIQD = revenueUSD * exchangeRate;
        const sub = subscriptions.find((s) => s.school_id === school.id);
        return { school, students, pricePerStudent, revenueUSD, revenueIQD, sub };
      })
      .sort((a, b) => b.revenueUSD - a.revenueUSD);
  }, [schools, studentCounts, prices, exchangeRate, subscriptions]);

  const totals = useMemo(() => {
    const totalStudents = schoolRows.reduce((s, r) => s + r.students, 0);
    const totalUSD = schoolRows.reduce((s, r) => s + r.revenueUSD, 0);
    const totalIQD = totalUSD * exchangeRate;
    return { totalStudents, totalUSD, totalIQD };
  }, [schoolRows, exchangeRate]);

  // General analytics
  const analytics = useMemo(() => {
    const activeSchools = schools.filter((s) => s.is_active && !s.deleted_at).length;
    const totalSchools = schools.filter((s) => !s.deleted_at).length;
    const activeUsers = users.filter((u) => u.is_active).length;
    const totalUsers = users.length;
    const activeSubscriptions = subscriptions.filter((s) => s.status === "active").length;
    const planDist = subscriptions
      .filter((s) => s.status === "active")
      .reduce((acc, s) => { acc[s.plan] = (acc[s.plan] || 0) + 1; return acc; }, {} as Record<string, number>);
    const roleDist = users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {} as Record<string, number>);
    const now = Date.now();
    const expiringSoon = subscriptions.filter((s) => {
      if (!s.end_date) return false;
      const diff = new Date(s.end_date).getTime() - now;
      return diff >= 0 && diff <= 30 * 24 * 60 * 60 * 1000;
    }).length;
    return { activeSchools, totalSchools, activeUsers, totalUsers, activeSubscriptions, planDist, roleDist, expiringSoon };
  }, [schools, users, subscriptions]);

  const ROLE_NAMES: Record<string, string> = { super_admin: "مسؤول عام", admin: "مسؤول", employee: "مستخدم" };

  return (
    <div className="space-y-6">

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "المدارس النشطة", value: `${analytics.activeSchools}/${analytics.totalSchools}`, icon: School, color: "#4f8cff", bg: "rgba(79,140,255,0.10)" },
          { label: "المستخدمون النشطون", value: `${analytics.activeUsers}/${analytics.totalUsers}`, icon: Users, color: "#22c55e", bg: "rgba(34,197,94,0.10)" },
          { label: "الاشتراكات النشطة", value: analytics.activeSubscriptions, icon: CreditCard, color: "#a855f7", bg: "rgba(168,85,247,0.10)" },
          { label: "ينتهي قريباً", value: `${analytics.expiringSoon} مدرسة`, icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[var(--text-tertiary)]">{label}</p>
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
        {/* Header */}
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
            {/* Currency toggle */}
            <div className="flex overflow-hidden rounded-xl border border-[var(--border)] text-sm font-black">
              <button
                type="button"
                className={`px-4 py-2 transition-colors ${!showIQD ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"}`}
                onClick={() => setShowIQD(false)}
              >USD $</button>
              <button
                type="button"
                className={`px-4 py-2 transition-colors ${showIQD ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"}`}
                onClick={() => setShowIQD(true)}
              >IQD د.ع</button>
            </div>
            {/* Exchange rate */}
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
              <span className="text-xs font-bold text-[var(--text-muted)]">1 $ =</span>
              {editingRate ? (
                <>
                  <input
                    type="number"
                    className="w-24 bg-transparent text-sm font-black text-[var(--text-primary)] outline-none"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyRate()}
                    autoFocus
                  />
                  <button type="button" onClick={applyRate} className="text-[var(--primary)]"><Check size={14} /></button>
                </>
              ) : (
                <>
                  <span className="text-sm font-black text-[var(--text-primary)]">{exchangeRate.toLocaleString()} د.ع</span>
                  <button type="button" onClick={() => { setRateInput(String(exchangeRate)); setEditingRate(true); }} className="text-[var(--text-muted)] hover:text-[var(--primary)]"><PencilLine size={13} /></button>
                </>
              )}
            </div>
            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--primary)]" onClick={() => void fetchStudentCounts()}>
              <RefreshCw size={14} className={loadingCounts ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-b border-[var(--border)] divide-x divide-x-reverse divide-[var(--border)]">
          <div className="p-6 text-center">
            <p className="text-xs font-bold text-[var(--text-muted)] mb-2">إجمالي الإيراد الشهري</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {showIQD ? fmtIQD(totals.totalIQD) : fmtUSD(totals.totalUSD)}
            </p>
            {showIQD && <p className="mt-1 text-xs font-bold text-[var(--text-muted)]">{fmtUSD(totals.totalUSD)}</p>}
          </div>
          <div className="p-6 text-center">
            <p className="text-xs font-bold text-[var(--text-muted)] mb-2">الإيراد السنوي المتوقع</p>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
              {showIQD ? fmtIQD(totals.totalIQD * 12) : fmtUSD(totals.totalUSD * 12)}
            </p>
          </div>
          <div className="p-6 text-center">
            <p className="text-xs font-bold text-[var(--text-muted)] mb-2">إجمالي الطلاب</p>
            <p className="text-3xl font-black text-[var(--text-primary)]">
              {loadingCounts ? "..." : totals.totalStudents.toLocaleString("ar-IQ")}
            </p>
          </div>
        </div>

        {/* Per-school table */}
        <div className="overflow-auto max-h-[420px]">
          <table className="ui-table">
            <thead>
              <tr>
                <th>المدرسة</th>
                <th>الباقة</th>
                <th>الطلاب</th>
                <th>سعر الطالب ($)</th>
                <th>الإيراد الشهري</th>
                <th>الإيراد السنوي</th>
              </tr>
            </thead>
            <tbody>
              {schoolRows.map(({ school, students, pricePerStudent, revenueUSD, revenueIQD, sub }) => (
                <tr key={school.id}>
                  <td>
                    <div className="space-y-0.5">
                      <div className="font-black text-[var(--text-primary)]">{school.name}</div>
                      <div className={`text-xs font-bold ${school.is_active ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                        {school.is_active ? "نشطة" : "موقوفة"}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="ui-pill">{PLAN_LABELS[sub?.plan ?? school.plan] ?? school.plan}</span>
                  </td>
                  <td className="font-black text-[var(--text-primary)]">
                    {loadingCounts ? <span className="inline-block h-4 w-10 animate-pulse rounded bg-[var(--surface-muted)]" /> : students.toLocaleString("ar-IQ")}
                  </td>
                  <td>
                    {editingPriceId === school.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-muted)] text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          className="w-20 rounded-lg border border-[var(--primary)] bg-[var(--surface-strong)] px-2 py-1 text-sm font-black text-[var(--text-primary)] outline-none"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { const v = parseFloat(priceInput); if (!isNaN(v)) setSchoolPrice(school.id, v); }
                            if (e.key === "Escape") setEditingPriceId(null);
                          }}
                          autoFocus
                        />
                        <button type="button" className="text-[var(--primary)]" onClick={() => { const v = parseFloat(priceInput); if (!isNaN(v)) setSchoolPrice(school.id, v); }}><Check size={14} /></button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-black hover:bg-[var(--surface-muted)] transition-colors group"
                        onClick={() => startEditPrice(school.id, pricePerStudent)}
                      >
                        <span className="text-[var(--text-primary)]">${pricePerStudent}</span>
                        <PencilLine size={12} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </td>
                  <td>
                    <span className={`font-black ${revenueUSD > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-muted)]"}`}>
                      {revenueUSD > 0 ? (showIQD ? fmtIQD(revenueIQD) : fmtUSD(revenueUSD)) : "—"}
                    </span>
                  </td>
                  <td className="text-[var(--text-secondary)] font-bold">
                    {revenueUSD > 0 ? (showIQD ? fmtIQD(revenueIQD * 12) : fmtUSD(revenueUSD * 12)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            {schoolRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-muted)]">
                  <td colSpan={2} className="font-black text-[var(--text-primary)]">الإجمالي</td>
                  <td className="font-black text-[var(--text-primary)]">{totals.totalStudents.toLocaleString("ar-IQ")}</td>
                  <td />
                  <td className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                    {showIQD ? fmtIQD(totals.totalIQD) : fmtUSD(totals.totalUSD)}
                  </td>
                  <td className="font-black text-blue-600 dark:text-blue-400">
                    {showIQD ? fmtIQD(totals.totalIQD * 12) : fmtUSD(totals.totalUSD * 12)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <p className="px-6 py-3 text-xs font-bold text-[var(--text-muted)] border-t border-[var(--border)]">
          انقر على سعر الطالب لتعديله. يُحفظ تلقائياً في المتصفح.
        </p>
      </div>

      {/* Plan + Role distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
          <h3 className="text-base font-black text-[var(--text-primary)] mb-4">توزيع الباقات (اشتراكات نشطة)</h3>
          <div className="space-y-3">
            {Object.entries(analytics.planDist).length === 0 && (
              <p className="text-sm font-bold text-[var(--text-muted)]">لا توجد اشتراكات نشطة</p>
            )}
            {Object.entries(analytics.planDist).map(([plan, count]) => {
              const total = Object.values(analytics.planDist).reduce((a, b) => a + b, 0);
              const pct = Math.round((count / (total || 1)) * 100);
              const colors: Record<string, string> = { basic: "bg-blue-500", premium: "bg-purple-500", enterprise: "bg-amber-500" };
              return (
                <div key={plan}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--text-secondary)]">{PLAN_LABELS[plan as keyof typeof PLAN_LABELS] ?? plan}</span>
                    <span className="text-sm font-black text-[var(--text-primary)]">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--surface-muted)]">
                    <div className={`h-full rounded-full ${colors[plan] ?? "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
          <h3 className="text-base font-black text-[var(--text-primary)] mb-4">توزيع أدوار المستخدمين</h3>
          <div className="space-y-3">
            {Object.entries(analytics.roleDist).map(([role, count]) => {
              const pct = Math.round((count / (analytics.totalUsers || 1)) * 100);
              const colors: Record<string, string> = { super_admin: "bg-red-500", admin: "bg-blue-500", employee: "bg-green-500" };
              return (
                <div key={role}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-bold text-[var(--text-secondary)]">{ROLE_NAMES[role] ?? role}</span>
                    <span className="text-sm font-black text-[var(--text-primary)]">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--surface-muted)]">
                    <div className={`h-full rounded-full ${colors[role] ?? "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المدارس", value: analytics.totalSchools },
          { label: "إجمالي المستخدمين", value: analytics.totalUsers },
          { label: "إجمالي الاشتراكات", value: subscriptions.length },
          { label: "معدل فعالية المدارس", value: `${Math.round((analytics.activeSchools / (analytics.totalSchools || 1)) * 100)}%` },
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
