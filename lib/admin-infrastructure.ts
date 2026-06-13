import type { PostgrestError } from "@supabase/supabase-js";

type ProbeResult = PromiseLike<{ error: PostgrestError | null }>;

type ProbeClient = {
  from: (table: string) => {
    select: (columns: string) => {
      limit: (count: number) => ProbeResult;
      is: (
        column: string,
        value: null,
      ) => {
        limit: (count: number) => ProbeResult;
      };
    };
  };
};

export interface AdminInfrastructure {
  branches: boolean;
  softDeleteSchools: boolean;
  softDeleteUsers: boolean;
  softDeleteBranches: boolean;
  customPermissions: boolean;
  customRoles: boolean;
  auditLogs: boolean;
  notifications: boolean;
  warnings: string[];
}

export const DEFAULT_ADMIN_INFRASTRUCTURE: AdminInfrastructure = {
  branches: false,
  softDeleteSchools: false,
  softDeleteUsers: false,
  softDeleteBranches: false,
  customPermissions: false,
  customRoles: false,
  auditLogs: false,
  notifications: false,
  warnings: [],
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : typeof error === "object" && error && "message" in error
    ? String((error as { message?: string }).message || "")
    : "";
}

function getErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: string }).code || "")
    : "";
}

export function isMissingTableError(error: unknown, tableName?: string) {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error);
  const normalizedTableName = tableName?.toLowerCase();

  const mentionsTable =
    !normalizedTableName ||
    message.includes(`public.${normalizedTableName}`) ||
    message.includes(`'${normalizedTableName}'`) ||
    message.includes(`"${normalizedTableName}"`) ||
    message.includes(normalizedTableName);

  return (
    mentionsTable &&
    (
      code === "PGRST205" ||
      code === "42P01" ||
      message.includes("could not find the table") ||
      message.includes("relation") && message.includes("does not exist")
    )
  );
}

export function isMissingColumnError(
  error: unknown,
  tableName?: string,
  columnName?: string,
) {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error);
  if (code !== "42703" && code !== "PGRST204") {
    return false;
  }

  if (!tableName && !columnName) {
    return true;
  }

  const parts = [tableName, columnName].filter(Boolean).map((part) => String(part).toLowerCase());
  return parts.every((part) => message.includes(String(part)));
}

export function isMissingRelationError(
  error: unknown,
  sourceTable?: string,
  relatedTable?: string,
) {
  const message = getErrorMessage(error).toLowerCase();
  const code = getErrorCode(error);
  const mentionsTables = [sourceTable, relatedTable]
    .filter(Boolean)
    .every((tableName) => message.includes(String(tableName).toLowerCase()));

  return (
    (!sourceTable && !relatedTable || mentionsTables) &&
    (
      code === "PGRST200" ||
      code === "PGRST201" ||
      message.includes("could not find a relationship between") ||
      message.includes("more than one relationship was found") ||
      (message.includes("relationship") && message.includes("schema cache"))
    )
  );
}

export function isInfrastructureCompatError(error: unknown) {
  return isMissingTableError(error) || isMissingColumnError(error) || isMissingRelationError(error);
}

export function getAdminInfrastructureNotice(infrastructure: AdminInfrastructure) {
  if (infrastructure.warnings.length === 0) {
    return "";
  }

  return `بيئة Supabase الحالية تعمل بوضع توافق لأن ${infrastructure.warnings.join("، ")}. شغّل ملف admin_infrastructure.sql ثم أعد تحميل الصفحة لتفعيل جميع ميزات المدير العام.`;
}

async function probe(
  action: () => ProbeResult,
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
    branchesTableError,
    branchSoftDeleteError,
    customPermissionsError,
    customRolesError,
    auditLogsError,
    notificationsError,
  ] = await Promise.all([
    probe(() => client.from("schools").select("id").is("deleted_at", null).limit(1)),
    probe(() => client.from("user_profiles").select("id").is("deleted_at", null).limit(1)),
    probe(() => client.from("branches").select("id").limit(1)),
    probe(() => client.from("branches").select("id").is("deleted_at", null).limit(1)),
    probe(() => client.from("user_profiles").select("id, custom_permissions").limit(1)),
    probe(() => client.from("custom_roles").select("id").limit(1)),
    probe(() => client.from("audit_logs").select("id").limit(1)),
    probe(() => client.from("notifications").select("id").limit(1)),
  ]);

  const branches = !isMissingTableError(branchesTableError, "branches");
  const infrastructure: AdminInfrastructure = {
    branches,
    softDeleteSchools:
      !isMissingTableError(schoolSoftDeleteError, "schools") &&
      !isMissingColumnError(schoolSoftDeleteError, "schools", "deleted_at"),
    softDeleteUsers:
      !isMissingTableError(userSoftDeleteError, "user_profiles") &&
      !isMissingColumnError(userSoftDeleteError, "user_profiles", "deleted_at"),
    softDeleteBranches:
      branches &&
      !isMissingTableError(branchSoftDeleteError, "branches") &&
      !isMissingColumnError(branchSoftDeleteError, "branches", "deleted_at"),
    customPermissions: !isMissingColumnError(customPermissionsError, "user_profiles", "custom_permissions"),
    customRoles: !isMissingTableError(customRolesError, "custom_roles"),
    auditLogs: !isMissingTableError(auditLogsError, "audit_logs"),
    notifications: !isMissingTableError(notificationsError, "notifications"),
    warnings: [],
  };

  const warnings: string[] = [];

  const softDeleteMissingTables = [
    !infrastructure.softDeleteSchools ? "schools" : null,
    !infrastructure.softDeleteUsers ? "user_profiles" : null,
    infrastructure.branches && !infrastructure.softDeleteBranches ? "branches" : null,
  ].filter(Boolean);

  if (softDeleteMissingTables.length > 0) {
    warnings.push(
      `أعمدة الأرشفة (\`deleted_at\` / \`deleted_by\`) غير مطبقة على: ${softDeleteMissingTables.join("، ")}`,
    );
  }

  if (!infrastructure.branches) {
    warnings.push("جدول `branches` غير موجود");
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

  if (!infrastructure.notifications) {
    warnings.push("جدول `notifications` غير موجود");
  }

  infrastructure.warnings = warnings;
  return infrastructure;
}
