"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Search, Loader2, GraduationCap, ChevronDown, ChevronRight, Save, DollarSign } from "@/lib/icons";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BranchCount {
  branch_id: string;
  branch_name: string;
  active: number;
  transferred: number;
}

interface SchoolCount {
  school_id: string;
  school_name: string;
  active: number;
  transferred: number;
  total_students: number;
  branches: BranchCount[];
}

interface CountsPayload {
  ok: boolean;
  schools: SchoolCount[];
  grand_total: number;
  grand_active: number;
  grand_transferred: number;
  error?: { message?: string };
}

interface ConfigPayload {
  branch_prices?: Record<string, number>;
  exchange_rate?: number;
  error?: { message?: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONFIG_API = "/api/web/super-admin/analytics-config";

function fmt(n: number) {
  return n.toLocaleString("en");
}

// price is in USD, students count, returns revenue in USD
function calcUSD(students: number, priceUSD: number): number {
  return students * priceUSD;
}

// USD -> IQD: usd * (rate / 100)
function toIQD(usd: number, rate: number): number {
  return usd * (rate / 100);
}

function fmtUSD(usd: number): string {
  const decimals = usd >= 1000 ? 0 : usd >= 10 ? 1 : 2;
  return `$${usd.toLocaleString("en", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StudentCountsTab() {
  const [schools, setSchools] = useState<SchoolCount[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [grandActive, setGrandActive] = useState(0);
  const [grandTransferred, setGrandTransferred] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [refreshing, setRefreshing] = useState(false);

  // Branch prices: { branch_id -> price_per_student_in_USD }
  const [branchPrices, setBranchPrices] = useState<Record<string, number>>({});
  const [savingPrice, setSavingPrice] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Exchange rate: how many IQD = $100
  const [exchangeRate, setExchangeRate] = useState(131000);
  const [savingRate, setSavingRate] = useState(false);
  const rateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch counts ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<CountsPayload>(
        "/api/web/super-admin/student-counts",
      );
      if (!response.ok || !payload?.ok) {
        setError(payload?.error?.message ?? "تعذر تحميل البيانات.");
      } else {
        setSchools(payload.schools);
        setGrandTotal(payload.grand_total);
        setGrandActive(payload.grand_active);
        setGrandTransferred(payload.grand_transferred);
      }
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Fetch config (prices + exchange rate) ───────────────────────────────────
  const fetchPrices = useCallback(async () => {
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<ConfigPayload>(CONFIG_API);
      setBranchPrices((payload?.branch_prices as Record<string, number>) ?? {});
      if (payload?.exchange_rate && payload.exchange_rate > 0) {
        setExchangeRate(payload.exchange_rate);
      }
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    void fetchData();
    void fetchPrices();
  }, [fetchData, fetchPrices]);

  // ── Save branch price in USD (debounced) ────────────────────────────────────
  function handlePriceChange(branchId: string, raw: string) {
    const val = raw === "" ? 0 : Math.max(0, Number(raw) || 0);
    setBranchPrices((prev) => ({ ...prev, [branchId]: val }));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void savePrice(branchId, val);
    }, 800);
  }

  async function savePrice(branchId: string, price: number) {
    setSavingPrice(branchId);
    try {
      const next = { ...branchPrices, [branchId]: price };
      await fetchJsonWithAuthorizedSession(CONFIG_API, {
        method: "PUT",
        headers: withJsonHeaders(),
        body: JSON.stringify({ key: "branch_prices", value: next }),
      });
    } catch {
      // silent fail
    } finally {
      setSavingPrice(null);
    }
  }

  // ── Save exchange rate (debounced) ──────────────────────────────────────────
  function handleRateChange(raw: string) {
    const val = raw === "" ? 0 : Math.max(0, Number(raw) || 0);
    setExchangeRate(val);

    if (rateDebounceRef.current) clearTimeout(rateDebounceRef.current);
    rateDebounceRef.current = setTimeout(() => {
      void saveRate(val);
    }, 800);
  }

  async function saveRate(rate: number) {
    setSavingRate(true);
    try {
      await fetchJsonWithAuthorizedSession(CONFIG_API, {
        method: "PUT",
        headers: withJsonHeaders(),
        body: JSON.stringify({ key: "exchange_rate_per_100", value: rate }),
      });
    } catch {
      // silent fail
    } finally {
      setSavingRate(false);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = schools
    .filter((s) => !query || s.school_name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sortDir === "desc"
        ? b.total_students - a.total_students
        : a.total_students - b.total_students,
    );

  // Grand revenue in USD
  const grandRevenueUSD = schools.reduce((sum, school) => {
    return sum + school.branches.reduce((s2, br) => {
      const priceUSD = branchPrices[br.branch_id] ?? 0;
      return s2 + calcUSD(br.active + br.transferred, priceUSD);
    }, 0);
  }, 0);
  const grandRevenueIQD = toIQD(grandRevenueUSD, exchangeRate);

  const maxCount = filtered[0]?.total_students ?? 1;

  return (
    <div className="space-y-3">
      {/* Grand revenue hero */}
      {!loading && !error && grandRevenueUSD > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-violet-500/20 bg-violet-500/8 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold text-violet-400 mb-0.5">إجمالي الإيرادات</p>
            <p className="text-2xl font-black text-violet-600 leading-none">{fmtUSD(grandRevenueUSD)}</p>
          </div>
          {exchangeRate > 0 && (
            <div className="border-s border-violet-500/20 ps-4">
              <p className="text-[10px] font-bold text-violet-400 mb-0.5">بالدينار العراقي</p>
              <p className="text-sm font-black text-violet-500">{fmt(Math.round(grandRevenueIQD))} د.ع</p>
            </div>
          )}
          <div className="border-s border-violet-500/20 ps-4">
            <p className="text-[10px] font-bold text-violet-400 mb-0.5">إجمالي الطلاب</p>
            <p className="text-sm font-black text-violet-500">{fmt(grandTotal)}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <GraduationCap size={13} className="text-[var(--text-muted)]" />
        <span className="text-xs font-black text-[var(--text-primary)]">
          أعداد الطلاب ({filtered.length} مدرسة)
        </span>
        <div className="ms-auto flex items-center gap-2">
          <div className="relative">
            <Search size={11} className="absolute start-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث..."
              className="h-6 rounded border border-[var(--border)] bg-[var(--surface-muted)] ps-6 pe-2 text-[11px] outline-none focus:border-[var(--primary)] w-28"
            />
          </div>
          <button
            onClick={() => void fetchData(true)}
            disabled={refreshing}
            className="flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] disabled:opacity-50"
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Exchange rate row */}
      <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
        <DollarSign size={12} className="text-[var(--text-muted)] shrink-0" />
        <span className="text-[11px] font-black text-[var(--text-secondary)] shrink-0">سعر $100 بالدينار:</span>
        <input
          type="number"
          min={0}
          value={exchangeRate === 0 ? "" : exchangeRate}
          placeholder="131000"
          onChange={(e) => handleRateChange(e.target.value)}
          className="h-6 w-28 rounded border border-[var(--border)] bg-[var(--card-bg)] px-2 text-[11px] font-bold outline-none focus:border-[var(--primary)]"
        />
        <span className="text-[10px] text-[var(--text-muted)]">د.ع</span>
        {savingRate && <Save size={10} className="text-[var(--primary)] animate-pulse shrink-0" />}
        {exchangeRate > 0 && (
          <span className="text-[10px] text-[var(--text-muted)] ms-1">
            ≈ {fmt(Math.round(exchangeRate / 100))} د.ع/$1
          </span>
        )}
      </div>

      {/* Summary chips */}
      {!loading && !error && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--success)]/20 bg-[var(--success)]/8 px-2 py-1 text-[11px] font-black text-[var(--success)]">
            نشط: {fmt(grandActive)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--warning)]/20 bg-[var(--warning)]/8 px-2 py-1 text-[11px] font-black text-[var(--warning)]">
            منقول: {fmt(grandTransferred)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/8 px-2 py-1 text-[11px] font-black text-[var(--primary)]">
            المجموع: {fmt(grandTotal)}
          </span>
          {grandRevenueUSD > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/8 px-2 py-1 text-[11px] font-black text-violet-600">
              {fmtUSD(grandRevenueUSD)}
              <span className="text-[10px] font-bold text-violet-400">
                {" "}/ {fmt(Math.round(grandRevenueIQD))} د.ع
              </span>
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--primary)] opacity-40" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-4 text-xs font-bold text-[var(--danger)]">
          {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <div className="max-h-[55dvh] overflow-y-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="w-6"></th>
                  <th className="text-start w-6">#</th>
                  <th className="text-start">المدرسة / الفرع</th>
                  <th className="text-center text-[var(--success)]">نشط</th>
                  <th className="text-center text-[var(--warning)]">منقول</th>
                  <th className="text-center">
                    <button
                      onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                      className="flex items-center gap-1 font-black hover:text-[var(--primary)]"
                    >
                      المجموع {sortDir === "desc" ? "↓" : "↑"}
                    </button>
                  </th>
                  <th className="text-start w-24">$/طالب</th>
                  <th className="text-center">$ / د.ع</th>
                  <th className="text-start w-20">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((school, idx) => {
                  const expanded = expandedIds.has(school.school_id);
                  const hasBranches = school.branches.length > 0;
                  const total = school.active + school.transferred;
                  const pct = maxCount > 0 ? (total / maxCount) * 100 : 0;

                  const schoolRevenueUSD = school.branches.reduce((s, br) => {
                    const p = branchPrices[br.branch_id] ?? 0;
                    return s + calcUSD(br.active + br.transferred, p);
                  }, 0);
                  const schoolRevenueIQD = toIQD(schoolRevenueUSD, exchangeRate);

                  return (
                    <>
                      {/* School row */}
                      <tr
                        key={school.school_id}
                        className={hasBranches ? "cursor-pointer hover:bg-[var(--surface-muted)]" : ""}
                        onClick={hasBranches ? () => toggleExpand(school.school_id) : undefined}
                      >
                        <td className="w-6 text-center">
                          {hasBranches ? (
                            expanded
                              ? <ChevronDown size={11} className="text-[var(--text-muted)]" />
                              : <ChevronRight size={11} className="text-[var(--text-muted)]" />
                          ) : null}
                        </td>
                        <td className="text-[10px] font-black text-[var(--text-muted)]">{idx + 1}</td>
                        <td className="font-black text-[var(--text-primary)]">{school.school_name}</td>
                        <td className="text-center font-bold text-[var(--success)]">{fmt(school.active)}</td>
                        <td className="text-center font-bold text-[var(--warning)]">{fmt(school.transferred)}</td>
                        <td className="text-center font-black text-[var(--text-primary)]">{fmt(total)}</td>
                        <td className="text-[10px] text-[var(--text-muted)]">—</td>
                        <td className="text-center text-[11px] font-bold text-violet-600">
                          {schoolRevenueUSD > 0 ? (
                            <div className="flex flex-col items-center leading-tight">
                              <span>{fmtUSD(schoolRevenueUSD)}</span>
                              <span className="text-[10px] text-violet-400">{fmt(Math.round(schoolRevenueIQD))} د.ع</span>
                            </div>
                          ) : "—"}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                              <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[9px] font-bold text-[var(--text-muted)] w-7 shrink-0">
                              {Math.round(pct)}%
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Branch rows */}
                      {expanded && school.branches.map((br) => {
                        const priceUSD = branchPrices[br.branch_id] ?? 0;
                        const brRevenueUSD = calcUSD(br.active + br.transferred, priceUSD);
                        const brRevenueIQD = toIQD(brRevenueUSD, exchangeRate);
                        const isSaving = savingPrice === br.branch_id;

                        return (
                          <tr key={br.branch_id} className="bg-[var(--surface-muted)]/50">
                            <td></td>
                            <td></td>
                            <td className="ps-4 text-[11px] font-bold text-[var(--text-secondary)]">
                              ↳ {br.branch_name}
                            </td>
                            <td className="text-center text-[11px] font-bold text-[var(--success)]">
                              {fmt(br.active)}
                            </td>
                            <td className="text-center text-[11px] font-bold text-[var(--warning)]">
                              {fmt(br.transferred)}
                            </td>
                            <td className="text-center text-[11px] font-bold text-[var(--text-secondary)]">
                              {fmt(br.active + br.transferred)}
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-[var(--text-muted)]">$</span>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  value={priceUSD === 0 ? "" : priceUSD}
                                  placeholder="0"
                                  onChange={(e) => handlePriceChange(br.branch_id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-5 w-16 rounded border border-[var(--border)] bg-[var(--card-bg)] px-2 text-[11px] font-bold outline-none focus:border-[var(--primary)]"
                                />
                                {isSaving && (
                                  <Save size={10} className="text-[var(--primary)] animate-pulse shrink-0" />
                                )}
                              </div>
                            </td>
                            <td className="text-center text-[11px] font-bold text-violet-600">
                              {brRevenueUSD > 0 ? (
                                <div className="flex flex-col items-center leading-tight">
                                  <span>{fmtUSD(brRevenueUSD)}</span>
                                  <span className="text-[10px] text-violet-400">{fmt(Math.round(brRevenueIQD))} د.ع</span>
                                </div>
                              ) : "—"}
                            </td>
                            <td></td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
              </tbody>

              {/* Grand total footer */}
              <tfoot>
                <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-muted)]">
                  <td></td>
                  <td></td>
                  <td className="text-xs font-black text-[var(--text-primary)]">المجموع الكلي</td>
                  <td className="text-center text-xs font-black text-[var(--success)]">{fmt(grandActive)}</td>
                  <td className="text-center text-xs font-black text-[var(--warning)]">{fmt(grandTransferred)}</td>
                  <td className="text-center text-sm font-black text-[var(--primary)]">{fmt(grandTotal)}</td>
                  <td></td>
                  <td className="text-center text-xs font-black text-violet-600">
                    {grandRevenueUSD > 0 ? (
                      <div className="flex flex-col items-center leading-tight">
                        <span>{fmtUSD(grandRevenueUSD)}</span>
                        <span className="text-[10px] text-violet-400">{fmt(Math.round(grandRevenueIQD))} د.ع</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <p className="text-[10px] text-[var(--text-muted)]">
        السعر بالدولار لكل طالب. الإيراد = طلاب × السعر$. الدينار = $ × (سعر التصريف ÷ 100).
      </p>
    </div>
  );
}
