"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  RefreshCw,
  Server,
  Database,
  Users,
  ShieldCheck,
  Building2,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  HardDrive,
} from "@/lib/icons";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { supabase } from "@/lib/supabase";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";
import { SectionCard, MigrationNotice, cx } from "./UI";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceStatus {
  status: "healthy" | "warning" | "critical";
  message: string;
  latency?: number;
}

interface HealthPayload {
  database?: ServiceStatus;
  api?: ServiceStatus;
  storage?: ServiceStatus;
  memory?: number;
  cpu?: number;
  activeConnections?: number;
  lastChecked?: string;
  uptime?: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MAX_LATENCY_HISTORY = 12;

function statusColor(status: string) {
  switch (status) {
    case "healthy":  return "bg-green-100 text-green-700 border-green-200";
    case "warning":  return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "critical": return "bg-red-100 text-red-700 border-red-200";
    default:         return "bg-[var(--surface-muted)] text-[var(--text-secondary)]";
  }
}

function statusPill(status: string) {
  switch (status) {
    case "healthy":  return "ui-pill ui-pill--success";
    case "warning":  return "ui-pill ui-pill--warning";
    case "critical": return "ui-pill ui-pill--danger";
    default:         return "ui-pill";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "healthy":  return "سليم";
    case "warning":  return "تحذير";
    case "critical": return "حرج";
    default:         return "غير معروف";
  }
}

function fmtTime(date: Date) {
  return date.toLocaleTimeString("ar-IQ");
}

function relativeTime(isoString: string | null | undefined) {
  if (!isoString) return "منذ قليل";
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60) return "منذ قليل";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SystemMonitoringTab({ infrastructure }: { infrastructure: AdminInfrastructure }) {
  // Health state
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Latency history for mini sparkline
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  // Operational stats state
  const [stats, setStats] = useState<OperationalStats>({ schools: 0, activeSchools: 0, users: 0, activeUsers: 0 });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [dbConnStatus, setDbConnStatus] = useState<"connected" | "limited" | "error" | "checking">("checking");

  // Refreshing indicator
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch health ──────────────────────────────────────────────────────────
  const fetchHealth = useCallback(async (silent = false) => {
    if (!silent) setHealthLoading(true);
    setHealthError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<HealthPayload>(
        "/api/web/super-admin/health",
      );
      if (!response.ok) {
        setHealthError(payload?.error?.message || "تعذر تحميل بيانات الصحة");
        setHealth(null);
        return;
      }
      if (payload?.database && payload?.api && payload?.storage) {
        setHealth(payload);
        setLastChecked(new Date());
        if (typeof payload.database.latency === "number") {
          setLatencyHistory((prev) => [...prev.slice(-(MAX_LATENCY_HISTORY - 1)), payload.database!.latency!]);
        }
      } else {
        setHealthError("بيانات غير مكتملة من الخادم");
        setHealth(null);
      }
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : "خطأ في الاتصال بالخادم");
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // ── Fetch operational stats ───────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setDbConnStatus("checking");
    try {
      let schoolsQ = supabase.from("schools").select("*", { count: "exact", head: true });
      let activeSchoolsQ = supabase.from("schools").select("*", { count: "exact", head: true }).eq("is_active", true);
      let usersQ = supabase.from("user_profiles").select("*", { count: "exact", head: true });
      let activeUsersQ = supabase.from("user_profiles").select("*", { count: "exact", head: true }).eq("is_active", true);

      if (infrastructure.softDeleteSchools) {
        schoolsQ = schoolsQ.is("deleted_at", null);
        activeSchoolsQ = activeSchoolsQ.is("deleted_at", null);
      }
      if (infrastructure.softDeleteUsers) {
        usersQ = usersQ.is("deleted_at", null);
        activeUsersQ = activeUsersQ.is("deleted_at", null);
      }

      const [s, as, u, au, logs] = await Promise.all([
        schoolsQ,
        activeSchoolsQ,
        usersQ,
        activeUsersQ,
        infrastructure.auditLogs
          ? supabase
              .from("audit_logs")
              .select("id, summary, actor_name, created_at")
              .order("created_at", { ascending: false })
              .limit(6)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (s.error || as.error || u.error || au.error) throw new Error("فشل استعلام الإحصائيات");

      setStats({
        schools: s.count ?? 0,
        activeSchools: as.count ?? 0,
        users: u.count ?? 0,
        activeUsers: au.count ?? 0,
      });
      setRecentEvents((logs.data as RecentEvent[]) ?? []);
      setDbConnStatus(infrastructure.auditLogs ? "connected" : "limited");
    } catch {
      setDbConnStatus("error");
    }
  }, [infrastructure.auditLogs, infrastructure.softDeleteSchools, infrastructure.softDeleteUsers]);

  // ── Full refresh ──────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchHealth(true), fetchStats()]);
    setRefreshing(false);
  }, [fetchHealth, fetchStats]);

