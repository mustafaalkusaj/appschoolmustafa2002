"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Archive,
  Clock3,
  GitBranch,
  GraduationCap,
  History,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Wifi,
} from "@/lib/icons";
import { cn } from "@/lib/brand/brand-utils";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { supabase } from "@/lib/supabase";
import type { AdminInfrastructure } from "@/lib/admin-infrastructure";
import type { AppSchemaCompat } from "@/lib/schema-compat";

import { AuditLogTab }         from "./AuditLogTab";
import { RolesTab }            from "./RolesTab";
import { TrashTab }            from "./TrashTab";
import { SystemMonitoringTab } from "./SystemMonitoringTab";
import { BranchesTab }         from "./BranchesTab";
import { AnalyticsTab }        from "./AnalyticsTab";
import { BulkOperationsTab }   from "./BulkOperationsTab";
import { PaymentArchivesTab }  from "./PaymentArchivesTab";
import { ErrorsTab }            from "./ErrorsTab";
import { HealthMonitoringTab }  from "./HealthMonitoringTab";
import { ActivityTimelineTab }  from "./ActivityTimelineTab";
import { StudentCountsTab }     from "./StudentCountsTab";

// ─── Types ──────────────────────────────────────────────────────────────────

type ToolId =
  | "monitoring" | "audit" | "analytics" | "payment-archives"
  | "branches" | "roles" | "trash" | "bulk"
  | "errors" | "health" | "timeline" | "students";

type ServiceHealth = "healthy" | "warning" | "critical" | "unknown";

interface SystemHealth {
  db: ServiceHealth;
  api: ServiceHealth;
  realtime: ServiceHealth;
  alertCount: number;
}

interface ToolDef {
  id: ToolId;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;       // CSS class for active bg/text
  dot: string;         // dot color
  available: (inf: AdminInfrastructure) => boolean;
}

