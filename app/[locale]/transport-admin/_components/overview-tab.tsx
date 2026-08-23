"use client";

import { useMemo } from "react";
import { formatNumber } from "@/lib/formatting";
import { cn } from "@/lib/brand/brand-utils";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, GitBranch, Plus, Bus, AlertTriangle } from "@/lib/icons";
import type { DriverRow, RouteRow } from "./types";

function EmptyWithCTA({ message, cta, onClick }: { message: string; cta: string; onClick: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center gap-3 py-10">
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
      <button onClick={onClick} className="flex items-center gap-2 rounded-xl bg-[var(--success)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-colors">
        <Plus className="h-4 w-4" /> {cta}
      </button>
    </div>
  );
}

export function OverviewTab({
  drivers, routes, activeDrivers, activeRoutes, totalStudents, onSwitchTab,
}: {
  drivers: DriverRow[];
  routes: RouteRow[];
  activeDrivers: number;
  activeRoutes: number;
  totalStudents: number;
  onSwitchTab: (tab: "drivers" | "routes") => void;
}) {
  const driverStats = useMemo(() => {
    const map = new Map<string, { students: number; routeCount: number; routeNames: string[] }>();
    for (const r of routes) {
      if (!r.driver_id) continue;
      const prev = map.get(r.driver_id) || { students: 0, routeCount: 0, routeNames: [] };
      prev.students += r.student_count || 0;
      prev.routeCount += 1;
      prev.routeNames.push(r.name);
      map.set(r.driver_id, prev);
    }
    return map;
  }, [routes]);

  const unassignedRoutes = useMemo(() => routes.filter((r) => r.is_active && !r.driver_id), [routes]);
  const avgStudents = activeRoutes > 0 ? Math.round(totalStudents / activeRoutes) : 0;
  const maxStudents = useMemo(() => {
    const vals = Array.from(driverStats.values()).map((v) => v.students);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [driverStats]);

  return (
    <div className="space-y-6">
      <KPIGrid className="grid-cols-2 lg:grid-cols-4">
        <StatsCard label="اجمالي السواق" value={formatNumber(drivers.length)} icon={Users} description={`${activeDrivers} نشط`} variant="info" />
        <StatsCard label="اجمالي الخطوط" value={formatNumber(routes.length)} icon={GitBranch} description={`${activeRoutes} نشط`} variant="success" />
        <StatsCard label="اجمالي الطلاب" value={formatNumber(totalStudents)} icon={Users} description="مسجلين بالنقل" variant="warning" />
        <StatsCard label="معدل طلاب/خط" value={formatNumber(avgStudents)} icon={Bus} description="متوسط لكل خط" variant="info" />
      </KPIGrid>

      {unassignedRoutes.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--warning)]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">{unassignedRoutes.length} خط بدون سائق</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{unassignedRoutes.map((r) => r.name).join("، ")}</p>
          </div>
          <button onClick={() => onSwitchTab("routes")} className="shrink-0 rounded-lg bg-[var(--warning)] px-3 py-1 text-xs font-bold text-white hover:opacity-90 transition-colors">
            تعيين
          </button>
        </div>
      )}

      <Card>
        <CardHeader className="border-b border-[var(--border)]">
          <CardTitle className="text-sm font-bold">توزيع الطلاب على السواق</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {drivers.map((d) => {
              const info = driverStats.get(d.id);
              const students = info?.students || 0;
              const routeCount = info?.routeCount || 0;
              const routeNames = info?.routeNames || [];
              const pct = maxStudents > 0 ? (students / maxStudents) * 100 : 0;
              return (
                <div key={d.id} className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[var(--surface-soft)]">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", d.status === "active" ? "bg-[var(--success)]" : "bg-[var(--text-muted)]")}>
                    {(d.full_name || "?")[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-[var(--text-primary)] truncate block">{d.full_name}</span>
                        {routeNames.length > 0 && (
                          <span className="text-[10px] text-[var(--text-muted)] truncate block">{routeNames.join("، ")}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ms-3">
                        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-medium tabular-nums text-[var(--text-muted)] group-hover:bg-[var(--surface)]">{routeCount} خط</span>
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--success)]">{students} طالب</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--surface-soft)] overflow-hidden group-hover:bg-[var(--surface)]">
                      <div className="h-full rounded-full bg-[var(--success)] transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {drivers.length === 0 && <EmptyWithCTA message="لا يوجد سواق بعد" cta="اضف سائق" onClick={() => onSwitchTab("drivers")} />}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-[var(--border)]">
          <CardTitle className="text-sm font-bold">الخطوط النشطة</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {routes.filter((r) => r.is_active).map((r) => (
              <div key={r.id} className="rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-soft)]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{r.name}</p>
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums" style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}>
                    {formatNumber(r.monthly_fee)} IQD
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {r.drivers?.full_name || <span className="text-[var(--warning)]">غير معين</span>}
                  </span>
                  <span className="tabular-nums">{r.student_count || 0} طالب</span>
                </div>
              </div>
            ))}
            {routes.filter((r) => r.is_active).length === 0 && <EmptyWithCTA message="لا يوجد خطوط نشطة" cta="اضف خط" onClick={() => onSwitchTab("routes")} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
