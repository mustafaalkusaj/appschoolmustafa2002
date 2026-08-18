"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRuntimeBranding } from "@/hooks/brand";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { formatNumber } from "@/lib/formatting";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import {
  Bus, Users, Loader2, Plus, RefreshCw, MapPin, AlertTriangle, X,
} from "@/lib/icons";

type DriverRow = {
  id: string;
  user_profile_id: string | null;
  full_name: string;
  phone: string | null;
  license_number: string | null;
  license_expiry: string | null;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  status: string;
};

type RouteRow = {
  id: string;
  name: string;
  monthly_fee: number;
  is_active: boolean;
  driver_id: string | null;
  backup_driver_id: string | null;
  student_count: number;
  drivers: { full_name: string | null } | null;
};

type BoardTrip = {
  id: string;
  trip_type: "morning" | "afternoon";
  status: string;
  started_at: string | null;
  counts: { boarded: number; absent: number; dropped_off: number };
};

type MemberRow = {
  id: string;
  student_id: string;
  stop_order: number;
  dropoff_pin: string;
  subscription_status: string;
  students: { full_name: string | null; class_name: string | null } | null;
};

type StudentOption = { id: string; full_name: string; class_name: string | null };

type BoardRoute = {
  id: string;
  name: string;
  enrolled: number;
  drivers: { full_name: string | null; phone: string | null; license_expiry: string | null } | null;
  trips: BoardTrip[];
};

const LICENSE_WARNING_DAYS = 30;

function licenseExpiringSoon(expiry: string | null): boolean {
  if (!expiry) return false;
  const days = (new Date(expiry).getTime() - Date.now()) / 86_400_000;
  return days < LICENSE_WARNING_DAYS;
}