const TOOLS: ToolDef[] = [
  { id: "monitoring",       label: "مراقبة",    desc: "صحة الخوادم",      icon: Activity,    color: "bg-sky-500/10 text-sky-600 border-sky-500/20",     dot: "bg-sky-500",     available: () => true },
  { id: "analytics",        label: "تحليلات",   desc: "إحصاءات المنصة",   icon: TrendingUp,  color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", dot: "bg-emerald-500", available: () => true },
  { id: "audit",            label: "تدقيق",     desc: "سجل العمليات",     icon: History,     color: "bg-violet-500/10 text-violet-600 border-violet-500/20",   dot: "bg-violet-500",  available: inf => inf.auditLogs },
  { id: "payment-archives", label: "أرشيف",     desc: "مدفوعات مؤرشفة",   icon: Archive,     color: "bg-amber-500/10 text-amber-600 border-amber-500/20",     dot: "bg-amber-500",   available: () => true },
  { id: "branches",         label: "فروع",      desc: "إدارة الفروع",     icon: GitBranch,   color: "bg-teal-500/10 text-teal-600 border-teal-500/20",       dot: "bg-teal-500",    available: inf => inf.branches },
  { id: "roles",            label: "صلاحيات",   desc: "أدوار مخصصة",      icon: ShieldCheck, color: "bg-rose-500/10 text-rose-600 border-rose-500/20",       dot: "bg-rose-500",    available: inf => inf.customRoles },
  { id: "trash",            label: "محذوفات",   desc: "سلة المحذوفات",    icon: Trash2,      color: "bg-orange-500/10 text-orange-600 border-orange-500/20",  dot: "bg-orange-500",  available: inf => inf.softDeleteSchools || inf.softDeleteUsers },
  { id: "bulk",             label: "استيراد",   desc: "رفع ملفات CSV",    icon: Plus,        color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",  dot: "bg-indigo-500",  available: () => true },
  { id: "errors",           label: "أخطاء",     desc: "سجل الأخطاء",      icon: AlertTriangle,  color: "bg-red-500/10 text-red-600 border-red-500/20",           dot: "bg-red-500",       available: () => true },
  { id: "health",           label: "صحة",       desc: "فحص الخوادم",      icon: Server,         color: "bg-green-500/10 text-green-600 border-green-500/20",       dot: "bg-green-500",     available: () => true },
  { id: "timeline",         label: "نشاط",      desc: "سجل الأحداث",      icon: Clock3,         color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",           dot: "bg-cyan-500",      available: () => true },
  { id: "students",         label: "طلاب",      desc: "أعداد المدارس",    icon: GraduationCap,  color: "bg-lime-500/10 text-lime-600 border-lime-500/20",           dot: "bg-lime-500",      available: () => true },
];

// ─── Health bar ──────────────────────────────────────────────────────────────

function HealthBar({ health, refreshing, onRefresh }: {
  health: SystemHealth;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const svc = (s: ServiceHealth) =>
    s === "healthy"  ? "bg-emerald-500"
    : s === "warning"  ? "bg-amber-500"
    : s === "critical" ? "bg-red-500"
    : "bg-[var(--text-muted)]";

  const label = (s: ServiceHealth) =>
    s === "healthy" ? "سليم" : s === "warning" ? "تحذير" : s === "critical" ? "خطأ" : "غير معروف";

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] bg-[var(--surface-muted)]">
      {/* Services */}
      <div className="flex items-center gap-3">
        {([
          { key: "DB",  s: health.db },
          { key: "API", s: health.api },
          { key: "RT",  s: health.realtime },
        ] as { key: string; s: ServiceHealth }[]).map(({ key, s }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full shrink-0", svc(s))} />
            <span className="text-[10px] font-black text-[var(--text-muted)]">{key}</span>
            <span className={cn(
              "text-[9px] font-bold",
              s === "healthy" ? "text-emerald-600" : s === "critical" ? "text-red-600" : "text-amber-600"
            )}>
              {label(s)}
            </span>
          </div>
        ))}
      </div>

      {/* Alert count or all-ok */}
      <div className="ms-auto flex items-center gap-2">
        {health.alertCount > 0 ? (
          <span className="flex items-center gap-1 rounded border border-[var(--danger)]/20 bg-[var(--danger)]/8 px-2 py-0.5 text-[10px] font-black text-[var(--danger)]">
            <AlertTriangle size={10} />
            {health.alertCount} تنبيه
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
            <CheckCircle2 size={11} />
            كل الخدمات سليمة
          </span>
        )}
        <button
          onClick={onRefresh}
          className="h-6 w-6 flex items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="تحديث الحالة"
        >
          <RefreshCw size={10} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface SystemViewProps {
  infrastructure: AdminInfrastructure;
  schemaCompat: AppSchemaCompat | null;
  schools: Array<{ id: string; name: string }>;
  onAlertCountChange?: (count: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SystemView({ infrastructure, schemaCompat, schools, onAlertCountChange }: SystemViewProps) {
  const [activeTool, setActiveTool] = useState<ToolId>("monitoring");
  const [health, setHealth]         = useState<SystemHealth>({ db: "unknown", api: "unknown", realtime: "unknown", alertCount: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const availableTools = TOOLS.filter(t => t.available(infrastructure));
  const activeDef = availableTools.find(t => t.id === activeTool) ?? availableTools[0];

  // ── Health fetch ────────────────────────────────────────────────────────
  const fetchHealth = useCallback(async () => {
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        database?: { status: string };
        api?: { status: string };
        expiring_subscriptions?: unknown[];
        archives_at_limit?: unknown[];
      }>("/api/web/super-admin/health");

      if (!response.ok) { setHealth(prev => ({ ...prev, api: "critical" })); return; }

      const db  = payload?.database?.status as ServiceHealth ?? "unknown";
      const api = payload?.api?.status     as ServiceHealth ?? "unknown";
      const alertCount =
        (db  !== "healthy" ? 1 : 0) +
        (api !== "healthy" ? 1 : 0) +
        ((payload?.expiring_subscriptions?.length ?? 0) > 0 ? 1 : 0) +
        ((payload?.archives_at_limit?.length       ?? 0) > 0 ? 1 : 0);

      setHealth(prev => ({ ...prev, db, api, alertCount }));
      onAlertCountChange?.(alertCount);
    } catch {
      setHealth(prev => ({ ...prev, api: "critical" }));
    }
  }, [onAlertCountChange]);

  // ── Realtime ping ───────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel("__system_view_ping__");
    ch.subscribe((status: string) => {
      setHealth(prev => ({
        ...prev,
        realtime: status === "SUBSCRIBED" ? "healthy"
          : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "critical"
          : "warning",
      }));
    });
    return () => { void supabase.removeChannel(ch); };
  }, []);

  // ── Poll ────────────────────────────────────────────────────────────────
  useEffect(() => {
    void fetchHealth();
    intervalRef.current = setInterval(() => void fetchHealth(), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchHealth]);

  // ── Guard active tool ───────────────────────────────────────────────────
  useEffect(() => {
    if (!availableTools.find(t => t.id === activeTool)) {
      setActiveTool(availableTools[0]?.id ?? "monitoring");
    }
  }, [availableTools, activeTool]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHealth();
    setRefreshing(false);
  }, [fetchHealth]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] overflow-hidden">

      {/* ── Health bar (top) ──────────────────────────────────────────── */}
      <HealthBar health={health} refreshing={refreshing} onRefresh={() => void handleRefresh()} />

      {/* ── Split layout ─────────────────────────────────────────────── */}
      <div className="flex min-h-[480px]">

        {/* ── Left sidebar: tool selector ───────────────────────────── */}
        <nav className="w-28 shrink-0 border-e border-[var(--border)] bg-[var(--surface-muted)] flex flex-col py-2 gap-0.5">
          {availableTools.map(tool => {
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 mx-1.5 px-2 py-3 rounded-lg text-center transition-all",
                  active
                    ? cn("border", tool.color)
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-secondary)]"
                )}
              >
                {/* Active indicator */}
                {active && (
                  <span className={cn("absolute inset-y-2 start-0 w-0.5 rounded-full", tool.dot)} />
                )}
                <tool.icon size={16} className="shrink-0" />
                <span className="text-[10px] font-black leading-tight">{tool.label}</span>
                <span className="text-[9px] font-bold opacity-60 leading-tight">{tool.desc}</span>
                {tool.id === "monitoring" && health.alertCount > 0 && (
                  <span className="absolute top-1.5 end-1.5 h-4 min-w-4 rounded-full bg-[var(--danger)] text-[8px] font-black text-white flex items-center justify-center px-0.5">
                    {health.alertCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* RT connection dot at bottom */}
          <div className="mt-auto px-3 pb-2 flex items-center gap-1.5">
            <Wifi size={10} className={cn(
              health.realtime === "healthy" ? "text-emerald-500"
              : health.realtime === "critical" ? "text-red-500"
              : "text-[var(--text-muted)]"
            )} />
            <span className="text-[9px] font-bold text-[var(--text-muted)]">Realtime</span>
          </div>
        </nav>

        {/* ── Right: content ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 bg-[var(--card-bg)] flex flex-col">
          {/* Tool header */}
          {activeDef && (
            <div className={cn(
              "flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)]",
            )}>
              <span className={cn(
                "inline-flex items-center justify-center h-6 w-6 rounded border",
                activeDef.color,
              )}>
                <activeDef.icon size={13} />
              </span>
              <div>
                <span className="text-xs font-black text-[var(--text-primary)]">{activeDef.label}</span>
                <span className="ms-2 text-[10px] text-[var(--text-muted)]">{activeDef.desc}</span>
              </div>
            </div>
          )}

          {/* Tool content */}
          <div className="p-4 flex-1 overflow-y-auto">
            {activeTool === "monitoring"       && <SystemMonitoringTab infrastructure={infrastructure} onAlertCountChange={onAlertCountChange} />}
            {activeTool === "audit"            && <AuditLogTab infrastructure={infrastructure} />}
            {activeTool === "analytics"        && <AnalyticsTab />}
            {activeTool === "payment-archives" && <PaymentArchivesTab />}
            {activeTool === "branches"         && <BranchesTab infrastructure={infrastructure} schemaCompat={schemaCompat} />}
            {activeTool === "roles"            && <RolesTab infrastructure={infrastructure} schools={schools} />}
            {activeTool === "trash"            && <TrashTab infrastructure={infrastructure} />}
            {activeTool === "bulk"             && <BulkOperationsTab />}
            {activeTool === "errors"           && <ErrorsTab />}
            {activeTool === "health"           && <HealthMonitoringTab />}
            {activeTool === "timeline"         && <ActivityTimelineTab />}
            {activeTool === "students"         && <StudentCountsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
