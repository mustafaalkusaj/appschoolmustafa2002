"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  RefreshCw, Server, Database, Users, ShieldCheck, Building2, Clock,
  Activity, CheckCircle2, AlertTriangle, Wifi, HardDrive, Download,
  Search, TrendingUp, Bell,
} from "@/lib/icons";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { supabase } from "@/lib/supabase";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";
import { SectionCard, MigrationNotice, cx } from "./UI";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceStatus {
  status: "healthy" | "warning" | "critical";
  message: string;
  latency?: number;
}

interface ExpiringSub {
  id: string;
  school_id: string;
  school_name: string;
  end_date: string | null;
  days_left: number | null;
}

interface ArchiveAtLimit {
  school_id: string;
  school_name: string;
  count: number;
}

interface TopSchool {
  school_id: string;
  school_name: string;
  payment_count: number;
}

interface HealthPayload {
  database?: ServiceStatus;
  api?: ServiceStatus;
  storage?: ServiceStatus;
  memory?: number;
  cpu?: number;
  activeConnections?: number;
  lastChecked?: string;
  uptime?: string | null;
  expiring_subscriptions?: ExpiringSub[];
  archives_at_limit?: ArchiveAtLimit[];
  users_today?: number;
  top_active_schools?: TopSchool[];
  error?: { message?: string };
}

interface OperationalStats {
  schools: number;
  activeSchools: number;
  users: number;
  activeUsers: number;
}

