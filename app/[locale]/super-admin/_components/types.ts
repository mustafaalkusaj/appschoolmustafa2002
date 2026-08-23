
import type { Permission } from "@/lib/auth";

export type ActiveTab =
  | "overview"
  | "schools"
  | "users"
  | "subscriptions"
  | "student-counts"
  | "audit"
  | "roles"
  | "trash"
  | "notifications"
  | "monitoring"
  | "branches"
  | "analytics"
  | "bulk"
  | "activity"
  | "payment-archives"
  | "apps"
  | "themes"
  | "features"
  | "global-settings"
  | "app-versions"
  | "transport-managers";

export type SchoolPlan = "basic" | "premium" | "enterprise";
export type SubscriptionStatus = "active" | "suspended" | "inactive" | "expired";

export type SchoolRelation = { name: string | null } | Array<{ name: string | null }> | null;

export interface SchoolRecord {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  owner_email: string | null;
  city: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  plan: SchoolPlan;
  is_active: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at?: string | null;
}

export interface UserRecord {
  id: string;
  full_name: string | null;
  job_title: string | null;
  email: string | null;
  role: "super_admin" | "admin" | "employee";
  school_id: string | null;
  branch_id: string | null;
  default_branch_id: string | null;
  phone: string | null;
  is_active: boolean;
  custom_permissions: Permission[] | null;
  scope_level: "super_admin" | "group_admin" | "branch_user" | "restricted" | null;
  allowed_module: string | null;
  is_single_page_user: boolean;
  hierarchy_level: number | null;
  permissions_version: number;
  allowed_pages: string[];
  schools?: SchoolRelation;
  created_at?: string | null;
}

export interface BranchOptionRecord {
  id: string;
  school_id: string;
  name: string;
  is_active: boolean;
  primary_color?: string | null;
  secondary_color?: string | null;
  sidebar_color?: string | null;
  accent_color?: string | null;
  text_color?: string | null;
  font_family?: string | null;
  topbar_color?: string | null;
  receipt_footer_text?: string | null;
  card_bg_url?: string | null;
  short_name?: string | null;
  schools?: SchoolRelation;
  created_at?: string | null;
}

export interface SubscriptionRecord {
  id: string;
  school_id: string;
  plan: SchoolPlan;
  status: SubscriptionStatus;
  start_date: string | null;
  end_date: string | null;
  schools?: SchoolRelation;
  created_at?: string | null;
}

export type OverviewDatasetStatus = "loaded" | "fallback" | "failed";

export interface OverviewDiagnostics {
  generatedAt: string;
  warnings: string[];
  schoolsStatus: OverviewDatasetStatus;
  usersStatus: OverviewDatasetStatus;
  subscriptionsStatus: OverviewDatasetStatus;
}

export type SpotlightFilter =
  | "inactive_schools"
  | "expiring_subscriptions"
  | "orphan_users"
  | "missing_branding";

export interface TabItem {
  id: ActiveTab;
  label: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const PLAN_LABELS: Record<SchoolPlan, string> = {
  basic: "أساسية",
  premium: "مميزة",
  enterprise: "مؤسسية",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "نشط",
  suspended: "موقوف",
  inactive: "غير نشط",
  expired: "منتهي",
};

export const DEFAULT_SCHOOL_BRANDING = {
  primary_color: "#4f8cff",
  secondary_color: "#79d7ff",
  sidebar_color: "#dceeff",
  accent_color: "#3e7df7",
  text_color: "#12304a",
};

export const DAY_IN_MS = 24 * 60 * 60 * 1000;

// --- App Management Types ---

export type AppPublishStatus = "draft" | "in_review" | "published" | "rejected" | "suspended";
export type LoginStyle = "default" | "minimal" | "branded" | "fullscreen";
export type AppPlatform = "ios" | "android" | "both";
export type SettingsCategory = "general" | "security" | "notifications" | "appearance" | "billing" | "maintenance";
export type SettingsValueType = "string" | "number" | "boolean" | "json";

export interface SchoolAppRecord {
  id: string;
  school_id: string;
  app_name: string;
  bundle_id_ios: string | null;
  package_name_android: string | null;
  ios_status: AppPublishStatus;
  android_status: AppPublishStatus;
  app_store_url: string | null;
  play_store_url: string | null;
  current_version: string;
  min_version: string;
  force_update: boolean;
  app_icon_url: string | null;
  splash_image_url: string | null;
  custom_login_background: string | null;
  login_style: LoginStyle;
  push_certificate_ios: string | null;
  fcm_key_android: string | null;
  download_count_ios: number;
  download_count_android: number;
  last_published_at: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  schools?: SchoolRelation;
}

export interface SchoolFeatureFlagRecord {
  id: string;
  school_id: string;
  feature_key: string;
  is_enabled: boolean;
  config_json: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface SchoolAppVersionRecord {
  id: string;
  school_id: string;
  version: string;
  platform: AppPlatform;
  changelog: string | null;
  build_number: string | null;
  is_mandatory: boolean;
  published_at: string | null;
  published_by: string | null;
  created_at: string | null;
  schools?: SchoolRelation;
}

export interface GlobalSettingRecord {
  id: string;
  key: string;
  value: string | null;
  category: SettingsCategory;
  description: string | null;
  value_type: SettingsValueType;
  updated_by: string | null;
  updated_at: string | null;
  created_at: string | null;
}

export const APP_STATUS_LABELS: Record<AppPublishStatus, string> = {
  draft: "مسودة",
  in_review: "قيد المراجعة",
  published: "منشور",
  rejected: "مرفوض",
  suspended: "موقوف",
};

export const APP_STATUS_COLORS: Record<AppPublishStatus, string> = {
  draft: "text-[var(--text-muted)] bg-[var(--surface-muted)]",
  in_review: "text-amber-700 bg-amber-50",
  published: "text-emerald-700 bg-emerald-50",
  rejected: "text-red-700 bg-red-50",
  suspended: "text-orange-700 bg-orange-50",
};

export const FEATURE_FLAG_LABELS: Record<string, string> = {
  enable_attendance: "نظام الحضور",
  enable_payments: "المدفوعات",
  enable_salaries: "الرواتب",
  enable_reports: "التقارير",
  enable_expenses: "المصاريف",
  enable_parent_portal: "بوابة أولياء الأمور",
  enable_teacher_portal: "بوابة المعلمين",
  enable_notifications: "إشعارات Push",
  enable_sms: "رسائل SMS",
  enable_whatsapp: "تكامل واتساب",
  enable_online_payment: "دفع إلكتروني",
  enable_qr_attendance: "حضور QR",
  enable_academic_records: "السجلات الأكاديمية",
  enable_fee_notifications: "إشعارات الرسوم",
  max_branches: "فروع متعددة",
  max_users: "مستخدمون متعددون",
};

export const SETTINGS_CATEGORY_LABELS: Record<SettingsCategory, string> = {
  general: "عام",
  security: "الأمان",
  notifications: "الإشعارات",
  appearance: "المظهر",
  billing: "الفوترة",
  maintenance: "الصيانة",
};
