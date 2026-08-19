"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { formatNumber } from "@/lib/formatting";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { supabase } from "@/lib/supabase";
import {
  Bus, Users, Loader2, RefreshCw, MapPin, AlertTriangle,
  CheckCircle2, Phone, LogOut, ChevronLeft, ChevronRight,
  Eye, EyeOff, X, UserRoundPlus, GitBranch,
} from "@/lib/icons";

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

  const activeDrivers = useMemo(
    () => drivers.filter((d) => d.status === "active"),
    [drivers],
  );
  const activeRoutes = useMemo(
    () => routes.filter((r) => r.is_active),
    [routes],
  );
  const totalStudents = useMemo(
    () => routes.reduce((s, r) => s + (r.student_count || 0), 0),
    [routes],
  );

  return (
    <div className="flex min-h-screen" dir={isRtl ? "rtl" : "ltr"}>
      <aside
        className="fixed top-0 bottom-0 z-30 flex flex-col border-e border-emerald-200 bg-gradient-to-b from-emerald-900 to-emerald-800 text-white transition-all duration-300"
        style={{
          width: sidebarOpen ? 260 : 72,
          [isRtl ? "right" : "left"]: 0,
        }}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-emerald-700">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
            <Bus className="h-5 w-5" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold leading-tight">
                ادارة النقل المدرسي
              </h1>
              <p className="text-[10px] text-emerald-300">Transport Manager</p>
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-emerald-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-emerald-700 px-2 py-3 space-y-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-emerald-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            {isRtl ? (
              sidebarOpen ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )
            ) : sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {sidebarOpen && <span>طي القائمة</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      <main
        className="flex-1 transition-all duration-300 bg-gray-50 min-h-screen"
        style={{
          [isRtl ? "marginRight" : "marginLeft"]: sidebarOpen ? 260 : 72,
        }}
      >
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white/80 backdrop-blur-sm px-6 py-3">
          <h2 className="text-lg font-bold text-gray-800">
            {NAV_ITEMS.find((i) => i.id === activeTab)?.label}
          </h2>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            تحديث
          </button>
        </header>

        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {loading && !drivers.length ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
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
  const stats = [
    {
      label: "اجمالي السواق",
      value: drivers.length,
      sub: `${activeDrivers} نشط`,
      icon: Users,
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      label: "اجمالي الخطوط",
      value: routes.length,
      sub: `${activeRoutes} نشط`,
      icon: GitBranch,
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      label: "اجمالي الطلاب",
      value: totalStudents,
      sub: "مسجلين بالنقل",
      icon: Users,
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl border p-5 ${s.color}`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              <p className="text-3xl font-bold">{formatNumber(s.value)}</p>
              <p className="mt-1 text-xs opacity-70">{s.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-3">
          <h3 className="text-sm font-bold text-gray-800">حالة السواق</h3>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${
                  d.status === "active" ? "bg-emerald-500" : "bg-gray-400"
                }`}
              >
                {(d.full_name || "?")[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {d.full_name}
                </p>
                <p className="text-xs text-gray-500">
                  {d.phone || "بدون رقم"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  d.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {d.status === "active" ? "نشط" : "متوقف"}
              </span>
            </div>
          ))}
          {drivers.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-gray-400">
              لا يوجد سواق
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-3">
          <h3 className="text-sm font-bold text-gray-800">الخطوط النشطة</h3>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {routes
            .filter((r) => r.is_active)
            .map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-500">
                    {r.drivers?.full_name || "غير معين"} &middot;{" "}
                    {r.student_count || 0} طالب
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  {formatNumber(r.monthly_fee)} IQD
                </span>
              </div>
            ))}
          {routes.filter((r) => r.is_active).length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-gray-400">
              لا يوجد خطوط نشطة
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DriversTab({ drivers }: { drivers: DriverRow[] }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="border-b px-5 py-3">
        <h3 className="text-sm font-bold text-gray-800">قائمة السواق</h3>
      </div>
      {drivers.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">
          لا يوجد سواق
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-start">الاسم</th>
                <th className="px-4 py-2 text-start">الهاتف</th>
                <th className="px-4 py-2 text-start">رقم الرخصة</th>
                <th className="px-4 py-2 text-start">لوحة المركبة</th>
                <th className="px-4 py-2 text-center">الحالة</th>
                <th className="px-4 py-2 text-center">الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{d.full_name}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {d.phone ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Phone className="h-3 w-3" /> {d.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {d.license_number || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {d.vehicle_plate || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        d.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {d.status === "active" ? "نشط" : "متوقف"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {d.user_profile_id ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <CheckCircle2 className="inline h-3 w-3 mr-0.5" />
                        مفعل
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
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
    </div>
  );
}

function RoutesTab({ routes }: { routes: RouteRow[] }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      <div className="border-b px-5 py-3">
        <h3 className="text-sm font-bold text-gray-800">خطوط النقل</h3>
      </div>
      {routes.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">
          لا يوجد خطوط
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-start">اسم الخط</th>
                <th className="px-4 py-2 text-start">السائق</th>
                <th className="px-4 py-2 text-center">عدد الطلاب</th>
                <th className="px-4 py-2 text-center">الرسوم الشهرية</th>
                <th className="px-4 py-2 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {routes.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {r.drivers?.full_name || "غير معين"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {r.student_count || 0}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {formatNumber(r.monthly_fee)} IQD
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        r.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {r.is_active ? "نشط" : "متوقف"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
