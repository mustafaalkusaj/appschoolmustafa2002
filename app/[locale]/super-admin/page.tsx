"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "@/lib/icons";
import {
  AlertTriangle,
  Archive,
  Bell,
  CreditCard,
  LayoutDashboard,
  RefreshCw,
  School,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  BadgeCheck,
  History,
  Activity,
  GitBranch,
  Flag,
  Plus,
  TrendingUp,
  X,
  Loader2,
} from "@/lib/icons";
import { fetchJsonWithAuthorizedSession, fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import { ROLE_LABELS, type Permission } from "@/lib/auth";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useRole } from "@/hooks/useRole";
import { requestRuntimeBrandingRefresh } from "@/hooks/brand";
import { setStoredSchoolBranding, getStoredSchoolBranding } from "@/lib/brand/palette";
import { type AdminInfrastructure, DEFAULT_ADMIN_INFRASTRUCTURE } from "@/lib/admin-infrastructure";
import { type AppSchemaCompat } from "@/lib/schema-compat";
import { cn } from "@/lib/brand/brand-utils";

// Components
import { AuditLogTab } from "./components/AuditLogTab";
import { RolesTab } from "./components/RolesTab";
import { TrashTab } from "./components/TrashTab";
import { NotificationsTab } from "./components/NotificationsTab";
import { SystemMonitoringTab } from "./components/SystemMonitoringTab";
import { BranchesTab } from "./components/BranchesTab";
import { AnalyticsTab } from "./components/AnalyticsTab";
import { BulkOperationsTab } from "./components/BulkOperationsTab";
import { ActivityTimelineTab } from "./components/ActivityTimelineTab";
import { PaymentArchivesTab } from "./components/PaymentArchivesTab";
import { StudentCountsTab } from "./components/StudentCountsTab";
import { AppsTab } from "./components/AppsTab";

import {
  OverviewTab,
  SchoolsTab,
  UsersTab,
  SubscriptionsTab,
  SchoolForm,
  UserForm,
  DeleteSchoolDialog,
  DeleteUserDialog,
  type SchoolRecord,
  type UserRecord,
  type SubscriptionRecord,
  type BranchOptionRecord,
  type ActiveTab,
  type SpotlightFilter,
  type OverviewDiagnostics,
  getErrorMessage,
  spotlightFilterLabel,
  datasetStatusMeta,
  PLAN_LABELS,
} from "./_components";
import type { SchoolFormData, UserFormData } from "./_components";

function isTabAvailable(tab: ActiveTab, infrastructure: AdminInfrastructure) {
  switch (tab) {
    case "audit": return infrastructure.auditLogs;
    case "roles": return infrastructure.customRoles;
    case "trash": return infrastructure.softDeleteSchools || infrastructure.softDeleteUsers || (infrastructure.branches && infrastructure.softDeleteBranches);
    case "notifications": return infrastructure.notifications;
    case "branches": return infrastructure.branches;
    default: return true;
  }
}

