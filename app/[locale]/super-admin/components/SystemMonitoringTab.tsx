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
import { MigrationNotice, cx } from "./UI";

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

function statusDot(status: string) {
  switch (status) {
    case "healthy":  return "bg-green-500";
    case "warning":  return "bg-yellow-500";
    case "critical": return "bg-red-500";
    default:         return "bg-[var(--text-muted)]";
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

function statusRowColor(status: string) {
  switch (status) {
    case "healthy":  return "text-green-700";
    case "warning":  return "text-yellow-700";
    case "critical": return "text-red-700";
    default:         return "text-[var(--text-secondary)]";
  }
}

function fmtTime(date: Date) { return date.toLocaleTimeString("ar-IQ-u-nu-latn"); }

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
  const [health, setHealth]             = useState<HealthPayload | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError]   = useState<string | null>(null);
  const [lastChecked, setLastChecked]   = useState<Date | null>(null);
  const [apiLatency, setApiLatency]     = useState<number | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<"open" | "connecting" | "closed">("connecting");

  const [stats, setStats]           = useState<OperationalStats>({ schools: 0, activeSchools: 0, users: 0, activeUsers: 0 });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [dbConnStatus, setDbConnStatus] = useState<"connected" | "limited" | "error" | "checking">("checking");

  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [eventSearch, setEventSearch] = useState("");

  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertCountRef = useRef(0);

  useEffect(() => {
    const ch = supabase.channel("__monitor_ping__");
    ch.subscribe((status: string) => {
      if (status === "SUBSCRIBED") setRealtimeStatus("open");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeStatus("closed");
      else setRealtimeStatus("connecting");
    });
    return () => { void supabase.removeChannel(ch); };
  }, []);

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

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchHealth(true), fetchStats()]);
    setRefreshing(false);
  }, [fetchHealth, fetchStats]);

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

  useEffect(() => {
    fetchHealth();
    fetchStats();
    intervalRef.current = setInterval(() => { void fetchHealth(true); void fetchStats(); }, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchHealth, fetchStats]);

  if (healthLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

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

  const filteredEvents = recentEvents.filter((e) => {
    if (!eventMatchesFilter(e.summary ?? "", eventFilter)) return false;
    if (eventSearch.trim() && !e.summary?.toLowerCase().includes(eventSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div>
          <span className="text-xs font-black text-[var(--text-primary)]">مراقبة النظام</span>
          {lastChecked && (
            <span className="ms-2 text-[10px] text-[var(--text-muted)]">
              آخر فحص: {fmtTime(lastChecked)} · كل 30ث
              {uptime && <span className="ms-1">· {uptime}</span>}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          title="تحديث يدوي"
        >
          <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Error banner */}
      {healthError && (
        <div className="flex items-center gap-2 rounded border border-[var(--danger)]/20 bg-[var(--danger)]/8 px-3 py-2 text-xs text-[var(--danger)]">
          <AlertTriangle size={13} className="shrink-0" />
          <span>{healthError}</span>
        </div>
      )}

      {/* Compact 2-column service status grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
        {[
          { icon: Database,    label: "قاعدة البيانات", status: db.status,                                          msg: db.message,      extra: db.latency !== undefined ? `${db.latency}ms` : undefined },
          { icon: Server,      label: "واجهة البرنامج", status: api.status,                                         msg: api.message,     extra: apiLatency !== null ? `API: ${apiLatency}ms` : undefined },
          { icon: HardDrive,   label: "التخزين",        status: storage.status,                                     msg: storage.message, extra: undefined },
          { icon: ShieldCheck, label: "RBAC",            status: "healthy" as const,                                 msg: "Matrix نشط",   extra: undefined },
          { icon: Wifi,        label: "Realtime WS",    status: realtimeStatus === "open" ? "healthy" as const : realtimeStatus === "connecting" ? "warning" as const : "critical" as const, msg: realtimeStatus === "open" ? "متصل" : realtimeStatus === "connecting" ? "جاري الاتصال" : "مقطوع", extra: avgLatency !== null ? `~${avgLatency}ms` : undefined },
          { icon: Activity,    label: "الخادم",          status: "healthy" as const,                                 msg: "Next.js يعمل", extra: undefined },
        ].map(({ icon: Icon, label, status, msg, extra }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1.5"
          >
            <span className={cx("inline-block h-1.5 w-1.5 shrink-0 rounded-full", statusDot(status))} />
            <Icon size={12} className="shrink-0 text-[var(--text-muted)]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black text-[var(--text-primary)] truncate">{label}</span>
                <span className={cx("text-[9px] font-black shrink-0", statusRowColor(status))}>{statusLabel(status)}</span>
              </div>
              <div className="text-[10px] text-[var(--text-muted)] truncate">{msg}{extra && ` · ${extra}`}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Service alerts */}
      {hasServiceAlerts && (
        <div className="flex items-start gap-2 rounded border border-[var(--warning)]/20 bg-[var(--warning)]/8 px-3 py-2">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-[var(--warning)]" />
          <div className="text-xs text-[var(--warning)] space-y-0.5">
            {db.status      !== "healthy" && <div>قاعدة البيانات: {db.message}</div>}
            {api.status     !== "healthy" && <div>واجهة البرنامج: {api.message}</div>}
            {storage.status !== "healthy" && <div>التخزين: {storage.message}</div>}
            {memory > 80 && <div>الذاكرة مرتفعة ({memory}%)</div>}
            {cpu > 80    && <div>المعالج مرتفع ({cpu}%)</div>}
          </div>
        </div>
      )}

      {/* Business alerts */}
      {hasBusinessAlerts && (
        <div className="space-y-1.5">
          {expiringSubs.length > 0 && (
            <div className="flex items-start gap-2 rounded border border-[var(--warning)]/20 bg-[var(--warning)]/8 px-3 py-2">
              <Bell size={12} className="mt-0.5 shrink-0 text-[var(--warning)]" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-[var(--warning)]">{expiringSubs.length} اشتراك ينتهي خلال 30 يوم</p>
                <div className="mt-1 space-y-0.5">
                  {expiringSubs.slice(0, 5).map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                      <span className="font-bold truncate max-w-[60%]">{sub.school_name}</span>
                      <span className={cx("font-black", (sub.days_left ?? 99) <= 7 ? "text-[var(--danger)]" : "")}>
                        {sub.days_left !== null ? `${sub.days_left} يوم` : sub.end_date}
                      </span>
                    </div>
                  ))}
                  {expiringSubs.length > 5 && <p className="text-[10px] text-[var(--text-muted)]">+{expiringSubs.length - 5} أخرى</p>}
                </div>
              </div>
            </div>
          )}
          {archivesAtLimit.length > 0 && (
            <div className="flex items-start gap-2 rounded border border-[var(--danger)]/20 bg-[var(--danger)]/8 px-3 py-2">
              <AlertTriangle size={12} className="mt-0.5 shrink-0 text-[var(--danger)]" />
              <div>
                <p className="text-xs font-black text-[var(--danger)]">{archivesAtLimit.length} مدرسة وصلت الحد الأقصى للأرشيف (5/5)</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {archivesAtLimit.map((a) => (
                    <span key={a.school_id} className="text-[10px] font-black bg-[var(--danger)]/10 text-[var(--danger)] px-1.5 py-0.5 rounded">
                      {a.school_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resources + connections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Resources */}
        <div className="rounded-md border border-[var(--border)] p-3">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">استخدام الموارد</p>
          <div className="space-y-2">
            {[
              { label: "الذاكرة", value: memory, color: "bg-blue-500" },
              { label: "المعالج", value: cpu,    color: "bg-purple-500" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)]">{label}</span>
                  {value > 0 && <span className="text-[11px] font-black">{value}%</span>}
                </div>
                {value > 0 ? (
                  <div className="h-1.5 rounded-full bg-[var(--surface-muted)]">
                    <div
                      className={`h-full rounded-full transition-all ${color} ${value > 80 ? "animate-pulse" : ""}`}
                      style={{ width: `${Math.min(value, 100)}%` }}
                    />
                  </div>
                ) : (
                  <span className="text-[10px] text-[var(--text-muted)]">غير متاح</span>
                )}
              </div>
            ))}
          </div>

          {/* Connections row */}
          <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">اتصالات نشطة</span>
            <span className="font-black text-blue-600">{conns}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">مستخدمو اليوم</span>
            <span className="font-black text-green-600">{usersToday}</span>
          </div>
          {uptime && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">مدة التشغيل</span>
              <span className="font-black text-[var(--text-primary)]">{uptime}</span>
            </div>
          )}

          {/* Latency sparkline */}
          {latencyHistory.length > 1 && (
            <div className="mt-2">
              <p className="text-[10px] font-bold text-[var(--text-muted)] mb-1">DB Latency · آخر {latencyHistory.length} قراءة</p>
              <div className="flex items-end gap-0.5 h-6">
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

          <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
            <Clock size={10} />
            <span>{lastChecked ? fmtTime(lastChecked) : "—"}</span>
          </div>
        </div>

        {/* Operational metrics */}
        <div className="rounded-md border border-[var(--border)] p-3 space-y-2">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase mb-1">مؤشرات التشغيل</p>

          {infrastructure.warnings.length > 0 && (
            <MigrationNotice
              title="بعض المؤشرات تعمل بوضع توافق"
              description="تم تخفيف بعض الاستعلامات لأن أجزاء من admin_infrastructure.sql غير مطبقة بعد."
            />
          )}

          {[
            { icon: Building2, label: "المدارس",    total: stats.schools,    active: stats.activeSchools },
            { icon: Users,     label: "المستخدمون", total: stats.users,      active: stats.activeUsers },
          ].map(({ icon: Icon, label, total, active }) => (
            <div key={label} className="flex items-center justify-between py-1 border-b border-[var(--border)]">
              <div className="flex items-center gap-1.5">
                <Icon size={12} className="text-[var(--text-muted)]" />
                <span className="text-xs font-black">{label}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[var(--text-muted)]">الكل: <span className="font-black text-[var(--text-primary)]">{total}</span></span>
                <span className="text-[var(--success)] font-black">{active} نشط</span>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between py-1 border-b border-[var(--border)]">
            <div className="flex items-center gap-1.5">
              <Database size={12} className="text-[var(--text-muted)]" />
              <span className="text-xs font-black">اتصال قاعدة البيانات</span>
            </div>
            <span className={cx(
              "ui-pill text-[10px] font-black",
              dbConnStatus === "connected" ? "ui-pill--success"
                : dbConnStatus === "limited" ? "ui-pill--warning"
                : dbConnStatus === "checking" ? "ui-pill"
                : "ui-pill--danger",
            )}>
              {dbConnStatus === "connected" ? "متصل" : dbConnStatus === "limited" ? "توافق" : dbConnStatus === "checking" ? "فحص..." : "خطأ"}
            </span>
          </div>

          {/* Top schools */}
          {topSchools.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp size={10} className="text-[var(--primary)]" />
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase">أكثر المدارس نشاطاً</p>
              </div>
              {topSchools.map((school, idx) => {
                const max = topSchools[0].payment_count;
                const pct = Math.max((school.payment_count / max) * 100, 4);
                return (
                  <div key={school.school_id} className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-[var(--text-muted)] w-3 shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[11px] font-black truncate">{school.school_name}</p>
                        <p className="text-[10px] font-black text-[var(--primary)] shrink-0 ms-1">{school.payment_count}</p>
                      </div>
                      <div className="h-1 rounded-full bg-[var(--surface-muted)]">
                        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Event log */}
      <div className="rounded-md border border-[var(--border)] p-3">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase flex-1">أحدث أحداث النظام</p>
          {EVENT_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setEventFilter(opt.value)}
              className={cx(
                "text-[10px] font-black px-2 py-0.5 rounded border transition-colors",
                eventFilter === opt.value
                  ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              {opt.label}
            </button>
          ))}
          <div className="relative">
            <Search size={10} className="absolute start-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder="بحث..."
              className="h-6 rounded border border-[var(--border)] bg-[var(--surface-muted)] ps-6 pe-2 text-[11px] outline-none focus:border-[var(--primary)]"
            />
          </div>
          <button
            onClick={() => exportEventsCsv(filteredEvents)}
            disabled={filteredEvents.length === 0}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] disabled:opacity-40"
            title="تصدير CSV"
          >
            <Download size={11} />
          </button>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="max-h-48 overflow-y-auto custom-scrollbar">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 gap-1">
              <CheckCircle2 size={16} className="text-[var(--success)]" />
              <p className="text-[11px] text-[var(--text-muted)]">لا توجد أحداث</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-2 py-1.5 border-b border-[var(--border)]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black truncate">{event.summary}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{event.actor_name || "النظام"}</p>
                </div>
                <span className="text-[9px] font-black text-[var(--text-muted)] shrink-0">
                  {relativeTime(event.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
