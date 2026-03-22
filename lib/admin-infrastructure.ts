import type { PostgrestError } from "@supabase/supabase-js";

type ProbeClient = {
  from: (table: string) => any;
};

export interface AdminInfrastructure {
  softDeleteSchools: boolean;
  softDeleteUsers: boolean;
  softDeleteBranches: boolean;
  customPermissions: boolean;
  customRoles: boolean;
  auditLogs: boolean;
  systemSettings: boolean;
  notifications: boolean;
  academicYears: boolean;
  warnings: string[];
}

export const DEFAULT_ADMIN_INFRASTRUCTURE: AdminInfrastructure = {
  softDeleteSchools: true,
  softDeleteUsers: true,
  softDeleteBranches: true,
  customPermissions: true,
  customRoles: true,
  auditLogs: true,
  systemSettings: true,
  notifications: true,
  academicYears: true,
  warnings: [],
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : typeof error === "object" && error && "message" in error
    ? String((error as { message?: string }).message || "")
    : "";
}

export function isMissingTableError(error: unknown, tableName?: string) {
  const message = getErrorMessage(error);
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "PGRST205" &&
    (!tableName || message.includes(`public.${tableName}`) || message.includes(`'${tableName}'`))
  );
}

export function isMissingColumnError(
  error: unknown,
  tableName?: string,
  columnName?: string,
) {
  const message = getErrorMessage(error);
  if (!(typeof error === "object" && error !== null && "code" in error)) {
    return false;
  }

  if ((error as { code?: string }).code !== "42703") {
    return false;
  }

  if (!tableName && !columnName) {
    return true;
  }

  const parts = [tableName, columnName].filter(Boolean);
  return parts.every((part) => message.includes(String(part)));
}

export function isInfrastructureCompatError(error: unknown) {
  return isMissingTableError(error) || isMissingColumnError(error);
}

export function getAdminInfrastructureNotice(infrastructure: AdminInfrastructure) {
  if (infrastructure.warnings.length === 0) {
    return "";
  }

  return `بيئة Supabase الحالية تعمل بوضع توافق لأن ${infrastructure.warnings.join("، ")}. شغّل ملف admin_infrastructure.sql ثم أعد تحميل الصفحة لتفعيل جميع ميزات المدير العام.`;
}

async function probe(
  action: () => Promise<{ error: PostgrestError | null }>,
) {
  try {
    const { error } = await action();
    return error;
  } catch (error) {
    return error as PostgrestError;
  }
}

export async function detectAdminInfrastructure(client: ProbeClient): Promise<AdminInfrastructure> {
  const [
    schoolSoftDeleteError,
    userSoftDeleteError,
    branchSoftDeleteError,
    customPermissionsError,
    customRolesError,
    auditLogsError,
    settingsError,
    notificationsError,
    academicYearsError,
  ] = await Promise.all([
    probe(() => client.from("schools").select("id").is("deleted_at", null).limit(1)),
    probe(() => client.from("user_profiles").select("id").is("deleted_at", null).limit(1)),
    probe(() => client.from("branches").select("id").is("deleted_at", null).limit(1)),
    probe(() => client.from("user_profiles").select("id, custom_permissions").limit(1)),
    probe(() => client.from("custom_roles").select("id").limit(1)),
    probe(() => client.from("audit_logs").select("id").limit(1)),
    probe(() => client.from("system_settings").select("id").limit(1)),
    probe(() => client.from("notifications").select("id").limit(1)),
    probe(() => client.from("academic_years").select("id").limit(1)),
  ]);

  const infrastructure: AdminInfrastructure = {
    softDeleteSchools: !isMissingColumnError(schoolSoftDeleteError, "schools", "deleted_at"),
    softDeleteUsers: !isMissingColumnError(userSoftDeleteError, "user_profiles", "deleted_at"),
    softDeleteBranches: !isMissingColumnError(branchSoftDeleteError, "branches", "deleted_at"),
    customPermissions: !isMissingColumnError(customPermissionsError, "user_profiles", "custom_permissions"),
    customRoles: !isMissingTableError(customRolesError, "custom_roles"),
    auditLogs: !isMissingTableError(auditLogsError, "audit_logs"),
    systemSettings: !isMissingTableError(settingsError, "system_settings"),
    notifications: !isMissingTableError(notificationsError, "notifications"),
    academicYears: !isMissingTableError(academicYearsError, "academic_years"),
    warnings: [],
  };

  const warnings: string[] = [];

  if (!infrastructure.softDeleteSchools || !infrastructure.softDeleteUsers || !infrastructure.softDeleteBranches) {
    warnings.push("أعمدة الأرشفة (`deleted_at` / `deleted_by`) غير مطبقة على كل الجداول المطلوبة");
  }

  if (!infrastructure.customPermissions) {
    warnings.push("عمود `custom_permissions` غير موجود في `user_profiles`");
  }

  if (!infrastructure.customRoles) {
    warnings.push("جدول `custom_roles` غير موجود");
  }

  if (!infrastructure.auditLogs) {
    warnings.push("جدول `audit_logs` غير موجود");
  }

  if (!infrastructure.systemSettings) {
    warnings.push("جدول `system_settings` غير موجود");
  }

  if (!infrastructure.notifications) {
    warnings.push("جدول `notifications` غير موجود");
  }

  if (!infrastructure.academicYears) {
    warnings.push("جدول `academic_years` غير موجود");
  }

  infrastructure.warnings = warnings;
  return infrastructure;
}
