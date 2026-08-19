"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProfileMenu } from "@/components/ProfileMenu";
import { LanguageToggle } from "@/components/LanguageToggle";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { formatNumber } from "@/lib/formatting";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/brand/brand-utils";
import { StatsCard, KPIGrid } from "@/components/ui/stats-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Bus, Users, Loader2, RefreshCw, AlertTriangle,
  CheckCircle2, Phone, LogOut, ChevronLeft, ChevronRight,
  GitBranch, Menu,
} from "@/lib/icons";

const ThemeModeToggle = dynamic(
  () => import("@/components/ThemeModeToggle").then((mod) => mod.ThemeModeToggle),
  { ssr: false },
);

type DriverRow = {
  id: string;
  full_name: string;
  phone: string | null;
  license_number: string | null;
  license_expiry: string | null;
  vehicle_plate: string | null;
  status: string;
  user_profile_id: string | null;
};

type RouteRow = {
  id: string;
  name: string;
  monthly_fee: number;
  is_active: boolean;
  driver_id: string | null;
  student_count: number;
  drivers: { full_name: string | null } | null;
};

type Tab = "overview" | "drivers" | "routes";

const NAV_ITEMS: { id: Tab; label: string; icon: typeof Bus }[] = [
  { id: "overview", label: "لوحة التحكم", icon: Bus },
  { id: "drivers", label: "السواق", icon: Users },
  { id: "routes", label: "الخطوط", icon: GitBranch },
];

export default function TransportAdminPage() {
  return (
    <ProtectedRoute roles={["transport_manager", "super_admin", "admin"]}>
      <TransportAdminShell />
    </ProtectedRoute>
  );
}

