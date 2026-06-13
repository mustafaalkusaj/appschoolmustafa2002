"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Users, School, CreditCard, DollarSign, RefreshCw, PencilLine, Check, AlertTriangle, FileDown } from "@/lib/icons";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { PLAN_LABELS } from "../_components/types";

type SchoolRecord = { id: string; name: string; is_active: boolean; deleted_at?: string | null };
type UserRecord = { role: string; is_active: boolean };
type SubscriptionRecord = { school_id: string; status: string; plan: string; end_date?: string | null };

// Exchange rate stored as "IQD per 100 USD" — e.g. 131000 means 100$ = 131,000 د.ع
const DEFAULT_RATE_PER_100 = 131000;
const ANALYTICS_CONFIG_API = "/api/web/super-admin/analytics-config";

// localStorage used as optimistic cache only
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
function fmtIQD(v: number) { return `${Math.round(v).toLocaleString("ar-IQ-u-nu-latn")} د.ع`; }
function fmt(v: number, showIQD: boolean, rate: number) { return showIQD ? fmtIQD(usdToIqd(v, rate)) : fmtUSD(v); }

interface OverviewPayload {
  schools?: SchoolRecord[];
  users?: UserRecord[];
  subscriptions?: SubscriptionRecord[];
}

const ROLE_NAMES: Record<string, string> = { super_admin: "مسؤول عام", admin: "مسؤول", employee: "مستخدم" };