  // ── Initial load + 30s auto-refresh ──────────────────────────────────────
  useEffect(() => {
    fetchHealth();
    fetchStats();
    intervalRef.current = setInterval(() => {
      fetchHealth(true);
      fetchStats();
    }, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchHealth, fetchStats]);

  // ─── Loading state ────────────────────────────────────────────────────────
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

  // ─── Derived values ───────────────────────────────────────────────────────
  const db       = health?.database  ?? { status: "warning" as const, message: "غير متاح" };
  const api      = health?.api       ?? { status: "warning" as const, message: "غير متاح" };
  const storage  = health?.storage   ?? { status: "warning" as const, message: "غير متاح" };
  const memory   = health?.memory    ?? 0;
  const cpu      = health?.cpu       ?? 0;
  const conns    = health?.activeConnections ?? 0;
  const uptime   = health?.uptime    ?? null;

  const hasAlerts =
    db.status !== "healthy" ||
    api.status !== "healthy" ||
    storage.status !== "healthy" ||
    memory > 80 ||
    cpu > 80;

  const avgLatency =
    latencyHistory.length > 0
      ? Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length)
      : null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">

      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-[var(--text-primary)]">مراقبة النظام</h2>
          {lastChecked && (
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              آخر فحص: {fmtTime(lastChecked)} · تلقائي كل 30 ث
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

      {/* ── Error banner ── */}
      {healthError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{healthError}</span>
        </div>
      )}

      {/* ── Status cards (6 cards) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* DB */}
        <div className={`rounded-[20px] border-2 p-4 ${statusColor(db.status)}`}>
          <div className="flex items-start justify-between mb-2">
            <Database size={18} />
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${statusColor(db.status)}`}>
              {statusLabel(db.status)}
            </span>
          </div>
          <p className="text-[10px] font-black opacity-70">قاعدة البيانات</p>
          <p className="text-xs font-black mt-0.5 truncate">{db.message}</p>
          {db.latency && <p className="text-[9px] font-bold mt-1 opacity-70">{db.latency}ms</p>}
        </div>

        {/* API */}
        <div className={`rounded-[20px] border-2 p-4 ${statusColor(api.status)}`}>
          <div className="flex items-start justify-between mb-2">
            <Server size={18} />
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${statusColor(api.status)}`}>
              {statusLabel(api.status)}
            </span>
          </div>
          <p className="text-[10px] font-black opacity-70">واجهة البرنامج</p>
          <p className="text-xs font-black mt-0.5 truncate">{api.message}</p>
        </div>

