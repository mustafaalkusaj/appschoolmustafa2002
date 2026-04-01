"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "@/lib/icons";
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  CreditCard,
  LayoutDashboard,
  Menu,
  RefreshCw,
  School,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  PanelRightClose,
  PanelRightOpen,
  House,
  BadgeCheck,
  History,
  Activity,
  GitBranch,
  Flag,
} from "@/lib/icons";
import { fetchJsonWithAuthorizedSession, fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import { getUserProfile, ROLE_LABELS, type Permission, type UserProfile } from "@/lib/auth";
import { UltrathinkLogo } from "@/components/brand";
import { ProfileMenu } from "@/components/ProfileMenu";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { requestRuntimeBrandingRefresh } from "@/hooks/brand";
import { setStoredSchoolBranding, getStoredSchoolBranding } from "@/lib/brand/palette";
import { type AdminInfrastructure, DEFAULT_ADMIN_INFRASTRUCTURE } from "@/lib/admin-infrastructure";
import { SCHOOL_BRAND } from "@/lib/brand";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { type AppSchemaCompat } from "@/lib/schema-compat";
import { logAction } from "@/lib/audit";

// Existing tab components (from components/ directory)
import { AuditLogTab } from "./components/AuditLogTab";
import { RolesTab } from "./components/RolesTab";
import { TrashTab } from "./components/TrashTab";
import { NotificationsTab } from "./components/NotificationsTab";
import { MonitoringTab } from "./components/MonitoringTab";
import { BranchesTab } from "./components/BranchesTab";

// New extracted components (from _components/ directory)
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
  type ActiveTab,
  type SpotlightFilter,
  type OverviewDiagnostics,
  cx,
  formatDateTime,
  getErrorMessage,
  isSubscriptionExpired,
  calculateDaysLeft,
  spotlightFilterLabel,
  datasetStatusMeta,
  PLAN_LABELS,
} from "./_components";
import type { SchoolFormData, UserFormData } from "./_components";

const TAB_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  hint: string;
  icon: LucideIcon;
}> = [
  { id: "overview", label: "نظرة عامة", hint: "ملخص الأداء", icon: LayoutDashboard },
  { id: "schools", label: "المدارس", hint: "إدارة المدارس", icon: School },
  { id: "users", label: "المستخدمون", hint: "الصلاحيات والأدوار", icon: Users },
  { id: "subscriptions", label: "الاشتراكات", hint: "المتابعة والتجديد", icon: CreditCard },
  { id: "audit", label: "سجل العمليات", hint: "مراقبة الإجراءات", icon: History },
  { id: "roles", label: "الأدوار", hint: "إدارة الصلاحيات", icon: ShieldCheck },
  { id: "trash", label: "سلة المهملات", hint: "استعادة البيانات", icon: Trash2 },
  { id: "notifications", label: "التنبيهات", hint: "إشعارات النظام", icon: Bell },
  { id: "monitoring", label: "مراقبة النظام", hint: "الصحة والتشغيل", icon: Activity },
  { id: "branches", label: "الفروع", hint: "إدارة فروع المدارس", icon: GitBranch },
];

function isTabAvailable(tab: ActiveTab, infrastructure: AdminInfrastructure) {
  switch (tab) {
    case "audit":
      return infrastructure.auditLogs;
    case "roles":
      return infrastructure.customRoles;
    case "trash":
      return (
        infrastructure.softDeleteSchools ||
        infrastructure.softDeleteUsers ||
        (infrastructure.branches && infrastructure.softDeleteBranches)
      );
    case "notifications":
      return infrastructure.notifications;
    case "branches":
      return infrastructure.branches;
    default:
      return true;
  }
}

