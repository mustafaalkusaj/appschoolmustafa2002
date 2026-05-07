import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ADMIN_TABLES, DEFAULT_ROLE_DEFINITIONS, normalizeRoleKey } from "@/lib/admin-schema";
import { normalizePermissions } from "@/lib/permissions";
import { getAdminSeed } from "@/lib/mock-data";
import { isSubscriptionExpired } from "@/lib/saas";
import type {
  AdminRole,
  AppUser,
  AuditLogEntry,
  Permission,
  Role,
  School,
  SchoolSubscription,
  SessionUser,
  SuperAdminSnapshot,
  SystemNotification,
  SystemSettings,
} from "@/lib/types";

interface ActorContext {
  id: string;
  name: string;
}

interface RoleRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  permissions: string[] | null;
  is_system: boolean | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface SchoolRow {
  id: string;
  name: string;
  code: string;
  status: "active" | "suspended";
  student_count: number | null;
  monthly_revenue: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface SubscriptionRow {
  id: string;
  school_id: string;
  plan: "monthly" | "yearly";
  started_at: string;
  expires_at: string;
  amount: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role_key: string;
  permissions: string[] | null;
  school_id: string | null;
  status: "active" | "blocked";
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface NotificationRow {
  id: string;
  type: "subscription" | "user" | "system";
  code: SystemNotification["code"];
  data: Record<string, number | string | null> | null;
  school_id: string | null;
  read: boolean | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface AuditLogRow {
  id: string;
  actor_id: string;
  actor_name: string;
  action: AuditLogEntry["action"];
  entity: AuditLogEntry["entity"];
  entity_id: string;
  metadata: Record<string, number | string | null> | null;
  created_at: string;
  deleted_at: string | null;
}

interface SettingsRow {
  id: string;
  system_name: string;
  logo_url: string;
  timezone: string;
  currency: string;
  allow_self_registration: boolean;
  created_at: string;
  updated_at: string;
}

type MutableAdminState = Omit<SuperAdminSnapshot, "source">;

const seed = getAdminSeed();
const DEFAULT_SETTINGS = seed.settings;

let fallbackState: MutableAdminState | null = null;
let supabaseClient: SupabaseClient | null = null;

function nowIso() {
  return new Date().toISOString();
}

function getFallbackState(): MutableAdminState {
  if (!fallbackState) {
    const nextSeed = getAdminSeed();
    fallbackState = {
      roles: nextSeed.roles,
      schools: nextSeed.schools,
      users: nextSeed.users,
      notifications: nextSeed.notifications,
      auditLogs: nextSeed.auditLogs,
      settings: nextSeed.settings,
    };
  }

  return fallbackState;
}

function cloneFallbackSnapshot(): SuperAdminSnapshot {
  return {
    ...structuredClone(getFallbackState()),
    source: "mock",
  };
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  return { url, key };
}

function getSupabase(): SupabaseClient | null {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

function sortByDateDesc<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function sortSoftDeletedLast<T extends { deletedAt: string | null; createdAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    if (left.deletedAt && !right.deletedAt) {
      return 1;
    }
    if (!left.deletedAt && right.deletedAt) {
      return -1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function buildDefaultSubscription(schoolId: string, createdAt: string): SchoolSubscription {
  const expiresAt = new Date(createdAt);
  expiresAt.setDate(expiresAt.getDate() + 30);

  return {
    id: `sub-${schoolId}`,
    schoolId,
    plan: "monthly",
    startedAt: createdAt,
    expiresAt: expiresAt.toISOString(),
    amount: 0,
    deletedAt: null,
  };
}

function mapRoleRow(row: RoleRow): AdminRole {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description ?? "",
    permissions: normalizePermissions((row.permissions ?? []) as Permission[]),
    isSystem: Boolean(row.is_system),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapSubscriptionRow(row: SubscriptionRow): SchoolSubscription {
  return {
    id: row.id,
    schoolId: row.school_id,
    plan: row.plan,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    amount: Number(row.amount ?? 0),
    deletedAt: row.deleted_at,
  };
}

function mapSchoolRow(row: SchoolRow, subscription?: SubscriptionRow): School {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    status: row.status,
    studentCount: Number(row.student_count ?? 0),
    monthlyRevenue: Number(row.monthly_revenue ?? 0),
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    subscription: subscription ? mapSubscriptionRow(subscription) : buildDefaultSubscription(row.id, row.created_at),
  };
}

function mapUserRow(row: UserRow): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role_key,
    permissions: normalizePermissions((row.permissions ?? []) as Permission[]),
    schoolId: row.school_id,
    status: row.status,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function mapNotificationRow(row: NotificationRow): SystemNotification {
  return {
    id: row.id,
    type: row.type,
    code: row.code,
    data: row.data ?? undefined,
    schoolId: row.school_id,
    createdAt: row.created_at,
    read: Boolean(row.read),
    deletedAt: row.deleted_at,
  };
}

function mapAuditLogRow(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    createdAt: row.created_at,
    metadata: row.metadata ?? undefined,
  };
}

function mapSettingsRow(row?: SettingsRow | null): SystemSettings {
  if (!row) {
    return DEFAULT_SETTINGS;
  }

  return {
    id: row.id,
    systemName: row.system_name,
    logoUrl: row.logo_url,
    timezone: row.timezone,
    currency: row.currency,
    allowSelfRegistration: row.allow_self_registration,
    updatedAt: row.updated_at,
  };
}

async function ensureSupabaseDefaults(supabase: SupabaseClient) {
  const rolesResult = await supabase.from(ADMIN_TABLES.roles).select("key");
  if (rolesResult.error) {
    throw rolesResult.error;
  }

  const existingKeys = new Set((rolesResult.data ?? []).map((row) => String(row.key)));
  const missingRoles = DEFAULT_ROLE_DEFINITIONS.filter((definition) => !existingKeys.has(definition.key));

  if (missingRoles.length > 0) {
    const now = nowIso();
    const insertResult = await supabase.from(ADMIN_TABLES.roles).insert(
      missingRoles.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        is_system: role.isSystem,
        created_at: now,
        updated_at: now,
      })),
    );

    if (insertResult.error) {
      throw insertResult.error;
    }
  }

  const settingsResult = await supabase.from(ADMIN_TABLES.settings).select("id").limit(1);
  if (settingsResult.error) {
    throw settingsResult.error;
  }

  if ((settingsResult.data ?? []).length === 0) {
    const insertSettings = await supabase.from(ADMIN_TABLES.settings).insert({
      id: DEFAULT_SETTINGS.id,
      system_name: DEFAULT_SETTINGS.systemName,
      logo_url: DEFAULT_SETTINGS.logoUrl,
      timezone: DEFAULT_SETTINGS.timezone,
      currency: DEFAULT_SETTINGS.currency,
      allow_self_registration: DEFAULT_SETTINGS.allowSelfRegistration,
      created_at: DEFAULT_SETTINGS.updatedAt,
      updated_at: DEFAULT_SETTINGS.updatedAt,
    });

    if (insertSettings.error) {
      throw insertSettings.error;
    }
  }
}

async function readSupabaseState(): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();
  if (!supabase) {
    return cloneFallbackSnapshot();
  }

  await ensureSupabaseDefaults(supabase);

  const [rolesResult, schoolsResult, subscriptionsResult, usersResult, notificationsResult, auditLogsResult, settingsResult] =
    await Promise.all([
      supabase.from(ADMIN_TABLES.roles).select("*").order("created_at", { ascending: false }),
      supabase.from(ADMIN_TABLES.schools).select("*").order("created_at", { ascending: false }),
      supabase
        .from(ADMIN_TABLES.subscriptions)
        .select("*")
        .order("started_at", { ascending: false }),
      supabase.from(ADMIN_TABLES.users).select("*").order("created_at", { ascending: false }),
      supabase.from(ADMIN_TABLES.notifications).select("*").order("created_at", { ascending: false }),
      supabase.from(ADMIN_TABLES.auditLogs).select("*").order("created_at", { ascending: false }),
      supabase.from(ADMIN_TABLES.settings).select("*").limit(1).maybeSingle(),
    ]);

  if (rolesResult.error) {
    throw rolesResult.error;
  }
  if (schoolsResult.error) {
    throw schoolsResult.error;
  }
  if (subscriptionsResult.error) {
    throw subscriptionsResult.error;
  }
  if (usersResult.error) {
    throw usersResult.error;
  }
  if (notificationsResult.error) {
    throw notificationsResult.error;
  }
  if (auditLogsResult.error) {
    throw auditLogsResult.error;
  }
  if (settingsResult.error) {
    throw settingsResult.error;
  }

  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[];
  const latestSubscriptionBySchool = new Map<string, SubscriptionRow>();
  for (const subscription of subscriptions) {
    if (!latestSubscriptionBySchool.has(subscription.school_id)) {
      latestSubscriptionBySchool.set(subscription.school_id, subscription);
    }
  }

  return {
    roles: sortSoftDeletedLast(((rolesResult.data ?? []) as RoleRow[]).map(mapRoleRow)),
    schools: sortSoftDeletedLast(
      ((schoolsResult.data ?? []) as SchoolRow[]).map((row) =>
        mapSchoolRow(row, latestSubscriptionBySchool.get(row.id)),
      ),
    ),
    users: sortSoftDeletedLast(((usersResult.data ?? []) as UserRow[]).map(mapUserRow)),
    notifications: sortByDateDesc(
      ((notificationsResult.data ?? []) as NotificationRow[])
        .filter((row) => !row.deleted_at)
        .map(mapNotificationRow),
    ),
    auditLogs: sortByDateDesc(
      ((auditLogsResult.data ?? []) as AuditLogRow[])
        .filter((row) => !row.deleted_at)
        .map(mapAuditLogRow),
    ),
    settings: mapSettingsRow(settingsResult.data as SettingsRow | null),
    source: "supabase",
  };
}

function getRoleFromState(state: MutableAdminState, roleKey: string) {
  return state.roles.find((role) => role.key === roleKey);
}

function buildSessionUser(snapshot: SuperAdminSnapshot, userId: string): SessionUser | null {
  const user = snapshot.users.find((entry) => entry.id === userId && !entry.deletedAt);
  if (!user) {
    return null;
  }

  const school = snapshot.schools.find((entry) => entry.id === user.schoolId && !entry.deletedAt) ?? null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: [...user.permissions],
    schoolId: user.schoolId,
    status: user.status,
    schoolStatus: school?.status ?? null,
    subscriptionExpiresAt: school?.subscription.expiresAt ?? null,
  };
}

