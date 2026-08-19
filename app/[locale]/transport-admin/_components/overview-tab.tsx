"use client";

import { formatNumber } from "@/lib/formatting";
import { cn } from "@/lib/brand/brand-utils";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, GitBranch, Phone, Plus } from "@/lib/icons";
import type { DriverRow, RouteRow } from "./types";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
        active
          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
          : "bg-[var(--surface-soft)] text-[var(--text-muted)]",
      )}
    >
      {active ? "نشط" : "متوقف"}
    </span>
  );
}

function EmptyWithCTA({ message, cta, onClick }: { message: string; cta: string; onClick: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center gap-3 py-10">
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-xl bg-[var(--success)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        {cta}
      </button>
    </div>
  );
}

export function OverviewTab({
  drivers,
  routes,
  activeDrivers,
  activeRoutes,
  totalStudents,
  onSwitchTab,
}: {
  drivers: DriverRow[];
  routes: RouteRow[];
  activeDrivers: number;
  activeRoutes: number;
  totalStudents: number;
  onSwitchTab: (tab: "drivers" | "routes") => void;
}) {
  return (
    <div className="space-y-6">
      <KPIGrid className="lg:grid-cols-3">
        <StatsCard label="اجمالي السواق" value={formatNumber(drivers.length)} icon={Users} description={`${activeDrivers} نشط`} variant="info" />
        <StatsCard label="اجمالي الخطوط" value={formatNumber(routes.length)} icon={GitBranch} description={`${activeRoutes} نشط`} variant="success" />
        <StatsCard label="اجمالي الطلاب" value={formatNumber(totalStudents)} icon={Users} description="مسجلين بالنقل" variant="warning" />
      </KPIGrid>

      <Card>
        <CardHeader className="border-b border-[var(--border)]">
          <CardTitle className="text-sm font-bold">حالة السواق</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drivers.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-soft)]">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white", d.status === "active" ? "bg-[var(--success)]" : "bg-[var(--text-muted)]")}>
                  {(d.full_name || "?")[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{d.full_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{d.phone ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{d.phone}</span> : "بدون رقم"}</p>
                </div>
                <StatusBadge active={d.status === "active"} />
              </div>
            ))}
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
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-soft)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{r.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{r.drivers?.full_name || "غير معين"} &middot; {r.student_count || 0} طالب</p>
                </div>
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums" style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}>
                  {formatNumber(r.monthly_fee)} IQD
                </span>
              </div>
            ))}
            {routes.filter((r) => r.is_active).length === 0 && <EmptyWithCTA message="لا يوجد خطوط نشطة" cta="اضف خط" onClick={() => onSwitchTab("routes")} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