export default function TransportPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isEnglish = locale === "en";
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const runtimeBranding = useRuntimeBranding();

  const [tab, setTab] = useState<"board" | "drivers" | "routes">("board");
  const [board, setBoard] = useState<BoardRoute[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyAccount, setBusyAccount] = useState<string | null>(null);
  const [driverForm, setDriverForm] = useState({
    full_name: "", phone: "", national_id: "", license_number: "",
    license_expiry: "", vehicle_plate: "", vehicle_model: "",
  });
  const [routeForm, setRouteForm] = useState({ name: "", monthly_fee: "", driver_id: "" });
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [memberRoute, setMemberRoute] = useState<RouteRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addStudentId, setAddStudentId] = useState("");

  const getScopedSchoolId = useCallback(async () => {
    if (!profile) return null;
    return resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
  }, [profile, schoolScope.selectedSchoolId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const schoolId = await getScopedSchoolId();
      if (!schoolId) {
        setBoard([]); setDrivers([]); setRoutes([]);
        return;
      }
      const params = new URLSearchParams({ schoolId });
      if (runtimeBranding.branchId) params.set("branchId", runtimeBranding.branchId);
      const query = params.toString();

      const [boardRes, driversRes, routesRes] = await Promise.all([
        fetchJsonWithAuthorizedSession<{ board?: BoardRoute[]; error?: { message?: string } }>(
          `/api/web/transport/board?${query}`,
        ),
        fetchJsonWithAuthorizedSession<{ drivers?: DriverRow[]; error?: { message?: string } }>(
          `/api/web/transport/drivers?${query}`,
        ),
        fetchJsonWithAuthorizedSession<{ routes?: RouteRow[]; error?: { message?: string } }>(
          `/api/web/transport/routes?${query}`,
        ),
      ]);

      const firstError =
        (!boardRes.response.ok && boardRes.payload?.error?.message) ||
        (!driversRes.response.ok && driversRes.payload?.error?.message) ||
        (!routesRes.response.ok && routesRes.payload?.error?.message);
      if (firstError) throw new Error(firstError);

      setBoard(boardRes.payload?.board ?? []);
      setDrivers(driversRes.payload?.drivers ?? []);
      setRoutes(routesRes.payload?.routes ?? []);
    } catch (err) {
      setBoard([]); setDrivers([]); setRoutes([]);
      setFetchError(err instanceof Error ? err.message : "تعذر تحميل بيانات النقل.");
    } finally {
      setLoading(false);
    }
  }, [getScopedSchoolId, runtimeBranding.branchId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchAll();
  }, [fetchAll, profile, schoolScope.scopeLoading]);

  const submitDriver = useCallback(async () => {
    if (!driverForm.full_name.trim() || saving) return;
    setSaving(true);
    setFetchError(null);
    try {
      const schoolId = await getScopedSchoolId();
      if (!schoolId) return;
      const params = new URLSearchParams({ schoolId });
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        `/api/web/transport/drivers?${params.toString()}`,
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            ...driverForm,
            branch_id: runtimeBranding.branchId || null,
          }),
        },
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر إضافة السائق.");
      setShowDriverForm(false);
      setDriverForm({
        full_name: "", phone: "", national_id: "", license_number: "",
        license_expiry: "", vehicle_plate: "", vehicle_model: "",
      });
      await fetchAll();
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "تعذر إضافة السائق.");
    } finally {
      setSaving(false);
    }
  }, [driverForm, saving, getScopedSchoolId, runtimeBranding.branchId, fetchAll]);

  const submitRoute = useCallback(async () => {
    if (!routeForm.name.trim() || saving) return;
    setSaving(true);
    setFetchError(null);
    try {
      const schoolId = await getScopedSchoolId();
      if (!schoolId) return;
      const params = new URLSearchParams({ schoolId });
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        `/api/web/transport/routes?${params.toString()}`,
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            name: routeForm.name,
            monthly_fee: Number(routeForm.monthly_fee || 0),
            driver_id: routeForm.driver_id || null,
            branch_id: runtimeBranding.branchId || null,
          }),
        },
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر إنشاء الخط.");
      setShowRouteForm(false);
      setRouteForm({ name: "", monthly_fee: "", driver_id: "" });
      await fetchAll();
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "تعذر إنشاء الخط.");
    } finally {
      setSaving(false);
    }
  }, [routeForm, saving, getScopedSchoolId, runtimeBranding.branchId, fetchAll]);

  const createDriverAccount = useCallback(async (driver: DriverRow) => {
    if (busyAccount) return;
    setBusyAccount(driver.id);
    setFetchError(null);
    try {
      const schoolId = await getScopedSchoolId();
      if (!schoolId) return;
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        credentials?: { username: string; password: string };
        error?: { message?: string };
      }>(`/api/web/transport/drivers/${driver.id}/account`, {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({ school_id: schoolId }),
      });
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر إنشاء الحساب.");
      if (payload?.credentials) setCredentials(payload.credentials);
      await fetchAll();
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "تعذر إنشاء الحساب.");
    } finally {
      setBusyAccount(null);
    }
  }, [busyAccount, getScopedSchoolId, fetchAll]);

  const openMembers = useCallback(async (route: RouteRow) => {
    setMemberRoute(route);
    setMembersLoading(true);
    setAddStudentId("");
    try {
      const schoolId = await getScopedSchoolId();
      if (!schoolId) return;
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        members?: MemberRow[];
        students?: StudentOption[];
        error?: { message?: string };
      }>(`/api/web/transport/routes/${route.id}/students?schoolId=${schoolId}`);
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر تحميل طلاب الخط.");
      setMembers(payload?.members ?? []);
      setStudentOptions(payload?.students ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "تعذر تحميل طلاب الخط.");
      setMemberRoute(null);
    } finally {
      setMembersLoading(false);
    }
  }, [getScopedSchoolId]);

  const addMember = useCallback(async () => {
    if (!memberRoute || !addStudentId || saving) return;
    setSaving(true);
    try {
      const schoolId = await getScopedSchoolId();
      if (!schoolId) return;
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        `/api/web/transport/routes/${memberRoute.id}/students`,
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({ school_id: schoolId, student_id: addStudentId }),
        },
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر إضافة الطالب.");
      await openMembers(memberRoute);
      await fetchAll();
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "تعذر إضافة الطالب.");
    } finally {
      setSaving(false);
    }
  }, [memberRoute, addStudentId, saving, getScopedSchoolId, openMembers, fetchAll]);

  const removeMember = useCallback(async (membershipId: string) => {
    if (!memberRoute || saving) return;
    setSaving(true);
    try {
      const schoolId = await getScopedSchoolId();
      if (!schoolId) return;
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        `/api/web/transport/routes/${memberRoute.id}/students?schoolId=${schoolId}&membershipId=${membershipId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر إزالة الطالب.");
      await openMembers(memberRoute);
      await fetchAll();
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "تعذر إزالة الطالب.");
    } finally {
      setSaving(false);
    }
  }, [memberRoute, saving, getScopedSchoolId, openMembers, fetchAll]);

  const mutate = useCallback(async (
    path: string,
    init: RequestInit,
    failMessage: string,
  ): Promise<{ credentials?: { username: string; password: string } } | null> => {
    setSaving(true);
    setFetchError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        credentials?: { username: string; password: string };
        error?: { message?: string };
      }>(path, init);
      if (!response.ok) throw new Error(payload?.error?.message || failMessage);
      await fetchAll();
      return payload ?? {};
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : failMessage);
      return null;
    } finally {
      setSaving(false);
    }
  }, [fetchAll]);

  const setDriverStatus = useCallback(async (driver: DriverRow, status: string) => {
    const schoolId = await getScopedSchoolId();
    if (!schoolId) return;
    await mutate(`/api/web/transport/drivers/${driver.id}`, {
      method: "PATCH",
      headers: withJsonHeaders(),
      body: JSON.stringify({ school_id: schoolId, status }),
    }, "تعذر تحديث حالة السائق.");
  }, [getScopedSchoolId, mutate]);

  const deleteDriver = useCallback(async (driver: DriverRow) => {
    if (!window.confirm(isEnglish ? `Delete ${driver.full_name}?` : `حذف السائق ${driver.full_name}؟ سيتم إلغاء تفعيل حسابه وفك ربطه من الخطوط.`)) return;
    const schoolId = await getScopedSchoolId();
    if (!schoolId) return;
    await mutate(`/api/web/transport/drivers/${driver.id}?schoolId=${schoolId}`, { method: "DELETE" }, "تعذر حذف السائق.");
  }, [getScopedSchoolId, mutate, isEnglish]);

  const resetDriverPassword = useCallback(async (driver: DriverRow) => {
    if (!window.confirm(isEnglish ? `Reset password for ${driver.full_name}?` : `إعادة تعيين كلمة مرور ${driver.full_name}؟ كلمة المرور القديمة ستتوقف فوراً.`)) return;
    const schoolId = await getScopedSchoolId();
    if (!schoolId) return;
    const result = await mutate(`/api/web/transport/drivers/${driver.id}/account`, {
      method: "PATCH",
      headers: withJsonHeaders(),
      body: JSON.stringify({ school_id: schoolId }),
    }, "تعذر إعادة تعيين كلمة المرور.");
    if (result?.credentials) setCredentials(result.credentials);
  }, [getScopedSchoolId, mutate, isEnglish]);

  const patchRoute = useCallback(async (route: RouteRow, patch: Record<string, unknown>, failMessage: string) => {
    const schoolId = await getScopedSchoolId();
    if (!schoolId) return;
    await mutate(`/api/web/transport/routes/${route.id}`, {
      method: "PATCH",
      headers: withJsonHeaders(),
      body: JSON.stringify({ school_id: schoolId, ...patch }),
    }, failMessage);
  }, [getScopedSchoolId, mutate]);

  const deleteRoute = useCallback(async (route: RouteRow) => {
    if (!window.confirm(isEnglish ? `Delete route ${route.name}?` : `حذف خط ${route.name}؟`)) return;
    const schoolId = await getScopedSchoolId();
    if (!schoolId) return;
    await mutate(`/api/web/transport/routes/${route.id}?schoolId=${schoolId}`, { method: "DELETE" }, "تعذر حذف الخط.");
  }, [getScopedSchoolId, mutate, isEnglish]);

  const toggleSubscription = useCallback(async (m: MemberRow) => {
    if (!memberRoute) return;
    const schoolId = await getScopedSchoolId();
    if (!schoolId) return;
    const next = m.subscription_status === "paid" ? "due" : "paid";
    const done = await mutate(`/api/web/transport/routes/${memberRoute.id}/students`, {
      method: "PATCH",
      headers: withJsonHeaders(),
      body: JSON.stringify({ school_id: schoolId, membership_id: m.id, subscription_status: next }),
    }, "تعذر تحديث حالة الاشتراك.");
    if (done) await openMembers(memberRoute);
  }, [memberRoute, getScopedSchoolId, mutate, openMembers]);

  const expiringDrivers = useMemo(
    () => drivers.filter((d) => licenseExpiringSoon(d.license_expiry)),
    [drivers],
  );

  const tabs = [
    { id: "board" as const, label: isEnglish ? "Today's board" : "لوحة اليوم" },
    { id: "drivers" as const, label: isEnglish ? "Drivers" : "السواق" },
    { id: "routes" as const, label: isEnglish ? "Routes" : "الخطوط" },
  ];

  const inputClass =
    "w-full h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-semibold text-[var(--text-primary)] outline-none";

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/transport" />
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={isEnglish ? "School Transport" : "النقل المدرسي"}
            subtitle={isEnglish ? "Drivers, routes and daily trips." : "إدارة السواق والخطوط والرحلات اليومية"}
            scope={schoolScope}
            fixed
          />
          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-5">
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title={isEnglish ? "School Transport" : "النقل المدرسي"}
                    description={isEnglish ? "Select a school to manage transport." : "اختر مدرسة لإدارة النقل."}
                  />
                </div>
              ) : (
                <>
                  {/* Tabs + actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-1">
                      {tabs.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setTab(item.id)}
                          className={`h-9 px-4 rounded-lg text-xs font-black transition-colors ${
                            tab === item.id
                              ? "bg-[var(--primary)] text-white"
                              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void fetchAll()}
                        className="flex items-center gap-2 h-9 px-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-xs font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        {isEnglish ? "Refresh" : "تحديث"}
                      </button>
                      {tab === "drivers" && (
                        <button
                          onClick={() => setShowDriverForm(true)}
                          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[var(--primary)] text-white text-xs font-black active:scale-95 transition-transform"
                        >
                          <Plus size={14} />
                          {isEnglish ? "Add driver" : "إضافة سائق"}
                        </button>
                      )}
                      {tab === "routes" && (
                        <button
                          onClick={() => setShowRouteForm(true)}
                          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[var(--primary)] text-white text-xs font-black active:scale-95 transition-transform"
                        >
                          <Plus size={14} />
                          {isEnglish ? "Add route" : "إضافة خط"}
                        </button>
                      )}
                    </div>
                  </div>

                  {fetchError && (
                    <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4 flex items-center gap-3">
                      <AlertTriangle size={18} className="text-[var(--danger)] shrink-0" />
                      <span className="text-sm font-bold text-[var(--danger)] flex-1">{fetchError}</span>
                      <button
                        className="h-8 px-3 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-black"
                        onClick={() => void fetchAll()}
                      >
                        {isEnglish ? "Retry" : "إعادة المحاولة"}
                      </button>
                    </div>
                  )}

                  {expiringDrivers.length > 0 && (
                    <div className="rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-4 flex items-center gap-3">
                      <AlertTriangle size={18} className="text-[var(--warning)] shrink-0" />
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {isEnglish
                          ? `${expiringDrivers.length} driver license(s) expire within ${LICENSE_WARNING_DAYS} days.`
                          : `${formatNumber(expiringDrivers.length)} إجازة سوق تنتهي خلال ${LICENSE_WARNING_DAYS} يوماً: ${expiringDrivers.map((d) => d.full_name).join("، ")}`}
                      </span>
                    </div>
                  )}

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="h-12 w-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                      <span className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">
                        {isEnglish ? "Loading..." : "جارٍ التحميل..."}
                      </span>
                    </div>
                  ) : (
                    <>
                      {tab === "board" && (
                        <div className="grid gap-4 md:grid-cols-2">
                          {board.length === 0 && (
                            <div className="md:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center">
                              <Bus size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
                              <p className="text-sm font-bold text-[var(--text-muted)]">
                                {isEnglish ? "No active routes yet." : "لا توجد خطوط نشطة بعد. أضف سائقاً ثم خطاً من التبويبات أعلاه."}
                              </p>
                            </div>
                          )}
                          {board.map((route, i) => {
                            const trip = route.trips[0];
                            const statusColor = !trip
                              ? "var(--text-muted)"
                              : trip.status === "in_progress"
                                ? "var(--success)"
                                : "var(--info)";
                            const statusLabel = !trip
                              ? isEnglish ? "Not started" : "لم تبدأ"
                              : trip.status === "in_progress"
                                ? isEnglish ? "In progress" : "جارية"
                                : isEnglish ? "Completed" : "مكتملة";
                            return (
                              <motion.section
                                key={route.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.35 }}
                                className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden"
                              >
                                <div className="h-1 w-full" style={{ background: statusColor }} />
                                <div className="p-5 space-y-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
                                        <Bus size={20} />
                                      </div>
                                      <div className="min-w-0">
                                        <h3 className="text-base font-black text-[var(--text-primary)] truncate">{route.name}</h3>
                                        <p className="text-xs text-[var(--text-muted)]">
                                          {route.drivers?.full_name ?? (isEnglish ? "No driver" : "بلا سائق")}
                                          {route.drivers?.phone ? ` · ${route.drivers.phone}` : ""}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="shrink-0 px-3 py-1 rounded-lg text-xs font-black"
                                      style={{ background: `color-mix(in srgb, ${statusColor} 12%, transparent)`, color: statusColor }}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 text-center">
                                    {[
                                      { label: isEnglish ? "Enrolled" : "مسجّل", value: route.enrolled, color: "var(--info)" },
                                      { label: isEnglish ? "Boarded" : "صعد", value: trip?.counts.boarded ?? 0, color: "var(--success)" },
                                      { label: isEnglish ? "Absent" : "غائب", value: trip?.counts.absent ?? 0, color: "var(--danger)" },
                                      { label: isEnglish ? "Dropped" : "نزل", value: trip?.counts.dropped_off ?? 0, color: "var(--primary)" },
                                    ].map((cell, j) => (
                                      <div key={j} className="rounded-xl p-2.5 bg-[var(--surface-soft)]">
                                        <div className="text-lg font-black tabular-nums" style={{ color: cell.color }}>
                                          {formatNumber(cell.value)}
                                        </div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{cell.label}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </motion.section>
                            );
                          })}
                        </div>
                      )}

                      {tab === "drivers" && (
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                                  {[
                                    isEnglish ? "Name" : "الاسم",
                                    isEnglish ? "Phone" : "الهاتف",
                                    isEnglish ? "License" : "إجازة السوق",
                                    isEnglish ? "Expiry" : "انتهاؤها",
                                    isEnglish ? "Vehicle" : "السيارة",
                                    isEnglish ? "Status" : "الحالة",
                                    isEnglish ? "Login" : "حساب الدخول",
                                    isEnglish ? "Actions" : "إجراءات",
                                  ].map((h) => (
                                    <th key={h} className="text-start px-4 py-3 text-[10px] font-black uppercase tracking-widest">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {drivers.length === 0 && (
                                  <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-[var(--text-muted)] font-bold">
                                      {isEnglish ? "No drivers yet." : "لا يوجد سواق بعد."}
                                    </td>
                                  </tr>
                                )}
                                {drivers.map((d) => (
                                  <tr key={d.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)] transition-colors">
                                    <td className="px-4 py-3 font-black text-[var(--text-primary)]">{d.full_name}</td>
                                    <td className="px-4 py-3 tabular-nums" dir="ltr">{d.phone ?? "—"}</td>
                                    <td className="px-4 py-3">{d.license_number ?? "—"}</td>
                                    <td className="px-4 py-3">
                                      {d.license_expiry ? (
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                                          licenseExpiringSoon(d.license_expiry)
                                            ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                                            : "bg-[var(--success)]/10 text-[var(--success)]"
                                        }`}>
                                          {d.license_expiry}
                                        </span>
                                      ) : "—"}
                                    </td>
                                    <td className="px-4 py-3">{[d.vehicle_model, d.vehicle_plate].filter(Boolean).join(" · ") || "—"}</td>
                                    <td className="px-4 py-3">
                                      <select
                                        value={d.status}
                                        disabled={saving}
                                        onChange={(e) => void setDriverStatus(d, e.target.value)}
                                        className="h-8 px-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] text-xs font-black text-[var(--text-primary)] outline-none"
                                      >
                                        <option value="active">{isEnglish ? "Active" : "نشط"}</option>
                                        <option value="on_leave">{isEnglish ? "On leave" : "إجازة"}</option>
                                        <option value="suspended">{isEnglish ? "Suspended" : "موقوف"}</option>
                                      </select>
                                    </td>
                                    <td className="px-4 py-3">
                                      {d.user_profile_id ? (
                                        <button
                                          onClick={() => void resetDriverPassword(d)}
                                          disabled={saving}
                                          className="h-8 px-3 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] text-xs font-black disabled:opacity-40"
                                        >
                                          {isEnglish ? "Reset password" : "إعادة تعيين كلمة المرور"}
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => void createDriverAccount(d)}
                                          disabled={busyAccount !== null}
                                          className="h-8 px-3 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-black disabled:opacity-40 flex items-center gap-1.5"
                                        >
                                          {busyAccount === d.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                          {isEnglish ? "Create login" : "إنشاء حساب"}
                                        </button>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      <button
                                        onClick={() => void deleteDriver(d)}
                                        disabled={saving}
                                        className="h-8 px-3 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-black disabled:opacity-40"
                                      >
                                        {isEnglish ? "Delete" : "حذف"}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {tab === "routes" && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {routes.length === 0 && (
                            <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center">
                              <MapPin size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
                              <p className="text-sm font-bold text-[var(--text-muted)]">{isEnglish ? "No routes yet." : "لا توجد خطوط بعد."}</p>
                            </div>
                          )}
                          {routes.map((route, i) => (
                            <motion.div
                              key={route.id}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.3 }}
                              className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 space-y-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-base font-black text-[var(--text-primary)] truncate">{route.name}</h3>
                                <span className={`shrink-0 px-2 py-0.5 rounded-lg text-xs font-black ${
                                  route.is_active
                                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                                    : "bg-[var(--text-muted)]/10 text-[var(--text-muted)]"
                                }`}>
                                  {route.is_active ? (isEnglish ? "Active" : "نشط") : (isEnglish ? "Inactive" : "متوقف")}
                                </span>
                              </div>
                              <div className="text-xs text-[var(--text-muted)] font-bold flex items-center gap-2">
                                <Users size={14} />
                                {formatNumber(route.student_count)} {isEnglish ? "students" : "طالب"}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 block">{isEnglish ? "Driver" : "السائق"}</label>
                                  <select
                                    value={route.driver_id ?? ""}
                                    disabled={saving}
                                    onChange={(e) => void patchRoute(route, { driver_id: e.target.value || null }, "تعذر إسناد السائق.")}
                                    className="w-full h-9 px-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] text-xs font-black text-[var(--text-primary)] outline-none"
                                  >
                                    <option value="">{isEnglish ? "None" : "بلا"}</option>
                                    {drivers.filter((d) => d.status === "active").map((d) => (
                                      <option key={d.id} value={d.id}>{d.full_name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 block">{isEnglish ? "Backup" : "السائق البديل"}</label>
                                  <select
                                    value={route.backup_driver_id ?? ""}
                                    disabled={saving}
                                    onChange={(e) => void patchRoute(route, { backup_driver_id: e.target.value || null }, "تعذر إسناد البديل.")}
                                    className="w-full h-9 px-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] text-xs font-black text-[var(--text-primary)] outline-none"
                                  >
                                    <option value="">{isEnglish ? "None" : "بلا"}</option>
                                    {drivers.filter((d) => d.status === "active" && d.id !== route.driver_id).map((d) => (
                                      <option key={d.id} value={d.id}>{d.full_name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="text-sm font-black text-[var(--text-primary)] tabular-nums">
                                {formatNumber(route.monthly_fee)} {isEnglish ? "IQD / month" : "د.ع / شهرياً"}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => void patchRoute(route, { is_active: !route.is_active }, "تعذر تغيير حالة الخط.")}
                                  disabled={saving}
                                  className={`h-9 rounded-xl text-xs font-black disabled:opacity-40 ${
                                    route.is_active
                                      ? "bg-[var(--warning)]/10 text-[var(--warning)]"
                                      : "bg-[var(--success)]/10 text-[var(--success)]"
                                  }`}
                                >
                                  {route.is_active ? (isEnglish ? "Deactivate" : "إيقاف الخط") : (isEnglish ? "Activate" : "تفعيل الخط")}
                                </button>
                                <button
                                  onClick={() => void deleteRoute(route)}
                                  disabled={saving}
                                  className="h-9 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-black disabled:opacity-40"
                                >
                                  {isEnglish ? "Delete" : "حذف الخط"}
                                </button>
                              </div>
                              <button
                                onClick={() => void openMembers(route)}
                                className="w-full h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-xs font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-2"
                              >
                                <Users size={14} />
                                {isEnglish ? "Manage students" : "إدارة الطلاب"}
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </main>
        </div>

        {/* Add driver modal */}
        {showDriverForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowDriverForm(false)}>
            <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-[var(--text-primary)]">{isEnglish ? "Add driver" : "إضافة سائق"}</h3>
                <button onClick={() => setShowDriverForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={18} /></button>
              </div>
              {[
                { key: "full_name", label: isEnglish ? "Full name *" : "الاسم الكامل *" },
                { key: "phone", label: isEnglish ? "Phone" : "الهاتف" },
                { key: "national_id", label: isEnglish ? "National ID" : "رقم الهوية" },
                { key: "license_number", label: isEnglish ? "License number" : "رقم إجازة السوق" },
                { key: "license_expiry", label: isEnglish ? "License expiry" : "تاريخ انتهاء الإجازة", type: "date" },
                { key: "vehicle_plate", label: isEnglish ? "Vehicle plate" : "رقم اللوحة" },
                { key: "vehicle_model", label: isEnglish ? "Vehicle model" : "نوع السيارة" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 block">{f.label}</label>
                  <input
                    type={f.type ?? "text"}
                    value={driverForm[f.key as keyof typeof driverForm]}
                    onChange={(e) => setDriverForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              ))}
              <button
                onClick={() => void submitDriver()}
                disabled={saving || !driverForm.full_name.trim()}
                className="w-full h-10 rounded-xl bg-[var(--primary)] text-white text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {isEnglish ? "Save" : "حفظ"}
              </button>
            </div>
          </div>
        )}

        {/* Add route modal */}
        {showRouteForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowRouteForm(false)}>
            <div className="w-full max-w-md rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-[var(--text-primary)]">{isEnglish ? "Add route" : "إضافة خط"}</h3>
                <button onClick={() => setShowRouteForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={18} /></button>
              </div>
              <div>
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 block">{isEnglish ? "Route name *" : "اسم الخط *"}</label>
                <input value={routeForm.name} onChange={(e) => setRouteForm((p) => ({ ...p, name: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 block">{isEnglish ? "Monthly fee (IQD)" : "الاشتراك الشهري (د.ع)"}</label>
                <input type="number" min="0" value={routeForm.monthly_fee} onChange={(e) => setRouteForm((p) => ({ ...p, monthly_fee: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 block">{isEnglish ? "Driver" : "السائق"}</label>
                <select value={routeForm.driver_id} onChange={(e) => setRouteForm((p) => ({ ...p, driver_id: e.target.value }))} className={inputClass}>
                  <option value="">{isEnglish ? "No driver" : "بلا سائق"}</option>
                  {drivers.filter((d) => d.status === "active").map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => void submitRoute()}
                disabled={saving || !routeForm.name.trim()}
                className="w-full h-10 rounded-xl bg-[var(--primary)] text-white text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {isEnglish ? "Save" : "حفظ"}
              </button>
            </div>
          </div>
        )}
        {/* Credentials modal — password is shown exactly once */}
        {credentials && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCredentials(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-black text-[var(--text-primary)]">
                {isEnglish ? "Driver login created" : "تم إنشاء حساب السائق"}
              </h3>
              <p className="text-xs font-bold text-[var(--warning)]">
                {isEnglish
                  ? "Save these now — the password is shown only once."
                  : "احفظ هذه المعلومات الآن — كلمة المرور تظهر مرة واحدة فقط."}
              </p>
              {[
                { label: isEnglish ? "Username" : "اسم المستخدم", value: `${credentials.username}@schoolapp.local` },
                { label: isEnglish ? "Password" : "كلمة المرور", value: credentials.password },
              ].map((row) => (
                <div key={row.label} className="rounded-xl bg-[var(--surface-soft)] p-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">{row.label}</div>
                  <div className="text-sm font-black text-[var(--text-primary)] select-all" dir="ltr">{row.value}</div>
                </div>
              ))}
              <button onClick={() => setCredentials(null)} className="w-full h-10 rounded-xl bg-[var(--primary)] text-white text-sm font-black">
                {isEnglish ? "Done" : "تم"}
              </button>
            </div>
          </div>
        )}

        {/* Route members modal */}
        {memberRoute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setMemberRoute(null)}>
            <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-[var(--text-primary)]">
                  {isEnglish ? `Students — ${memberRoute.name}` : `طلاب خط ${memberRoute.name}`}
                </h3>
                <button onClick={() => setMemberRoute(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={18} /></button>
              </div>

              <div className="flex gap-2">
                <select value={addStudentId} onChange={(e) => setAddStudentId(e.target.value)} className={`${inputClass} flex-1`}>
                  <option value="">{isEnglish ? "Select student..." : "اختر طالباً..."}</option>
                  {studentOptions
                    .filter((st) => !members.some((m) => m.student_id === st.id))
                    .map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.full_name}{st.class_name ? ` — ${st.class_name}` : ""}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => void addMember()}
                  disabled={!addStudentId || saving}
                  className="h-10 px-4 rounded-xl bg-[var(--primary)] text-white text-xs font-black disabled:opacity-40 shrink-0"
                >
                  {isEnglish ? "Add" : "إضافة"}
                </button>
              </div>

              {membersLoading ? (
                <div className="py-8 flex justify-center"><Loader2 size={22} className="animate-spin text-[var(--primary)]" /></div>
              ) : members.length === 0 ? (
                <p className="py-6 text-center text-sm font-bold text-[var(--text-muted)]">
                  {isEnglish ? "No students on this route yet." : "لا يوجد طلاب على هذا الخط بعد."}
                </p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 flex items-center gap-3">
                      <span className="h-7 w-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-black flex items-center justify-center shrink-0">
                        {formatNumber(m.stop_order)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-[var(--text-primary)] truncate">
                          {m.students?.full_name ?? "—"}
                        </div>
                        <div className="text-[11px] font-bold text-[var(--text-muted)]">
                          {m.students?.class_name ?? "—"} · {isEnglish ? "Drop-off PIN" : "رمز التسليم"}:
                          <span className="font-black text-[var(--text-primary)] ms-1 select-all" dir="ltr">{m.dropoff_pin}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => void toggleSubscription(m)}
                        disabled={saving}
                        className={`h-8 px-3 rounded-lg text-xs font-black disabled:opacity-40 shrink-0 ${
                          m.subscription_status === "paid"
                            ? "bg-[var(--success)]/10 text-[var(--success)]"
                            : "bg-[var(--warning)]/10 text-[var(--warning)]"
                        }`}
                      >
                        {m.subscription_status === "paid" ? (isEnglish ? "Paid" : "مدفوع") : (isEnglish ? "Due" : "مستحق")}
                      </button>
                      <button
                        onClick={() => void removeMember(m.id)}
                        disabled={saving}
                        className="h-8 px-3 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-black disabled:opacity-40 shrink-0"
                      >
                        {isEnglish ? "Remove" : "إزالة"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