export async function getSuperAdminSnapshot(): Promise<SuperAdminSnapshot> {
  return readSupabaseState();
}

export async function getDemoLoginUsers(): Promise<Array<SessionUser & { schoolName: string | null }>> {
  const snapshot = await getSuperAdminSnapshot();
  return snapshot.users
    .filter((user) => !user.deletedAt)
    .map((user) => {
      const school = snapshot.schools.find((item) => item.id === user.schoolId && !item.deletedAt) ?? null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: [...user.permissions],
        schoolId: user.schoolId,
        schoolStatus: school?.status ?? null,
        subscriptionExpiresAt: school?.subscription.expiresAt ?? null,
        status: user.status,
        schoolName: school?.name ?? null,
      };
    });
}

export async function findSessionUserById(userId: string): Promise<SessionUser | null> {
  const snapshot = await getSuperAdminSnapshot();
  return buildSessionUser(snapshot, userId);
}

function pushAuditToFallback(
  state: MutableAdminState,
  actor: ActorContext,
  entry: Omit<AuditLogEntry, "id" | "createdAt" | "actorId" | "actorName">,
) {
  state.auditLogs.unshift({
    ...entry,
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    actorId: actor.id,
    actorName: actor.name,
  });
}

function pushNotificationToFallback(
  state: MutableAdminState,
  notification: Omit<SystemNotification, "id" | "createdAt" | "read" | "deletedAt">,
) {
  state.notifications.unshift({
    ...notification,
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    read: false,
    deletedAt: null,
  });
}