export default function SuperAdminPage() {
  const t = useTranslations("superAdmin");
  const toast = useToast();
  const { profile, loading: authLoading } = useRole();
  const isSuperAdmin = !authLoading && profile?.role === "super_admin";

  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [branches, setBranches] = useState<BranchOptionRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [infrastructure, setInfrastructure] = useState(DEFAULT_ADMIN_INFRASTRUCTURE);
  const [schemaCompat, setSchemaCompat] = useState<AppSchemaCompat | null>(null);
  const [overviewDiagnostics, setOverviewDiagnostics] = useState<OverviewDiagnostics | null>(null);
  const [infrastructureNotice, setInfrastructureNotice] = useState("");
  const hasLoadedOnceRef = useRef(false);

  const expiringSubscriptionsCount = useMemo(() => {
    const now = Date.now();
    return subscriptions.filter((s) => {
      if (!s.end_date) return false;
      const d = new Date(s.end_date).getTime() - now;
      return d >= 0 && d <= 30 * 86400000;
    }).length;
  }, [subscriptions]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [monitoringAlertCount, setMonitoringAlertCount] = useState(0);
  const [query, setQuery] = useState("");
  const [spotlightFilter, setSpotlightFilter] = useState<SpotlightFilter | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editSchool, setEditSchool] = useState<SchoolRecord | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [deleteSchoolTarget, setDeleteSchoolTarget] = useState<SchoolRecord | null>(null);
  const [permanentDeleteSchoolTarget, setPermanentDeleteSchoolTarget] = useState<SchoolRecord | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserRecord | null>(null);
  const [importingSchoolId, setImportingSchoolId] = useState<string | null>(null);
  const [copyClassesSource, setCopyClassesSource] = useState<SchoolRecord | null>(null);
  const [copyClassesTargetId, setCopyClassesTargetId] = useState("");
  const [copySettingsSource, setCopySettingsSource] = useState<SchoolRecord | null>(null);
  const [copySettingsTargetId, setCopySettingsTargetId] = useState("");

  const TAB_ITEMS: Array<{ id: ActiveTab; label: string; hint: string; icon: LucideIcon }> = useMemo(() => [
    { id: "overview", label: t("tabs.overview.label"), hint: t("tabs.overview.hint"), icon: LayoutDashboard },
    { id: "schools", label: t("tabs.schools.label"), hint: t("tabs.schools.hint"), icon: School },
    { id: "users", label: t("tabs.users.label"), hint: t("tabs.users.hint"), icon: Users },
    { id: "subscriptions", label: t("tabs.subscriptions.label"), hint: t("tabs.subscriptions.hint"), icon: CreditCard },
    { id: "student-counts", label: "أعداد الطلاب", hint: "عدد الطلاب لكل مدرسة وفرع", icon: Users },
    { id: "analytics", label: "التحليلات", hint: "رسوم بيانية وإحصائيات متقدمة", icon: TrendingUp },
    { id: "bulk", label: "عمليات جماعية", hint: "استيراد وتحديث جماعي", icon: Plus },
    { id: "activity", label: "سجل النشاط", hint: "تتبع العمليات والأحداث", icon: History },
    { id: "payment-archives", label: "أرشيفات الحسابات", hint: "إدارة وحذف أرشيفات الحسابات السنوية", icon: Archive },
    { id: "audit", label: t("tabs.audit.label"), hint: t("tabs.audit.hint"), icon: History },
    { id: "roles", label: t("tabs.roles.label"), hint: t("tabs.roles.hint"), icon: ShieldCheck },
    { id: "trash", label: t("tabs.trash.label"), hint: t("tabs.trash.hint"), icon: Trash2 },
    { id: "notifications", label: t("tabs.notifications.label"), hint: t("tabs.notifications.hint"), icon: Bell },
    { id: "monitoring", label: t("tabs.monitoring.label"), hint: t("tabs.monitoring.hint"), icon: Activity },
    { id: "branches", label: t("tabs.branches.label"), hint: t("tabs.branches.hint"), icon: GitBranch },
    { id: "apps", label: "التطبيقات", hint: "إدارة تطبيقات المدارس، الثيمات، والمميزات", icon: School },
  ], [t]);

  const flashSuccess = useCallback((m: string) => { setSuccess(m); toast.success(m); window.setTimeout(() => setSuccess(""), 2600); }, [toast]);
  const flashError = useCallback((m: string) => { setError(m); toast.error(m); window.setTimeout(() => setError(""), 3200); }, [toast]);

  const refreshDashboard = useCallback(async () => {
    if (!hasLoadedOnceRef.current) setLoading(true); else setRefreshing(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ infrastructure?: AdminInfrastructure; schemaCompat?: AppSchemaCompat; infrastructureNotice?: string; diagnostics?: OverviewDiagnostics; schools?: SchoolRecord[]; branches?: BranchOptionRecord[]; users?: UserRecord[]; subscriptions?: SubscriptionRecord[]; error?: { message?: string }; }>("/api/web/super-admin/overview");
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر تحميل البيانات.");
      setInfrastructure(payload?.infrastructure ?? DEFAULT_ADMIN_INFRASTRUCTURE);
      setSchemaCompat(payload?.schemaCompat ?? null);
      setInfrastructureNotice(payload?.infrastructureNotice ?? "");
      setOverviewDiagnostics(payload?.diagnostics ?? null);
      setSchools((payload?.schools ?? []).map((s) => { const b = getStoredSchoolBranding(s.id); return { ...s, primary_color: s.primary_color ?? b?.primaryColor ?? null, secondary_color: s.secondary_color ?? b?.secondaryColor ?? null }; }));
      setBranches(payload?.branches ?? []);
      setUsers((payload?.users ?? []).map((u) => ({
        ...u,
        job_title: typeof u.job_title === "string" ? u.job_title : null,
        branch_id: typeof u.branch_id === "string" ? u.branch_id : null,
        default_branch_id: typeof u.default_branch_id === "string" ? u.default_branch_id : null,
        custom_permissions: Array.isArray(u.custom_permissions) ? (u.custom_permissions as Permission[]) : null,
        allowed_pages: Array.isArray(u.allowed_pages) ? u.allowed_pages.filter((item): item is string => typeof item === "string") : [],
        is_single_page_user: u.is_single_page_user === true,
        permissions_version: typeof u.permissions_version === "number" ? u.permissions_version : 1,
      })));
      setSubscriptions(payload?.subscriptions ?? []);
      hasLoadedOnceRef.current = true;
    } catch (e) { flashError(getErrorMessage(e, "تعذر تحميل البيانات.")); } finally { setLoading(false); setRefreshing(false); }
  }, [flashError]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void refreshDashboard();
  }, [isSuperAdmin, refreshDashboard]);

  // Actions
  const openCreateSchool = useCallback(() => { setEditSchool(null); setShowSchoolForm(true); }, []);
  const openEditSchool = useCallback((s: SchoolRecord) => { setEditSchool(s); setShowSchoolForm(true); }, []);
  const openCreateUser = useCallback(() => { setEditUser(null); setShowUserForm(true); }, []);
  const openEditUser = useCallback((u: UserRecord) => { setEditUser(u); setShowUserForm(true); }, []);
  const focusSpotlight = useCallback((filter: SpotlightFilter, tab: ActiveTab) => {
    setSpotlightFilter(filter);
    setActiveTab(tab);
  }, []);

  const handleSaveSchool = useCallback(async (f: SchoolFormData, editing: SchoolRecord | null) => {
    try {
      const url = editing ? `/api/web/super-admin/schools/${editing.id}` : "/api/web/super-admin/schools";
      const method = editing ? "PATCH" : "POST";
      const body = { name: f.name, address: f.address || null, phone: f.phone || null, owner_email: f.owner_email || null, city: f.city || null, logo_url: f.logo_url || null, primary_color: f.primary_color || null, secondary_color: f.secondary_color || null, plan: f.plan, mode: editing ? "update" : undefined };
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ school?: SchoolRecord; error?: { message?: string } }>(url, { method, headers: withJsonHeaders(), body: JSON.stringify(body) });
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر الحفظ.");
      const schoolId = editing?.id ?? payload?.school?.id;
      if (!schoolId) {
        throw new Error("تعذر تحديد المدرسة بعد الحفظ.");
      }
      setStoredSchoolBranding(schoolId, { primaryColor: f.primary_color || null, secondaryColor: f.secondary_color || null, themePreset: f.themePresetId || null, sidebarColor: f.sidebar_color || null, accentColor: f.accent_color || null, textColor: f.text_color || null, source: "manual" });
      flashSuccess("تم الحفظ بنجاح ✓");
      setShowSchoolForm(false);
      await refreshDashboard();
      requestRuntimeBrandingRefresh();
    } catch (e) { flashError(getErrorMessage(e, "تعذر الحفظ.")); }
  }, [flashError, flashSuccess, refreshDashboard]);

  const handleSaveUser = useCallback(async (f: UserFormData, editing: UserRecord | null) => {
    try {
      const payload = {
        full_name: f.full_name,
        job_title: f.job_title || null,
        email: f.email,
        role: f.role,
        school_id: f.school_id || null,
        branch_id: f.branch_id || null,
        phone: f.phone || null,
        is_active: f.is_active,
        scope_level: f.scope_level,
        is_single_page_user: f.is_single_page_user,
        allowed_pages: f.allowed_pages,
        permissions_version: f.permissions_version,
        custom_permissions: f.permissions.length ? f.permissions : null,
      };
      if (editing) {
        const { response, payload: res } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(`/api/web/super-admin/users/${editing.id}`, { method: "PATCH", headers: withJsonHeaders(), body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(res?.error?.message || "تعذر التحديث.");
      } else {
        const { response, payload: res } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>("/api/users", {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({ ...payload, password: f.password }),
        });
        if (!response.ok) throw new Error(res?.error?.message || "فشل إنشاء المستخدم.");
      }
      flashSuccess("تم حفظ المستخدم بنجاح ✓");
      setShowUserForm(false);
      await refreshDashboard();
    } catch (e) { flashError(getErrorMessage(e, "تعذر الحفظ.")); }
  }, [flashError, flashSuccess, refreshDashboard]);

  const handleToggleSchool = useCallback(async (schoolId: string, current: boolean) => {
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ school?: SchoolRecord; error?: { message?: string } }>(
        `/api/web/super-admin/schools/${schoolId}`,
        {
          method: "PATCH",
          headers: withJsonHeaders(),
          body: JSON.stringify({ mode: "toggle", is_active: !current }),
        },
      );
      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحديث حالة المدرسة.");
      }
      flashSuccess(current ? "تم إيقاف المدرسة بنجاح ✓" : "تم تفعيل المدرسة بنجاح ✓");
      await refreshDashboard();
    } catch (toggleError) {
      flashError(getErrorMessage(toggleError, "تعذر تحديث حالة المدرسة."));
    }
  }, [flashError, flashSuccess, refreshDashboard]);

  const handleExtendSubscription = useCallback(async (schoolId: string) => {
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        created?: boolean;
        subscription?: SubscriptionRecord;
        error?: { message?: string };
      }>(`/api/web/super-admin/subscriptions/${schoolId}`, {
        method: "POST",
        headers: withJsonHeaders(),
      });
      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تجديد الاشتراك.");
      }
      flashSuccess(payload?.created ? "تم إنشاء الاشتراك وتفعيله ✓" : "تم تجديد الاشتراك بنجاح ✓");
      await refreshDashboard();
    } catch (renewError) {
      flashError(getErrorMessage(renewError, "تعذر تجديد الاشتراك."));
    }
  }, [flashError, flashSuccess, refreshDashboard]);

  const handleDeleteSchool = useCallback(async () => {
    if (!deleteSchoolTarget) return;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        `/api/web/super-admin/schools/${deleteSchoolTarget.id}`,
        {
          method: "DELETE",
          headers: withJsonHeaders(),
        },
      );
      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر أرشفة المدرسة.");
      }
      flashSuccess(`تمت أرشفة المدرسة ${deleteSchoolTarget.name} ✓`);
      setDeleteSchoolTarget(null);
      await refreshDashboard();
    } catch (deleteError) {
      flashError(getErrorMessage(deleteError, "تعذر أرشفة المدرسة."));
    }
  }, [deleteSchoolTarget, flashError, flashSuccess, refreshDashboard]);

  const handlePermanentlyDeleteSchool = useCallback(async () => {
    if (!permanentDeleteSchoolTarget) return;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        `/api/web/super-admin/schools/${permanentDeleteSchoolTarget.id}?hardDelete=true`,
        {
          method: "DELETE",
          headers: withJsonHeaders(),
        },
      );
      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر حذف المدرسة.");
      }
      flashSuccess(`تم حذف المدرسة ${permanentDeleteSchoolTarget.name} نهائياً ✓`);
      setPermanentDeleteSchoolTarget(null);
      await refreshDashboard();
    } catch (deleteError) {
      flashError(getErrorMessage(deleteError, "تعذر حذف المدرسة."));
    }
  }, [permanentDeleteSchoolTarget, flashError, flashSuccess, refreshDashboard]);

  const downloadResponseFile = useCallback(async (response: Response, fallbackFileName: string) => {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const disposition = response.headers.get("Content-Disposition") || response.headers.get("content-disposition") || "";
    const matchedFileName = disposition.match(/filename=\"?([^\";]+)\"?/i);
    anchor.href = url;
    anchor.download = decodeURIComponent(matchedFileName?.[1] || fallbackFileName);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }, []);

  const handleExportSchool = useCallback(async (school: SchoolRecord) => {
    try {
      const response = await fetchWithAuthorizedSession(`/api/web/super-admin/schools/${school.id}/export`, {
        method: "GET",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || "تعذر تصدير بيانات المدرسة.");
      }
      await downloadResponseFile(response, `${school.name}-archive.json`);
      const warningsCount = Number(response.headers.get("X-School-Archive-Warnings-Count") || "0");
      flashSuccess(
        warningsCount > 0
          ? `تم تجهيز نسخة بيانات المدرسة ${school.name} مع ${warningsCount} تنبيه توافق.`
          : `تم تجهيز نسخة بيانات المدرسة ${school.name} ✓`,
      );
    } catch (exportError) {
      flashError(getErrorMessage(exportError, "تعذر تصدير بيانات المدرسة."));
    }
  }, [downloadResponseFile, flashError, flashSuccess]);

  const handleImportSchoolData = useCallback(async (school: SchoolRecord, file: File) => {
    setImportingSchoolId(school.id);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetchWithAuthorizedSession(`/api/web/super-admin/schools/${school.id}/import`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر استيراد ملف المدرسة.");
      }
      const warnings = Array.isArray(payload?.warnings) ? payload.warnings.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0) : [];
      flashSuccess(
        warnings.length > 0
          ? `تم استيراد بيانات ${school.name} مع ${warnings.length} تنبيه يحتاج مراجعة.`
          : `تم استيراد بيانات ${school.name} بنجاح ✓`,
      );
      await refreshDashboard();
    } catch (importError) {
      flashError(getErrorMessage(importError, "تعذر استيراد ملف المدرسة."));
    } finally {
      setImportingSchoolId(null);
    }
  }, [flashError, flashSuccess, refreshDashboard]);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteUserTarget) return;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(
        `/api/web/super-admin/users/${deleteUserTarget.id}`,
        {
          method: "DELETE",
          headers: withJsonHeaders(),
        },
      );
      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر أرشفة المستخدم.");
      }
      flashSuccess(`تمت أرشفة المستخدم ${deleteUserTarget.full_name || deleteUserTarget.email || ""} ✓`);
      setDeleteUserTarget(null);
      await refreshDashboard();
    } catch (deleteError) {
      flashError(getErrorMessage(deleteError, "تعذر أرشفة المستخدم."));
    }
  }, [deleteUserTarget, flashError, flashSuccess, refreshDashboard]);

  const clearSpotlightFilter = useCallback(() => setSpotlightFilter(null), []);

  const handleResetUserPassword = useCallback(async (userId: string) => {
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; temporaryPassword?: string; error?: { message?: string } }>(`/api/web/super-admin/users/${userId}/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!response.ok) { toast.error(payload?.error?.message || "تعذر إعادة تعيين كلمة المرور"); return; }
      toast.success(`كلمة المرور الجديدة: ${payload?.temporaryPassword}`);
    } catch { toast.error("تعذر إعادة تعيين كلمة المرور"); }
  }, [toast]);

  const handleImpersonateUser = useCallback(async (userId: string) => {
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; link?: string; email?: string; error?: { message?: string } }>(`/api/web/super-admin/users/${userId}/impersonate`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!response.ok) { toast.error(payload?.error?.message || "تعذر توليد رابط تسجيل الدخول"); return; }
      if (payload?.link) {
        window.open(payload.link, "_blank", "noopener,noreferrer");
        toast.success(`تم فتح رابط تسجيل الدخول لـ ${payload.email ?? "المستخدم"}`);
      }
    } catch { toast.error("تعذر توليد رابط تسجيل الدخول"); }
  }, [toast]);

  const handleEditSubscriptionPlan = useCallback(async (schoolId: string, plan: string, endDate: string, status: string) => {
    const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; subscription?: SubscriptionRecord; error?: { message?: string } }>(
      `/api/web/super-admin/subscriptions/${schoolId}`,
      { method: "PATCH", headers: withJsonHeaders(), body: JSON.stringify({ plan, end_date: endDate || null, status }) },
    );
    if (!response.ok) throw new Error(payload?.error?.message || "تعذر تحديث الاشتراك.");
    flashSuccess("تم تحديث الاشتراك بنجاح ✓");
    await refreshDashboard();
  }, [flashSuccess, refreshDashboard]);

  const handleCopySettings = useCallback(async () => {
    if (!copySettingsSource || !copySettingsTargetId.trim()) return;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; copied?: string[]; targetSchoolName?: string; error?: { message?: string } }>(
        `/api/web/super-admin/schools/${copySettingsSource.id}/copy-settings`,
        { method: "POST", headers: withJsonHeaders(), body: JSON.stringify({ targetSchoolId: copySettingsTargetId.trim() }) },
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر نسخ الإعدادات.");
      flashSuccess(`تم نسخ إعدادات التصميم إلى ${payload?.targetSchoolName ?? "المدرسة الهدف"} ✓`);
      setCopySettingsSource(null);
      setCopySettingsTargetId("");
      await refreshDashboard();
    } catch (e) { flashError(getErrorMessage(e, "تعذر نسخ الإعدادات.")); }
  }, [copySettingsSource, copySettingsTargetId, flashSuccess, flashError, refreshDashboard]);

  const handleBulkRenewSubscriptions = useCallback(async (schoolIds: string[]) => {
    const results = await Promise.allSettled(
      schoolIds.map((id) =>
        fetchJsonWithAuthorizedSession<{ ok: boolean; error?: { message?: string } }>(
          `/api/web/super-admin/subscriptions/${id}`,
          { method: "POST", headers: withJsonHeaders() },
        ),
      ),
    );
    const succeeded = results.filter((r) => r.status === "fulfilled" && r.value.response.ok).length;
    const failed = results.length - succeeded;
    if (failed > 0) {
      flashError(`تم تجديد ${succeeded} اشتراك. فشل ${failed}.`);
    } else {
      flashSuccess(`تم تجديد ${succeeded} اشتراك بنجاح ✓`);
    }
    await refreshDashboard();
  }, [flashError, flashSuccess, refreshDashboard]);

  const handleCopyClasses = useCallback(async () => {
    if (!copyClassesSource || !copyClassesTargetId.trim()) return;
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; copied?: number; targetSchoolName?: string; error?: { message?: string } }>(
        `/api/web/super-admin/schools/${copyClassesSource.id}/copy-classes`,
        { method: "POST", headers: withJsonHeaders(), body: JSON.stringify({ targetSchoolId: copyClassesTargetId.trim() }) },
      );
      if (!response.ok) throw new Error(payload?.error?.message || "تعذر نسخ الصفوف.");
      flashSuccess(`تم نسخ ${payload?.copied ?? 0} صف إلى ${payload?.targetSchoolName ?? "المدرسة الهدف"} ✓`);
      setCopyClassesSource(null);
      setCopyClassesTargetId("");
    } catch (e) { flashError(getErrorMessage(e, "تعذر نسخ الصفوف.")); }
  }, [copyClassesSource, copyClassesTargetId, flashSuccess, flashError]);

  const availableTabs = useMemo(() => TAB_ITEMS.filter((i) => isTabAvailable(i.id, infrastructure)), [infrastructure, TAB_ITEMS]);

  const filteredSchools = useMemo(() => schools.filter(s => {
    if (spotlightFilter === "inactive_schools" && s.is_active) return false;
    if (spotlightFilter === "missing_branding" && s.primary_color) return false;
    return !query || s.name.toLowerCase().includes(query.toLowerCase());
  }), [schools, spotlightFilter, query]);

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        if (!query) return true;
        const normalizedQuery = query.toLowerCase();
        return (
          (u.email ?? "").toLowerCase().includes(normalizedQuery) ||
          u.full_name?.toLowerCase().includes(normalizedQuery) ||
          u.job_title?.toLowerCase().includes(normalizedQuery)
        );
      }),
    [users, query],
  );
  const filteredSubscriptions = useMemo(() => subscriptions.filter(s => !query || (Array.isArray(s.schools) ? s.schools[0]?.name : s.schools?.name)?.toLowerCase().includes(query.toLowerCase())), [subscriptions, query]);

  const dataHealthItems = useMemo(() => [
    { key: "schools", label: "المدارس", status: datasetStatusMeta(overviewDiagnostics?.schoolsStatus ?? "loaded") },
    { key: "users", label: "المستخدمون", status: datasetStatusMeta(overviewDiagnostics?.usersStatus ?? "loaded") },
    { key: "subscriptions", label: "الاشتراكات", status: datasetStatusMeta(overviewDiagnostics?.subscriptionsStatus ?? "loaded") }
  ], [overviewDiagnostics]);

  return (
    <ProtectedRoute roles={["super_admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/super-admin" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar 
            title={t("title")} 
            subtitle="مركز التحكم الرئيسي لإدارة المنصة والمدارس والاشتراكات" 
            fixed 
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 min-h-0 flex flex-col overflow-hidden xl:flex-row">
            {/* Super Admin Vertical Tabs Sidebar */}
            <div className="w-80 shrink-0 border-e border-[var(--border)] bg-[var(--surface-muted)] hidden xl:flex flex-col p-4">
              <div className="space-y-1">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group text-start",
                      activeTab === tab.id 
                        ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20 font-bold scale-[1.02]" 
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <tab.icon size={18} className={cn(activeTab === tab.id ? "text-white" : "text-[var(--text-muted)] group-hover:text-[var(--primary)]")} />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm truncate">{tab.label}</span>
                      <span className={cn("text-[10px] truncate opacity-70", activeTab === tab.id ? "text-white" : "text-[var(--text-muted)]")}>{tab.hint}</span>
                    </div>
                    {tab.id === "monitoring" && monitoringAlertCount > 0 && (
                      <span className="ms-auto h-5 min-w-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1 shrink-0">
                        {monitoringAlertCount}
                      </span>
                    )}
                    {tab.id === "subscriptions" && expiringSubscriptionsCount > 0 && (
                      <span className="ms-auto h-5 min-w-5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center px-1 shrink-0">
                        {expiringSubscriptionsCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-auto p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
                <div className="flex items-center gap-2 text-xs font-black text-[var(--text-muted)] mb-2">
                  <Activity size={14} /> الحالة التشغيلية
                </div>
                <div className="space-y-2">
                  {dataHealthItems.map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--text-secondary)]">{item.label}</span>
                      <div className={cn("h-2 w-2 rounded-full", item.status.tone.includes("success") ? "bg-[var(--success)]" : "bg-[var(--warning)]")} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8 space-y-6">
                <section className="xl:hidden rounded-[28px] border border-[var(--border)] bg-[var(--card-bg)] p-3 shadow-[var(--card-shadow)]">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {availableTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={cn(
                          "flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all",
                          activeTab === tab.id
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-[var(--shadow-primary)]"
                            : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        <tab.icon size={16} />
                        <span>{tab.label}</span>
                        {tab.id === "monitoring" && monitoringAlertCount > 0 && (
                          <span className="h-4 min-w-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1">
                            {monitoringAlertCount}
                          </span>
                        )}
                        {tab.id === "subscriptions" && expiringSubscriptionsCount > 0 && (
                          <span className="h-4 min-w-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center px-1">
                            {expiringSubscriptionsCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
                
                {/* Global Search & Action Bar */}
                <section className="rounded-[32px] border border-[var(--border)] bg-[var(--card-bg)] p-4 shadow-[var(--card-shadow)] sm:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="relative w-full flex-1 xl:max-w-2xl">
                      <Search size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input 
                        className="w-full h-12 ps-12 pe-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
                        placeholder={t(`header.searchPlaceholder.${activeTab === "schools" ? "schools" : activeTab === "users" ? "users" : activeTab === "subscriptions" ? "subscriptions" : "default"}`)}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end xl:w-auto">
                      <button className="flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-all hover:bg-[var(--border)] sm:w-12" onClick={() => refreshDashboard()}>
                        <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
                      </button>
                      <button className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 text-white font-black shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95 sm:w-auto" onClick={() => activeTab === "users" ? openCreateUser() : openCreateSchool()}>
                        <Plus size={20} />
                        {activeTab === "users" ? "إضافة مستخدم" : "إضافة مدرسة"}
                      </button>
                    </div>
                  </div>
                  {spotlightFilter && (
                    <div className="mt-4 flex w-full flex-wrap items-center gap-2 rounded-xl border border-[var(--primary)]/10 bg-[var(--primary)]/5 p-2 sm:w-fit">
                      <span className="text-[11px] font-black text-[var(--primary)] px-2">فلتر نشط: {spotlightFilterLabel(spotlightFilter)}</span>
                      <button onClick={clearSpotlightFilter} className="h-6 w-6 flex items-center justify-center rounded-lg bg-[var(--surface-strong)] text-[var(--primary)] shadow-sm"><X size={12} /></button>
                    </div>
                  )}
                </section>

                {/* Alerts */}
                {success && <div className="p-4 rounded-2xl bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)] font-bold flex items-center gap-3"><BadgeCheck size={18} /> {success}</div>}
                {error && <div className="p-4 rounded-2xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] font-bold flex items-center gap-3"><AlertTriangle size={18} /> {error}</div>}
                {infrastructureNotice && <div className="p-4 rounded-2xl bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-[var(--warning)] font-bold flex items-center gap-3"><Flag size={18} /> {infrastructureNotice}</div>}

                {/* Main Tab Content */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 size={40} className="animate-spin text-[var(--primary)] opacity-20" />
                    <span className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">تحميل لوحة التحكم...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {activeTab === "overview" && <OverviewTab schools={schools} users={users} subscriptions={subscriptions} loading={loading} overviewDiagnostics={overviewDiagnostics} spotlightFilter={spotlightFilter} onClearSpotlightFilter={clearSpotlightFilter} onFocusSpotlight={focusSpotlight} onOpenCreateSchool={openCreateSchool} onOpenCreateUser={openCreateUser} onSetActiveTab={setActiveTab} ROLE_LABELS={ROLE_LABELS} PLAN_LABELS={PLAN_LABELS} />}
                    {activeTab === "schools" && <SchoolsTab schools={schools} subscriptions={subscriptions} filteredSchools={filteredSchools} onOpenCreateSchool={openCreateSchool} onOpenEditSchool={openEditSchool} onToggleSchool={handleToggleSchool} onExtendSubscription={handleExtendSubscription} onDeleteSchool={setDeleteSchoolTarget} onPermanentlyDeleteSchool={setPermanentDeleteSchoolTarget} onExportSchool={handleExportSchool} onImportSchoolData={handleImportSchoolData} importingSchoolId={importingSchoolId} onRefresh={refreshDashboard} onCopyClasses={(school) => { setCopyClassesSource(school); setCopyClassesTargetId(""); }} onCopySettings={(school) => { setCopySettingsSource(school); setCopySettingsTargetId(""); }} />}
                    {activeTab === "users" && <UsersTab users={users} schools={schools} branches={branches} filteredUsers={filteredUsers} onOpenCreateUser={openCreateUser} onOpenEditUser={openEditUser} onDeleteUser={setDeleteUserTarget} onResetPassword={(userId) => void handleResetUserPassword(userId)} onImpersonate={(userId) => void handleImpersonateUser(userId)} />}
                    {activeTab === "subscriptions" && <SubscriptionsTab subscriptions={subscriptions} filteredSubscriptions={filteredSubscriptions} onExtendSubscription={handleExtendSubscription} onEditPlan={handleEditSubscriptionPlan} onBulkRenew={handleBulkRenewSubscriptions} />}
                    {activeTab === "student-counts" && <StudentCountsTab />}
                    {activeTab === "audit" && <AuditLogTab infrastructure={infrastructure} />}
                    {activeTab === "roles" && <RolesTab infrastructure={infrastructure} schools={schools.map(s => ({ id: s.id, name: s.name }))} />}
                    {activeTab === "trash" && <TrashTab infrastructure={infrastructure} />}
                    {activeTab === "notifications" && <NotificationsTab infrastructure={infrastructure} />}
                    {activeTab === "monitoring" && <SystemMonitoringTab infrastructure={infrastructure} onAlertCountChange={setMonitoringAlertCount} />}
                    {activeTab === "branches" && <BranchesTab infrastructure={infrastructure} schemaCompat={schemaCompat} />}
                    {activeTab === "analytics" && <AnalyticsTab schools={schools} users={users} subscriptions={subscriptions} onSwitchTab={(tab) => setActiveTab(tab as ActiveTab)} />}
                    {activeTab === "bulk" && <BulkOperationsTab />}
                    {activeTab === "activity" && <ActivityTimelineTab />}
                    {activeTab === "payment-archives" && <PaymentArchivesTab />}
                    {activeTab === "apps" && <AppsTab />}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>

        <SchoolForm isOpen={showSchoolForm} editSchool={editSchool} schemaCompat={schemaCompat} onClose={() => setShowSchoolForm(false)} onSave={handleSaveSchool} />
        <UserForm isOpen={showUserForm} editUser={editUser} schools={schools.map(s => ({ id: s.id, name: s.name }))} branches={branches} infrastructure={infrastructure} onClose={() => setShowUserForm(false)} onSave={handleSaveUser} />
        <DeleteSchoolDialog school={deleteSchoolTarget} onClose={() => setDeleteSchoolTarget(null)} onConfirm={() => void handleDeleteSchool()} />
        <ConfirmDialog
          open={!!permanentDeleteSchoolTarget}
          title="حذف المدرسة نهائياً"
          description={permanentDeleteSchoolTarget ? `هل أنت متأكد من حذف "${permanentDeleteSchoolTarget.name}" بشكل دائم؟ هذا الإجراء لا يمكن التراجع عنه.` : ""}
          confirmLabel="حذف نهائياً"
          cancelLabel="إلغاء"
          tone="danger"
          onClose={() => setPermanentDeleteSchoolTarget(null)}
          onConfirm={() => void handlePermanentlyDeleteSchool()}
        />
        <DeleteUserDialog user={deleteUserTarget} onClose={() => setDeleteUserTarget(null)} onConfirm={() => void handleDeleteUser()} />

        {/* Copy Settings Modal */}
        {copySettingsSource && (
          <div className="ui-backdrop flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setCopySettingsSource(null)}>
            <div className="ui-dialog w-full max-w-md overflow-hidden" role="dialog" aria-modal="true">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-[var(--text-primary)]">نسخ إعدادات التصميم</h2>
                  <p className="text-sm text-[var(--text-secondary)]">من: {copySettingsSource.name}</p>
                </div>
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface)]" onClick={() => setCopySettingsSource(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-[var(--text-secondary)]">سيتم نسخ الألوان والشعار من <strong>{copySettingsSource.name}</strong> إلى المدرسة المحددة.</p>
                <div className="space-y-1">
                  <label className="text-sm font-black text-[var(--text-secondary)]">المدرسة الهدف</label>
                  <select
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    value={copySettingsTargetId}
                    onChange={(e) => setCopySettingsTargetId(e.target.value)}
                  >
                    <option value="">— اختر المدرسة الهدف —</option>
                    {schools.filter((s) => s.id !== copySettingsSource.id && !s.deleted_at).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button className="ui-button ui-button--secondary flex-1" onClick={() => setCopySettingsSource(null)}>إلغاء</button>
                  <button className="ui-button ui-button--primary flex-1" disabled={!copySettingsTargetId} onClick={() => void handleCopySettings()}>نسخ الإعدادات</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Copy Classes Modal */}
        {copyClassesSource && (
          <div className="ui-backdrop flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setCopyClassesSource(null)}>
            <div className="ui-dialog w-full max-w-md overflow-hidden" role="dialog" aria-modal="true">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-[var(--text-primary)]">نسخ الصفوف</h2>
                  <p className="text-sm text-[var(--text-secondary)]">من: {copyClassesSource.name}</p>
                </div>
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface)]" onClick={() => setCopyClassesSource(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-black text-[var(--text-secondary)]">المدرسة الهدف</label>
                  <select
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                    value={copyClassesTargetId}
                    onChange={(e) => setCopyClassesTargetId(e.target.value)}
                  >
                    <option value="">— اختر المدرسة الهدف —</option>
                    {schools.filter((s) => s.id !== copyClassesSource.id && !s.deleted_at).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button className="ui-button ui-button--secondary flex-1" onClick={() => setCopyClassesSource(null)}>إلغاء</button>
                  <button className="ui-button ui-button--primary flex-1" disabled={!copyClassesTargetId} onClick={() => void handleCopyClasses()}>نسخ الصفوف</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