export default function SuperAdminPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const toast = useToast();

  // Data state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [infrastructure, setInfrastructure] = useState(DEFAULT_ADMIN_INFRASTRUCTURE);
  const [schemaCompat, setSchemaCompat] = useState<AppSchemaCompat | null>(null);
  const [overviewDiagnostics, setOverviewDiagnostics] = useState<OverviewDiagnostics | null>(null);
  const [infrastructureNotice, setInfrastructureNotice] = useState("");
  const hasLoadedOnceRef = useRef(false);

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [query, setQuery] = useState("");
  const [spotlightFilter, setSpotlightFilter] = useState<SpotlightFilter | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Modal state
  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editSchool, setEditSchool] = useState<SchoolRecord | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [deleteSchoolTarget, setDeleteSchoolTarget] = useState<SchoolRecord | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserRecord | null>(null);

  const flashSuccess = useCallback(
    (message: string) => {
      setSuccess(message);
      toast.success(message);
      window.setTimeout(() => setSuccess(""), 2600);
    },
    [toast]
  );

  const flashError = useCallback(
    (message: string) => {
      setError(message);
      toast.error(message);
      window.setTimeout(() => setError(""), 3200);
    },
    [toast]
  );

  const checkAuth = useCallback(async () => {
    const nextProfile = await getUserProfile();
    if (!nextProfile || nextProfile.role !== "super_admin") {
      window.location.href = localizeAppPath("/access-denied", locale);
      return null;
    }
    setProfile(nextProfile);
    return nextProfile;
  }, [locale]);

  const refreshDashboard = useCallback(async () => {
    const initialLoad = !hasLoadedOnceRef.current;
    if (initialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const nextProfile = await checkAuth();
      if (!nextProfile) return;

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        infrastructure?: AdminInfrastructure;
        schemaCompat?: AppSchemaCompat;
        infrastructureNotice?: string;
        diagnostics?: OverviewDiagnostics;
        schools?: SchoolRecord[];
        users?: UserRecord[];
        subscriptions?: SubscriptionRecord[];
        error?: { message?: string };
      }>("/api/web/super-admin/overview");

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل بيانات المدير العام.");
      }

      setInfrastructure(payload?.infrastructure ?? DEFAULT_ADMIN_INFRASTRUCTURE);
      setSchemaCompat(payload?.schemaCompat ?? null);
      setInfrastructureNotice(payload?.infrastructureNotice ?? "");
      setOverviewDiagnostics(payload?.diagnostics ?? null);
      setSchools(
        (payload?.schools ?? []).map((school) => {
          const storedBranding = getStoredSchoolBranding(school.id);
          return {
            ...school,
            primary_color: school.primary_color ?? storedBranding?.primaryColor ?? null,
            secondary_color: school.secondary_color ?? storedBranding?.secondaryColor ?? null,
          };
        })
      );
      setUsers(
        (payload?.users ?? []).map((user) => ({
          ...user,
          custom_permissions: Array.isArray(user.custom_permissions)
            ? (user.custom_permissions as Permission[])
            : null,
        }))
      );
      setSubscriptions(payload?.subscriptions ?? []);
      hasLoadedOnceRef.current = true;
    } catch (fetchError) {
      flashError(getErrorMessage(fetchError, "تعذر تحميل بيانات المدير العام."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [checkAuth, flashError]);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  // Actions
  const openCreateSchool = useCallback(() => {
    setEditSchool(null);
    setShowSchoolForm(true);
  }, []);

  const openEditSchool = useCallback((school: SchoolRecord) => {
    setEditSchool(school);
    setShowSchoolForm(true);
  }, []);

  const openCreateUser = useCallback(() => {
    setEditUser(null);
    setShowUserForm(true);
  }, []);

  const openEditUser = useCallback((user: UserRecord) => {
    setEditUser(user);
    setShowUserForm(true);
  }, []);

  const toggleSchool = useCallback(
    async (id: string, current: boolean) => {
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          school?: SchoolRecord;
          error?: { message?: string };
        }>(`/api/web/super-admin/schools/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: withJsonHeaders(),
          body: JSON.stringify({ mode: "toggle", is_active: !current }),
        });

        if (!response.ok) {
          throw new Error(payload?.error?.message || "تعذر تحديث حالة المدرسة.");
        }

        await logAction({
          action_type: "update",
          entity_type: "school",
          entity_id: id,
          summary: `${!current ? "تفعيل" : "إيقاف"} المدرسة وتعديل حالة الاشتراك`,
        });

        flashSuccess(!current ? "تم تفعيل المدرسة بنجاح." : "تم إيقاف المدرسة بنجاح.");
        await refreshDashboard();
      } catch (toggleError) {
        flashError(getErrorMessage(toggleError, "تعذر تحديث حالة المدرسة."));
      }
    },
    [flashError, flashSuccess, refreshDashboard]
  );

  const handleSaveSchool = useCallback(
    async (formData: SchoolFormData, editingSchool: SchoolRecord | null) => {
      try {
        if (editingSchool) {
          const { response, payload } = await fetchJsonWithAuthorizedSession<{
            school?: SchoolRecord;
            schemaCompat?: AppSchemaCompat;
            error?: { message?: string };
          }>(`/api/web/super-admin/schools/${encodeURIComponent(editingSchool.id)}`, {
            method: "PATCH",
            headers: withJsonHeaders(),
            body: JSON.stringify({
              mode: "update",
              name: formData.name,
              address: formData.address || null,
              phone: formData.phone || null,
              owner_email: formData.owner_email || null,
              city: formData.city || null,
              logo_url: formData.logo_url || null,
              primary_color: formData.primary_color || null,
              secondary_color: formData.secondary_color || null,
              plan: formData.plan,
            }),
          });

          if (!response.ok) {
            throw new Error(payload?.error?.message || "تعذر حفظ بيانات المدرسة.");
          }

          const compat = payload?.schemaCompat ?? schemaCompat;
          if (compat) setSchemaCompat(compat);

          setStoredSchoolBranding(editingSchool.id, {
            primaryColor: formData.primary_color || null,
            secondaryColor: formData.secondary_color || null,
            themePreset: formData.themePresetId || null,
            sidebarColor: formData.sidebar_color || null,
            accentColor: formData.accent_color || null,
            textColor: formData.text_color || null,
            source: "manual",
          });

          await logAction({
            action_type: "update",
            entity_type: "school",
            entity_id: editingSchool.id,
            summary: `تعديل بيانات المدرسة: ${formData.name}`,
          });

          flashSuccess(compat?.schoolColors ? "تم تحديث بيانات المدرسة." : "تم تحديث بيانات المدرسة، وحُفظت الألوان محلياً.");
        } else {
          const { response, payload } = await fetchJsonWithAuthorizedSession<{
            school?: SchoolRecord;
            schemaCompat?: AppSchemaCompat;
            branchSkipped?: boolean;
            error?: { message?: string };
          }>("/api/web/super-admin/schools", {
            method: "POST",
            headers: withJsonHeaders(),
            body: JSON.stringify({
              name: formData.name,
              address: formData.address || null,
              phone: formData.phone || null,
              owner_email: formData.owner_email || null,
              city: formData.city || null,
              logo_url: formData.logo_url || null,
              primary_color: formData.primary_color || null,
              secondary_color: formData.secondary_color || null,
              plan: formData.plan,
            }),
          });

          if (!response.ok || !payload?.school) {
            throw new Error(payload?.error?.message || "تعذر حفظ بيانات المدرسة.");
          }

          const compat = payload?.schemaCompat ?? schemaCompat;
          if (compat) setSchemaCompat(compat);

          setStoredSchoolBranding(payload.school.id, {
            primaryColor: formData.primary_color || null,
            secondaryColor: formData.secondary_color || null,
            themePreset: formData.themePresetId || null,
            sidebarColor: formData.sidebar_color || null,
            accentColor: formData.accent_color || null,
            textColor: formData.text_color || null,
            source: "manual",
          });

          await logAction({
            action_type: "create",
            entity_type: "school",
            entity_id: payload.school.id,
            summary: `إنشاء مدرسة جديدة: ${formData.name}`,
          });

          flashSuccess(payload?.branchSkipped ? "تمت إضافة المدرسة وإنشاء اشتراكها الافتراضي." : "تمت إضافة المدرسة وإنشاء اشتراكها الافتراضي.");
        }

        setShowSchoolForm(false);
        await refreshDashboard();
        requestRuntimeBrandingRefresh();
      } catch (saveError) {
        flashError(getErrorMessage(saveError, "تعذر حفظ بيانات المدرسة."));
        throw saveError;
      }
    },
    [flashError, flashSuccess, refreshDashboard, schemaCompat]
  );

  const handleSaveUser = useCallback(
    async (formData: UserFormData, editingUser: UserRecord | null) => {
      try {
        const payload = {
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          school_id: formData.school_id || null,
          phone: formData.phone || null,
          is_active: formData.is_active,
          ...(infrastructure.customPermissions
            ? { custom_permissions: formData.permissions.length > 0 ? formData.permissions : null }
            : {}),
        };

        if (editingUser) {
          const { response, payload: responsePayload } = await fetchJsonWithAuthorizedSession<{
            user?: UserRecord;
            error?: { message?: string };
          }>(`/api/web/super-admin/users/${encodeURIComponent(editingUser.id)}`, {
            method: "PATCH",
            headers: withJsonHeaders(),
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(responsePayload?.error?.message || "تعذر حفظ المستخدم.");
          }

          await logAction({
            action_type: "update",
            entity_type: "user",
            entity_id: editingUser.id,
            summary: `تعديل بيانات المستخدم: ${payload.full_name || payload.email}`,
          });

          flashSuccess("تم تحديث بيانات المستخدم.");
        } else {
          if (!formData.password) {
            throw new Error("يرجى إدخال كلمة مرور للمستخدم الجديد.");
          }

          const response = await fetchWithAuthorizedSession("/api/users", {
            method: "POST",
            headers: withJsonHeaders(),
            body: JSON.stringify({ ...payload, password: formData.password }),
          });

          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body?.error?.message || body?.message || `فشل إنشاء المستخدم (${response.status}).`);
          }

          await logAction({
            action_type: "create",
            entity_type: "user",
            summary: `إنشاء مستخدم جديد: ${payload.full_name || payload.email}`,
          });

          flashSuccess("تمت إضافة المستخدم بنجاح.");
        }

        setShowUserForm(false);
        await refreshDashboard();
      } catch (saveError) {
        flashError(getErrorMessage(saveError, "تعذر حفظ المستخدم."));
        throw saveError;
      }
    },
    [flashError, flashSuccess, infrastructure.customPermissions, refreshDashboard]
  );

  const extendSubscription = useCallback(
    async (schoolId: string) => {
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          subscription?: SubscriptionRecord;
          error?: { message?: string };
        }>(`/api/web/super-admin/subscriptions/${encodeURIComponent(schoolId)}`, {
          method: "POST",
          headers: withJsonHeaders(),
        });

        if (!response.ok) {
          throw new Error(payload?.error?.message || "تعذر تجديد الاشتراك.");
        }

        await logAction({
          action_type: "subscription_renew",
          entity_type: "subscription",
          entity_id: schoolId,
          summary: `تجديد اشتراك مدرسة (سنة واحدة)`,
        });

        flashSuccess("تم تجديد الاشتراك لمدة سنة كاملة.");
        await refreshDashboard();
      } catch (extendError) {
        flashError(getErrorMessage(extendError, "تعذر تجديد الاشتراك."));
      }
    },
    [flashError, flashSuccess, refreshDashboard]
  );

  const handleDeleteSchool = useCallback(async () => {
    if (!deleteSchoolTarget) return;

    if (!infrastructure.softDeleteSchools) {
      flashError("أرشفة المدارس تتطلب تشغيل admin_infrastructure.sql لإضافة deleted_at و deleted_by إلى جدول schools.");
      return;
    }

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        school?: Pick<SchoolRecord, "id" | "name">;
        error?: { message?: string };
      }>(`/api/web/super-admin/schools/${encodeURIComponent(deleteSchoolTarget.id)}`, {
        method: "DELETE",
        headers: withJsonHeaders(),
      });

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر حذف المدرسة.");
      }

      await logAction({
        action_type: "delete",
        entity_type: "school",
        entity_id: deleteSchoolTarget.id,
        summary: `أرشفة مدرسة (نقل للسلة): ${deleteSchoolTarget.name}`,
      });

      flashSuccess("تم نقل المدرسة إلى سلة المهملات.");
      setDeleteSchoolTarget(null);
      await refreshDashboard();
    } catch (deleteError) {
      flashError(getErrorMessage(deleteError, "تعذر حذف المدرسة."));
    }
  }, [deleteSchoolTarget, flashError, flashSuccess, infrastructure.softDeleteSchools, refreshDashboard]);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteUserTarget) return;

    if (!infrastructure.softDeleteUsers) {
      flashError("أرشفة المستخدمين تتطلب تشغيل admin_infrastructure.sql لإضافة deleted_at و deleted_by إلى جدول user_profiles.");
      return;
    }

    if (deleteUserTarget.id === profile?.id) {
      flashError("لا يمكن أرشفة حساب المدير العام الحالي أثناء استخدامه.");
      return;
    }

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        user?: Pick<UserRecord, "id" | "full_name" | "email">;
        error?: { message?: string };
      }>(`/api/web/super-admin/users/${encodeURIComponent(deleteUserTarget.id)}`, {
        method: "DELETE",
        headers: withJsonHeaders(),
      });

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر أرشفة المستخدم.");
      }

      await logAction({
        action_type: "delete",
        entity_type: "user",
        entity_id: deleteUserTarget.id,
        summary: `أرشفة مستخدم: ${deleteUserTarget.full_name || deleteUserTarget.email || deleteUserTarget.id}`,
      });

      flashSuccess("تم نقل المستخدم إلى سلة المهملات.");
      setDeleteUserTarget(null);
      await refreshDashboard();
    } catch (deleteError) {
      flashError(getErrorMessage(deleteError, "تعذر أرشفة المستخدم."));
    }
  }, [deleteUserTarget, flashError, flashSuccess, infrastructure.softDeleteUsers, profile?.id, refreshDashboard]);

  // Spotlight and filtering
  const focusSpotlight = useCallback((filter: SpotlightFilter, tab: ActiveTab) => {
    setQuery("");
    setSpotlightFilter(filter);
    setActiveTab(tab);
  }, []);

  const clearSpotlightFilter = useCallback(() => {
    setSpotlightFilter(null);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      if (spotlightFilter === "inactive_schools" && school.is_active) return false;
      if (spotlightFilter === "missing_branding" && school.primary_color && school.secondary_color) return false;
      if (!normalizedQuery) return true;
      return [school.name, school.city, school.phone, school.owner_email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [schools, spotlightFilter, normalizedQuery]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (spotlightFilter === "orphan_users" && (user.role === "super_admin" || user.school_id)) return false;
      if (!normalizedQuery) return true;
      return [user.full_name, user.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [users, spotlightFilter, normalizedQuery]);

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription) => {
      if (spotlightFilter === "expiring_subscriptions") {
        const days = calculateDaysLeft(subscription.end_date);
        if (isSubscriptionExpired(subscription) || days === null || days > 30) return false;
      }
      if (!normalizedQuery) return true;
      const schoolName = Array.isArray(subscription.schools) 
        ? subscription.schools[0]?.name 
        : subscription.schools?.name;
      return [schoolName, PLAN_LABELS[subscription.plan]]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [subscriptions, spotlightFilter, normalizedQuery]);

  const availableTabs = useMemo(
    () => TAB_ITEMS.filter((item) => isTabAvailable(item.id, infrastructure)),
    [infrastructure]
  );

  useEffect(() => {
    if (availableTabs.length === 0) return;
    if (!availableTabs.some((item) => item.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [activeTab, availableTabs]);

  const tabMeta = availableTabs.find((item) => item.id === activeTab) ?? availableTabs[0] ?? TAB_ITEMS[0];

  const expiringSoon = useMemo(
    () =>
      subscriptions.filter((subscription) => {
        const days = calculateDaysLeft(subscription.end_date);
        return !isSubscriptionExpired(subscription) && days !== null && days <= 30;
      }),
    [subscriptions]
  );

  const dataHealthItems = useMemo(
    () => [
      {
        key: "schools",
        datasetLabel: "المدارس",
        status: datasetStatusMeta(overviewDiagnostics?.schoolsStatus ?? "loaded"),
        hint: "قراءة أساسية للوحة",
      },
      {
        key: "users",
        datasetLabel: "المستخدمون",
        status: datasetStatusMeta(overviewDiagnostics?.usersStatus ?? "loaded"),
        hint: "الصلاحيات وربط المدارس",
      },
      {
        key: "subscriptions",
        datasetLabel: "الاشتراكات",
        status: datasetStatusMeta(overviewDiagnostics?.subscriptionsStatus ?? "loaded"),
        hint: "التجديدات والحالة الحالية",
      },
    ],
    [overviewDiagnostics]
  );

  const hasLoadWarning =
    (overviewDiagnostics?.warnings.length ?? 0) > 0 ||
    dataHealthItems.some((item) => item.status.tone !== "ui-pill ui-pill--success");

  return (
    <ProtectedRoute roles={["super_admin"]}>
      <div className="relative min-h-dvh overflow-hidden">
        <div className="ui-grid-lines pointer-events-none absolute inset-0 opacity-35" />
        <div className="pointer-events-none absolute inset-x-0 top-[-18rem] h-[34rem] rounded-full bg-[radial-gradient(circle,rgba(121,215,255,0.16),transparent_60%)] blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-12rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(79,140,255,0.18),transparent_60%)] blur-3xl" />

        {sidebarOpen ? (
          <div className="ui-backdrop z-40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        ) : null}

        <div className="relative flex min-h-dvh flex-row-reverse">
          {/* Sidebar */}
          <aside
            className={cx(
              "ui-glass fixed inset-y-0 right-0 z-50 flex w-[300px] flex-col border-l border-r-0 px-3 py-4 transition-transform duration-200 lg:static lg:translate-x-0",
              sidebarCollapsed ? "lg:w-[108px]" : "lg:w-[300px]",
              sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
            )}
          >
            <div className="mb-5 flex items-center justify-between gap-3 px-2">
              <UltrathinkLogo
                size={sidebarCollapsed ? 48 : 54}
                showText={!sidebarCollapsed}
                title={SCHOOL_BRAND.nameAr}
                subtitle="لوحة المدير العام"
              />
              <button
                type="button"
                className="hidden h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] lg:inline-flex"
                onClick={() => setSidebarCollapsed((current) => !current)}
                aria-label={sidebarCollapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
              >
                {sidebarCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
              </button>
            </div>

            <div className="space-y-1">
              {availableTabs.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeTab;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cx(
                      "group flex w-full items-center gap-3 rounded-[22px] px-3 py-3 text-right transition",
                      isActive
                        ? "bg-[linear-gradient(135deg,rgba(79,140,255,0.18),rgba(121,215,255,0.08))] text-[var(--text-primary)] shadow-[var(--shadow-xs)]"
                        : "text-[var(--text-secondary)] hover:bg-[rgba(79,140,255,0.08)] hover:text-[var(--text-primary)]",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    title={item.label}
                  >
                    <span
                      className={cx(
                        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] transition",
                        isActive
                          ? "bg-[rgba(79,140,255,0.14)] text-[var(--primary)]"
                          : "bg-[var(--surface-muted)] text-[var(--text-tertiary)] group-hover:text-[var(--primary)]"
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    {!sidebarCollapsed ? (
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{item.label}</span>
                        <span className="block truncate text-xs font-semibold text-[var(--text-tertiary)]">{item.hint}</span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="my-5 h-px bg-[var(--border)]" />

            <div className="space-y-2">
              <Link
                href={localizeAppPath("/dashboard", locale)}
                className={cx(
                  "flex items-center gap-3 rounded-[22px] px-3 py-3 text-[var(--text-secondary)] transition hover:bg-[rgba(79,140,255,0.08)] hover:text-[var(--text-primary)]",
                  sidebarCollapsed && "justify-center px-2"
                )}
                title="لوحة المدرسة"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[var(--surface-muted)] text-[var(--text-tertiary)]">
                  <House size={18} />
                </span>
                {!sidebarCollapsed ? <span className="text-sm font-black">لوحة المدرسة</span> : null}
              </Link>
            </div>

            <div className="mt-auto space-y-3">
              <div className={cx("rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-3", sidebarCollapsed && "p-2")}>
                {!sidebarCollapsed ? (
                  <div className="space-y-2">
                    <p className="text-xs font-black text-[var(--text-tertiary)]">الحساب الحالي</p>
                    <p className="text-sm font-black text-[var(--text-primary)]">{profile?.full_name || profile?.email || "المدير العام"}</p>
                    <div className="ui-pill ui-pill--success text-xs">صلاحية كاملة مفعلة</div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(53,197,138,0.14)] text-[var(--success)]">
                      <ShieldCheck size={18} />
                    </div>
                  </div>
                )}
              </div>

              {!sidebarCollapsed ? (
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
                  <p className="text-xs font-black text-[var(--text-tertiary)]">إدارة الهوية والإعدادات</p>
                  <p className="mt-2 text-sm font-bold leading-7 text-[var(--text-secondary)]">
                    ستجد اللغة والمظهر وتسجيل الخروج ضمن قائمة الحساب في الهيدر لتبقى اللوحة أخف وأكثر وضوحاً.
                  </p>
                </div>
              ) : null}
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 px-3 pb-4 pt-3 sm:px-4 lg:px-5 lg:pb-6">
            {/* Header */}
            <header className="ui-glass sticky top-3 z-30 rounded-[30px] px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] lg:hidden"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={18} />
                  </button>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-extrabold text-[var(--text-tertiary)]">
                      <span>المدير العام</span>
                      <ChevronLeft size={12} className="opacity-60" />
                      <span className="text-[var(--text-secondary)]">{tabMeta.label}</span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-[var(--text-primary)] sm:text-[2.1rem]">{tabMeta.label}</h1>
                      <p className="text-sm leading-7 text-[var(--text-secondary)]">{tabMeta.hint}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 xl:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[240px] max-w-[420px] flex-1 xl:w-[360px]">
                      <Search
                        size={18}
                        className="pointer-events-none absolute top-1/2 text-[var(--text-tertiary)]"
                        style={{ insetInlineStart: "1rem", transform: "translateY(-50%)" }}
                      />
                      <input
                        type="search"
                        className="ui-input"
                        style={{ paddingInlineStart: "3rem" }}
                        placeholder={
                          activeTab === "schools"
                            ? "ابحث عن مدرسة أو مدينة أو بريد..."
                            : activeTab === "users"
                            ? "ابحث عن مستخدم أو بريد..."
                            : activeTab === "subscriptions"
                            ? "ابحث عن مدرسة أو حالة اشتراك..."
                            : "ابحث في لوحة المدير العام..."
                        }
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      className="ui-button ui-button--secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => void refreshDashboard()}
                      disabled={refreshing}
                      title="تحديث البيانات"
                    >
                      <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                      <span className="hidden sm:inline">{refreshing ? "جاري التحديث" : "تحديث"}</span>
                    </button>

                    <button
                      type="button"
                      className="ui-button ui-button--secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => setActiveTab("notifications")}
                      title={infrastructure.notifications ? "التنبيهات" : "التنبيهات غير متاحة"}
                      disabled={!infrastructure.notifications}
                    >
                      <Bell size={18} />
                      <span className="hidden sm:inline">
                        {infrastructure.notifications ? "التنبيهات" : "التنبيهات غير متاحة"}
                      </span>
                      {infrastructure.notifications && expiringSoon.length > 0 ? (
                        <span className="ui-pill ui-pill--warning min-h-0 px-2 py-1 text-[11px]">{expiringSoon.length}</span>
                      ) : null}
                    </button>

                    <ProfileMenu />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--text-tertiary)]">
                    <span className="rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-1.5">
                      {overviewDiagnostics?.generatedAt
                        ? `آخر مزامنة: ${formatDateTime(overviewDiagnostics.generatedAt)}`
                        : "لم تكتمل أول مزامنة بعد"}
                    </span>
                    {spotlightFilter ? (
                      <button
                        type="button"
                        className="rounded-full border border-[rgba(79,140,255,0.18)] bg-[rgba(79,140,255,0.08)] px-3 py-1.5 text-[var(--primary)] transition hover:bg-[rgba(79,140,255,0.14)]"
                        onClick={clearSpotlightFilter}
                      >
                        الفلتر الذكي: {spotlightFilterLabel(spotlightFilter)} · إلغاء
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </header>

            {/* Content */}
            <div className="mt-4 space-y-4">
              {/* Alerts */}
              {success ? (
                <div className="ui-surface flex items-start gap-3 rounded-[24px] border-[rgba(47,182,122,0.18)] bg-[rgba(47,182,122,0.10)] px-4 py-3 text-[var(--success)]">
                  <BadgeCheck size={18} className="mt-1 shrink-0" />
                  <p className="text-sm font-bold leading-7">{success}</p>
                </div>
              ) : null}

              {error ? (
                <div className="ui-surface flex items-start gap-3 rounded-[24px] border-[rgba(240,90,90,0.18)] bg-[rgba(240,90,90,0.10)] px-4 py-3 text-[var(--danger)]">
                  <AlertTriangle size={18} className="mt-1 shrink-0" />
                  <p className="text-sm font-bold leading-7">{error}</p>
                </div>
              ) : null}

              {infrastructureNotice ? (
                <div className="ui-surface flex items-start gap-3 rounded-[24px] border-[rgba(242,169,59,0.22)] bg-[rgba(242,169,59,0.10)] px-4 py-3 text-[var(--warning)]">
                  <Flag size={18} className="mt-1 shrink-0" />
                  <p className="text-sm font-bold leading-7">{infrastructureNotice}</p>
                </div>
              ) : null}

              {hasLoadWarning ? (
                <div className="ui-surface rounded-[28px] border-[rgba(242,169,59,0.22)] bg-[linear-gradient(135deg,rgba(242,169,59,0.10),rgba(79,140,255,0.08))] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[var(--warning)]">
                        <AlertTriangle size={18} />
                        <span className="text-sm font-black">تحذير تحميل البيانات</span>
                      </div>
                      <p className="max-w-[64rem] text-sm leading-7 text-[var(--text-secondary)]">
                        المشكلة الأساسية كانت أن الصفحة تعامل كل تحديث وكأنه تحميل أولي، ومع أي fallback في علاقات
                        قاعدة البيانات يظهر تنبيه عام بدون توضيح. الآن صار عندك تشخيص أوضح لكل مجموعة بيانات
                        وتحديث خلفي بدون تفريغ الشاشة.
                      </p>
                      {overviewDiagnostics?.warnings.length ? (
                        <div className="space-y-2">
                          {overviewDiagnostics.warnings.slice(0, 3).map((warning) => (
                            <div
                              key={warning}
                              className="rounded-[20px] border border-[rgba(242,169,59,0.18)] bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm font-bold leading-7 text-[var(--text-secondary)]"
                            >
                              {warning}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid min-w-[280px] gap-2 sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1">
                      {dataHealthItems.map((item) => (
                        <div key={item.key} className="rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,0.78)] px-4 py-3">
                          <div className="mb-2 text-xs font-black text-[var(--text-tertiary)]">{item.datasetLabel}</div>
                          <span className={item.status.tone}>{item.status.label}</span>
                          <div className="mt-2 text-sm font-black text-[var(--text-primary)]">{item.datasetLabel}</div>
                          <div className="mt-1 text-xs font-bold text-[var(--text-secondary)]">{item.hint}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Tab Content */}
              {activeTab === "overview" && (
                <OverviewTab
                  schools={schools}
                  users={users}
                  subscriptions={subscriptions}
                  loading={loading}
                  overviewDiagnostics={overviewDiagnostics}
                  spotlightFilter={spotlightFilter}
                  onClearSpotlightFilter={clearSpotlightFilter}
                  onFocusSpotlight={focusSpotlight}
                  onOpenCreateSchool={openCreateSchool}
                  onOpenCreateUser={openCreateUser}
                  onSetActiveTab={setActiveTab}
                  ROLE_LABELS={ROLE_LABELS}
                  PLAN_LABELS={PLAN_LABELS}
                />
              )}

              {activeTab === "schools" && (
                <SchoolsTab
                  schools={schools}
                  subscriptions={subscriptions}
                  filteredSchools={filteredSchools}
                  onOpenCreateSchool={openCreateSchool}
                  onOpenEditSchool={openEditSchool}
                  onToggleSchool={toggleSchool}
                  onExtendSubscription={extendSubscription}
                  onDeleteSchool={setDeleteSchoolTarget}
                  onRefresh={refreshDashboard}
                />
              )}

              {activeTab === "users" && (
                <UsersTab
                  users={users}
                  schools={schools}
                  filteredUsers={filteredUsers}
                  onOpenCreateUser={openCreateUser}
                  onOpenEditUser={openEditUser}
                  onDeleteUser={setDeleteUserTarget}
                />
              )}

              {activeTab === "subscriptions" && (
                <SubscriptionsTab
                  subscriptions={subscriptions}
                  filteredSubscriptions={filteredSubscriptions}
                  onExtendSubscription={extendSubscription}
                />
              )}

              {activeTab === "audit" && <AuditLogTab infrastructure={infrastructure} />}
              {activeTab === "roles" && <RolesTab infrastructure={infrastructure} schools={schools.map((s) => ({ id: s.id, name: s.name }))} />}
              {activeTab === "trash" && <TrashTab infrastructure={infrastructure} />}
              {activeTab === "notifications" && <NotificationsTab infrastructure={infrastructure} />}
              {activeTab === "monitoring" && <MonitoringTab infrastructure={infrastructure} />}
              {activeTab === "branches" && <BranchesTab infrastructure={infrastructure} />}
            </div>
          </main>
        </div>

        {/* Modals */}
        <SchoolForm
          isOpen={showSchoolForm}
          editSchool={editSchool}
          schemaCompat={schemaCompat}
          onClose={() => setShowSchoolForm(false)}
          onSave={handleSaveSchool}
        />

        <UserForm
          isOpen={showUserForm}
          editUser={editUser}
          schools={schools.map((s) => ({ id: s.id, name: s.name }))}
          infrastructure={infrastructure}
          onClose={() => setShowUserForm(false)}
          onSave={handleSaveUser}
        />

        <DeleteSchoolDialog school={deleteSchoolTarget} onClose={() => setDeleteSchoolTarget(null)} onConfirm={handleDeleteSchool} />

        <DeleteUserDialog user={deleteUserTarget} onClose={() => setDeleteUserTarget(null)} onConfirm={handleDeleteUser} />
      </div>
    </ProtectedRoute>
  );
}