async function pushAuditToSupabase(
  supabase: SupabaseClient,
  actor: ActorContext,
  entry: Omit<AuditLogEntry, "id" | "createdAt" | "actorId" | "actorName">,
) {
  const result = await supabase.from(ADMIN_TABLES.auditLogs).insert({
    id: crypto.randomUUID(),
    actor_id: actor.id,
    actor_name: actor.name,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    metadata: entry.metadata ?? null,
    created_at: nowIso(),
  });

  if (result.error) {
    throw result.error;
  }
}

async function pushNotificationToSupabase(
  supabase: SupabaseClient,
  notification: Omit<SystemNotification, "id" | "createdAt" | "read" | "deletedAt">,
) {
  const result = await supabase.from(ADMIN_TABLES.notifications).insert({
    id: crypto.randomUUID(),
    type: notification.type,
    code: notification.code,
    data: notification.data ?? null,
    school_id: notification.schoolId,
    read: false,
    created_at: nowIso(),
    updated_at: nowIso(),
  });

  if (result.error) {
    throw result.error;
  }
}

async function mutateFallback(
  mutator: (state: MutableAdminState) => void,
): Promise<SuperAdminSnapshot> {
  const state = getFallbackState();
  mutator(state);
  return cloneFallbackSnapshot();
}

