"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { cn } from "@/lib/brand/brand-utils";
import { Settings, Building2, Palette, Save, RefreshCw } from "@/lib/icons";

type SchoolRow = {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  city: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
};

type SettingsResponse = {
  ok?: boolean;
  school?: SchoolRow;
  error?: { message?: string };
};

function getApiErrorMessage(payload: { error?: { message?: string } } | null | undefined, fallback: string) {
  return typeof payload?.error?.message === "string" && payload.error.message.trim()
    ? payload.error.message
    : fallback;
}

const inputClasses =
  "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 w-full";

type FormState = {
  name: string;
  address: string;
  phone: string;
  city: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  address: "",
  phone: "",
  city: "",
  logo_url: "",
  primary_color: "#4f46e5",
  secondary_color: "#0ea5e9",
};

function formFromSchool(school: SchoolRow): FormState {
  return {
    name: school.name ?? "",
    address: school.address ?? "",
    phone: school.phone ?? "",
    city: school.city ?? "",
    logo_url: school.logo_url ?? "",
    primary_color: school.primary_color ?? "#4f46e5",
    secondary_color: school.secondary_color ?? "#0ea5e9",
  };
}

function isDirty(form: FormState, original: FormState): boolean {
  return (Object.keys(form) as (keyof FormState)[]).some((key) => form[key] !== original[key]);
}