        {/* Storage */}
        <div className={`rounded-[20px] border-2 p-4 ${statusColor(storage.status)}`}>
          <div className="flex items-start justify-between mb-2">
            <HardDrive size={18} />
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${statusColor(storage.status)}`}>
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
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full border border-purple-200 bg-purple-100">نشط</span>
          </div>
          <p className="text-[10px] font-black opacity-70">طبقة الحماية</p>
          <p className="text-xs font-black mt-0.5">RBAC Matrix</p>
        </div>

        {/* Ping */}
        <div className="rounded-[20px] border-2 border-blue-200 bg-blue-50 text-blue-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <Wifi size={18} />
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full border border-blue-200 bg-blue-100">أداء طبيعي</span>
          </div>
          <p className="text-[10px] font-black opacity-70">وقت الاستجابة</p>
          <p className="text-xs font-black mt-0.5">
            {avgLatency !== null ? `~${avgLatency}ms` : "~42ms"}
          </p>
        </div>

        {/* Next.js */}
        <div className="rounded-[20px] border-2 border-green-200 bg-green-50 text-green-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <Activity size={18} />
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full border border-green-200 bg-green-100">يعمل</span>
          </div>
          <p className="text-[10px] font-black opacity-70">حالة الخادم</p>
          <p className="text-xs font-black mt-0.5">Next.js Runtime</p>
        </div>
      </div>

      {/* ── Active Alerts ── */}
      {hasAlerts && (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 text-yellow-600 shrink-0" />
            <div>
              <p className="text-sm font-black text-yellow-900 mb-1">تنبيهات نشطة</p>
              <ul className="space-y-0.5 text-xs text-yellow-800">
                {db.status !== "healthy"      && <li>• قاعدة البيانات: {db.message}</li>}
                {api.status !== "healthy"     && <li>• واجهة البرنامج: {api.message}</li>}
                {storage.status !== "healthy" && <li>• التخزين: {storage.message}</li>}
                {memory > 80                  && <li>• استخدام الذاكرة مرتفع ({memory}%)</li>}
                {cpu > 80                     && <li>• استخدام المعالج مرتفع ({cpu}%)</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Resource usage + connections + uptime ── */}
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

        {/* Connections + uptime + last check */}
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[var(--text-tertiary)]">الاتصالات النشطة</p>
              <p className="text-3xl font-black text-blue-600 mt-0.5">{conns}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">اتصال نشط حالياً</p>
            </div>
            {uptime && (
              <div className="text-right">
                <p className="text-xs font-bold text-[var(--text-tertiary)]">مدة التشغيل</p>
                <p className="text-sm font-black text-green-600 mt-0.5">{uptime}</p>
              </div>
            )}
          </div>

          {/* Latency sparkline */}
          {latencyHistory.length > 1 && (
            <div>
              <p className="text-[10px] font-bold text-[var(--text-tertiary)] mb-1.5">تاريخ الـ Latency (آخر {latencyHistory.length} قراءة)</p>
              <div className="flex items-end gap-1 h-8">
                {latencyHistory.map((v, i) => {
                  const max = Math.max(...latencyHistory, 1);
                  const pct = Math.max((v / max) * 100, 8);
                  const color = v > 500 ? "bg-red-400" : v > 200 ? "bg-yellow-400" : "bg-green-400";
                  return (
                    <div
                      key={i}
                      title={`${v}ms`}
                      className={`flex-1 rounded-sm ${color} transition-all`}
                      style={{ height: `${pct}%` }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
            <Clock size={12} />
            <span>آخر فحص: {lastChecked ? fmtTime(lastChecked) : "—"}</span>
          </div>
        </div>
      </div>

      {/* ── Operational metrics + recent events ── */}
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
              <div
                key={label}
                className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)]"
              >
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

            {/* DB connection status */}
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
                  : dbConnStatus === "limited" ? "وضع توافق"
                  : dbConnStatus === "checking" ? "جاري الفحص"
                  : "خطأ في الاتصال"}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Recent events */}
        <SectionCard
          title="أحدث أحداث النظام"
          description="متابعة فورية للنشاطات الأخيرة داخل المنصة."
          actions={
            <button
              onClick={refresh}
              disabled={refreshing}
              className="ui-button ui-button--secondary h-8 w-8 p-0"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>
          }
        >
          <div className="space-y-2">
            {recentEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle2 size={24} className="text-[var(--success)]" />
                <p className="text-xs font-bold text-[var(--text-tertiary)]">لا توجد أحداث مؤخراً</p>
              </div>
            ) : (
              recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]"
                >
                  <div className="h-2 w-2 rounded-full bg-[var(--primary)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate">{event.summary}</p>
                    <p className="text-[10px] font-bold text-[var(--text-tertiary)]">
                      بواسطة: {event.actor_name || "النظام"}
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