function ensureFallbackRole(state: MutableAdminState, roleKey: string): AdminRole {
  const role = state.roles.find((entry) => entry.key === roleKey && !entry.deletedAt);
  if (!role) {
    throw new Error(`Role ${roleKey} was not found`);
  }

  return role;
}

function ensureFallbackSchool(state: MutableAdminState, schoolId: string): School {
  const school = state.schools.find((entry) => entry.id === schoolId);
  if (!school) {
    throw new Error(`School ${schoolId} was not found`);
  }

  return school;
}

function ensureFallbackUser(state: MutableAdminState, userId: string): AppUser {
  const user = state.users.find((entry) => entry.id === userId);
  if (!user) {
    throw new Error(`User ${userId} was not found`);
  }

  return user;
}

export async function createSchool(actor: ActorContext, input: {
  name: string;
  code: string;
  plan: "monthly" | "yearly";
  amount: number;
  expiresAt: string;
}): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();
  const createdAt = nowIso();
  const schoolId = crypto.randomUUID();
  const subscriptionId = crypto.randomUUID();

  if (!supabase) {
    return mutateFallback((state) => {
      const school: School = {
        id: schoolId,
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        status: "active",
        studentCount: 0,
        monthlyRevenue: 0,
        createdAt,
        deletedAt: null,
        subscription: {
          id: subscriptionId,
          schoolId,
          plan: input.plan,
          startedAt: createdAt,
          expiresAt: input.expiresAt,
          amount: input.amount,
          deletedAt: null,
        },
      };

      state.schools.unshift(school);
      pushAuditToFallback(state, actor, {
        action: "created_school",
        entity: "school",
        entityId: school.id,
      });
      pushNotificationToFallback(state, {
        type: "system",
        code: "school_created",
        data: { schoolName: school.name },
        schoolId: school.id,
      });
    });
  }

  const schoolInsert = await supabase.from(ADMIN_TABLES.schools).insert({
    id: schoolId,
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    status: "active",
    student_count: 0,
    monthly_revenue: 0,
    created_at: createdAt,
    updated_at: createdAt,
  });
  if (schoolInsert.error) {
    throw schoolInsert.error;
  }

  const subscriptionInsert = await supabase.from(ADMIN_TABLES.subscriptions).insert({
    id: subscriptionId,
    school_id: schoolId,
    plan: input.plan,
    started_at: createdAt,
    expires_at: input.expiresAt,
    amount: input.amount,
    created_at: createdAt,
    updated_at: createdAt,
  });
  if (subscriptionInsert.error) {
    throw subscriptionInsert.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "created_school",
    entity: "school",
    entityId: schoolId,
  });
  await pushNotificationToSupabase(supabase, {
    type: "system",
    code: "school_created",
    data: { schoolName: input.name.trim() },
    schoolId,
  });

  return getSuperAdminSnapshot();
}

export async function toggleSchoolStatus(actor: ActorContext, schoolId: string): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();

  if (!supabase) {
    return mutateFallback((state) => {
      const school = ensureFallbackSchool(state, schoolId);
      if (school.deletedAt) {
        return;
      }

      const nextStatus = school.status === "active" ? "suspended" : "active";
      if (nextStatus === "active" && isSubscriptionExpired(school.subscription.expiresAt)) {
        pushNotificationToFallback(state, {
          type: "subscription",
          code: "activation_blocked",
          data: { schoolName: school.name },
          schoolId: school.id,
        });
        school.status = "suspended";
        return;
      }

      school.status = nextStatus;
      pushAuditToFallback(state, actor, {
        action: nextStatus === "active" ? "activated_school" : "suspended_school",
        entity: "school",
        entityId: school.id,
      });
    });
  }

  const snapshot = await getSuperAdminSnapshot();
  const school = snapshot.schools.find((entry) => entry.id === schoolId);
  if (!school || school.deletedAt) {
    return snapshot;
  }

  const nextStatus = school.status === "active" ? "suspended" : "active";
  if (nextStatus === "active" && isSubscriptionExpired(school.subscription.expiresAt)) {
    await pushNotificationToSupabase(supabase, {
      type: "subscription",
      code: "activation_blocked",
      data: { schoolName: school.name },
      schoolId: school.id,
    });
    return getSuperAdminSnapshot();
  }

  const result = await supabase
    .from(ADMIN_TABLES.schools)
    .update({
      status: nextStatus,
      updated_at: nowIso(),
    })
    .eq("id", schoolId);

  if (result.error) {
    throw result.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: nextStatus === "active" ? "activated_school" : "suspended_school",
    entity: "school",
    entityId: schoolId,
  });

  return getSuperAdminSnapshot();
}