interface RecentEvent {
  id: string;
  summary: string;
  actor_name?: string | null;
  created_at?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_LATENCY_HISTORY = 12;
const EVENT_FILTER_OPTIONS = [
  { value: "all",    label: "الكل" },
  { value: "add",    label: "إضافة" },
  { value: "update", label: "تعديل" },
  { value: "delete", label: "حذف" },
] as const;
type EventFilter = typeof EVENT_FILTER_OPTIONS[number]["value"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBorder(status: string) {
  switch (status) {
    case "healthy":  return "border-green-200 bg-green-50 text-green-700";
    case "warning":  return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "critical": return "border-red-200 bg-red-50 text-red-700";
    default:         return "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "healthy":  return "سليم";
    case "warning":  return "تحذير";
    case "critical": return "حرج";
    default:         return "—";
  }
}

function fmtTime(date: Date) { return date.toLocaleTimeString("ar-IQ"); }

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "منذ قليل";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "منذ قليل";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)}د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)}س`;
  return `منذ ${Math.floor(diff / 86400)}ي`;
}

function eventMatchesFilter(summary: string, filter: EventFilter) {
  if (filter === "all") return true;
  const s = summary.toLowerCase();
  if (filter === "add")    return s.includes("إضافة") || s.includes("إنشاء") || s.includes("جديد");
  if (filter === "delete") return s.includes("حذف") || s.includes("مسح");
  if (filter === "update") return s.includes("تعديل") || s.includes("تحديث") || s.includes("تغيير");
  return true;
}

function exportEventsCsv(events: RecentEvent[]) {
  const header = "الحدث,الفاعل,الوقت";
  const rows = events.map((e) =>
    [`"${(e.summary ?? "").replace(/"/g, '""')}"`, `"${(e.actor_name ?? "النظام").replace(/"/g, '""')}"`, `"${e.created_at ?? ""}"`].join(","),
  );
  const csv = "\uFEFF" + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `events_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface SystemMonitoringTabProps {
  infrastructure: AdminInfrastructure;
  onAlertCountChange?: (count: number) => void;
}

export function SystemMonitoringTab({ infrastructure, onAlertCountChange }: SystemMonitoringTabProps) {
  // Health / extended data
  const [health, setHealth]             = useState<HealthPayload | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError]   = useState<string | null>(null);
  const [lastChecked, setLastChecked]   = useState<Date | null>(null);
  const [apiLatency, setApiLatency]     = useState<number | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<"open" | "connecting" | "closed">("connecting");

  // Operational stats
  const [stats, setStats]           = useState<OperationalStats>({ schools: 0, activeSchools: 0, users: 0, activeUsers: 0 });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [dbConnStatus, setDbConnStatus] = useState<"connected" | "limited" | "error" | "checking">("checking");

  // Event log UI
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [eventSearch, setEventSearch] = useState("");

  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertCountRef = useRef(0);

  // ── Realtime status ────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel("__monitor_ping__");
    ch.subscribe((status: string) => {
      if (status === "SUBSCRIBED") setRealtimeStatus("open");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeStatus("closed");
      else setRealtimeStatus("connecting");
    });
    return () => { void supabase.removeChannel(ch); };
  }, []);

  // ── Fetch health ───────────────────────────────────────────────────────────
  const fetchHealth = useCallback(async (silent = false) => {
    if (!silent) setHealthLoading(true);
    setHealthError(null);
    const t0 = Date.now();
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<HealthPayload>(
        "/api/web/super-admin/health",
      );
      const elapsed = Date.now() - t0;
      setApiLatency(elapsed);
      if (!response.ok) {
        setHealthError(payload?.error?.message || "تعذر تحميل بيانات الصحة");
        setHealth(null);
        return;
      }
      if (payload?.database && payload?.api && payload?.storage) {
        setHealth(payload);
        setLastChecked(new Date());
        const dbLat = payload.database.latency;
        if (typeof dbLat === "number") {
          setLatencyHistory((prev) => [...prev.slice(-(MAX_LATENCY_HISTORY - 1)), dbLat]);
        }
      } else {
        setHealthError("بيانات غير مكتملة من الخادم");
        setHealth(null);
      }
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : "خطأ في الاتصال");
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // ── Fetch operational stats ────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setDbConnStatus("checking");
    try {
      let sQ  = supabase.from("schools").select("*", { count: "exact", head: true });
      let asQ = supabase.from("schools").select("*", { count: "exact", head: true }).eq("is_active", true);
      let uQ  = supabase.from("user_profiles").select("*", { count: "exact", head: true });
      let auQ = supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("is_active", true);
      if (infrastructure.softDeleteSchools) { sQ = sQ.is("deleted_at", null); asQ = asQ.is("deleted_at", null); }
      if (infrastructure.softDeleteUsers)   { uQ = uQ.is("deleted_at", null); auQ = auQ.is("deleted_at", null); }

      const [s, as, u, au, logs] = await Promise.all([
        sQ, asQ, uQ, auQ,
        infrastructure.auditLogs
          ? supabase.from("audit_logs").select("id, summary, actor_name, created_at").order("created_at", { ascending: false }).limit(20)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (s.error || u.error) throw new Error("فشل استعلام الإحصائيات");
      setStats({ schools: s.count ?? 0, activeSchools: as.count ?? 0, users: u.count ?? 0, activeUsers: au.count ?? 0 });
      setRecentEvents((logs.data as RecentEvent[]) ?? []);
      setDbConnStatus(infrastructure.auditLogs ? "connected" : "limited");
    } catch { setDbConnStatus("error"); }
  }, [infrastructure.auditLogs, infrastructure.softDeleteSchools, infrastructure.softDeleteUsers]);

  // ── Full refresh ───────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchHealth(true), fetchStats()]);
    setRefreshing(false);
  }, [fetchHealth, fetchStats]);

  // ── Alert count → parent ───────────────────────────────────────────────────
  useEffect(() => {
    const db       = health?.database;
    const api      = health?.api;
    const storage  = health?.storage;
    const expiring = health?.expiring_subscriptions?.length ?? 0;
    const atLimit  = health?.archives_at_limit?.length ?? 0;
    const cnt =
      (db?.status !== "healthy" ? 1 : 0) +
      (api?.status !== "healthy" ? 1 : 0) +
      (storage?.status !== "healthy" ? 1 : 0) +
      (expiring > 0 ? 1 : 0) +
      (atLimit > 0 ? 1 : 0);
    if (cnt !== alertCountRef.current) {
      alertCountRef.current = cnt;
      onAlertCountChange?.(cnt);
    }
  }, [health, onAlertCountChange]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchHealth();
    fetchStats();
    intervalRef.current = setInterval(() => { void fetchHealth(true); void fetchStats(); }, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchHealth, fetchStats]);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (healthLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent mx-auto" />
          <p className="text-sm text-[var(--text-secondary)]">جاري فحص النظام...</p>
        </div>
      </div>
    );
  }

  // ─── Derived ──────────────────────────────────────────────────────────────
  const db      = health?.database  ?? { status: "warning" as const, message: "غير متاح" };
  const api     = health?.api       ?? { status: "warning" as const, message: "غير متاح" };
  const storage = health?.storage   ?? { status: "warning" as const, message: "غير متاح" };
  const memory  = health?.memory    ?? 0;
  const cpu     = health?.cpu       ?? 0;
  const conns   = health?.activeConnections ?? 0;
  const uptime  = health?.uptime    ?? null;
  const expiringSubs    = health?.expiring_subscriptions ?? [];
  const archivesAtLimit = health?.archives_at_limit      ?? [];
  const usersToday      = health?.users_today            ?? 0;
  const topSchools      = health?.top_active_schools     ?? [];

  const avgLatency = latencyHistory.length > 0
    ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length)
    : null;

  const hasServiceAlerts = db.status !== "healthy" || api.status !== "healthy" || storage.status !== "healthy" || memory > 80 || cpu > 80;
  const hasBusinessAlerts = expiringSubs.length > 0 || archivesAtLimit.length > 0;

  // Filtered events
  const filteredEvents = recentEvents.filter((e) => {
    if (!eventMatchesFilter(e.summary ?? "", eventFilter)) return false;
    if (eventSearch.trim() && !e.summary?.toLowerCase().includes(eventSearch.toLowerCase())) return false;
    return true;
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-[var(--text-primary)]">مراقبة النظام</h2>
          {lastChecked && (
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              آخر فحص: {fmtTime(lastChecked)} · تلقائي كل 30 ث
              {uptime && <span className="ms-2">· تشغيل: {uptime}</span>}
            </p>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="ui-button ui-button--secondary h-8 w-8 p-0"
          title="تحديث يدوي"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Error banner */}
      {healthError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{healthError}</span>
        </div>
      )}

      {/* ── 6 Status cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* DB */}
        <div className={`rounded-[20px] border-2 p-4 ${statusBorder(db.status)}`}>
          <div className="flex items-start justify-between mb-2">
            <Database size={18} />
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border border-current/20 bg-current/10">
              {statusLabel(db.status)}
            </span>
          </div>
          <p className="text-[10px] font-black opacity-70">قاعدة البيانات</p>
          <p className="text-xs font-black mt-0.5 truncate">{db.message}</p>
          {db.latency !== undefined && (
            <p className="text-[9px] font-bold mt-1 opacity-60">{db.latency}ms</p>
          )}
        </div>

        {/* API */}
        <div className={`rounded-[20px] border-2 p-4 ${statusBorder(api.status)}`}>
          <div className="flex items-start justify-between mb-2">
            <Server size={18} />
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border border-current/20 bg-current/10">
              {statusLabel(api.status)}
            </span>
          </div>
          <p className="text-[10px] font-black opacity-70">واجهة البرنامج</p>
          <p className="text-xs font-black mt-0.5 truncate">{api.message}</p>
          {apiLatency !== null && (
            <p className="text-[9px] font-bold mt-1 opacity-60">API: {apiLatency}ms</p>
          )}
        </div>

        {/* Storage */}
        <div className={`rounded-[20px] border-2 p-4 ${statusBorder(storage.status)}`}>
          <div className="flex items-start justify-between mb-2">
            <HardDrive size={18} />
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border border-current/20 bg-current/10">
              {statusLabel(storage.status)}
            </span>
          </div>
          <p className="text-[10px] font-black opacity-70">التخزين</p>
          <p className="text-xs font-black mt-0.5 truncate">{storage.message}</p>
        </div>

        {/* RBAC */}
        <div className="rounded-[20px] border-2 border-purple-200 bg-purple-50 text-purple-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <ShieldCheck size={18} />
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border border-purple-200 bg-purple-100">نشط</span>
          </div>
          <p className="text-[10px] font-black opacity-70">طبقة الحماية</p>
          <p className="text-xs font-black mt-0.5">RBAC Matrix</p>
        </div>

        {/* Realtime / Ping */}
        <div className={cx(
          "rounded-[20px] border-2 p-4",
          realtimeStatus === "open"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : realtimeStatus === "connecting"
              ? "border-yellow-200 bg-yellow-50 text-yellow-700"
              : "border-red-200 bg-red-50 text-red-700",
        )}>
          <div className="flex items-start justify-between mb-2">
            <Wifi size={18} />
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border border-current/20 bg-current/10">
              {realtimeStatus === "open" ? "متصل" : realtimeStatus === "connecting" ? "جاري" : "مقطوع"}
            </span>
          </div>
          <p className="text-[10px] font-black opacity-70">Realtime WS</p>
          <p className="text-xs font-black mt-0.5">
            {avgLatency !== null ? `~${avgLatency}ms` : "قيد القياس"}
          </p>
        </div>

        {/* Server */}
        <div className="rounded-[20px] border-2 border-green-200 bg-green-50 text-green-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <Activity size={18} />
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border border-green-200 bg-green-100">يعمل</span>
          </div>
          <p className="text-[10px] font-black opacity-70">حالة الخادم</p>
          <p className="text-xs font-black mt-0.5">Next.js Runtime</p>
        </div>
      </div>

      {/* ── Service Alerts ── */}
      {hasServiceAlerts && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 text-yellow-600 shrink-0" />
            <div>
              <p className="text-sm font-black text-yellow-900 mb-1">تنبيهات النظام</p>
              <ul className="space-y-0.5 text-xs text-yellow-800">
                {db.status      !== "healthy" && <li>• قاعدة البيانات: {db.message}</li>}
                {api.status     !== "healthy" && <li>• واجهة البرنامج: {api.message}</li>}
                {storage.status !== "healthy" && <li>• التخزين: {storage.message}</li>}
                {memory > 80                  && <li>• استخدام الذاكرة مرتفع ({memory}%)</li>}
                {cpu > 80                     && <li>• استخدام المعالج مرتفع ({cpu}%)</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Business Alerts ── */}
      {hasBusinessAlerts && (
        <div className="space-y-3">
          {/* Expiring subscriptions */}
          {expiringSubs.length > 0 && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <Bell size={16} className="mt-0.5 text-orange-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-orange-900 mb-2">
                    {expiringSubs.length} اشتراك ينتهي خلال 30 يوم
                  </p>
                  <div className="space-y-1.5">
                    {expiringSubs.slice(0, 5).map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between text-xs text-orange-800">
                        <span className="font-bold truncate max-w-[60%]">{sub.school_name}</span>
                        <span className={cx(
                          "font-black px-2 py-0.5 rounded-full",
                          (sub.days_left ?? 99) <= 7 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700",
                        )}>
                          {sub.days_left !== null ? `${sub.days_left} يوم` : sub.end_date}
                        </span>
                      </div>
                    ))}
                    {expiringSubs.length > 5 && (
                      <p className="text-[10px] text-orange-600 font-bold">+{expiringSubs.length - 5} أخرى</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Archives at limit */}
          {archivesAtLimit.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="mt-0.5 text-red-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-red-900 mb-2">
                    {archivesAtLimit.length} مدرسة وصلت الحد الأقصى للأرشيف (5/5)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {archivesAtLimit.map((a) => (
                      <span key={a.school_id} className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        {a.school_name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Resources + connections ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Resources */}
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm font-black text-[var(--text-primary)] mb-4">استخدام الموارد</p>
          <div className="space-y-4">
            {[
              { label: "الذاكرة", value: memory, color: "bg-blue-500" },
              { label: "المعالج", value: cpu,    color: "bg-purple-500" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-[var(--text-secondary)]">{label}</p>
                  <p className="text-xs font-black text-[var(--text-primary)]">{value}%</p>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--surface-muted)]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${color} ${value > 80 ? "animate-pulse" : ""}`}
                    style={{ width: `${Math.min(value, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connections + latency sparkline */}
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-[var(--text-tertiary)]">الاتصالات النشطة</p>
              <p className="text-3xl font-black text-blue-600 mt-0.5">{conns}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">اتصال نشط حالياً</p>
            </div>
            <div className="text-right space-y-2">
              <div>
                <p className="text-[10px] font-bold text-[var(--text-tertiary)]">مستخدمو اليوم</p>
                <p className="text-lg font-black text-green-600">{usersToday}</p>
              </div>
              {uptime && (
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-tertiary)]">مدة التشغيل</p>
                  <p className="text-sm font-black text-[var(--text-primary)]">{uptime}</p>
                </div>
              )}
            </div>
          </div>

          {latencyHistory.length > 1 && (
            <div>
              <p className="text-[10px] font-bold text-[var(--text-tertiary)] mb-1.5">
                DB Latency — آخر {latencyHistory.length} قراءة
              </p>
              <div className="flex items-end gap-0.5 h-8">
                {latencyHistory.map((v, i) => {
                  const max = Math.max(...latencyHistory, 1);
                  const pct = Math.max((v / max) * 100, 8);
                  const color = v > 500 ? "bg-red-400" : v > 200 ? "bg-yellow-400" : "bg-green-400";
                  return (
                    <div key={i} title={`${v}ms`} className={`flex-1 rounded-sm ${color}`} style={{ height: `${pct}%` }} />
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
            <Clock size={12} />
            <span>{lastChecked ? fmtTime(lastChecked) : "—"}</span>
          </div>
        </div>
      </div>

      {/* ── Top active schools ── */}
      {topSchools.length > 0 && (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[var(--primary)]" />
            <p className="text-sm font-black text-[var(--text-primary)]">أكثر المدارس نشاطاً هذا الشهر</p>
          </div>
          <div className="space-y-2">
            {topSchools.map((school, idx) => {
              const max = topSchools[0].payment_count;
              const pct = Math.max((school.payment_count / max) * 100, 4);
              return (
                <div key={school.school_id} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-[var(--text-tertiary)] w-4 shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-black truncate">{school.school_name}</p>
                      <p className="text-xs font-black text-[var(--primary)] shrink-0 ms-2">{school.payment_count} دفعة</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--surface-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Operational metrics + event log ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Metrics */}
        <SectionCard title="مؤشرات التشغيل" description="إحصائيات مباشرة حول الكيانات الأساسية.">
          {infrastructure.warnings.length > 0 && (
            <div className="mb-4">
              <MigrationNotice
                title="بعض المؤشرات تعمل بوضع توافق"
                description="تم تخفيف بعض الاستعلامات لأن أجزاء من admin_infrastructure.sql غير مطبقة بعد."
              />
            </div>
          )}
          <div className="space-y-3">
            {[
              { icon: Building2, label: "المدارس",    total: stats.schools,    active: stats.activeSchools },
              { icon: Users,     label: "المستخدمون", total: stats.users,      active: stats.activeUsers },
            ].map(({ icon: Icon, label, total, active }) => (
              <div key={label} className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <Icon size={16} className="text-[var(--text-tertiary)]" />
                  <span className="text-sm font-black">{label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-[var(--text-tertiary)]">الكل</p>
                    <p className="text-sm font-black">{total}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-[var(--success)]">نشط</p>
                    <p className="text-sm font-black text-[var(--success)]">{active}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <Database size={16} className="text-[var(--text-tertiary)]" />
                <span className="text-sm font-black">اتصال قاعدة البيانات</span>
              </div>
              <div className={cx(
                "ui-pill text-[10px] font-black",
                dbConnStatus === "connected" ? "ui-pill--success"
                  : dbConnStatus === "limited" ? "ui-pill--warning"
                  : dbConnStatus === "checking" ? "ui-pill"
                  : "ui-pill--danger",
              )}>
                {dbConnStatus === "connected" ? "متصل"
                  : dbConnStatus === "limited" ? "توافق"
                  : dbConnStatus === "checking" ? "فحص..."
                  : "خطأ"}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Event log */}
        <SectionCard
          title="أحدث أحداث النظام"
          description="متابعة فورية للنشاطات الأخيرة."
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportEventsCsv(filteredEvents)}
                disabled={filteredEvents.length === 0}
                className="ui-button ui-button--secondary h-8 w-8 p-0"
                title="تصدير CSV"
              >
                <Download size={13} />
              </button>
              <button
                onClick={refresh}
                disabled={refreshing}
                className="ui-button ui-button--secondary h-8 w-8 p-0"
              >
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
          }
        >
          {/* Filter tabs + search */}
          <div className="space-y-2 mb-3">
            <div className="flex gap-1.5">
              {EVENT_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setEventFilter(opt.value)}
                  className={cx(
                    "text-[10px] font-black px-2.5 py-1 rounded-full border transition-colors",
                    eventFilter === opt.value
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={12} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="بحث في الأحداث..."
                className="w-full ps-8 pe-3 py-1.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <CheckCircle2 size={22} className="text-[var(--success)]" />
                <p className="text-xs font-bold text-[var(--text-tertiary)]">لا توجد أحداث</p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate">{event.summary}</p>
                    <p className="text-[10px] font-bold text-[var(--text-tertiary)]">
                      {event.actor_name || "النظام"}
                    </p>
                  </div>
                  <span className="text-[9px] font-black text-[var(--text-tertiary)] shrink-0">
                    {relativeTime(event.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
