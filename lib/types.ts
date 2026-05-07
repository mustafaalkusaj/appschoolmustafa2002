export type BuiltInRole = "super_admin" | "admin" | "employee" | "teacher";
export type Role = string;
export type Language = "ar" | "en";
export type AuthErrorCode =
  | "missing_user_id"
  | "user_not_found"
  | "user_blocked"
  | "subscription_inactive"
  | "invalid_request"
  | "login_failed";

export type Permission =
  | "view_students"
  | "add_students"
  | "edit_students"
  | "delete_students"
  | "view_payments"
  | "add_payments"
  | "delete_payments"
  | "view_salaries"
  | "manage_salaries"
  | "manage_schools"
  | "manage_subscriptions"
  | "full_access";

export type PermissionGroup = "students" | "payments" | "salaries" | "schools" | "subscriptions" | "system";
export type UserStatus = "active" | "blocked";
export type SchoolStatus = "active" | "suspended";
export type SubscriptionPlan = "monthly" | "yearly";

export interface AdminRole {
  id: string;
  key: Role;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  schoolId: string | null;
  status: UserStatus;
  createdAt: string;
  deletedAt: string | null;
}

export interface SchoolSubscription {
  id: string;
  schoolId: string;
  plan: SubscriptionPlan;
  startedAt: string;
  expiresAt: string;
  amount: number;
  deletedAt: string | null;
}

export interface School {
  id: string;
  name: string;
  code: string;
  status: SchoolStatus;
  studentCount: number;
  monthlyRevenue: number;
  createdAt: string;
  deletedAt: string | null;
  subscription: SchoolSubscription;
}

export type NotificationType = "subscription" | "user" | "system";
export type NotificationCode =
  | "subscription_expired"
  | "subscription_ending_soon"
  | "user_onboarded"
  | "system_warning"
  | "activation_blocked"
  | "school_created"
  | "user_created";

export interface SystemNotification {
  id: string;
  type: NotificationType;
  code: NotificationCode;
  data?: Record<string, number | string | null>;
  schoolId: string | null;
  createdAt: string;
  read: boolean;
  deletedAt: string | null;
}

export type AuditEntity = "school" | "student" | "payment" | "user" | "subscription" | "system";
export type AuditAction =
  | "created_school"
  | "updated_school"
  | "archived_school"
  | "restored_school"
  | "deleted_student"
  | "recorded_payment"
  | "changed_system_settings"
  | "activated_school"
  | "suspended_school"
  | "created_role"
  | "updated_role"
  | "archived_role"
  | "restored_role"
  | "created_user"
  | "updated_user"
  | "deleted_user"
  | "archived_user"
  | "restored_user"
  | "blocked_user"
  | "unblocked_user"
  | "updated_system_settings";

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  createdAt: string;
  metadata?: Record<string, number | string | null>;
}

export interface SystemSettings {
  id: string;
  systemName: string;
  logoUrl: string;
  timezone: string;
  currency: string;
  allowSelfRegistration: boolean;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permission[];
  schoolId: string | null;
  status: UserStatus;
  schoolStatus: SchoolStatus | null;
  subscriptionExpiresAt: string | null;
}

export interface GlobalStats {
  totalSchools: number;
  totalUsers: number;
  totalRevenue: number;
  expiredSubscriptions: number;
}

export interface MonthlyMetric {
  month: string;
  schools: number;
  revenue: number;
}

export interface TopSchoolMetric {
  school: string;
  revenue: number;
}

export interface SmartInsight {
  id: string;
  title: string;
  detail: string;
  trend: "up" | "down" | "neutral";
}

export interface SuperAdminSnapshot {
  roles: AdminRole[];
  schools: School[];
  users: AppUser[];
  notifications: SystemNotification[];
  auditLogs: AuditLogEntry[];
  settings: SystemSettings;
  source: "mock" | "supabase";
}