export async function archiveSchool(actor: ActorContext, schoolId: string): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();
  const deletedAt = nowIso();

  if (!supabase) {
    return mutateFallback((state) => {
      const school = ensureFallbackSchool(state, schoolId);
      if (school.deletedAt) {
        return;
      }

      school.deletedAt = deletedAt;
      school.subscription.deletedAt = deletedAt;
      state.users = state.users.map((user) =>
        user.schoolId === schoolId ? { ...user, deletedAt } : user,
      );
      pushAuditToFallback(state, actor, {
        action: "archived_school",
        entity: "school",
        entityId: schoolId,
      });
    });
  }

  const schoolUpdate = await supabase
    .from(ADMIN_TABLES.schools)
    .update({
      deleted_at: deletedAt,
      deleted_by: actor.id,
      updated_at: deletedAt,
    })
    .eq("id", schoolId)
    .is("deleted_at", null);

  if (schoolUpdate.error) {
    throw schoolUpdate.error;
  }

  const [subscriptionUpdate, usersUpdate] = await Promise.all([
    supabase
      .from(ADMIN_TABLES.subscriptions)
      .update({
        deleted_at: deletedAt,
        deleted_by: actor.id,
        updated_at: deletedAt,
      })
      .eq("school_id", schoolId)
      .is("deleted_at", null),
    supabase
      .from(ADMIN_TABLES.users)
      .update({
        deleted_at: deletedAt,
        deleted_by: actor.id,
        updated_at: deletedAt,
      })
      .eq("school_id", schoolId)
      .is("deleted_at", null),
  ]);

  if (subscriptionUpdate.error) {
    throw subscriptionUpdate.error;
  }
  if (usersUpdate.error) {
    throw usersUpdate.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "archived_school",
    entity: "school",
    entityId: schoolId,
  });

  return getSuperAdminSnapshot();
}

export async function restoreSchool(actor: ActorContext, schoolId: string): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();

  if (!supabase) {
    return mutateFallback((state) => {
      const school = ensureFallbackSchool(state, schoolId);
      school.deletedAt = null;
      school.subscription.deletedAt = null;
      state.users = state.users.map((user) =>
        user.schoolId === schoolId ? { ...user, deletedAt: null } : user,
      );
      pushAuditToFallback(state, actor, {
        action: "restored_school",
        entity: "school",
        entityId: schoolId,
      });
    });
  }

  const now = nowIso();
  const [schoolUpdate, subscriptionUpdate, usersUpdate] = await Promise.all([
    supabase
      .from(ADMIN_TABLES.schools)
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: now,
      })
      .eq("id", schoolId),
    supabase
      .from(ADMIN_TABLES.subscriptions)
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: now,
      })
      .eq("school_id", schoolId),
    supabase
      .from(ADMIN_TABLES.users)
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: now,
      })
      .eq("school_id", schoolId),
  ]);

  if (schoolUpdate.error) {
    throw schoolUpdate.error;
  }
  if (subscriptionUpdate.error) {
    throw subscriptionUpdate.error;
  }
  if (usersUpdate.error) {
    throw usersUpdate.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "restored_school",
    entity: "school",
    entityId: schoolId,
  });

  return getSuperAdminSnapshot();
}

export async function createRole(actor: ActorContext, input: {
  key: string;
  name: string;
  description: string;
  permissions: Permission[];
}): Promise<SuperAdminSnapshot> {
  const key = normalizeRoleKey(input.key);
  if (!key) {
    throw new Error("Role key is required");
  }

  const permissions = normalizePermissions(input.permissions);
  const createdAt = nowIso();
  const supabase = getSupabase();

  if (!supabase) {
    return mutateFallback((state) => {
      if (state.roles.some((role) => role.key === key)) {
        throw new Error(`Role ${key} already exists`);
      }

      state.roles.unshift({
        id: crypto.randomUUID(),
        key,
        name: input.name.trim(),
        description: input.description.trim(),
        permissions,
        isSystem: false,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
      });
      pushAuditToFallback(state, actor, {
        action: "created_role",
        entity: "system",
        entityId: key,
      });
    });
  }

  const result = await supabase.from(ADMIN_TABLES.roles).insert({
    id: crypto.randomUUID(),
    key,
    name: input.name.trim(),
    description: input.description.trim(),
    permissions,
    is_system: false,
    created_at: createdAt,
    updated_at: createdAt,
  });
  if (result.error) {
    throw result.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "created_role",
    entity: "system",
    entityId: key,
  });

  return getSuperAdminSnapshot();
}

