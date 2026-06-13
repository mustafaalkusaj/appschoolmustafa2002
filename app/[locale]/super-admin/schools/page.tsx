"use client";

import { useCallback, useMemo, useState } from "react";
import {
  fetchJsonWithAuthorizedSession,
  fetchWithAuthorizedSession,
  withJsonHeaders,
} from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { requestRuntimeBrandingRefresh } from "@/hooks/brand";
import { setStoredSchoolBranding } from "@/lib/brand/palette";
import { X } from "@/lib/icons";
import { useSuperAdminData } from "../_hooks/useSuperAdminData";
import {
  SchoolsTab,
  SchoolForm,
  DeleteSchoolDialog,
  type SchoolFormData,
  getErrorMessage,
} from "../_components";
import type { SchoolRecord } from "../_components/types";

export default function SchoolsPage() {
  const { schools, subscriptions, schemaCompat, refresh } =
    useSuperAdminData();
  const toast = useToast();

  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editSchool, setEditSchool] = useState<SchoolRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolRecord | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] =
    useState<SchoolRecord | null>(null);
  const [importingSchoolId, setImportingSchoolId] = useState<string | null>(
    null,
  );
  const [copyClassesSource, setCopyClassesSource] =
    useState<SchoolRecord | null>(null);
  const [copyClassesTargetId, setCopyClassesTargetId] = useState("");
  const [copySettingsSource, setCopySettingsSource] =
    useState<SchoolRecord | null>(null);
  const [copySettingsTargetId, setCopySettingsTargetId] = useState("");

  const filteredSchools = useMemo(
    () => schools.filter((s) => !s.deleted_at),
    [schools],
  );

  const handleSaveSchool = useCallback(
    async (f: SchoolFormData, editing: SchoolRecord | null) => {
      try {
        const url = editing
          ? `/api/web/super-admin/schools/${editing.id}`
          : "/api/web/super-admin/schools";
        const method = editing ? "PATCH" : "POST";
        const body = {
          name: f.name,
          address: f.address || null,
          phone: f.phone || null,
          owner_email: f.owner_email || null,
          city: f.city || null,
          logo_url: f.logo_url || null,
          primary_color: f.primary_color || null,
          secondary_color: f.secondary_color || null,
          plan: f.plan,
          mode: editing ? "update" : undefined,
        };
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          school?: SchoolRecord;
          error?: { message?: string };
        }>(url, {
          method,
          headers: withJsonHeaders(),
          body: JSON.stringify(body),
        });
        if (!response.ok)
          throw new Error(payload?.error?.message || "تعذر الحفظ.");
        const schoolId = editing?.id ?? payload?.school?.id;
        if (!schoolId) throw new Error("تعذر تحديد المدرسة بعد الحفظ.");
        setStoredSchoolBranding(schoolId, {
          primaryColor: f.primary_color || null,
          secondaryColor: f.secondary_color || null,
          themePreset: f.themePresetId || null,
          sidebarColor: f.sidebar_color || null,
          accentColor: f.accent_color || null,
          textColor: f.text_color || null,
          source: "manual",
        });
        toast.success("تم الحفظ بنجاح ✓");
        setShowSchoolForm(false);
        await refresh();
        requestRuntimeBrandingRefresh();
      } catch (e) {
        toast.error(getErrorMessage(e, "تعذر الحفظ."));
      }
    },
    [refresh, toast],
  );

  const handleToggleSchool = useCallback(
    async (schoolId: string, current: boolean) => {
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          school?: SchoolRecord;
          error?: { message?: string };
        }>(`/api/web/super-admin/schools/${schoolId}`, {
          method: "PATCH",
          headers: withJsonHeaders(),
          body: JSON.stringify({ mode: "toggle", is_active: !current }),
        });
        if (!response.ok)
          throw new Error(
            payload?.error?.message || "تعذر تحديث حالة المدرسة.",
          );
        toast.success(
          current
            ? "تم إيقاف المدرسة بنجاح ✓"
            : "تم تفعيل المدرسة بنجاح ✓",
        );
        await refresh();
      } catch (e) {
        toast.error(getErrorMessage(e, "تعذر تحديث حالة المدرسة."));
      }
    },
    [refresh, toast],
  );

  const handleExtendSubscription = useCallback(
    async (schoolId: string) => {
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          created?: boolean;
          error?: { message?: string };
        }>(`/api/web/super-admin/subscriptions/${schoolId}`, {
          method: "POST",
          headers: withJsonHeaders(),
        });
        if (!response.ok)
          throw new Error(
            payload?.error?.message || "تعذر تجديد الاشتراك.",
          );
        toast.success(
          payload?.created
            ? "تم إنشاء الاشتراك وتفعيله ✓"
            : "تم تجديد الاشتراك بنجاح ✓",
        );
        await refresh();
      } catch (e) {
        toast.error(getErrorMessage(e, "تعذر تجديد الاشتراك."));
      }
    },
    [refresh, toast],
  );

  const handleDeleteSchool = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        error?: { message?: string };
      }>(`/api/web/super-admin/schools/${deleteTarget.id}`, {
        method: "DELETE",
        headers: withJsonHeaders(),
      });
      if (!response.ok)
        throw new Error(payload?.error?.message || "تعذر أرشفة المدرسة.");
      toast.success(`تمت أرشفة المدرسة ${deleteTarget.name} ✓`);
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      toast.error(getErrorMessage(e, "تعذر أرشفة المدرسة."));
    }
  }, [deleteTarget, refresh, toast]);

  const handlePermanentlyDeleteSchool = useCallback(async () => {
    if (!permanentDeleteTarget) return;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        error?: { message?: string };
      }>(`/api/web/super-admin/schools/${permanentDeleteTarget.id}?hardDelete=true`, {
        method: "DELETE",
        headers: withJsonHeaders(),
      });
      if (!response.ok)
        throw new Error(payload?.error?.message || "تعذر حذف المدرسة.");
      toast.success(
        `تم حذف المدرسة ${permanentDeleteTarget.name} نهائياً ✓`,
      );
      setPermanentDeleteTarget(null);
      await refresh();
    } catch (e) {
      toast.error(getErrorMessage(e, "تعذر حذف المدرسة."));
    }
  }, [permanentDeleteTarget, refresh, toast]);

  const handleExportSchool = useCallback(
    async (school: SchoolRecord) => {
      try {
        const response = await fetchWithAuthorizedSession(
          `/api/web/super-admin/schools/${school.id}/export`,
          { method: "GET" },
        );
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.error?.message || "تعذر تصدير بيانات المدرسة.",
          );
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const disposition =
          response.headers.get("Content-Disposition") ||
          response.headers.get("content-disposition") ||
          "";
        const matchedFileName = disposition.match(
          /filename="?([^";]+)"?/i,
        );
        anchor.href = url;
        anchor.download = decodeURIComponent(
          matchedFileName?.[1] || `${school.name}-archive.json`,
        );
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
        const warningsCount = Number(
          response.headers.get("X-School-Archive-Warnings-Count") || "0",
        );
        toast.success(
          warningsCount > 0
            ? `تم تجهيز نسخة بيانات المدرسة ${school.name} مع ${warningsCount} تنبيه توافق.`
            : `تم تجهيز نسخة بيانات المدرسة ${school.name} ✓`,
        );
      } catch (e) {
        toast.error(getErrorMessage(e, "تعذر تصدير بيانات المدرسة."));
      }
    },
    [toast],
  );

  const handleImportSchoolData = useCallback(
    async (school: SchoolRecord, file: File) => {
      setImportingSchoolId(school.id);
      try {
        const formData = new FormData();
        formData.set("file", file);
        const response = await fetchWithAuthorizedSession(
          `/api/web/super-admin/schools/${school.id}/import`,
          { method: "POST", body: formData },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(
            payload?.error?.message || "تعذر استيراد ملف المدرسة.",
          );
        const warnings = Array.isArray(payload?.warnings)
          ? payload.warnings.filter(
              (item: unknown): item is string =>
                typeof item === "string" && item.trim().length > 0,
            )
          : [];
        toast.success(
          warnings.length > 0
            ? `تم استيراد بيانات ${school.name} مع ${warnings.length} تنبيه يحتاج مراجعة.`
            : `تم استيراد بيانات ${school.name} بنجاح ✓`,
        );
        await refresh();
      } catch (e) {
        toast.error(getErrorMessage(e, "تعذر استيراد ملف المدرسة."));
      } finally {
        setImportingSchoolId(null);
      }
    },
    [refresh, toast],
  );

  const handleCopySettings = useCallback(async () => {
    if (!copySettingsSource || !copySettingsTargetId.trim()) return;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        targetSchoolName?: string;
        error?: { message?: string };
      }>(`/api/web/super-admin/schools/${copySettingsSource.id}/copy-settings`, {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          targetSchoolId: copySettingsTargetId.trim(),
        }),
      });
      if (!response.ok)
        throw new Error(payload?.error?.message || "تعذر نسخ الإعدادات.");
      toast.success(
        `تم نسخ إعدادات التصميم إلى ${payload?.targetSchoolName ?? "المدرسة الهدف"} ✓`,
      );
      setCopySettingsSource(null);
      setCopySettingsTargetId("");
      await refresh();
    } catch (e) {
      toast.error(getErrorMessage(e, "تعذر نسخ الإعدادات."));
    }
  }, [copySettingsSource, copySettingsTargetId, refresh, toast]);

  const handleCopyClasses = useCallback(async () => {
    if (!copyClassesSource || !copyClassesTargetId.trim()) return;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        copied?: number;
        targetSchoolName?: string;
        error?: { message?: string };
      }>(`/api/web/super-admin/schools/${copyClassesSource.id}/copy-classes`, {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          targetSchoolId: copyClassesTargetId.trim(),
        }),
      });
      if (!response.ok)
        throw new Error(payload?.error?.message || "تعذر نسخ الصفوف.");
      toast.success(
        `تم نسخ ${payload?.copied ?? 0} صف إلى ${payload?.targetSchoolName ?? "المدرسة الهدف"} ✓`,
      );
      setCopyClassesSource(null);
      setCopyClassesTargetId("");
    } catch (e) {
      toast.error(getErrorMessage(e, "تعذر نسخ الصفوف."));
    }
  }, [copyClassesSource, copyClassesTargetId, toast]);

  return (
    <>
      <SchoolsTab
        schools={schools}
        subscriptions={subscriptions}
        filteredSchools={filteredSchools}
        onOpenCreateSchool={() => {
          setEditSchool(null);
          setShowSchoolForm(true);
        }}
        onOpenEditSchool={(s) => {
          setEditSchool(s);
          setShowSchoolForm(true);
        }}
        onToggleSchool={handleToggleSchool}
        onExtendSubscription={handleExtendSubscription}
        onDeleteSchool={setDeleteTarget}
        onPermanentlyDeleteSchool={setPermanentDeleteTarget}
        onExportSchool={handleExportSchool}
        onImportSchoolData={handleImportSchoolData}
        importingSchoolId={importingSchoolId}
        onRefresh={refresh}
        onCopyClasses={(school) => {
          setCopyClassesSource(school);
          setCopyClassesTargetId("");
        }}
        onCopySettings={(school) => {
          setCopySettingsSource(school);
          setCopySettingsTargetId("");
        }}
      />

      <SchoolForm
        isOpen={showSchoolForm}
        editSchool={editSchool}
        schemaCompat={schemaCompat}
        onClose={() => setShowSchoolForm(false)}
        onSave={handleSaveSchool}
      />

      <DeleteSchoolDialog
        school={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteSchool()}
      />

      <ConfirmDialog
        open={!!permanentDeleteTarget}
        title="حذف المدرسة نهائياً"
        description={
          permanentDeleteTarget
            ? `هل أنت متأكد من حذف "${permanentDeleteTarget.name}" بشكل دائم؟ هذا الإجراء لا يمكن التراجع عنه.`
            : ""
        }
        confirmLabel="حذف نهائياً"
        cancelLabel="إلغاء"
        tone="danger"
        onClose={() => setPermanentDeleteTarget(null)}
        onConfirm={() => void handlePermanentlyDeleteSchool()}
      />

      {copySettingsSource && (
        <div
          className="ui-backdrop flex items-center justify-center p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setCopySettingsSource(null)
          }
        >
          <div
            className="ui-dialog w-full max-w-md overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-[var(--text-primary)]">
                  نسخ إعدادات التصميم
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  من: {copySettingsSource.name}
                </p>
              </div>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface)]"
                onClick={() => setCopySettingsSource(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-[var(--text-secondary)]">
                سيتم نسخ الألوان والشعار من{" "}
                <strong>{copySettingsSource.name}</strong> إلى المدرسة
                المحددة.
              </p>
              <div className="space-y-1">
                <label className="text-sm font-black text-[var(--text-secondary)]">
                  المدرسة الهدف
                </label>
                <select
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  value={copySettingsTargetId}
                  onChange={(e) => setCopySettingsTargetId(e.target.value)}
                >
                  <option value="">— اختر المدرسة الهدف —</option>
                  {schools
                    .filter(
                      (s) =>
                        s.id !== copySettingsSource.id && !s.deleted_at,
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  className="ui-button ui-button--secondary flex-1"
                  onClick={() => setCopySettingsSource(null)}
                >
                  إلغاء
                </button>
                <button
                  className="ui-button ui-button--primary flex-1"
                  disabled={!copySettingsTargetId}
                  onClick={() => void handleCopySettings()}
                >
                  نسخ الإعدادات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {copyClassesSource && (
        <div
          className="ui-backdrop flex items-center justify-center p-4"
          onClick={(e) =>
            e.target === e.currentTarget && setCopyClassesSource(null)
          }
        >
          <div
            className="ui-dialog w-full max-w-md overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-[var(--text-primary)]">
                  نسخ الصفوف
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  من: {copyClassesSource.name}
                </p>
              </div>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface)]"
                onClick={() => setCopyClassesSource(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="space-y-1">
                <label className="text-sm font-black text-[var(--text-secondary)]">
                  المدرسة الهدف
                </label>
                <select
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  value={copyClassesTargetId}
                  onChange={(e) => setCopyClassesTargetId(e.target.value)}
                >
                  <option value="">— اختر المدرسة الهدف —</option>
                  {schools
                    .filter(
                      (s) =>
                        s.id !== copyClassesSource.id && !s.deleted_at,
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  className="ui-button ui-button--secondary flex-1"
                  onClick={() => setCopyClassesSource(null)}
                >
                  إلغاء
                </button>
                <button
                  className="ui-button ui-button--primary flex-1"
                  disabled={!copyClassesTargetId}
                  onClick={() => void handleCopyClasses()}
                >
                  نسخ الصفوف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