function TransportAdminShell() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const isRtl = locale === "ar";

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [driversRes, routesRes] = await Promise.all([
        fetchJsonWithAuthorizedSession<{ drivers?: DriverRow[]; error?: { message?: string } }>(
          "/api/web/transport/drivers",
        ),
        fetchJsonWithAuthorizedSession<{ routes?: RouteRow[]; error?: { message?: string } }>(
          "/api/web/transport/routes",
        ),
      ]);
      const firstError =
        (!driversRes.response.ok && driversRes.payload?.error?.message) ||
        (!routesRes.response.ok && routesRes.payload?.error?.message);
      if (firstError) throw new Error(firstError);
      setDrivers(driversRes.payload?.drivers ?? []);
      setRoutes(routesRes.payload?.routes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
  };

  const activeDrivers = useMemo(() => drivers.filter((d) => d.status === "active"), [drivers]);
  const activeRoutes = useMemo(() => routes.filter((r) => r.is_active), [routes]);
  const totalStudents = useMemo(() => routes.reduce((s, r) => s + (r.student_count || 0), 0), [routes]);

  return (
    <div className="flex min-h-screen bg-[var(--background)]" dir={isRtl ? "rtl" : "ltr"}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 z-30 flex flex-col",
          "border-e border-[var(--border)] bg-[var(--surface-strong)]",
          "transition-all duration-300",
        )}
        style={{
          width: sidebarOpen ? 260 : 72,
          [isRtl ? "right" : "left"]: 0,
        }}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--border)]">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)" }}
          >
            <Bus className="h-5 w-5 text-[var(--success)]" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold leading-tight text-[var(--text-primary)]">
                ادارة النقل المدرسي
              </h1>
              <p className="text-[10px] text-[var(--text-tertiary)]">Transport Manager</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "text-[var(--success)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]",
                )}
              >
                {active && (
                  <motion.div
                    layoutId="transport-sidebar-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)" }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className="relative h-5 w-5 shrink-0" />
                {sidebarOpen && <span className="relative">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] px-2 py-3 space-y-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-[var(--text-tertiary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] transition-colors"
          >
            {isRtl
              ? (sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />)
              : (sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
            {sidebarOpen && <span>طي القائمة</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main
        className="flex-1 transition-all duration-300 min-h-screen"
        style={{ [isRtl ? "marginRight" : "marginLeft"]: sidebarOpen ? 260 : 72 }}
      >
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/92 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-tertiary)] hover:bg-[var(--success)]/10 hover:text-[var(--success)] active:scale-95 transition-all lg:hidden"
            >
              <Menu size={17} />
            </button>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {NAV_ITEMS.find((i) => i.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors",
                "bg-[var(--success)] text-white hover:opacity-90 disabled:opacity-50",
              )}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              تحديث
            </button>

            <div className="h-4 w-[1px] bg-[var(--border)] hidden sm:block" />

            <div className="flex items-center gap-0.5 p-1 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)]">
              <LanguageToggle className="shell-utility-button" />
              <ThemeModeToggle variant="inline" className="hidden lg:inline-flex" compact />
            </div>

            <ProfileMenu className="app-shell-topbar__profile-menu" />
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] border border-[color-mix(in_srgb,var(--danger)_20%,transparent)] px-4 py-3 text-sm text-[var(--danger)]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {loading && !drivers.length ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--success)]" />
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewTab
                  drivers={drivers}
                  routes={routes}
                  activeDrivers={activeDrivers.length}
                  activeRoutes={activeRoutes.length}
                  totalStudents={totalStudents}
                />
              )}
              {activeTab === "drivers" && <DriversTab drivers={drivers} />}
              {activeTab === "routes" && <RoutesTab routes={routes} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function OverviewTab({
  drivers,
  routes,
  activeDrivers,
  activeRoutes,
  totalStudents,
}: {
  drivers: DriverRow[];
  routes: RouteRow[];
  activeDrivers: number;
  activeRoutes: number;
  totalStudents: number;
}) {
  return (
    <div className="space-y-6">
      <KPIGrid className="lg:grid-cols-3">
        <StatsCard
          label="اجمالي السواق"
          value={formatNumber(drivers.length)}
          icon={Users}
          description={`${activeDrivers} نشط`}
          variant="info"
        />
        <StatsCard
          label="اجمالي الخطوط"
          value={formatNumber(routes.length)}
          icon={GitBranch}
          description={`${activeRoutes} نشط`}
          variant="success"
        />
        <StatsCard
          label="اجمالي الطلاب"
          value={formatNumber(totalStudents)}
          icon={Users}
          description="مسجلين بالنقل"
          variant="warning"
        />
      </KPIGrid>

      <Card>
        <CardHeader className="border-b border-[var(--border)]">
          <CardTitle className="text-sm font-bold">حالة السواق</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drivers.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-soft)]"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white",
                    d.status === "active" ? "bg-[var(--success)]" : "bg-[var(--text-muted)]",
                  )}
                >
                  {(d.full_name || "?")[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{d.full_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{d.phone || "بدون رقم"}</p>
                </div>
                <StatusBadge active={d.status === "active"} />
              </div>
            ))}
            {drivers.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-[var(--text-muted)]">لا يوجد سواق</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-[var(--border)]">
          <CardTitle className="text-sm font-bold">الخطوط النشطة</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {routes
              .filter((r) => r.is_active)
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-soft)]"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{r.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {r.drivers?.full_name || "غير معين"} &middot; {r.student_count || 0} طالب
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums"
                    style={{
                      background: "color-mix(in srgb, var(--success) 12%, transparent)",
                      color: "var(--success)",
                    }}
                  >
                    {formatNumber(r.monthly_fee)} IQD
                  </span>
                </div>
              ))}
            {routes.filter((r) => r.is_active).length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-[var(--text-muted)]">لا يوجد خطوط نشطة</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DriversTab({ drivers }: { drivers: DriverRow[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-[var(--border)]">
        <CardTitle className="text-sm font-bold">قائمة السواق</CardTitle>
      </CardHeader>
      {drivers.length === 0 ? (
        <CardContent>
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">لا يوجد سواق</p>
        </CardContent>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                {["الاسم", "الهاتف", "رقم الرخصة", "لوحة المركبة"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-start text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                ))}
                {["الحالة", "الحساب"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-center text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-soft)] transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{d.full_name}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {d.phone ? (
                      <span className="flex items-center gap-1 text-[var(--success)]">
                        <Phone className="h-3 w-3" /> {d.phone}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{d.license_number || "—"}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{d.vehicle_plate || "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge active={d.status === "active"} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {d.user_profile_id ? (
                      <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--success)]">
                        <CheckCircle2 className="h-3 w-3 me-0.5" />
                        مفعل
                      </span>
                    ) : (
                      <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                        بدون حساب
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function RoutesTab({ routes }: { routes: RouteRow[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-[var(--border)]">
        <CardTitle className="text-sm font-bold">خطوط النقل</CardTitle>
      </CardHeader>
      {routes.length === 0 ? (
        <CardContent>
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">لا يوجد خطوط</p>
        </CardContent>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                {["اسم الخط", "السائق"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-start text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                ))}
                {["عدد الطلاب", "الرسوم الشهرية", "الحالة"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-center text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-soft)] transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{r.name}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.drivers?.full_name || "غير معين"}</td>
                  <td className="px-4 py-2.5 text-center text-[var(--text-primary)] tabular-nums">{r.student_count || 0}</td>
                  <td className="px-4 py-2.5 text-center text-[var(--text-primary)] tabular-nums">{formatNumber(r.monthly_fee)} IQD</td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge active={r.is_active} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

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