export async function updateRole(actor: ActorContext, roleKey: string, input: {
  name: string;
  description: string;
  permissions: Permission[];
}): Promise<SuperAdminSnapshot> {
  const updatedAt = nowIso();
  const permissions = normalizePermissions(input.permissions);
  const supabase = getSupabase();

  if (!supabase) {
    return mutateFallback((state) => {
      state.roles = state.roles.map((role) =>
        role.key === roleKey
          ? {
              ...role,
              name: input.name.trim(),
              description: input.description.trim(),
              permissions,
              updatedAt,
            }
          : role,
      );
      pushAuditToFallback(state, actor, {
        action: "updated_role",
        entity: "system",
        entityId: roleKey,
      });
    });
  }

  const result = await supabase
    .from(ADMIN_TABLES.roles)
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
      permissions,
      updated_at: updatedAt,
    })
    .eq("key", roleKey);

  if (result.error) {
    throw result.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "updated_role",
    entity: "system",
    entityId: roleKey,
  });

  return getSuperAdminSnapshot();
}

export async function archiveRole(actor: ActorContext, roleKey: string): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();
  const deletedAt = nowIso();

  if (!supabase) {
    return mutateFallback((state) => {
      const role = ensureFallbackRole(state, roleKey);
      if (role.isSystem) {
        throw new Error("System roles cannot be archived");
      }
      if (state.users.some((user) => user.role === roleKey && !user.deletedAt)) {
        throw new Error("Reassign active users before archiving this role");
      }

      role.deletedAt = deletedAt;
      role.updatedAt = deletedAt;
      pushAuditToFallback(state, actor, {
        action: "archived_role",
        entity: "system",
        entityId: roleKey,
      });
    });
  }

  const usersUsingRole = await supabase
    .from(ADMIN_TABLES.users)
    .select("id", { count: "exact", head: true })
    .eq("role_key", roleKey)
    .is("deleted_at", null);

  if (usersUsingRole.error) {
    throw usersUsingRole.error;
  }
  if ((usersUsingRole.count ?? 0) > 0) {
    throw new Error("Reassign active users before archiving this role");
  }

  const roleResult = await supabase
    .from(ADMIN_TABLES.roles)
    .update({
      deleted_at: deletedAt,
      deleted_by: actor.id,
      updated_at: deletedAt,
    })
    .eq("key", roleKey)
    .eq("is_system", false);

  if (roleResult.error) {
    throw roleResult.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "archived_role",
    entity: "system",
    entityId: roleKey,
  });

  return getSuperAdminSnapshot();
}

export async function restoreRole(actor: ActorContext, roleKey: string): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();

  if (!supabase) {
    return mutateFallback((state) => {
      const role = getRoleFromState(state, roleKey);
      if (!role) {
        return;
      }

      role.deletedAt = null;
      role.updatedAt = nowIso();
      pushAuditToFallback(state, actor, {
        action: "restored_role",
        entity: "system",
        entityId: roleKey,
      });
    });
  }

  const updatedAt = nowIso();
  const result = await supabase
    .from(ADMIN_TABLES.roles)
    .update({
      deleted_at: null,
      deleted_by: null,
      updated_at: updatedAt,
    })
    .eq("key", roleKey);

  if (result.error) {
    throw result.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "restored_role",
    entity: "system",
    entityId: roleKey,
  });

  return getSuperAdminSnapshot();
}