function CSSBarChart({ segments }: { segments: { label: string; count: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (total === 0) return <p className="text-xs text-[var(--text-muted)]">لا توجد بيانات</p>;
  return (
    <div className="space-y-2">
      {segments.map(({ label, count, color }) => {
        const pct = Math.round((count / total) * 100);
        return (
          <div key={label} className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-[var(--text-secondary)]">{label}</span>
              <span className="font-black text-[var(--text-primary)]">{count} ({pct}%)</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--surface-muted)] overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsTab() {
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState(false);
  const [studentCounts, setStudentCounts] = useState<SchoolCount[]>([]);
  const [loadingCounts, setLoadingCounts] = useState(true);

  const [prices,    setPrices]    = useState<Record<string, number>>(() => ls(STORAGE_PRICES, {}));
  const [collected, setCollected] = useState<Record<string, number>>(() => ls(STORAGE_COLLECTED, {}));
  const [ratePer100, setRatePer100] = useState<number>(() => ls(STORAGE_RATE, DEFAULT_RATE_PER_100));
  const [configLoaded, setConfigLoaded] = useState(false);

  const [editingPrice, setEditingPrice]     = useState<string | null>(null);
  const [editingCollect, setEditingCollect] = useState<string | null>(null);
  const [editingRate, setEditingRate]       = useState(false);
  const [priceInput,   setPriceInput]       = useState("");
  const [collectInput, setCollectInput]     = useState("");
  const [rateInput,    setRateInput]        = useState("");
  const [showIQD, setShowIQD] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<OverviewPayload>(
        "/api/web/super-admin/overview",
      );
      if (response.ok) {
        setSchools(payload?.schools ?? []);
        setUsers(payload?.users ?? []);
        setSubscriptions(payload?.subscriptions ?? []);
        setOverviewError(false);
      } else {
        setOverviewError(true);
      }
    } catch { setOverviewError(true); } finally { setLoadingOverview(false); }
  }, []);

  const fetchCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; schools?: SchoolCount[] }>(
        "/api/web/super-admin/student-counts",
      );
      if (response.ok && payload?.ok) setStudentCounts(payload.schools ?? []);
    } catch { /* silent */ } finally { setLoadingCounts(false); }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        prices: Record<string, number>;
        collected: Record<string, number>;
        exchange_rate: number;
      }>(ANALYTICS_CONFIG_API);
      if (response.ok && payload) {
        setPrices(payload.prices ?? {});
        setCollected(payload.collected ?? {});
        setRatePer100(payload.exchange_rate ?? DEFAULT_RATE_PER_100);
        // Update localStorage cache
        lsSet(STORAGE_PRICES, payload.prices ?? {});
        lsSet(STORAGE_COLLECTED, payload.collected ?? {});
        lsSet(STORAGE_RATE, payload.exchange_rate ?? DEFAULT_RATE_PER_100);
      }
    } catch { /* silent — localStorage fallback already in state */ }
    finally { setConfigLoaded(true); }
  }, []);

  const saveConfig = useCallback(async (key: string, value: unknown) => {
    try {
      await fetchJsonWithAuthorizedSession(ANALYTICS_CONFIG_API, {
        method: "PUT",
        headers: withJsonHeaders(),
        body: JSON.stringify({ key, value }),
      });
    } catch { /* silent — data already in localStorage */ }
  }, []);

  useEffect(() => { void fetchOverview(); }, [fetchOverview]);
  useEffect(() => { void fetchCounts(); }, [fetchCounts]);
  useEffect(() => { void fetchConfig(); }, [fetchConfig]);

  const applyPrice = useCallback((id: string) => {
    const v = parseFloat(priceInput);
    if (!isNaN(v) && v >= 0) {
      const next = { ...prices, [id]: v };
      setPrices(next); lsSet(STORAGE_PRICES, next);
      void saveConfig("school_prices", next);
    }
    setEditingPrice(null);
  }, [priceInput, prices, saveConfig]);

  const applyCollected = useCallback((id: string) => {
    const v = parseFloat(collectInput);
    if (!isNaN(v) && v >= 0) {
      const next = { ...collected, [id]: v };
      setCollected(next); lsSet(STORAGE_COLLECTED, next);
      void saveConfig("school_collected", next);
    }
    setEditingCollect(null);
  }, [collectInput, collected, saveConfig]);

  const applyRate = useCallback(() => {
    const v = parseFloat(rateInput.replace(/,/g, ""));
    if (!isNaN(v) && v > 0) {
      setRatePer100(v); lsSet(STORAGE_RATE, v);
      void saveConfig("exchange_rate_per_100", v);
    }
    setEditingRate(false);
  }, [rateInput, saveConfig]);

  const livePrice = useMemo(() => {
    if (!editingPrice) return null;
    const v = parseFloat(priceInput);
    if (isNaN(v)) return null;
    const students = studentCounts.find((s) => s.school_id === editingPrice)?.total_students ?? 0;
    const yearlyTotal = students * v;
    return { students, price: v, yearlyTotal };
  }, [editingPrice, priceInput, studentCounts]);

  const rows = useMemo(() => {
    const countMap = new Map(studentCounts.map((s) => [s.school_id, s.total_students]));
    return schools
      .filter((s) => !s.deleted_at)
      .map((school) => {
        const students       = countMap.get(school.id) ?? 0;
        const price          = prices[school.id] ?? 0;
        const yearlyUSD      = students * price;
        const collectedUSD   = collected[school.id] ?? 0;
        const remainingUSD   = Math.max(0, yearlyUSD - collectedUSD);
        const sub = subscriptions.find((s) => s.school_id === school.id);
        return { school, students, price, yearlyUSD, collectedUSD, remainingUSD, sub };
      })
      .sort((a, b) => b.yearlyUSD - a.yearlyUSD);
  }, [schools, studentCounts, prices, collected, subscriptions]);

  const totals = useMemo(() => ({
    students:   rows.reduce((s, r) => s + r.students, 0),
    yearly:     rows.reduce((s, r) => s + r.yearlyUSD, 0),
    collected:  rows.reduce((s, r) => s + r.collectedUSD, 0),
    remaining:  rows.reduce((s, r) => s + r.remainingUSD, 0),
  }), [rows]);

  const exportRevenueCSV = useCallback(() => {
    const headers = ["المدرسة", "الطلاب", "سعر الطالب ($)", "الإيراد السنوي ($)", "المستحصل ($)", "المتبقي ($)", "نسبة التحصيل (%)"];
    const csvRows = [
      headers.join(","),
      ...rows.map(r => [
        `"${r.school.name}"`,
        r.students,
        r.price,
        r.yearlyUSD,
        r.collectedUSD,
        r.remainingUSD,
        r.yearlyUSD > 0 ? Math.round((r.collectedUSD / r.yearlyUSD) * 100) : 0,
      ].join(","))
    ];
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "revenues.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

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
    <div className="space-y-4">

      {/* Error banner */}
      {overviewError && (
        <div className="flex items-center justify-between rounded border border-[var(--danger)]/20 bg-[var(--danger)]/8 px-3 py-2 text-xs text-[var(--danger)]">
          <span>تعذر تحميل بيانات التحليلات</span>
          <button onClick={() => void fetchOverview()} className="font-black hover:underline">إعادة المحاولة</button>
        </div>
      )}

      {/* KPI Row — compact */}
      {loadingOverview ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] p-3 animate-pulse">
              <div className="h-3 w-16 bg-[var(--surface-muted)] rounded mb-2" />
              <div className="h-5 w-10 bg-[var(--surface-muted)] rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
          {[
            { label: "المدارس النشطة",       value: `${stats.active}/${stats.total}`,          icon: School,        tab: "schools"       },
            { label: "المستخدمون النشطون",   value: `${stats.uActive}/${stats.totalUsers}`,     icon: Users,         tab: "users"         },
            { label: "الاشتراكات النشطة",    value: stats.activeSubs,                           icon: CreditCard,    tab: "subscriptions" },
            { label: "ينتهي خلال 30 يوم",   value: `${stats.expiring} مدرسة`,                 icon: AlertTriangle, tab: "subscriptions" },
          ].map(({ label, value, icon: Icon, tab }) => (
            <button
              key={label}
              type="button"
              onClick={() => {}}
              className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] p-3 text-start w-full transition-all hover:border-[var(--primary)]"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-muted)]">{label}</p>
                  <p className="text-lg font-black text-[var(--text-primary)] mt-0.5">{value}</p>
                </div>
                <Icon size={16} className="text-[var(--text-muted)] shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Revenue Panel */}
      <div className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
        {/* Panel header */}
        <div className="flex flex-col gap-2 border-b border-[var(--border)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-emerald-600 shrink-0" />
            <div>
              <span className="text-xs font-black text-[var(--text-primary)]">الإيرادات</span>
              <span className="ms-2 text-[10px] text-[var(--text-muted)]">سعر الطالب × عدد الطلاب لكل مدرسة</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* USD / IQD toggle */}
            <div className="flex overflow-hidden rounded border border-[var(--border)] text-[11px] font-black">
              <button type="button" onClick={() => setShowIQD(false)}
                className={`px-2 py-1 transition-colors ${!showIQD ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"}`}>
                $ USD
              </button>
              <button type="button" onClick={() => setShowIQD(true)}
                className={`px-2 py-1 transition-colors ${showIQD ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"}`}>
                د.ع IQD
              </button>
            </div>

            {/* Exchange rate */}
            <div className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">$100 =</span>
              {editingRate ? (
                <>
                  <input
                    type="number" autoFocus
                    className="w-24 bg-transparent text-[11px] font-black text-[var(--text-primary)] outline-none"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") applyRate(); if (e.key === "Escape") setEditingRate(false); }}
                  />
                  <button type="button" onClick={applyRate} className="text-[var(--primary)]"><Check size={12} /></button>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-black text-[var(--text-primary)]">{ratePer100.toLocaleString("ar-IQ-u-nu-latn")} د.ع</span>
                  <button type="button" onClick={() => { setRateInput(String(ratePer100)); setEditingRate(true); }} className="text-[var(--text-muted)] hover:text-[var(--primary)]"><PencilLine size={11} /></button>
                </>
              )}
            </div>

            <button type="button" title="تصدير CSV"
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--primary)]"
              onClick={exportRevenueCSV}>
              <FileDown size={12} />
            </button>

            <button type="button" title="تحديث البيانات"
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--primary)]"
              onClick={() => { void fetchOverview(); void fetchCounts(); }}>
              <RefreshCw size={12} className={(loadingCounts || loadingOverview) ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Summary stat row */}
        {(() => {
          const collectionPct = totals.yearly > 0 ? Math.round((totals.collected / totals.yearly) * 100) : 0;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[var(--border)] divide-x divide-x-reverse divide-[var(--border)]">
              {[
                { label: "الإيراد السنوي المتوقع", val: totals.yearly,    pct: null, color: "text-blue-600 dark:text-blue-400" },
                { label: "المبلغ المستحصل",        val: totals.collected, pct: null, color: "text-violet-600 dark:text-violet-400" },
                { label: "المبلغ المتبقي",         val: totals.remaining, pct: null, color: totals.remaining > 0 ? "text-amber-600" : "text-[var(--text-muted)]" },
                { label: "نسبة التحصيل",           val: null,             pct: collectionPct, color: collectionPct >= 100 ? "text-[var(--success)]" : collectionPct >= 80 ? "text-blue-600" : collectionPct >= 50 ? "text-amber-600" : "text-[var(--danger)]" },
              ].map(({ label, val, pct, color }) => (
                <div key={label} className="p-3 text-center">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] mb-1">{label}</p>
                  {pct !== null
                    ? <p className={`text-lg font-black ${color}`}>{pct}%</p>
                    : <p className={`text-lg font-black ${color}`}>{fmt(val!, showIQD, ratePer100)}</p>
                  }
                  {pct === null && showIQD && val !== null && <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{fmtUSD(val)}</p>}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Table */}
        <div className="overflow-auto max-h-[400px]">
          <table className="ui-table">
            <thead>
              <tr>
                <th>المدرسة</th>
                <th>الطلاب</th>
                <th>سعر الطالب</th>
                <th>الإيراد السنوي</th>
                <th>المستحصل</th>
                <th>المتبقي</th>
                <th>% التحصيل</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ school, students, price, yearlyUSD, collectedUSD, remainingUSD }) => (
                <tr key={school.id}>
                  <td>
                    <div className="font-black text-[var(--text-primary)]">{school.name}</div>
                    <div className={`text-[10px] font-bold ${school.is_active ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                      {school.is_active ? "نشطة" : "موقوفة"}
                    </div>
                  </td>
                  <td className="font-black text-[var(--text-primary)]">
                    {loadingCounts
                      ? <span className="inline-block h-4 w-10 animate-pulse rounded bg-[var(--surface-muted)]" />
                      : students.toLocaleString("ar-IQ-u-nu-latn")}
                  </td>
                  <td>
                    {editingPrice === school.id ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[var(--text-muted)] text-xs font-bold">$</span>
                          <input
                            type="number" min="0" step="0.5" autoFocus
                            className="w-16 rounded border border-[var(--primary)] bg-[var(--surface-strong)] px-1 py-0.5 text-xs font-black outline-none"
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")  applyPrice(school.id);
                              if (e.key === "Escape") setEditingPrice(null);
                            }}
                          />
                          <button type="button" className="text-[var(--primary)]" onClick={() => applyPrice(school.id)}><Check size={12} /></button>
                        </div>
                        {livePrice && livePrice.students > 0 && (
                          <p className="text-[9px] font-black text-[var(--text-muted)]">
                            {livePrice.students.toLocaleString("ar-IQ-u-nu-latn")} × ${livePrice.price} = {fmtUSD(livePrice.yearlyTotal)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-black hover:bg-[var(--surface-muted)] group"
                        onClick={() => { setEditingPrice(school.id); setPriceInput(String(price)); }}
                      >
                        <span>${price}</span>
                        <PencilLine size={10} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100" />
                      </button>
                    )}
                  </td>
                  <td>
                    {yearlyUSD > 0 ? (
                      <div>
                        <span className="font-black text-blue-600 dark:text-blue-400">{fmtUSD(yearlyUSD)}</span>
                        <p className="text-[9px] font-bold text-[var(--text-muted)]">{fmtIQD(usdToIqd(yearlyUSD, ratePer100))}</p>
                      </div>
                    ) : <span className="text-[var(--text-muted)]">—</span>}
                  </td>
                  <td>
                    {editingCollect === school.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[var(--text-muted)] text-[10px]">$</span>
                        <input
                          type="number" min="0" autoFocus
                          className="w-16 rounded border border-[var(--primary)] bg-[var(--surface-strong)] px-1 py-0.5 text-xs font-black outline-none"
                          value={collectInput}
                          onChange={(e) => setCollectInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")  applyCollected(school.id);
                            if (e.key === "Escape") setEditingCollect(null);
                          }}
                        />
                        <button type="button" className="text-[var(--primary)]" onClick={() => applyCollected(school.id)}><Check size={12} /></button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-black hover:bg-[var(--surface-muted)] group"
                        onClick={() => { setEditingCollect(school.id); setCollectInput(String(collectedUSD)); }}
                      >
                        <span className={collectedUSD > 0 ? "text-violet-600 dark:text-violet-400" : "text-[var(--text-muted)]"}>
                          {collectedUSD > 0 ? fmt(collectedUSD, showIQD, ratePer100) : "—"}
                        </span>
                        <PencilLine size={10} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100" />
                      </button>
                    )}
                  </td>
                  <td>
                    {yearlyUSD > 0 ? (
                      remainingUSD > 0 ? (
                        <div>
                          <span className="font-black text-amber-600 dark:text-amber-400">{fmtUSD(remainingUSD)}</span>
                          <p className="text-[9px] font-bold text-[var(--text-muted)]">{fmtIQD(usdToIqd(remainingUSD, ratePer100))}</p>
                        </div>
                      ) : <span className="font-black text-[var(--success)]">مكتمل ✓</span>
                    ) : <span className="text-[var(--text-muted)]">—</span>}
                  </td>
                  <td>
                    {yearlyUSD > 0 ? (() => {
                      const pct = Math.round((collectedUSD / yearlyUSD) * 100);
                      const color = pct >= 100 ? "text-[var(--success)]" : pct >= 80 ? "text-blue-600" : pct >= 50 ? "text-amber-600" : "text-[var(--danger)]";
                      return (
                        <div>
                          <span className={`font-black text-xs ${color}`}>{pct}%</span>
                          <div className="mt-0.5 h-1 w-12 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 100 ? "bg-[var(--success)]" : pct >= 80 ? "bg-blue-500" : pct >= 50 ? "bg-amber-500" : "bg-[var(--danger)]"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        </div>
                      );
                    })() : <span className="text-[var(--text-muted)]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>

            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-muted)]">
                  <td className="font-black text-[var(--text-primary)]">الإجمالي</td>
                  <td className="font-black">{totals.students.toLocaleString("ar-IQ-u-nu-latn")}</td>
                  <td />
                  <td>
                    <span className="font-black text-blue-600">{fmtUSD(totals.yearly)}</span>
                    <p className="text-[9px] font-bold text-[var(--text-muted)]">{fmtIQD(usdToIqd(totals.yearly, ratePer100))}</p>
                  </td>
                  <td className="font-black text-violet-600">{fmtUSD(totals.collected)}</td>
                  <td>
                    {totals.remaining > 0 ? (
                      <>
                        <span className="font-black text-amber-600">{fmtUSD(totals.remaining)}</span>
                        <p className="text-[9px] font-bold text-[var(--text-muted)]">{fmtIQD(usdToIqd(totals.remaining, ratePer100))}</p>
                      </>
                    ) : <span className="font-black text-[var(--success)]">—</span>}
                  </td>
                  <td className="font-black">
                    {totals.yearly > 0 ? (() => {
                      const pct = Math.round((totals.collected / totals.yearly) * 100);
                      const color = pct >= 100 ? "text-[var(--success)]" : pct >= 80 ? "text-blue-600" : pct >= 50 ? "text-amber-600" : "text-[var(--danger)]";
                      return <span className={color}>{pct}%</span>;
                    })() : "—"}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <p className="px-3 py-2 text-[10px] font-bold text-[var(--text-muted)] border-t border-[var(--border)]">
          {configLoaded
            ? "انقر على أي قيمة لتعديلها. يُحفظ تلقائياً في قاعدة البيانات."
            : "جارٍ تحميل البيانات المحفوظة..."}
        </p>
      </div>

      {/* Plan + Role distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] p-3">
          <h4 className="text-xs font-black text-[var(--text-primary)] mb-3">توزيع الباقات (اشتراكات نشطة)</h4>
          {Object.keys(stats.planDist).length === 0
            ? <p className="text-xs font-bold text-[var(--text-muted)]">لا توجد اشتراكات نشطة</p>
            : <CSSBarChart
                segments={Object.entries(stats.planDist).map(([plan, count]) => ({
                  label: PLAN_LABELS[plan as keyof typeof PLAN_LABELS] ?? plan,
                  count,
                  color: plan === "basic" ? "#3b82f6" : plan === "premium" ? "#a855f7" : "#f59e0b",
                }))}
              />
          }
        </div>

        <div className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] p-3">
          <h4 className="text-xs font-black text-[var(--text-primary)] mb-3">توزيع أدوار المستخدمين</h4>
          <CSSBarChart
            segments={Object.entries(stats.roleDist).map(([role, count]) => ({
              label: ROLE_NAMES[role] ?? role,
              count,
              color: role === "super_admin" ? "#ef4444" : role === "admin" ? "#3b82f6" : "#22c55e",
            }))}
          />
        </div>
      </div>

      {/* Bottom summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "إجمالي المدارس",          value: stats.total },
          { label: "إجمالي المستخدمين",       value: stats.totalUsers },
          { label: "إجمالي الاشتراكات",      value: subscriptions.length },
          { label: "متوسط الطلاب / مدرسة",   value: rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.students, 0) / rows.length).toLocaleString("ar-IQ-u-nu-latn") : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-md border border-[var(--border)] bg-[var(--card-bg)] p-3 text-center">
            <p className="text-[10px] font-bold text-[var(--text-muted)] mb-1">{label}</p>
            <p className="text-base font-black text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