export default function SettingsPage() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);

  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const originalRef = useRef<FormState>(EMPTY_FORM);
  const dirty = isDirty(form, originalRef.current);

  const resolveScopedSchoolId = useCallback(async () => {
    return resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
  }, [profile, schoolScope.selectedSchoolId]);

  const fetchSettings = useCallback(async () => {
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<SettingsResponse>(
        `/api/web/settings?schoolId=${encodeURIComponent(scopedSchoolId)}`,
      );

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "تعذر تحميل إعدادات المدرسة."));
      }

      const s = payload?.school ?? null;
      setSchool(s);
      if (s) {
        const f = formFromSchool(s);
        setForm(f);
        originalRef.current = f;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل إعدادات المدرسة.");
    } finally {
      setLoading(false);
    }
  }, [resolveScopedSchoolId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchSettings();
  }, [fetchSettings, profile, schoolScope.scopeLoading]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;

    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) {
      setError("لا يمكن تحديد المدرسة.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const body: Record<string, string | null> = { schoolId: scopedSchoolId };
    if (form.name !== originalRef.current.name) body.name = form.name;
    if (form.address !== originalRef.current.address) body.address = form.address || null;
    if (form.phone !== originalRef.current.phone) body.phone = form.phone || null;
    if (form.city !== originalRef.current.city) body.city = form.city || null;
    if (form.logo_url !== originalRef.current.logo_url) body.logo_url = form.logo_url || null;
    if (form.primary_color !== originalRef.current.primary_color) body.primary_color = form.primary_color || null;
    if (form.secondary_color !== originalRef.current.secondary_color) body.secondary_color = form.secondary_color || null;

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<SettingsResponse>(
        "/api/web/settings",
        {
          method: "PATCH",
          headers: withJsonHeaders(),
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "تعذر حفظ الإعدادات."));
      }

      const s = payload?.school ?? null;
      setSchool(s);
      if (s) {
        const f = formFromSchool(s);
        setForm(f);
        originalRef.current = f;
      }
      setSuccess("تم حفظ الإعدادات بنجاح ✓");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الإعدادات.");
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/settings" showFloatingToggle />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title="الإعدادات"
            subtitle="إعدادات المدرسة والهوية البصرية"
            scope={schoolScope}
            fixed
          />

          <main className="flex-1 pt-16 overflow-y-auto custom-scrollbar">
            <div className="max-w-[900px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">

              {success && (
                <div className="rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold">
                  {success}
                </div>
              )}
              {error && (
                <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold">
                  {error}
                </div>
              )}

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-[40px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-lg">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title="الإعدادات"
                    description="اختر مدرسة من القائمة لعرض إعداداتها."
                  />
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <div className="h-12 w-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                  <span className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">
                    جارٍ تحميل الإعدادات...
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-8">
                  {/* Section 1 — School Info */}
                  <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-lg">
                    <div className="flex items-center gap-3 mb-8 pb-6 border-b border-[var(--border)]">
                      <div className="h-10 w-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-[var(--text-primary)]">معلومات المدرسة</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">البيانات الأساسية للمدرسة</p>
                      </div>
                      <button
                        type="button"
                        title="تحديث"
                        className="ms-auto h-9 w-9 flex items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--primary)] hover:bg-[var(--border)] transition-colors"
                        onClick={() => void fetchSettings()}
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
                          اسم المدرسة *
                        </label>
                        <input
                          className={inputClasses}
                          required
                          placeholder="اسم المدرسة..."
                          value={form.name}
                          onChange={(e) => setField("name", e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
                          رقم الهاتف
                        </label>
                        <input
                          className={inputClasses}
                          placeholder="مثال: 07xxxxxxxxx"
                          value={form.phone}
                          onChange={(e) => setField("phone", e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
                          المدينة
                        </label>
                        <input
                          className={inputClasses}
                          placeholder="مثال: بغداد"
                          value={form.city}
                          onChange={(e) => setField("city", e.target.value)}
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
                          العنوان
                        </label>
                        <input
                          className={inputClasses}
                          placeholder="عنوان المدرسة..."
                          value={form.address}
                          onChange={(e) => setField("address", e.target.value)}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Section 2 — Branding */}
                  <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-lg">
                    <div className="flex items-center gap-3 mb-8 pb-6 border-b border-[var(--border)]">
                      <div className="h-10 w-10 rounded-2xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center">
                        <Palette size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-[var(--text-primary)]">الهوية البصرية</h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">شعار المدرسة والألوان الرسمية</p>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
                          رابط الشعار (URL)
                        </label>
                        <input
                          className={inputClasses}
                          type="url"
                          placeholder="https://..."
                          value={form.logo_url}
                          onChange={(e) => setField("logo_url", e.target.value)}
                        />
                        {form.logo_url && (
                          <div className="mt-2 flex items-center gap-3 px-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={form.logo_url}
                              alt="معاينة الشعار"
                              className="h-12 w-12 rounded-xl object-contain border border-[var(--border)] bg-[var(--surface-muted)]"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <span className="text-xs text-[var(--text-muted)]">معاينة الشعار</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
                          اللون الأساسي
                        </label>
                        <div className="flex gap-3 items-center">
                          <input
                            type="color"
                            value={form.primary_color}
                            onChange={(e) => setField("primary_color", e.target.value)}
                            className="h-11 w-14 rounded-xl border border-[var(--border)] cursor-pointer bg-transparent p-1 flex-shrink-0"
                          />
                          <input
                            className={cn(inputClasses, "font-mono uppercase")}
                            value={form.primary_color}
                            maxLength={7}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) setField("primary_color", val);
                            }}
                          />
                        </div>
                        <div
                          className="mt-2 h-6 rounded-lg border border-[var(--border)]"
                          style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(form.primary_color) ? form.primary_color : "transparent" }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
                          اللون الثانوي
                        </label>
                        <div className="flex gap-3 items-center">
                          <input
                            type="color"
                            value={form.secondary_color}
                            onChange={(e) => setField("secondary_color", e.target.value)}
                            className="h-11 w-14 rounded-xl border border-[var(--border)] cursor-pointer bg-transparent p-1 flex-shrink-0"
                          />
                          <input
                            className={cn(inputClasses, "font-mono uppercase")}
                            value={form.secondary_color}
                            maxLength={7}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^#[0-9a-fA-F]{0,6}$/.test(val)) setField("secondary_color", val);
                            }}
                          />
                        </div>
                        <div
                          className="mt-2 h-6 rounded-lg border border-[var(--border)]"
                          style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(form.secondary_color) ? form.secondary_color : "transparent" }}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Save Button */}
                  <div className="flex justify-end gap-3 pb-4">
                    <button
                      type="button"
                      className="px-6 h-12 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] text-sm font-black transition-all hover:bg-[var(--border)] disabled:opacity-40"
                      disabled={!dirty || saving}
                      onClick={() => {
                        setForm(originalRef.current);
                        setError("");
                      }}
                    >
                      تراجع
                    </button>
                    <button
                      type="submit"
                      disabled={!dirty || saving}
                      className="flex items-center gap-2 px-8 h-12 rounded-full bg-[var(--primary)] text-white text-sm font-black shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                    >
                      <Save size={16} />
                      {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