export async function createUser(actor: ActorContext, input: {
  name: string;
  email: string;
  role: Role;
  schoolId: string | null;
  permissions: Permission[];
}): Promise<SuperAdminSnapshot> {
  const createdAt = nowIso();
  const userId = crypto.randomUUID();
  const supabase = getSupabase();

  if (!supabase) {
    return mutateFallback((state) => {
      const role = ensureFallbackRole(state, input.role);
      const schoolId = input.role === "super_admin" ? null : input.schoolId;
      if (schoolId) {
        const school = ensureFallbackSchool(state, schoolId);
        if (school.deletedAt) {
          throw new Error("Cannot assign an archived school");
        }
      }

      const permissions =
        input.permissions.length > 0 ? normalizePermissions(input.permissions) : role.permissions;

      const user: AppUser = {
        id: userId,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        permissions,
        schoolId,
        status: "active",
        createdAt,
        deletedAt: null,
      };

      state.users.unshift(user);
      pushAuditToFallback(state, actor, {
        action: "created_user",
        entity: "user",
        entityId: user.id,
      });
      pushNotificationToFallback(state, {
        type: "user",
        code: "user_created",
        data: { userName: user.name, role: user.role },
        schoolId: user.schoolId,
      });
    });
  }

  const snapshot = await getSuperAdminSnapshot();
  const role = snapshot.roles.find((entry) => entry.key === input.role && !entry.deletedAt);
  if (!role) {
    throw new Error(`Role ${input.role} was not found`);
  }

  const schoolId = input.role === "super_admin" ? null : input.schoolId;
  const permissions =
    input.permissions.length > 0 ? normalizePermissions(input.permissions) : role.permissions;

  const result = await supabase.from(ADMIN_TABLES.users).insert({
    id: userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role_key: input.role,
    permissions,
    school_id: schoolId,
    status: "active",
    created_at: createdAt,
    updated_at: createdAt,
  });

  if (result.error) {
    throw result.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "created_user",
    entity: "user",
    entityId: userId,
  });
  await pushNotificationToSupabase(supabase, {
    type: "user",
    code: "user_created",
    data: { userName: input.name.trim(), role: input.role },
    schoolId,
  });

  return getSuperAdminSnapshot();
}

export async function updateUser(actor: ActorContext, userId: string, input: {
  name: string;
  email: string;
  role: Role;
  schoolId: string | null;
  permissions: Permission[];
  status: "active" | "blocked";
}): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();
  const updatedAt = nowIso();

  if (!supabase) {
    return mutateFallback((state) => {
      ensureFallbackRole(state, input.role);
      state.users = state.users.map((user) =>
        user.id === userId
          ? {
              ...user,
              name: input.name.trim(),
              email: input.email.trim().toLowerCase(),
              role: input.role,
              permissions: normalizePermissions(input.permissions),
              schoolId: input.role === "super_admin" ? null : input.schoolId,
              status: input.status,
            }
          : user,
      );
      pushAuditToFallback(state, actor, {
        action: "updated_user",
        entity: "user",
        entityId: userId,
      });
    });
  }

  const result = await supabase
    .from(ADMIN_TABLES.users)
    .update({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role_key: input.role,
      permissions: normalizePermissions(input.permissions),
      school_id: input.role === "super_admin" ? null : input.schoolId,
      status: input.status,
      updated_at: updatedAt,
    })
    .eq("id", userId);

  if (result.error) {
    throw result.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "updated_user",
    entity: "user",
    entityId: userId,
  });

  return getSuperAdminSnapshot();
}

export async function archiveUser(actor: ActorContext, userId: string): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();
  const deletedAt = nowIso();

  if (!supabase) {
    return mutateFallback((state) => {
      const user = ensureFallbackUser(state, userId);
      user.deletedAt = deletedAt;
      pushAuditToFallback(state, actor, {
        action: "archived_user",
        entity: "user",
        entityId: userId,
      });
    });
  }

  const result = await supabase
    .from(ADMIN_TABLES.users)
    .update({
      deleted_at: deletedAt,
      deleted_by: actor.id,
      updated_at: deletedAt,
    })
    .eq("id", userId);

  if (result.error) {
    throw result.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "archived_user",
    entity: "user",
    entityId: userId,
  });

  return getSuperAdminSnapshot();
}

export async function restoreUser(actor: ActorContext, userId: string): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();
  const updatedAt = nowIso();

  if (!supabase) {
    return mutateFallback((state) => {
      const user = ensureFallbackUser(state, userId);
      user.deletedAt = null;
      pushAuditToFallback(state, actor, {
        action: "restored_user",
        entity: "user",
        entityId: userId,
      });
    });
  }

  const result = await supabase
    .from(ADMIN_TABLES.users)
    .update({
      deleted_at: null,
      deleted_by: null,
      updated_at: updatedAt,
    })
    .eq("id", userId);

  if (result.error) {
    throw result.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "restored_user",
    entity: "user",
    entityId: userId,
  });

  return getSuperAdminSnapshot();
}

