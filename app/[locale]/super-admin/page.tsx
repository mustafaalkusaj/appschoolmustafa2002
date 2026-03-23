"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  Building2,
  ChevronLeft,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  PencilLine,
  Plus,
  RefreshCw,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRoundPlus,
  Users,
  X,
  PanelRightClose,
  PanelRightOpen,
  House,
  BadgeCheck,
  Ban,
  History,
  Activity,
  GitBranch,
  FileDown,
  Flag,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/toast";
import {
  getUserProfile,
  ROLE_COLORS,
  ROLE_LABELS,
  signOutClient,
  type Permission,
  type UserProfile,
} from "@/lib/auth";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { UltrathinkLogo } from "@/components/UltrathinkLogo";
import {
  type AdminInfrastructure,
  DEFAULT_ADMIN_INFRASTRUCTURE,
  detectAdminInfrastructure,
  getAdminInfrastructureNotice,
  isInfrastructureCompatError,
  isMissingRelationError,
} from "@/lib/admin-infrastructure";
import { SCHOOL_BRAND } from "@/lib/branding";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { PERMISSION_GROUPS } from "@/types/roles";

// New Components
import { AuditLogTab } from "./components/AuditLogTab";
import { RolesTab } from "./components/RolesTab";
import { TrashTab } from "./components/TrashTab";
import { NotificationsTab } from "./components/NotificationsTab";
import { MonitoringTab } from "./components/MonitoringTab";
import { BranchesTab } from "./components/BranchesTab";
import { logAction } from "@/lib/audit";
import { exportToCSV } from "@/lib/export";

const chartSkeleton = () => <div className="sk h-full w-full rounded-[24px]" />;

const PlanDistributionChart = dynamic(
  () => import("./components/OverviewCharts").then((module) => module.PlanDistributionChart),
  { ssr: false, loading: chartSkeleton },
);

const RoleDistributionChart = dynamic(
  () => import("./components/OverviewCharts").then((module) => module.RoleDistributionChart),
  { ssr: false, loading: chartSkeleton },
);

const SubscriptionHealthPieChart = dynamic(
  () => import("./components/OverviewCharts").then((module) => module.SubscriptionHealthPieChart),
  { ssr: false, loading: chartSkeleton },
);

type ActiveTab = 
  | "overview" 
  | "schools" 
  | "users" 
  | "subscriptions"
  | "audit"
  | "roles"
  | "trash"
  | "notifications"
  | "monitoring"
  | "branches";

type SchoolPlan = "basic" | "premium" | "enterprise";
type SubscriptionStatus = "active" | "suspended" | "inactive" | "expired";

type SchoolRelation = { name: string | null } | Array<{ name: string | null }> | null;

interface SchoolRecord {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  owner_email: string | null;
  city: string | null;
  plan: SchoolPlan;
  is_active: boolean;
  created_at?: string | null;
}

interface UserRecord {
  id: string;
  full_name: string | null;
  email: string | null;
  role: keyof typeof ROLE_LABELS;
  school_id: string | null;
  phone: string | null;
  is_active: boolean;
  custom_permissions: Permission[] | null;
  schools?: SchoolRelation;
  created_at?: string | null;
}

interface SubscriptionRecord {
  id: string;
  school_id: string;
  plan: SchoolPlan;
  status: SubscriptionStatus;
  start_date: string | null;
  end_date: string | null;
  schools?: SchoolRelation;
  created_at?: string | null;
}

const PLAN_LABELS: Record<SchoolPlan, string> = {
  basic: "أساسية",
  premium: "مميزة",
  enterprise: "مؤسسية",
};

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "نشط",
  suspended: "موقوف",
  inactive: "غير نشط",
  expired: "منتهي",
};

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

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function relationName(value: SchoolRelation) {
  if (Array.isArray(value)) {
    return value[0]?.name ?? null;
  }

  return value?.name ?? null;
}

function attachSchoolNames<T extends { school_id: string | null }>(
  records: T[],
  schools: Array<Pick<SchoolRecord, "id" | "name">>,
) {
  const schoolNamesById = new Map(schools.map((school) => [school.id, school.name]));

  return records.map((record) => ({
    ...record,
    schools: record.school_id ? { name: schoolNamesById.get(record.school_id) ?? null } : null,
  }));
}

function getErrorMessage(error: unknown, fallback = "حدث خطأ غير متوقع") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("ar-IQ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function calculateDaysLeft(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return Math.ceil((parsed.getTime() - Date.now()) / DAY_IN_MS);
}

function isSubscriptionExpired(subscription: SubscriptionRecord | null | undefined) {
  if (!subscription) return true;
  if (subscription.status !== "active") return true;

  const days = calculateDaysLeft(subscription.end_date);
  return days !== null && days < 0;
}

function statusTone(status: "success" | "warning" | "danger") {
  if (status === "success") return "ui-pill ui-pill--success";
  if (status === "warning") return "ui-pill ui-pill--warning";
  return "ui-pill ui-pill--danger";
}

