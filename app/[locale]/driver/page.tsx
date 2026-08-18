"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { getLocaleFromPath } from "@/lib/locale-routing";
import {
  Bus, CheckCircle2, Loader2, LogOut, Phone, RefreshCw, User, X, AlertTriangle,
} from "@/lib/icons";
import { formatNumber } from "@/lib/formatting";
import { supabase } from "@/lib/supabase";

/**
 * The driver's whole product: one mobile-first page. Big touch targets, three
 * actions per student (boarded / absent / PIN-gated drop-off), one active trip
 * at a time. The role can reach nothing else — see types/roles.ts.
 */

type RouteInfo = { id: string; name: string };
type TripInfo = { id: string; route_id: string; trip_type: "morning" | "afternoon"; status: string };
type StudentRow = {
  membership_id: string;
  route_id: string;
  student_id: string;
  stop_order: number;
  special_notes: string | null;
  subscription_active: boolean;
  full_name: string;
  class_name: string | null;
  photo_url: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
};

type OverviewPayload = {
  ok?: boolean;
  date?: string;
  driver?: { full_name: string };
  routes?: RouteInfo[];
  students?: StudentRow[];
  trips?: TripInfo[];
  error?: { message?: string };
};

type MarkState = "boarded" | "absent" | "dropped_off";