export async function toggleUserStatus(actor: ActorContext, userId: string): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();

  if (!supabase) {
    return mutateFallback((state) => {
      const user = ensureFallbackUser(state, userId);
      if (user.deletedAt) {
        return;
      }

      user.status = user.status === "active" ? "blocked" : "active";
      pushAuditToFallback(state, actor, {
        action: user.status === "blocked" ? "blocked_user" : "unblocked_user",
        entity: "user",
        entityId: userId,
      });
    });
  }

  const snapshot = await getSuperAdminSnapshot();
  const user = snapshot.users.find((entry) => entry.id === userId && !entry.deletedAt);
  if (!user) {
    return snapshot;
  }

  const nextStatus = user.status === "active" ? "blocked" : "active";
  const result = await supabase
    .from(ADMIN_TABLES.users)
    .update({
      status: nextStatus,
      updated_at: nowIso(),
    })
    .eq("id", userId);

  if (result.error) {
    throw result.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: nextStatus === "blocked" ? "blocked_user" : "unblocked_user",
    entity: "user",
    entityId: userId,
  });

  return getSuperAdminSnapshot();
}

export async function applyRoleTemplate(actor: ActorContext, userId: string, roleKey: string): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();

  if (!supabase) {
    return mutateFallback((state) => {
      const role = ensureFallbackRole(state, roleKey);
      state.users = state.users.map((user) =>
        user.id === userId
          ? {
              ...user,
              role: role.key,
              permissions: [...role.permissions],
              schoolId: role.key === "super_admin" ? null : user.schoolId,
            }
          : user,
      );
      pushAuditToFallback(state, actor, {
        action: "updated_user",
        entity: "user",
        entityId: userId,
      });
    });
  }

  const snapshot = await getSuperAdminSnapshot();
  const role = snapshot.roles.find((entry) => entry.key === roleKey && !entry.deletedAt);
  if (!role) {
    throw new Error(`Role ${roleKey} was not found`);
  }

  const result = await supabase
    .from(ADMIN_TABLES.users)
    .update({
      role_key: role.key,
      permissions: role.permissions,
      school_id: role.key === "super_admin" ? null : snapshot.users.find((entry) => entry.id === userId)?.schoolId ?? null,
      updated_at: nowIso(),
    })
    .eq("id", userId);

  if (result.error) {
    throw result.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "updated_user",
    entity: "user",
    entityId: userId,
  });

  return getSuperAdminSnapshot();
}

export async function markNotificationRead(notificationId: string): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();

  if (!supabase) {
    return mutateFallback((state) => {
      state.notifications = state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification,
      );
    });
  }

  const result = await supabase
    .from(ADMIN_TABLES.notifications)
    .update({
      read: true,
      updated_at: nowIso(),
    })
    .eq("id", notificationId);

  if (result.error) {
    throw result.error;
  }

  return getSuperAdminSnapshot();
}

export async function updateSettings(actor: ActorContext, patch: Partial<SystemSettings>): Promise<SuperAdminSnapshot> {
  const supabase = getSupabase();
  const currentSettings = supabase ? (await getSuperAdminSnapshot()).settings : getFallbackState().settings;
  const nextPatch = {
    systemName: patch.systemName ?? currentSettings.systemName,
    logoUrl: patch.logoUrl ?? currentSettings.logoUrl,
    timezone: patch.timezone ?? currentSettings.timezone,
    currency: patch.currency ?? currentSettings.currency,
    allowSelfRegistration: patch.allowSelfRegistration ?? currentSettings.allowSelfRegistration,
  };
  const updatedAt = nowIso();

  if (!supabase) {
    return mutateFallback((state) => {
      state.settings = {
        ...state.settings,
        ...nextPatch,
        updatedAt,
      };
      pushAuditToFallback(state, actor, {
        action: "updated_system_settings",
        entity: "system",
        entityId: state.settings.id,
      });
    });
  }

  const result = await supabase
    .from(ADMIN_TABLES.settings)
    .upsert({
      id: DEFAULT_SETTINGS.id,
      system_name: nextPatch.systemName,
      logo_url: nextPatch.logoUrl,
      timezone: nextPatch.timezone,
      currency: nextPatch.currency,
      allow_self_registration: nextPatch.allowSelfRegistration,
      created_at: DEFAULT_SETTINGS.updatedAt,
      updated_at: updatedAt,
    })
    .select("*")
    .single();

  if (result.error) {
    throw result.error;
  }

  await pushAuditToSupabase(supabase, actor, {
    action: "updated_system_settings",
    entity: "system",
    entityId: result.data.id,
  });

  return getSuperAdminSnapshot();
}