function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="ui-surface rounded-[32px] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-[var(--text-primary)]">{title}</h2>
          {description ? (
            <p className="text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-6 py-10 text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[20px] bg-[rgba(79,140,255,0.12)] text-[var(--primary)]">
        <Icon size={24} />
      </div>
      <h3 className="mb-2 text-lg font-black text-[var(--text-primary)]">{title}</h3>
      <p className="max-w-md text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          className="ui-button ui-button--primary mt-5 inline-flex items-center gap-2"
          onClick={onAction}
        >
          <Plus size={16} />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  meta,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  meta: string;
  tint: string;
}) {
  return (
    <div className="ui-surface relative overflow-hidden rounded-[28px] p-5">
      <div
        className="pointer-events-none absolute inset-x-6 top-0 h-20 rounded-full blur-3xl"
        style={{ background: `${tint}20` }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-bold text-[var(--text-secondary)]">{label}</p>
          <div className="text-3xl font-black tracking-tight text-[var(--text-primary)]">{value}</div>
          <p className="text-xs font-bold text-[var(--text-secondary)]">{meta}</p>
        </div>
        <div
          className="inline-flex h-12 w-12 items-center justify-center rounded-[18px]"
          style={{ background: `${tint}14`, color: tint }}
        >
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function ModalFrame({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="ui-backdrop flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ui-dialog w-full max-w-[720px] overflow-hidden" role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-7">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--text-primary)]">{title}</h2>
            {subtitle ? <p className="text-sm leading-7 text-[var(--text-secondary)]">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const toast = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [infrastructureNotice, setInfrastructureNotice] = useState("");
  const [infrastructure, setInfrastructure] = useState(DEFAULT_ADMIN_INFRASTRUCTURE);
  const [query, setQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editSchool, setEditSchool] = useState<SchoolRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [schoolForm, setSchoolForm] = useState({
    name: "",
    address: "",
    phone: "",
    owner_email: "",
    city: "",
    plan: "basic" as SchoolPlan,
  });

  const [showUserForm, setShowUserForm] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [userForm, setUserForm] = useState({
    full_name: "",
    email: "",
    role: "employee" as keyof typeof ROLE_LABELS,
    school_id: "",
    phone: "",
    is_active: true,
    password: "",
    permissions: [] as Permission[],
  });

  const [deleteSchoolTarget, setDeleteSchoolTarget] = useState<SchoolRecord | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<UserRecord | null>(null);

  const flashSuccess = useCallback((message: string) => {
    setSuccess(message);
    toast.success(message);
    window.setTimeout(() => setSuccess(""), 2600);
  }, [toast]);

  const flashError = useCallback((message: string) => {
    setError(message);
    toast.error(message);
    window.setTimeout(() => setError(""), 3200);
  }, [toast]);

  const checkAuth = useCallback(async () => {
    const nextProfile = await getUserProfile();
    if (!nextProfile || nextProfile.role !== "super_admin") {
      window.location.href = localizeAppPath("/access-denied", locale);
      return null;
    }

    setProfile(nextProfile);
    return nextProfile;
  }, [locale]);

  const fetchAll = useCallback(async (nextInfrastructure = DEFAULT_ADMIN_INFRASTRUCTURE) => {
    const compatWarnings = new Set<string>();
    const schoolsQuery = nextInfrastructure.softDeleteSchools
      ? supabase.from("schools").select("*").is("deleted_at", null)
      : supabase.from("schools").select("*");

    const schoolsResponse = await schoolsQuery.order("created_at", { ascending: false });
    if (schoolsResponse.error) throw schoolsResponse.error;

    const nextSchools = (schoolsResponse.data ?? []) as SchoolRecord[];
    const baseUserColumns = nextInfrastructure.customPermissions
      ? "id, full_name, email, role, school_id, phone, is_active, created_at, custom_permissions"
      : "id, full_name, email, role, school_id, phone, is_active, created_at";
    const usersQuery = nextInfrastructure.softDeleteUsers
      ? supabase.from("user_profiles").select(`${baseUserColumns}, schools(name)`).is("deleted_at", null)
      : supabase.from("user_profiles").select(`${baseUserColumns}, schools(name)`);

    let usersResponse: any = await usersQuery.order("created_at", { ascending: false });
    let usersNeedSchoolFallback = false;

    if (usersResponse.error && isMissingRelationError(usersResponse.error, "user_profiles", "schools")) {
      compatWarnings.add("تم تفعيل عرض بديل لأسماء المدارس لأن علاقة الربط لبعض جداول المدير العام غير متاحة حالياً.");
      usersNeedSchoolFallback = true;
      usersResponse = nextInfrastructure.softDeleteUsers
        ? await supabase
            .from("user_profiles")
            .select(baseUserColumns)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
        : await supabase.from("user_profiles").select(baseUserColumns).order("created_at", { ascending: false });
    }

    let subscriptionsResponse: any = await supabase
      .from("subscriptions")
      .select("*, schools(name)")
      .order("created_at", { ascending: false });
    let subscriptionsNeedSchoolFallback = false;

    if (subscriptionsResponse.error && isMissingRelationError(subscriptionsResponse.error, "subscriptions", "schools")) {
      compatWarnings.add("تم تفعيل عرض بديل لأسماء المدارس لأن علاقة الربط لبعض جداول المدير العام غير متاحة حالياً.");
      subscriptionsNeedSchoolFallback = true;
      subscriptionsResponse = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
    }

    if (usersResponse.error) throw usersResponse.error;
    if (subscriptionsResponse.error) throw subscriptionsResponse.error;

    setSchools(nextSchools);
    const rawUsers = (
      usersNeedSchoolFallback
        ? attachSchoolNames(
            (usersResponse.data ?? []) as unknown as UserRecord[],
            nextSchools,
          )
        : ((usersResponse.data ?? []) as unknown as Array<Record<string, unknown>>)
    ) as Array<Record<string, unknown>>;
    setUsers(
      rawUsers.map((user) => ({
        ...user,
        custom_permissions: Array.isArray(user.custom_permissions)
          ? (user.custom_permissions as Permission[])
          : null,
      })) as UserRecord[],
    );
    setSubscriptions(
      subscriptionsNeedSchoolFallback
        ? attachSchoolNames((subscriptionsResponse.data ?? []) as SubscriptionRecord[], nextSchools)
        : ((subscriptionsResponse.data ?? []) as SubscriptionRecord[]),
    );

    return Array.from(compatWarnings);
  }, []);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const nextProfile = await checkAuth();
      if (!nextProfile) return;

      const nextInfrastructure = await detectAdminInfrastructure(supabase);
      setInfrastructure(nextInfrastructure);

      const fetchWarnings = await fetchAll(nextInfrastructure);
      const notices = [getAdminInfrastructureNotice(nextInfrastructure), ...fetchWarnings].filter(Boolean);
      setInfrastructureNotice(notices.join(" "));
    } catch (fetchError) {
      flashError(getErrorMessage(fetchError, "تعذر تحميل بيانات المدير العام."));
    } finally {
      setLoading(false);
    }
  }, [checkAuth, fetchAll, flashError]);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  function resetSchoolForm() {
    setEditSchool(null);
    setSchoolForm({
      name: "",
      address: "",
      phone: "",
      owner_email: "",
      city: "",
      plan: "basic",
    });
  }

  function resetUserForm() {
    setEditUser(null);
    setUserForm({
      full_name: "",
      email: "",
      role: "employee",
      school_id: "",
      phone: "",
      is_active: true,
      password: "",
      permissions: [],
    });
  }

  function openCreateSchool() {
    resetSchoolForm();
    setShowSchoolForm(true);
  }

  function openEditSchool(school: SchoolRecord) {
    setEditSchool(school);
    setSchoolForm({
      name: school.name,
      address: school.address ?? "",
      phone: school.phone ?? "",
      owner_email: school.owner_email ?? "",
      city: school.city ?? "",
      plan: school.plan ?? "basic",
    });
    setShowSchoolForm(true);
  }

  function openCreateUser() {
    resetUserForm();
    setShowUserForm(true);
  }

  function openEditUser(user: UserRecord) {
    setEditUser(user);
    setUserForm({
      full_name: user.full_name ?? "",
      email: user.email ?? "",
      role: user.role,
      school_id: user.school_id ?? "",
      phone: user.phone ?? "",
      is_active: user.is_active,
      password: "",
      permissions: user.custom_permissions ?? [],
    });
    setShowUserForm(true);
  }

  async function toggleSchool(id: string, current: boolean) {
    try {
      const schoolResponse = await supabase.from("schools").update({ is_active: !current }).eq("id", id);
      if (schoolResponse.error) throw schoolResponse.error;

      const subscriptionResponse = await supabase
        .from("subscriptions")
        .update({ status: current ? "suspended" : "active" })
        .eq("school_id", id);

      if (subscriptionResponse.error) throw subscriptionResponse.error;

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
  }

  async function handleSaveSchool(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: schoolForm.name,
      address: schoolForm.address || null,
      phone: schoolForm.phone || null,
      owner_email: schoolForm.owner_email || null,
      city: schoolForm.city || null,
      plan: schoolForm.plan,
      is_active: true,
    };

    try {
      if (editSchool) {
        const response = await supabase.from("schools").update(payload).eq("id", editSchool.id);
        if (response.error) throw response.error;

        await logAction({
          action_type: "update",
          entity_type: "school",
          entity_id: editSchool.id,
          summary: `تعديل بيانات المدرسة: ${payload.name}`,
        });

        flashSuccess("تم تحديث بيانات المدرسة.");
      } else {
        const { data: newSchool, error: schoolError } = await supabase
          .from("schools")
          .insert(payload)
          .select()
          .single();

        if (schoolError) throw schoolError;

        await logAction({
          action_type: "create",
          entity_type: "school",
          entity_id: newSchool.id,
          summary: `إنشاء مدرسة جديدة: ${payload.name}`,
        });

        const { error: subscriptionError } = await supabase.from("subscriptions").insert({
          school_id: newSchool.id,
          plan: schoolForm.plan,
          status: "active",
          start_date: new Date().toISOString().split("T")[0],
          end_date: new Date(Date.now() + 365 * DAY_IN_MS).toISOString().split("T")[0],
        });

        if (subscriptionError) throw subscriptionError;

        let branchSkipped = !infrastructure.branches;
        if (!branchSkipped) {
          const { error: branchError } = await supabase.from("branches").insert({
            school_id: newSchool.id,
            name: "الفرع الرئيسي",
            is_main: true,
          });

          if (branchError) {
            if (isInfrastructureCompatError(branchError)) {
              branchSkipped = true;
            } else {
              throw branchError;
            }
          }
        }

        flashSuccess(
          branchSkipped
            ? "تمت إضافة المدرسة وإنشاء اشتراكها الافتراضي. تم تجاوز إنشاء الفرع الرئيسي لأن بنية الفروع غير متاحة حالياً."
            : "تمت إضافة المدرسة وإنشاء اشتراكها الافتراضي.",
        );
      }

      setShowSchoolForm(false);
      resetSchoolForm();
      await refreshDashboard();
    } catch (saveError) {
      flashError(getErrorMessage(saveError, "تعذر حفظ بيانات المدرسة."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      full_name: userForm.full_name,
      email: userForm.email,
      role: userForm.role,
      school_id: userForm.school_id || null,
      phone: userForm.phone || null,
      is_active: userForm.is_active,
      ...(infrastructure.customPermissions
        ? { custom_permissions: userForm.permissions.length > 0 ? userForm.permissions : null }
        : {}),
    };

    try {
      if (editUser) {
        const response = await supabase.from("user_profiles").update(payload).eq("id", editUser.id);
        if (response.error) throw response.error;

        await logAction({
          action_type: "update",
          entity_type: "user",
          entity_id: editUser.id,
          summary: `تعديل بيانات المستخدم: ${payload.full_name || payload.email}`,
        });

        flashSuccess("تم تحديث بيانات المستخدم.");
      } else {
        if (!userForm.password) {
          throw new Error("يرجى إدخال كلمة مرور للمستخدم الجديد.");
        }

        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, password: userForm.password }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            body?.error?.message || body?.message || `فشل إنشاء المستخدم (${response.status}).`,
          );
        }

        await logAction({
          action_type: "create",
          entity_type: "user",
          summary: `إنشاء مستخدم جديد: ${payload.full_name || payload.email}`,
        });

        flashSuccess("تمت إضافة المستخدم بنجاح.");
      }

      setShowUserForm(false);
      resetUserForm();
      await refreshDashboard();
    } catch (saveError) {
      flashError(getErrorMessage(saveError, "تعذر حفظ المستخدم."));
    } finally {
      setSaving(false);
    }
  }

  async function extendSubscription(schoolId: string) {
    try {
      const endDate = new Date(Date.now() + 365 * DAY_IN_MS).toISOString().split("T")[0];
      const response = await supabase
        .from("subscriptions")
        .update({ status: "active", end_date: endDate })
        .eq("school_id", schoolId);

      if (response.error) throw response.error;

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
  }

  async function handleDeleteSchool() {
    if (!deleteSchoolTarget) return;

    if (!infrastructure.softDeleteSchools) {
      flashError("أرشفة المدارس تتطلب تشغيل admin_infrastructure.sql لإضافة deleted_at و deleted_by إلى جدول schools.");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const deleteSchoolResponse = await supabase
        .from("schools")
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: userData.user?.id 
        })
        .eq("id", deleteSchoolTarget.id);

      if (deleteSchoolResponse.error) throw deleteSchoolResponse.error;

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
  }

  async function handleDeleteUser() {
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
      const { data: userData } = await supabase.auth.getUser();
      const response = await supabase
        .from("user_profiles")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userData.user?.id ?? null,
          is_active: false,
        })
        .eq("id", deleteUserTarget.id);

      if (response.error) throw response.error;

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
  }

  async function handleLogout() {
    await signOutClient();
    window.location.href = localizeAppPath("/login", locale);
  }

  const normalizedQuery = query.trim().toLowerCase();

  const activeSchools = schools.filter((school) => school.is_active);
  const activeSubscriptions = subscriptions.filter((subscription) => !isSubscriptionExpired(subscription));
  const expiredSubscriptions = subscriptions.filter((subscription) => isSubscriptionExpired(subscription));
  const expiringSoon = subscriptions.filter((subscription) => {
    const days = calculateDaysLeft(subscription.end_date);
    return !isSubscriptionExpired(subscription) && days !== null && days <= 30;
  });

  const filteredSchools = schools.filter((school) => {
    if (!normalizedQuery) return true;
    return [school.name, school.city, school.phone, school.owner_email]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery));
  });

  const filteredUsers = users.filter((user) => {
    if (!normalizedQuery) return true;
    return [user.full_name, user.email, relationName(user.schools)]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery));
  });

  const filteredSubscriptions = subscriptions.filter((subscription) => {
    if (!normalizedQuery) return true;
    return [relationName(subscription.schools), PLAN_LABELS[subscription.plan], SUBSCRIPTION_STATUS_LABELS[subscription.status]]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery));
  });

  const availableTabs = useMemo(
    () => TAB_ITEMS.filter((item) => isTabAvailable(item.id, infrastructure)),
    [infrastructure],
  );

  useEffect(() => {
    if (availableTabs.length === 0) return;
    if (!availableTabs.some((item) => item.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [activeTab, availableTabs]);

  const planData = [
    {
      name: "أساسية",
      value: schools.filter((school) => school.plan === "basic").length,
      fill: "#4F8CFF",
    },
    {
      name: "مميزة",
      value: schools.filter((school) => school.plan === "premium").length,
      fill: "#79D7FF",
    },
    {
      name: "مؤسسية",
      value: schools.filter((school) => school.plan === "enterprise").length,
      fill: "#8B5CF6",
    },
  ];

  const roleData = [
    {
      name: "المدير العام",
      value: users.filter((user) => user.role === "super_admin").length,
    },
    {
      name: "مدير مدرسة",
      value: users.filter((user) => user.role === "admin").length,
    },
    {
      name: "موظف",
      value: users.filter((user) => user.role === "employee").length,
    },
  ];

  const subscriptionHealthData = [
    { name: "نشط", value: activeSubscriptions.length, fill: "#35C58A" },
    { name: "موقوف / منتهي", value: expiredSubscriptions.length, fill: "#FF7272" },
    { name: "قرب الانتهاء", value: expiringSoon.length, fill: "#FFB84D" },
  ];

  const recentSchools = schools.slice(0, 4);
  const recentUsers = users.slice(0, 5);
  const tabMeta = availableTabs.find((item) => item.id === activeTab) ?? availableTabs[0] ?? TAB_ITEMS[0];

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="ui-grid-lines pointer-events-none absolute inset-0 opacity-35" />
      <div className="pointer-events-none absolute inset-x-0 top-[-18rem] h-[34rem] rounded-full bg-[radial-gradient(circle,rgba(121,215,255,0.16),transparent_60%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-12rem] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(79,140,255,0.18),transparent_60%)] blur-3xl" />

      {sidebarOpen ? (
        <div
          className="ui-backdrop z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div className="relative flex min-h-dvh flex-row-reverse">
        <aside
          className={cx(
            "ui-glass fixed inset-y-0 right-0 z-50 flex w-[300px] flex-col border-l border-r-0 px-3 py-4 transition-transform duration-200 lg:static lg:translate-x-0",
            sidebarCollapsed ? "lg:w-[108px]" : "lg:w-[300px]",
            sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
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
                    sidebarCollapsed && "justify-center px-2",
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
                        : "bg-[var(--surface-muted)] text-[var(--text-tertiary)] group-hover:text-[var(--primary)]",
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  {!sidebarCollapsed ? (
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black">{item.label}</span>
                      <span className="block truncate text-xs font-semibold text-[var(--text-tertiary)]">
                        {item.hint}
                      </span>
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
                sidebarCollapsed && "justify-center px-2",
              )}
              title="لوحة المدرسة"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[var(--surface-muted)] text-[var(--text-tertiary)]">
                <House size={18} />
              </span>
              {!sidebarCollapsed ? (
                <span className="text-sm font-black">لوحة المدرسة</span>
              ) : null}
            </Link>
          </div>

          <div className="mt-auto space-y-3">
            <div className={cx("rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-3", sidebarCollapsed && "p-2")}>
              {!sidebarCollapsed ? (
                <div className="space-y-2">
                  <p className="text-xs font-black text-[var(--text-tertiary)]">الحساب الحالي</p>
                  <p className="text-sm font-black text-[var(--text-primary)]">
                    {profile?.full_name || profile?.email || "المدير العام"}
                  </p>
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

            <div
              className={cx(
                "rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-2",
                sidebarCollapsed && "p-2",
              )}
            >
              <button
                type="button"
                className={cx(
                  "ui-button ui-button--danger flex w-full items-center gap-3 justify-center",
                  !sidebarCollapsed && "justify-start px-4",
                )}
                onClick={handleLogout}
              >
                <LogOut size={18} />
                {!sidebarCollapsed ? <span>تسجيل الخروج</span> : null}
              </button>

              <ThemeModeToggle
                variant="inline"
                className="sidebar-theme-switch mt-2 w-full"
                showLabels={!sidebarCollapsed}
                compact={sidebarCollapsed}
              />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-3 pb-4 pt-3 sm:px-4 lg:px-5 lg:pb-6">
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
                    <h1 className="text-2xl font-black text-[var(--text-primary)] sm:text-[2.1rem]">
                      {tabMeta.label}
                    </h1>
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
                    onClick={() => setActiveTab("notifications")}
                    title={infrastructure.notifications ? "التنبيهات" : "التنبيهات غير متاحة في بيئة قاعدة البيانات الحالية"}
                    disabled={!infrastructure.notifications}
                  >
                    <Bell size={18} />
                    <span className="hidden sm:inline">
                      {infrastructure.notifications ? "التنبيهات" : "التنبيهات غير متاحة"}
                    </span>
                    {infrastructure.notifications && expiringSoon.length > 0 ? (
                      <span className="ui-pill ui-pill--warning min-h-0 px-2 py-1 text-[11px]">
                        {expiringSoon.length}
                      </span>
                    ) : null}
                  </button>

                  <details className="relative">
                    <summary className="list-none">
                      <div className="ui-button ui-button--secondary flex min-w-[180px] items-center gap-3 px-3 py-2">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(79,140,255,0.14)] text-[var(--primary)]">
                          <Users size={18} />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-[var(--text-primary)]">
                            {profile?.full_name || "المدير العام"}
                          </div>
                          <div className="text-xs font-bold text-[var(--text-tertiary)]">حساب مشرف النظام</div>
                        </div>
                      </div>
                    </summary>
                    <div className="ui-surface absolute right-0 top-full z-50 mt-2 w-[240px] rounded-[24px] p-2">
                      <Link
                        href={localizeAppPath("/dashboard", locale)}
                        className="flex items-center gap-3 rounded-[18px] px-3 py-3 text-sm font-bold text-[var(--text-secondary)] transition hover:bg-[rgba(79,140,255,0.08)] hover:text-[var(--text-primary)]"
                      >
                        <House size={16} />
                        الانتقال إلى لوحة المدرسة
                      </Link>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-sm font-bold text-[var(--text-secondary)] transition hover:bg-[rgba(79,140,255,0.08)] hover:text-[var(--text-primary)]"
                      >
                        <BadgeCheck size={16} />
                        الملف الشخصي
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-sm font-bold text-[var(--danger)] transition hover:bg-[rgba(240,90,90,0.08)]"
                        onClick={handleLogout}
                      >
                        <LogOut size={16} />
                        تسجيل الخروج
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </header>

          <div className="mt-4 space-y-4">
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

            <section className="ui-soft-surface relative overflow-hidden rounded-[34px] p-6 sm:p-7">
              <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(121,215,255,0.16),transparent_72%)] lg:block" />
              <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-[760px] space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-extrabold text-[var(--text-secondary)]">
                    <Sparkles size={14} className="text-[var(--primary)]" />
                    تجربة مشرف عربية أولاً بطبقات هادئة وقرارات أسرع
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black leading-tight text-[var(--text-primary)] sm:text-[3rem]">
                      مرحباً بك في مركز التحكم الخاص بـ {SCHOOL_BRAND.nameAr}
                    </h2>
                    <p className="max-w-[58rem] text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
                      لوحة موحدة لمتابعة حالة المدارس والمستخدمين والاشتراكات، مع تسلسل بصري أوضح وقرارات
                      تشغيلية أسرع دون المساس بمنطق البيانات الحالي.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="ui-button ui-button--primary inline-flex items-center gap-2"
                    onClick={openCreateSchool}
                  >
                    <Plus size={16} />
                    إضافة مدرسة
                  </button>
                  <button
                    type="button"
                    className="ui-button ui-button--secondary inline-flex items-center gap-2"
                    onClick={openCreateUser}
                  >
                    <UserRoundPlus size={16} />
                    إضافة مستخدم
                  </button>
                  <button
                    type="button"
                    className="ui-button ui-button--secondary inline-flex items-center gap-2"
                    onClick={() => setActiveTab("subscriptions")}
                  >
                    <RefreshCw size={16} />
                    متابعة الاشتراكات
                  </button>
                </div>
              </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
              <StatCard
                icon={Building2}
                label="إجمالي المدارس"
                value={schools.length}
                meta={`${activeSchools.length} مدرسة نشطة حالياً`}
                tint="var(--primary)"
              />
              <StatCard
                icon={CreditCard}
                label="الاشتراكات النشطة"
                value={activeSubscriptions.length}
                meta={`${expiredSubscriptions.length} اشتراك يحتاج متابعة`}
                tint="var(--success)"
              />
              <StatCard
                icon={AlertTriangle}
                label="قرب انتهاء الاشتراكات"
                value={expiringSoon.length}
                meta="المدارس التي تحتاج إجراء استباقي"
                tint="var(--warning)"
              />
              <StatCard
                icon={Users}
                label="المستخدمون"
                value={users.length}
                meta={`${users.filter((user) => user.is_active).length} مستخدم مفعّل`}
                tint="#8B5CF6"
              />
            </div>

            {loading ? (
              <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="ui-surface rounded-[32px] p-6">
                  <div className="sk mb-4 h-8 w-48 rounded-full" />
                  <div className="sk h-[280px] w-full rounded-[28px]" />
                </div>
                <div className="ui-surface rounded-[32px] p-6">
                  <div className="sk mb-4 h-8 w-36 rounded-full" />
                  <div className="space-y-3">
                    <div className="sk h-20 w-full rounded-[24px]" />
                    <div className="sk h-20 w-full rounded-[24px]" />
                    <div className="sk h-20 w-full rounded-[24px]" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {activeTab === "overview" ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                      <SectionCard
                        title="توزيع المدارس والمستخدمين"
                        description="لقطة سريعة على الباقات والأدوار لمعرفة التوازن التشغيلي داخل المنصة."
                      >
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                            <div className="mb-4">
                              <h3 className="text-sm font-black text-[var(--text-primary)]">المدارس حسب الباقة</h3>
                              <p className="text-xs font-bold text-[var(--text-tertiary)]">
                                مقارنة سريعة بين الخطط المفعّلة
                              </p>
                            </div>
                            <div className="h-[270px]">
                              <PlanDistributionChart data={planData} />
                            </div>
                          </div>

                          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                            <div className="mb-4">
                              <h3 className="text-sm font-black text-[var(--text-primary)]">المستخدمون حسب الدور</h3>
                              <p className="text-xs font-bold text-[var(--text-tertiary)]">
                                توزيع الصلاحيات على الهيكل التشغيلي
                              </p>
                            </div>
                            <div className="h-[270px]">
                              <RoleDistributionChart data={roleData} />
                            </div>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="صحة الاشتراكات"
                        description="التجديدات القريبة والاشتراكات الموقوفة تحتاج متابعة مستمرة."
                      >
                        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                          <div className="h-[260px] rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                            <SubscriptionHealthPieChart data={subscriptionHealthData} />
                          </div>

                          <div className="space-y-3">
                            {subscriptionHealthData.map((item) => (
                              <div
                                key={item.name}
                                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4"
                              >
                                <div className="mb-2 flex items-center justify-between gap-3">
                                  <span className="text-sm font-black text-[var(--text-primary)]">{item.name}</span>
                                  <span className="text-xl font-black" style={{ color: item.fill }}>
                                    {item.value}
                                  </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-[rgba(79,140,255,0.08)]">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${subscriptions.length === 0 ? 0 : (item.value / subscriptions.length) * 100}%`,
                                      background: item.fill,
                                    }}
                                  />
                                </div>
                              </div>
                            ))}

                            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
                              <div className="mb-2 flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
                                <AlertTriangle size={16} className="text-[var(--warning)]" />
                                أولوية هذا الأسبوع
                              </div>
                              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                                {expiringSoon.length > 0
                                  ? `يوجد ${expiringSoon.length} اشتراكاً يحتاج تواصلاً استباقياً قبل انتهاء الفترة الحالية.`
                                  : "لا توجد اشتراكات على وشك الانتهاء خلال الثلاثين يوماً القادمة."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </SectionCard>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                      <SectionCard
                        title="مدارس تحتاج انتباهاً"
                        description="نظرة مركزة على المدارس التي شارفت اشتراكاتها على الانتهاء أو تم إيقافها."
                        actions={
                          <button
                            type="button"
                            className="ui-button ui-button--secondary inline-flex items-center gap-2"
                            onClick={() => setActiveTab("schools")}
                          >
                            عرض كل المدارس
                          </button>
                        }
                      >
                        <div className="space-y-3">
                          {(filteredSchools.filter((school) => {
                            const subscription = subscriptions.find((item) => item.school_id === school.id);
                            const days = calculateDaysLeft(subscription?.end_date);
                            return !school.is_active || isSubscriptionExpired(subscription) || (days !== null && days <= 30);
                          }).slice(0, 4)).map((school) => {
                            const subscription = subscriptions.find((item) => item.school_id === school.id);
                            const days = calculateDaysLeft(subscription?.end_date);
                            const tone =
                              !school.is_active || isSubscriptionExpired(subscription)
                                ? "danger"
                                : days !== null && days <= 30
                                  ? "warning"
                                  : "success";

                            return (
                              <div
                                key={school.id}
                                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="space-y-1">
                                    <div className="text-base font-black text-[var(--text-primary)]">{school.name}</div>
                                    <div className="text-sm leading-7 text-[var(--text-secondary)]">
                                      {school.city || "مدينة غير محددة"} · {school.owner_email || "بدون بريد مدير"}
                                    </div>
                                  </div>
                                  <span className={statusTone(tone)}>
                                    {tone === "danger"
                                      ? !school.is_active
                                        ? "المدرسة موقوفة"
                                        : "الاشتراك منتهي"
                                      : tone === "warning"
                                        ? `${days} يوم متبقي`
                                        : "نشط"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {schools.length === 0 ? (
                            <EmptyState
                              icon={School}
                              title="لا توجد مدارس بعد"
                              description="ابدأ بإضافة أول مدرسة ليظهر ملخص الاشتراك والحالة التشغيلية هنا."
                              actionLabel="إضافة مدرسة"
                              onAction={openCreateSchool}
                            />
                          ) : null}
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="آخر النشاطات"
                        description="إضافات المدارس والمستخدمين الأحدث لتتبع التغييرات الأخيرة."
                      >
                        <div className="space-y-3">
                          {recentSchools.map((school) => (
                            <div
                              key={school.id}
                              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="text-sm font-black text-[var(--text-primary)]">{school.name}</div>
                                <div className="text-xs font-bold text-[var(--text-tertiary)]">
                                  {formatDate(school.created_at)}
                                </div>
                              </div>
                              <div className="text-sm leading-7 text-[var(--text-secondary)]">
                                {PLAN_LABELS[school.plan]} · {school.city || "المدينة غير محددة"}
                              </div>
                            </div>
                          ))}

                          {recentUsers.map((user) => (
                            <div
                              key={user.id}
                              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4"
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="text-sm font-black text-[var(--text-primary)]">
                                  {user.full_name || user.email || "مستخدم جديد"}
                                </div>
                                <div className="text-xs font-bold text-[var(--text-tertiary)]">
                                  {formatDate(user.created_at)}
                                </div>
                              </div>
                              <div className="text-sm leading-7 text-[var(--text-secondary)]">
                                {ROLE_LABELS[user.role]} · {relationName(user.schools) || "كل المدارس"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    </div>
                  </div>
                ) : null}

                {activeTab === "schools" ? (
                  <SectionCard
                    title={`إدارة المدارس (${filteredSchools.length})`}
                    description="مراجعة حالة المدارس وخططها وتجديد اشتراكاتها مع أدوات تعديل مباشرة."
                    actions={
                      <>
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center gap-2"
                          onClick={() => exportToCSV(filteredSchools, "schools")}
                        >
                          <FileDown size={16} />
                          تصدير
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center gap-2"
                          onClick={() => void refreshDashboard()}
                        >
                          <RefreshCw size={16} />
                          تحديث
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button--primary inline-flex items-center gap-2"
                          onClick={openCreateSchool}
                        >
                          <Plus size={16} />
                          إضافة مدرسة
                        </button>
                      </>
                    }
                  >
                    {filteredSchools.length === 0 ? (
                      <EmptyState
                        icon={School}
                        title="لا توجد نتائج مطابقة"
                        description="جرّب تعديل كلمات البحث أو أضف مدرسة جديدة لبدء إدارة المنصة."
                        actionLabel="إضافة مدرسة"
                        onAction={openCreateSchool}
                      />
                    ) : (
                      <div className="grid gap-4 xl:grid-cols-2">
                        {filteredSchools.map((school) => {
                          const subscription = subscriptions.find((item) => item.school_id === school.id);
                          const daysLeft = calculateDaysLeft(subscription?.end_date);
                          const expired = isSubscriptionExpired(subscription);
                          const badgeTone =
                            !school.is_active || expired
                              ? "danger"
                              : daysLeft !== null && daysLeft <= 30
                                ? "warning"
                                : "success";

                          return (
                            <article
                              key={school.id}
                              className="ui-surface overflow-hidden rounded-[30px] p-5"
                            >
                              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(79,140,255,0.12)] text-[var(--primary)]">
                                      <School size={20} />
                                    </div>
                                    <div>
                                      <h3 className="text-lg font-black text-[var(--text-primary)]">{school.name}</h3>
                                      <p className="text-sm leading-7 text-[var(--text-secondary)]">
                                        {school.city || "مدينة غير محددة"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-sm leading-7 text-[var(--text-secondary)]">
                                    {school.owner_email || "بدون بريد مدير"} · {school.phone || "بدون هاتف"}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={statusTone(badgeTone)}>
                                    {!school.is_active
                                      ? "موقوفة"
                                      : expired
                                        ? "منتهية"
                                        : daysLeft !== null && daysLeft <= 30
                                          ? `${daysLeft} يوم متبقي`
                                          : "نشطة"}
                                  </span>
                                  <span className="ui-pill">
                                    {PLAN_LABELS[school.plan]}
                                  </span>
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                                  <p className="mb-1 text-xs font-black text-[var(--text-tertiary)]">تاريخ الانتهاء</p>
                                  <p className="text-sm font-black text-[var(--text-primary)]">
                                    {formatDate(subscription?.end_date)}
                                  </p>
                                </div>
                                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                                  <p className="mb-1 text-xs font-black text-[var(--text-tertiary)]">حالة الاشتراك</p>
                                  <p className="text-sm font-black text-[var(--text-primary)]">
                                    {subscription ? SUBSCRIPTION_STATUS_LABELS[subscription.status] : "—"}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(79,140,255,0.08)]">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width:
                                      daysLeft === null
                                        ? "18%"
                                        : `${Math.max(0, Math.min(100, (daysLeft / 365) * 100))}%`,
                                    background:
                                      !school.is_active || expired
                                        ? "var(--danger)"
                                        : daysLeft !== null && daysLeft <= 30
                                          ? "var(--warning)"
                                          : "var(--success)",
                                  }}
                                />
                              </div>

                              <div className="mt-5 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className={cx(
                                    "ui-button inline-flex items-center gap-2",
                                    school.is_active ? "ui-button--danger" : "ui-button--secondary",
                                  )}
                                  onClick={() => void toggleSchool(school.id, school.is_active)}
                                >
                                  {school.is_active ? <Ban size={16} /> : <BadgeCheck size={16} />}
                                  {school.is_active ? "إيقاف المدرسة" : "تفعيل المدرسة"}
                                </button>
                                <button
                                  type="button"
                                  className="ui-button ui-button--secondary inline-flex items-center gap-2"
                                  onClick={() => void extendSubscription(school.id)}
                                >
                                  <RefreshCw size={16} />
                                  تجديد الاشتراك
                                </button>
                                <button
                                  type="button"
                                  className="ui-button ui-button--secondary inline-flex items-center gap-2"
                                  onClick={() => openEditSchool(school)}
                                >
                                  <PencilLine size={16} />
                                  تعديل
                                </button>
                                <button
                                  type="button"
                                  className="ui-button ui-button--danger inline-flex items-center gap-2"
                                  onClick={() => setDeleteSchoolTarget(school)}
                                >
                                  <Trash2 size={16} />
                                  أرشفة
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </SectionCard>
                ) : null}

                {activeTab === "users" ? (
                  <SectionCard
                    title={`إدارة المستخدمين (${filteredUsers.length})`}
                    description="إدارة المستخدمين والأدوار والصلاحيات المخصصة مع إبقاء تدفق الإنشاء والتعديل الحالي."
                    actions={
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center gap-2"
                          onClick={() => exportToCSV(filteredUsers, "users")}
                        >
                          <FileDown size={16} />
                          تصدير
                        </button>
                        <button
                          type="button"
                          className="ui-button ui-button--primary inline-flex items-center gap-2"
                          onClick={openCreateUser}
                        >
                          <UserRoundPlus size={16} />
                          إضافة مستخدم
                        </button>
                      </div>
                    }
                  >
                    {filteredUsers.length === 0 ? (
                      <EmptyState
                        icon={Users}
                        title="لا توجد نتائج للمستخدمين"
                        description="جرّب تعديل البحث الحالي أو أضف مستخدماً جديداً لتخصيص الوصول."
                        actionLabel="إضافة مستخدم"
                        onAction={openCreateUser}
                      />
                    ) : (
                      <>
                        <div className="hidden overflow-hidden rounded-[30px] border border-[var(--border)] lg:block">
                          <div className="max-h-[70dvh] overflow-auto">
                            <table className="ui-table">
                              <thead>
                                <tr>
                                  <th>الاسم</th>
                                  <th>البريد</th>
                                  <th>الدور</th>
                                  <th>المدرسة</th>
                                  <th>الصلاحيات</th>
                                  <th>الحالة</th>
                                  <th>إجراءات</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredUsers.map((user) => {
                                  const roleColor = ROLE_COLORS[user.role] ?? {
                                    bg: "rgba(79,140,255,0.12)",
                                    color: "#4F8CFF",
                                  };
                                  const customPermissionsCount = user.custom_permissions?.length ?? 0;

                                  return (
                                    <tr key={user.id}>
                                      <td>
                                        <div className="space-y-1">
                                          <div className="font-black">{user.full_name || "—"}</div>
                                          <div className="text-xs font-bold text-[var(--text-tertiary)]">
                                            {formatDate(user.created_at)}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="text-[var(--text-secondary)]">{user.email || "—"}</td>
                                      <td>
                                        <span
                                          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-black"
                                          style={{ background: roleColor.bg, color: roleColor.color }}
                                        >
                                          {ROLE_LABELS[user.role]}
                                        </span>
                                      </td>
                                      <td className="text-[var(--text-secondary)]">
                                        {relationName(user.schools) || "كل المدارس"}
                                      </td>
                                      <td>
                                        <span className="ui-pill">
                                          {customPermissionsCount === 0 ? "افتراضي" : `${customPermissionsCount} مخصص`}
                                        </span>
                                      </td>
                                      <td>
                                        <span className={user.is_active ? "ui-pill ui-pill--success" : "ui-pill ui-pill--danger"}>
                                          {user.is_active ? "نشط" : "موقوف"}
                                        </span>
                                      </td>
                                      <td>
                                        <div className="flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
                                            onClick={() => openEditUser(user)}
                                          >
                                            <PencilLine size={16} />
                                            تعديل
                                          </button>
                                          <button
                                            type="button"
                                            className="ui-button ui-button--danger inline-flex items-center gap-2 px-4"
                                            onClick={() => setDeleteUserTarget(user)}
                                          >
                                            <Trash2 size={16} />
                                            أرشفة
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="space-y-3 lg:hidden">
                          {filteredUsers.map((user) => {
                            const roleColor = ROLE_COLORS[user.role] ?? {
                              bg: "rgba(79,140,255,0.12)",
                              color: "#4F8CFF",
                            };

                            return (
                              <article
                                key={user.id}
                                className="ui-surface rounded-[28px] p-4"
                              >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <h3 className="text-base font-black text-[var(--text-primary)]">
                                      {user.full_name || "—"}
                                    </h3>
                                    <p className="text-sm leading-7 text-[var(--text-secondary)]">{user.email}</p>
                                  </div>
                                  <span
                                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-black"
                                    style={{ background: roleColor.bg, color: roleColor.color }}
                                  >
                                    {ROLE_LABELS[user.role]}
                                  </span>
                                </div>
                                <div className="mb-4 flex flex-wrap gap-2">
                                  <span className="ui-pill">{relationName(user.schools) || "كل المدارس"}</span>
                                  <span className={user.is_active ? "ui-pill ui-pill--success" : "ui-pill ui-pill--danger"}>
                                    {user.is_active ? "نشط" : "موقوف"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="ui-button ui-button--secondary inline-flex flex-1 items-center justify-center gap-2"
                                    onClick={() => openEditUser(user)}
                                  >
                                    <PencilLine size={16} />
                                    تعديل
                                  </button>
                                  <button
                                    type="button"
                                    className="ui-button ui-button--danger inline-flex flex-1 items-center justify-center gap-2"
                                    onClick={() => setDeleteUserTarget(user)}
                                  >
                                    <Trash2 size={16} />
                                    أرشفة
                                  </button>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </SectionCard>
                ) : null}

                {activeTab === "subscriptions" ? (
                  <SectionCard
                    title={`الاشتراكات (${filteredSubscriptions.length})`}
                    description="جدول متابعة مركزي لتجديد الاشتراكات ورؤية المدارس القريبة من الانتهاء."
                  >
                    {filteredSubscriptions.length === 0 ? (
                      <EmptyState
                        icon={CreditCard}
                        title="لا توجد نتائج للاشتراكات"
                        description="جرّب تعديل كلمات البحث أو أضف مدرسة جديدة لإنشاء اشتراكها الافتراضي."
                      />
                    ) : (
                      <div className="overflow-hidden rounded-[30px] border border-[var(--border)]">
                        <div className="max-h-[72dvh] overflow-auto">
                          <table className="ui-table">
                            <thead>
                              <tr>
                                <th>المدرسة</th>
                                <th>الباقة</th>
                                <th>تاريخ الانتهاء</th>
                                <th>المتبقي</th>
                                <th>الحالة</th>
                                <th>إجراءات</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredSubscriptions.map((subscription) => {
                                const daysLeft = calculateDaysLeft(subscription.end_date);
                                const expired = isSubscriptionExpired(subscription);
                                const tone =
                                  expired ? "ui-pill ui-pill--danger" : daysLeft !== null && daysLeft <= 30 ? "ui-pill ui-pill--warning" : "ui-pill ui-pill--success";

                                return (
                                  <tr key={subscription.id}>
                                    <td>
                                      <div className="space-y-1">
                                        <div className="font-black text-[var(--text-primary)]">
                                          {relationName(subscription.schools) || "—"}
                                        </div>
                                        <div className="text-xs font-bold text-[var(--text-tertiary)]">
                                          {formatDate(subscription.created_at)}
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <span className="ui-pill">{PLAN_LABELS[subscription.plan]}</span>
                                    </td>
                                    <td className="text-[var(--text-secondary)]">{formatDate(subscription.end_date)}</td>
                                    <td className="font-black text-[var(--text-primary)]">
                                      {daysLeft === null ? "—" : `${daysLeft} يوم`}
                                    </td>
                                    <td>
                                      <span className={tone}>
                                        {expired ? "منتهي / موقوف" : daysLeft !== null && daysLeft <= 30 ? "قرب الانتهاء" : "نشط"}
                                      </span>
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
                                        onClick={() => void extendSubscription(subscription.school_id)}
                                      >
                                        <RefreshCw size={16} />
                                        تجديد
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </SectionCard>
                ) : null}

                {activeTab === "audit" ? <AuditLogTab infrastructure={infrastructure} /> : null}
                {activeTab === "roles" ? <RolesTab infrastructure={infrastructure} schools={schools.map((school) => ({ id: school.id, name: school.name }))} /> : null}
                {activeTab === "trash" ? <TrashTab infrastructure={infrastructure} /> : null}
                {activeTab === "notifications" ? <NotificationsTab infrastructure={infrastructure} /> : null}
                {activeTab === "monitoring" ? <MonitoringTab infrastructure={infrastructure} /> : null}
                {activeTab === "branches" ? <BranchesTab infrastructure={infrastructure} /> : null}
              </>
            )}
          </div>
        </main>
      </div>

      {showSchoolForm ? (
        <ModalFrame
          title={editSchool ? "تعديل المدرسة" : "إضافة مدرسة جديدة"}
          subtitle="جميع الحقول تحافظ على نفس هيكل البيانات الحالي في Supabase دون أي تعديل على المنطق."
          onClose={() => setShowSchoolForm(false)}
        >
          <form className="space-y-5" onSubmit={handleSaveSchool}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">اسم المدرسة *</label>
                <input
                  className="ui-input"
                  required
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">المدينة</label>
                <input
                  className="ui-input"
                  value={schoolForm.city}
                  onChange={(e) => setSchoolForm({ ...schoolForm, city: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الهاتف</label>
                <input
                  className="ui-input"
                  value={schoolForm.phone}
                  onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">بريد المدير</label>
                <input
                  type="email"
                  className="ui-input"
                  value={schoolForm.owner_email}
                  onChange={(e) => setSchoolForm({ ...schoolForm, owner_email: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">العنوان</label>
                <input
                  className="ui-input"
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الباقة</label>
                <select
                  className="ui-input"
                  value={schoolForm.plan}
                  onChange={(e) => setSchoolForm({ ...schoolForm, plan: e.target.value as SchoolPlan })}
                >
                  <option value="basic">أساسية</option>
                  <option value="premium">مميزة</option>
                  <option value="enterprise">مؤسسية</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="ui-button ui-button--secondary"
                onClick={() => setShowSchoolForm(false)}
              >
                إلغاء
              </button>
              <button type="submit" className="ui-button ui-button--primary" disabled={saving}>
                {saving ? "جارٍ الحفظ..." : editSchool ? "حفظ التعديلات" : "إضافة المدرسة"}
              </button>
            </div>
          </form>
        </ModalFrame>
      ) : null}

      {showUserForm ? (
        <ModalFrame
          title={editUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}
          subtitle="يمكنك ضبط صلاحيات مخصصة أو تركها فارغة ليتم استخدام الافتراضي المرتبط بالدور."
          onClose={() => setShowUserForm(false)}
        >
          <form className="space-y-5" onSubmit={handleSaveUser}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الاسم الكامل</label>
                <input
                  className="ui-input"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">البريد الإلكتروني</label>
                <input
                  className="ui-input"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  disabled={Boolean(editUser)}
                />
              </div>

              {!editUser ? (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">كلمة المرور</label>
                  <input
                    className="ui-input"
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="أدخل كلمة مرور المستخدم الجديد"
                  />
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الدور</label>
                <select
                  className="ui-input"
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as keyof typeof ROLE_LABELS })}
                >
                  <option value="super_admin">المدير العام</option>
                  <option value="admin">مدير مدرسة</option>
                  <option value="employee">موظف</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">المدرسة</label>
                <select
                  className="ui-input"
                  value={userForm.school_id}
                  onChange={(e) => setUserForm({ ...userForm, school_id: e.target.value })}
                >
                  <option value="">كل المدارس (المدير العام)</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-black text-[var(--text-primary)]">الحالة</label>
                <select
                  className="ui-input"
                  value={userForm.is_active ? "active" : "inactive"}
                  onChange={(e) => setUserForm({ ...userForm, is_active: e.target.value === "active" })}
                >
                  <option value="active">نشط</option>
                  <option value="inactive">موقوف</option>
                </select>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              <div className="mb-4 space-y-1">
                <h3 className="text-base font-black text-[var(--text-primary)]">الصلاحيات المخصصة</h3>
                <p className="text-sm leading-7 text-[var(--text-secondary)]">
                  {infrastructure.customPermissions
                    ? "عند ترك كل العناصر غير محددة سيتم اعتماد الصلاحيات الافتراضية للدور."
                    : "تم تعطيل الحفظ المخصص للصلاحيات لأن عمود custom_permissions غير موجود بعد في user_profiles."}
                </p>
              </div>

              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.title} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                    <div className="mb-3 text-sm font-black text-[var(--text-primary)]">{group.title}</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {group.permissions.map((permission) => {
                        const checked = userForm.permissions.includes(permission.key);

                        return (
                          <label
                            key={permission.key}
                            className={cx(
                              "flex items-center gap-3 rounded-[18px] border px-3 py-3 text-sm font-bold transition",
                              checked
                                ? "border-[rgba(79,140,255,0.22)] bg-[rgba(79,140,255,0.10)] text-[var(--text-primary)]"
                                : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!infrastructure.customPermissions}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setUserForm({
                                    ...userForm,
                                    permissions: [...userForm.permissions, permission.key],
                                  });
                                } else {
                                  setUserForm({
                                    ...userForm,
                                    permissions: userForm.permissions.filter((item) => item !== permission.key),
                                  });
                                }
                              }}
                            />
                            <span>{permission.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm font-bold text-[var(--text-secondary)]">
                {userForm.permissions.length === 0
                  ? "لا توجد صلاحيات مخصصة حالياً."
                  : `${userForm.permissions.length} صلاحيات محددة لهذا المستخدم.`}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="ui-button ui-button--secondary"
                onClick={() => setShowUserForm(false)}
              >
                إلغاء
              </button>
              <button type="submit" className="ui-button ui-button--primary" disabled={saving}>
                {saving ? "جارٍ الحفظ..." : editUser ? "حفظ التعديلات" : "إضافة المستخدم"}
              </button>
            </div>
          </form>
        </ModalFrame>
      ) : null}

      {deleteSchoolTarget ? (
        <ModalFrame
          title="تأكيد أرشفة المدرسة"
          subtitle="سيتم نقل المدرسة إلى سلة المهملات بدلاً من حذفها نهائياً عند توفر أعمدة soft delete."
          onClose={() => setDeleteSchoolTarget(null)}
        >
          <div className="space-y-5">
            <div className="rounded-[26px] border border-[rgba(240,90,90,0.18)] bg-[rgba(240,90,90,0.08)] px-4 py-4">
              <div className="mb-2 flex items-center gap-2 text-base font-black text-[var(--danger)]">
                <AlertTriangle size={18} />
                {deleteSchoolTarget.name}
              </div>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                يمكن استعادة المدرسة لاحقاً من سلة المهملات بعد تطبيق بنية الأرشفة الكاملة.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="ui-button ui-button--secondary"
                onClick={() => setDeleteSchoolTarget(null)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="ui-button ui-button--danger"
                onClick={() => void handleDeleteSchool()}
              >
                أرشفة المدرسة
              </button>
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {deleteUserTarget ? (
        <ModalFrame
          title="تأكيد أرشفة المستخدم"
          subtitle="سيتم نقل المستخدم إلى سلة المهملات وتعطيل حسابه داخل التطبيق."
          onClose={() => setDeleteUserTarget(null)}
        >
          <div className="space-y-5">
            <div className="rounded-[26px] border border-[rgba(240,90,90,0.18)] bg-[rgba(240,90,90,0.08)] px-4 py-4">
              <div className="mb-2 flex items-center gap-2 text-base font-black text-[var(--danger)]">
                <AlertTriangle size={18} />
                {deleteUserTarget.full_name || deleteUserTarget.email || "مستخدم"}
              </div>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                سيتم إخفاء المستخدم من القوائم النشطة مع إمكانية استعادته لاحقاً من سلة المهملات.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="ui-button ui-button--secondary"
                onClick={() => setDeleteUserTarget(null)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="ui-button ui-button--danger"
                onClick={() => void handleDeleteUser()}
              >
                أرشفة المستخدم
              </button>
            </div>
          </div>
        </ModalFrame>
      ) : null}
    </div>
  );
}