export default function DriverPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isEnglish = locale === "en";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("");
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [trips, setTrips] = useState<TripInfo[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [marked, setMarked] = useState<Record<string, MarkState>>({});
  const [pinFor, setPinFor] = useState<StudentRow | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<OverviewPayload>(
        "/api/web/driver/overview",
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر تحميل بياناتك.");
      setDriverName(payload?.driver?.full_name ?? "");
      setRoutes(payload?.routes ?? []);
      setStudents(payload?.students ?? []);
      setTrips(payload?.trips ?? []);
      const firstRoute = (payload?.routes ?? [])[0];
      setActiveRouteId((current) => current ?? firstRoute?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل بياناتك.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const activeTrip = useMemo(
    () => trips.find((t) => t.route_id === activeRouteId && t.status === "in_progress") ?? null,
    [trips, activeRouteId],
  );
  const routeStudents = useMemo(
    () => students.filter((s) => s.route_id === activeRouteId).sort((a, b) => a.stop_order - b.stop_order),
    [students, activeRouteId],
  );

  const withPosition = useCallback(
    () =>
      new Promise<{ lat: number | null; lng: number | null }>((resolve) => {
        if (!navigator.geolocation) return resolve({ lat: null, lng: null });
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: null, lng: null }),
          { enableHighAccuracy: false, timeout: 5_000, maximumAge: 60_000 },
        );
      }),
    [],
  );

  const startTrip = useCallback(async (tripType: "morning" | "afternoon") => {
    if (!activeRouteId || busy) return;
    setBusy("start");
    setError(null);
    try {
      const pos = await withPosition();
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        "/api/web/driver/trips",
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({ route_id: activeRouteId, trip_type: tripType, ...pos }),
        },
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر بدء الرحلة.");
      setMarked({});
      await fetchOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر بدء الرحلة.");
    } finally {
      setBusy(null);
    }
  }, [activeRouteId, busy, withPosition, fetchOverview]);

  const endTrip = useCallback(async () => {
    if (!activeTrip || busy) return;
    setBusy("end");
    setError(null);
    try {
      const pos = await withPosition();
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        "/api/web/driver/trips",
        {
          method: "PATCH",
          headers: withJsonHeaders(),
          body: JSON.stringify({ trip_id: activeTrip.id, ...pos }),
        },
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر إنهاء الرحلة.");
      await fetchOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنهاء الرحلة.");
    } finally {
      setBusy(null);
    }
  }, [activeTrip, busy, withPosition, fetchOverview]);

  const mark = useCallback(async (student: StudentRow, state: MarkState, pin?: string) => {
    if (!activeTrip) return;
    setBusy(student.student_id + state);
    setPinError(null);
    try {
      const pos = state === "dropped_off" ? await withPosition() : { lat: null, lng: null };
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        "/api/web/driver/attendance",
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            trip_id: activeTrip.id,
            student_id: student.student_id,
            state,
            pin,
            ...pos,
          }),
        },
      );
      if (!response.ok) {
        const message = payload?.error?.message || "تعذر تسجيل الحالة.";
        if (state === "dropped_off") {
          setPinError(message);
          return;
        }
        throw new Error(message);
      }
      setMarked((prev) => ({ ...prev, [student.student_id]: state }));
      if (state === "dropped_off") {
        setPinFor(null);
        setPinValue("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الحالة.");
    } finally {
      setBusy(null);
    }
  }, [activeTrip, withPosition]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    window.location.href = `/${locale}/login`;
  }, [locale]);

  return (
    <ProtectedRoute roles={["driver"]}>
      <div className="min-h-screen bg-[var(--surface-soft)]" dir={isEnglish ? "ltr" : "rtl"}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[var(--card-bg)] border-b border-[var(--border)]">
          <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
                <Bus size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-black text-[var(--text-primary)] truncate">
                  {driverName || (isEnglish ? "Driver" : "السائق")}
                </h1>
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                  {isEnglish ? "School transport" : "النقل المدرسي"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => void fetchOverview()} aria-label={isEnglish ? "Refresh" : "تحديث"}
                className="h-10 w-10 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={() => void signOut()} aria-label={isEnglish ? "Sign out" : "خروج"}
                className="h-10 w-10 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--danger)]">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto p-4 space-y-4 pb-24">
          {error && (
            <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-4 flex items-center gap-3">
              <AlertTriangle size={18} className="text-[var(--danger)] shrink-0" />
              <span className="text-sm font-bold text-[var(--danger)] flex-1">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="h-12 w-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
            </div>
          ) : routes.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center space-y-2">
              <Bus size={32} className="mx-auto text-[var(--text-muted)]" />
              <p className="text-sm font-bold text-[var(--text-muted)]">
                {isEnglish ? "No routes assigned to you yet." : "لا توجد خطوط مسندة إليك بعد. راجع إدارة المدرسة."}
              </p>
            </div>
          ) : (
            <>
              {/* Route picker (only when more than one) */}
              {routes.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {routes.map((r) => (
                    <button key={r.id} onClick={() => setActiveRouteId(r.id)}
                      className={`h-10 px-4 rounded-xl text-xs font-black whitespace-nowrap border transition-colors ${
                        activeRouteId === r.id
                          ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                          : "bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)]"
                      }`}>
                      {r.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Trip control */}
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 space-y-3">
                {activeTrip ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-[var(--text-primary)]">
                        {activeTrip.trip_type === "morning"
                          ? (isEnglish ? "Morning trip in progress" : "رحلة الصباح جارية")
                          : (isEnglish ? "Afternoon trip in progress" : "رحلة العودة جارية")}
                      </span>
                      <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)] animate-pulse" />
                    </div>
                    <button onClick={() => void endTrip()} disabled={busy !== null}
                      className="w-full h-14 rounded-2xl bg-[var(--danger)] text-white text-base font-black active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
                      {busy === "end" ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                      {isEnglish ? "End trip" : "إنهاء الرحلة"}
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => void startTrip("morning")} disabled={busy !== null}
                      className="h-14 rounded-2xl bg-[var(--primary)] text-white text-sm font-black active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
                      {busy === "start" ? <Loader2 size={18} className="animate-spin" /> : <Bus size={18} />}
                      {isEnglish ? "Start morning" : "ابدأ رحلة الصباح"}
                    </button>
                    <button onClick={() => void startTrip("afternoon")} disabled={busy !== null}
                      className="h-14 rounded-2xl border-2 border-[var(--primary)] text-[var(--primary)] text-sm font-black active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2">
                      {busy === "start" ? <Loader2 size={18} className="animate-spin" /> : <Bus size={18} />}
                      {isEnglish ? "Start afternoon" : "ابدأ رحلة العودة"}
                    </button>
                  </div>
                )}
              </section>

              {/* Students */}
              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
                    {isEnglish ? "Students" : "الطلاب"} ({formatNumber(routeStudents.length)})
                  </h2>
                  {!activeTrip && (
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">
                      {isEnglish ? "Start a trip to record boarding" : "ابدأ الرحلة لتسجيل الصعود"}
                    </span>
                  )}
                </div>

                {routeStudents.map((s) => {
                  const state = marked[s.student_id];
                  return (
                    <div key={s.membership_id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-[var(--surface-soft)] flex items-center justify-center shrink-0 overflow-hidden">
                          {s.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.photo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <User size={20} className="text-[var(--text-muted)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-[var(--text-primary)] truncate">{s.full_name}</h3>
                            {!s.subscription_active && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black bg-[var(--warning)]/10 text-[var(--warning)]">
                                {isEnglish ? "unpaid" : "غير مشترك"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] font-bold">
                            {s.class_name ?? "—"}
                            {s.guardian_name ? ` · ${s.guardian_name}` : ""}
                          </p>
                          {s.special_notes && (
                            <p className="mt-1 text-[11px] font-bold text-[var(--warning)] bg-[var(--warning)]/10 rounded-lg px-2 py-1">
                              {s.special_notes}
                            </p>
                          )}
                        </div>
                        {s.guardian_phone && (
                          <a href={`tel:${s.guardian_phone}`} aria-label={isEnglish ? "Call guardian" : "اتصال بولي الأمر"}
                            className="h-11 w-11 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--success)] shrink-0">
                            <Phone size={18} />
                          </a>
                        )}
                      </div>

                      {activeTrip && (
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => void mark(s, "boarded")}
                            disabled={busy !== null || state === "boarded"}
                            className={`h-12 rounded-xl text-xs font-black transition-all active:scale-95 ${
                              state === "boarded"
                                ? "bg-[var(--success)] text-white"
                                : "bg-[var(--success)]/10 text-[var(--success)]"
                            }`}>
                            {busy === s.student_id + "boarded" ? <Loader2 size={14} className="animate-spin mx-auto" /> : (isEnglish ? "Boarded ✓" : "صعد ✓")}
                          </button>
                          <button
                            onClick={() => void mark(s, "absent")}
                            disabled={busy !== null || state === "absent"}
                            className={`h-12 rounded-xl text-xs font-black transition-all active:scale-95 ${
                              state === "absent"
                                ? "bg-[var(--danger)] text-white"
                                : "bg-[var(--danger)]/10 text-[var(--danger)]"
                            }`}>
                            {busy === s.student_id + "absent" ? <Loader2 size={14} className="animate-spin mx-auto" /> : (isEnglish ? "Absent ✗" : "لم يحضر ✗")}
                          </button>
                          <button
                            onClick={() => { setPinFor(s); setPinValue(""); setPinError(null); }}
                            disabled={busy !== null || state === "dropped_off" || state !== "boarded"}
                            className={`h-12 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-40 ${
                              state === "dropped_off"
                                ? "bg-[var(--primary)] text-white"
                                : "bg-[var(--primary)]/10 text-[var(--primary)]"
                            }`}>
                            {state === "dropped_off" ? (isEnglish ? "Dropped ✓" : "سُلِّم ✓") : (isEnglish ? "Drop-off" : "تسليم")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            </>
          )}
        </main>

        {/* Drop-off PIN sheet */}
        {pinFor && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
            onClick={() => setPinFor(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-[var(--text-primary)]">
                  {isEnglish ? "Drop-off code" : "رمز التسليم"}
                </h3>
                <button onClick={() => setPinFor(null)} className="text-[var(--text-muted)]"><X size={18} /></button>
              </div>
              <p className="text-sm font-bold text-[var(--text-muted)]">
                {isEnglish
                  ? `Ask ${pinFor.full_name}'s guardian for the 4-digit code.`
                  : `اطلب رمز التسليم المكوّن من 4 أرقام من ولي أمر ${pinFor.full_name}.`}
              </p>
              <input
                inputMode="numeric"
                maxLength={4}
                autoFocus
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full h-16 text-center text-3xl font-black tracking-[0.5em] rounded-2xl border-2 border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                dir="ltr"
              />
              {pinError && <p className="text-sm font-bold text-[var(--danger)] text-center">{pinError}</p>}
              <button
                onClick={() => void mark(pinFor, "dropped_off", pinValue)}
                disabled={pinValue.length !== 4 || busy !== null}
                className="w-full h-14 rounded-2xl bg-[var(--primary)] text-white text-base font-black disabled:opacity-40 flex items-center justify-center gap-2">
                {busy === pinFor.student_id + "dropped_off"
                  ? <Loader2 size={18} className="animate-spin" />
                  : <CheckCircle2 size={18} />}
                {isEnglish ? "Confirm drop-off" : "تأكيد التسليم"}
              </button>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
