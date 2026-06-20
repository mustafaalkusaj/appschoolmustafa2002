import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

import { isMissingTableError } from "@/lib/admin-infrastructure";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { ManagedUserAppAccountSummary, ManagedUserRole } from "@/lib/managed-users";
import type {
  RouteSupabaseClient,
  CredentialRow,
} from "./types";
import {
  AUTH_CREDENTIAL_CACHE_TTL_MS,
  authCredentialCache,
  authCredentialPending,
} from "./cache";

// Utility functions
function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeNullableTimestamp(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function randomFragment(length = 6) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  return result;
}

function slugifyIdentifier(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Password generation and hashing
export function generateTemporaryPassword() {
  // 8-char: A + b + 4 digits + ! — simple, meets Supabase policy (upper+lower+digit+special)
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const bytes = randomBytes(8);
  const pick = (charset: string, byte: number) => charset[byte % charset.length];
  return (
    pick(upper, bytes[0]) +
    pick(lower, bytes[1]) +
    pick(digits, bytes[2]) +
    pick(digits, bytes[3]) +
    pick(digits, bytes[4]) +
    pick(digits, bytes[5]) +
    pick(digits, bytes[6]) +
    "!"
  );
}

const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): boolean {
  // Support legacy sha256 hashes during migration window
  // sha256 hashes are 64-char hex strings; bcrypt hashes start with $2b$
  if (hash.startsWith("$2b$") || hash.startsWith("$2a$")) {
    return bcrypt.compareSync(password, hash);
  }
  // Legacy sha256 — constant-time comparison to avoid timing attacks
  const { createHash, timingSafeEqual } = require("crypto") as typeof import("crypto");
  const inputHash = createHash("sha256").update(password).digest();
  const storedHash = Buffer.from(hash, "hex");
  if (inputHash.length !== storedHash.length) return false;
  return timingSafeEqual(inputHash, storedHash);
}

// Credential conversion
function toCredentialSummary(row: CredentialRow): ManagedUserAppAccountSummary {
  return {
    login_identifier: row.login_identifier,
    has_temporary_password: Boolean(row.temporary_password_hash),
    temporary_password_plain: row.temporary_password_plain ?? null,
    password_last_reset_at: row.password_last_reset_at,
    card_last_printed_at: row.card_last_printed_at,
  };
}

function toAuthCredentialRow(authUserId: string, user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown>; email?: string } | null | undefined) {
  if (!user) {
    return null;
  }

  const appMetadata = asObject(user.app_metadata);
  const userMetadata = asObject(user.user_metadata);
  const managedCredentials = asObject(appMetadata.managed_credentials ?? userMetadata.managed_credentials);
  const loginIdentifier =
    nullableText(managedCredentials.login_identifier) ??
    nullableText(userMetadata.loginIdentifier) ??
    nullableText(user.email);

  if (!loginIdentifier) {
    return null;
  }

  return {
    auth_user_id: authUserId,
    login_identifier: loginIdentifier,
    temporary_password_hash: nullableText(managedCredentials.temporary_password_hash),
    temporary_password_plain: nullableText(managedCredentials.temporary_password_plain),
    has_pending_setup: Boolean(managedCredentials.has_pending_setup),
    password_last_reset_at: normalizeNullableTimestamp(managedCredentials.password_last_reset_at),
    card_last_printed_at: normalizeNullableTimestamp(managedCredentials.card_last_printed_at),
  } satisfies CredentialRow;
}

// Cache management
function writeAuthCredentialCache(authUserId: string, row: CredentialRow | null) {
  authCredentialCache.set(authUserId, {
    value: row,
    expiresAt: Date.now() + AUTH_CREDENTIAL_CACHE_TTL_MS,
  });
}

function invalidateAuthCredentialCache(authUserId: string) {
  authCredentialCache.delete(authUserId);
  authCredentialPending.delete(authUserId);
}

// Fetch credentials from auth metadata
async function fetchManagedUserCredentialFromAuthMetadata(authUserId: string) {
  const now = Date.now();
  const cached = authCredentialCache.get(authUserId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const pending = authCredentialPending.get(authUserId);
  if (pending) {
    return pending;
  }

  const nextLookup = (async () => {
    const serviceSupabase = createServiceSupabaseClient();
    const response = await serviceSupabase.auth.admin.getUserById(authUserId);
    const row =
      response.error || !response.data.user
        ? null
        : toAuthCredentialRow(authUserId, response.data.user);

    writeAuthCredentialCache(authUserId, row);
    return row;
  })();

  authCredentialPending.set(authUserId, nextLookup);

  try {
    return await nextLookup;
  } finally {
    authCredentialPending.delete(authUserId);
  }
}

async function fetchManagedUserCredentialsFromAuthMetadata(authUserIds: string[]) {
  const uniqueIds = Array.from(new Set(authUserIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, CredentialRow>();
  }

  const rows = (await Promise.all(uniqueIds.map((authUserId) => fetchManagedUserCredentialFromAuthMetadata(authUserId))))
    .filter((row): row is CredentialRow => Boolean(row));

  return new Map<string, CredentialRow>(rows.map((row) => [row.auth_user_id, row]));
}

// Patch credential metadata
async function patchManagedCredentialMetadata(
  authUserId: string,
  patch: {
    login_identifier?: string;
    temporary_password_hash?: string | null;
    temporary_password_plain?: string | null;
    has_pending_setup?: boolean;
    password_last_reset_at?: string | null;
    card_last_printed_at?: string | null;
  },
) {
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase.auth.admin.getUserById(authUserId);
  if (error || !data.user) {
    throw error ?? new Error("تعذر تحميل حساب المصادقة لتحديث بيانات الدخول.");
  }

  const existingAppMetadata = asObject(data.user.app_metadata);
  const existingManagedCredentials = asObject(existingAppMetadata.managed_credentials);
  const nextManagedCredentials: Record<string, unknown> = {
    ...existingManagedCredentials,
    ...(patch.login_identifier !== undefined ? { login_identifier: patch.login_identifier } : {}),
    ...(patch.temporary_password_hash !== undefined ? { temporary_password_hash: patch.temporary_password_hash } : {}),
    ...(patch.temporary_password_plain !== undefined ? { temporary_password_plain: patch.temporary_password_plain } : {}),
    ...(patch.has_pending_setup !== undefined ? { has_pending_setup: patch.has_pending_setup } : {}),
    ...(patch.password_last_reset_at !== undefined ? { password_last_reset_at: patch.password_last_reset_at } : {}),
    ...(patch.card_last_printed_at !== undefined ? { card_last_printed_at: patch.card_last_printed_at } : {}),
  };

  if (!nullableText(nextManagedCredentials.login_identifier) && data.user.email) {
    nextManagedCredentials.login_identifier = data.user.email;
  }

  const existingUserMetadata = asObject(data.user.user_metadata);
  const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
    app_metadata: {
      ...existingAppMetadata,
      managed_credentials: nextManagedCredentials,
    },
    user_metadata: {
      ...existingUserMetadata,
      ...(nullableText(nextManagedCredentials.login_identifier)
        ? { loginIdentifier: nullableText(nextManagedCredentials.login_identifier) }
        : {}),
    },
  });

  if (updateError) {
    throw updateError;
  }

  writeAuthCredentialCache(authUserId, {
    auth_user_id: authUserId,
    login_identifier:
      nullableText(nextManagedCredentials.login_identifier) ??
      nullableText(data.user.email) ??
      "",
    temporary_password_hash: nullableText(nextManagedCredentials.temporary_password_hash),
    temporary_password_plain: nullableText(nextManagedCredentials.temporary_password_plain),
    has_pending_setup: Boolean(nextManagedCredentials.has_pending_setup),
    password_last_reset_at: normalizeNullableTimestamp(nextManagedCredentials.password_last_reset_at),
    card_last_printed_at: normalizeNullableTimestamp(nextManagedCredentials.card_last_printed_at),
  });
}

// Build auth identity payload
export function buildManagedAuthIdentityPayload(options: {
  role: ManagedUserRole;
  schoolId: string;
  fullName: string;
  loginIdentifier: string;
  createdBy?: string | null;
  existingAppMetadata?: Record<string, unknown>;
  existingUserMetadata?: Record<string, unknown>;
  credentialPatch?: {
    temporaryPasswordHash?: string | null;
    hasPendingSetup?: boolean;
    passwordLastResetAt?: string | null;
    cardLastPrintedAt?: string | null;
  };
}) {
  const existingAppMetadata = options.existingAppMetadata ?? {};
  const existingUserMetadata = options.existingUserMetadata ?? {};
  const existingManagedCredentials = asObject(
    existingAppMetadata.managed_credentials ?? existingUserMetadata.managed_credentials,
  );
  const nextLoginIdentifier = normalizeText(options.loginIdentifier).toLowerCase();

  return {
    app_metadata: {
      ...existingAppMetadata,
      managed_credentials: {
        ...existingManagedCredentials,
        ...(nextLoginIdentifier ? { login_identifier: nextLoginIdentifier } : {}),
        ...(options.credentialPatch?.temporaryPasswordHash !== undefined
          ? { temporary_password_hash: options.credentialPatch.temporaryPasswordHash }
          : {}),
        ...(options.credentialPatch?.hasPendingSetup !== undefined
          ? { has_pending_setup: options.credentialPatch.hasPendingSetup }
          : {}),
        ...(options.credentialPatch?.passwordLastResetAt !== undefined
          ? { password_last_reset_at: options.credentialPatch.passwordLastResetAt }
          : {}),
        ...(options.credentialPatch?.cardLastPrintedAt !== undefined
          ? { card_last_printed_at: options.credentialPatch.cardLastPrintedAt }
          : {}),
      },
    },
    user_metadata: {
      ...existingUserMetadata,
      accountType: "managed_user",
      managedRole: options.role,
      schoolId: options.schoolId,
      full_name: options.fullName,
      ...(nextLoginIdentifier ? { loginIdentifier: nextLoginIdentifier } : {}),
      ...(options.createdBy !== undefined ? { createdBy: options.createdBy } : {}),
    },
  };
}

// Sync auth identity metadata
export async function syncManagedAuthIdentityMetadata(options: {
  authUserId: string;
  role: ManagedUserRole;
  schoolId: string;
  fullName: string;
  loginIdentifier: string;
  createdBy?: string | null;
  isActive?: boolean;
}) {
  const { MANAGED_USER_INACTIVE_BAN_DURATION } = await import("@/lib/managed-users");
  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase.auth.admin.getUserById(options.authUserId);
  if (error || !data.user) {
    throw error ?? new Error("تعذر تحميل حساب المصادقة لتحديث بيانات الهوية.");
  }

  const existingAppMetadata = asObject(data.user.app_metadata);
  const existingManagedCredentials = asObject(existingAppMetadata.managed_credentials);
  const existingUserMetadata = asObject(data.user.user_metadata);
  const nextLoginIdentifier =
    normalizeText(options.loginIdentifier).toLowerCase() ||
    nullableText(existingManagedCredentials.login_identifier) ||
    nullableText(data.user.email) ||
    "";
  const identityPayload = buildManagedAuthIdentityPayload({
    role: options.role,
    schoolId: options.schoolId,
    fullName: options.fullName,
    loginIdentifier: nextLoginIdentifier,
    createdBy: options.createdBy,
    existingAppMetadata,
    existingUserMetadata,
  });

  const updatePayload: Record<string, unknown> = {
    ...identityPayload,
  };

  if (typeof options.isActive === "boolean") {
    updatePayload.ban_duration = options.isActive ? "none" : MANAGED_USER_INACTIVE_BAN_DURATION;
  }

  const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(options.authUserId, updatePayload);
  if (updateError) {
    throw updateError;
  }

  invalidateAuthCredentialCache(options.authUserId);
}

// Fetch credentials from database
export async function fetchManagedUserCredentials(
  actorSupabase: RouteSupabaseClient,
  authUserIds: string[],
) {
  const uniqueIds = Array.from(new Set(authUserIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, CredentialRow>();
  }

  const { data, error } = await actorSupabase
    .from("managed_user_credentials")
    .select("auth_user_id, login_identifier, temporary_password_hash, has_pending_setup, password_last_reset_at, card_last_printed_at")
    .in("auth_user_id", uniqueIds);

  if (error) {
    if (isMissingTableError(error, "managed_user_credentials") || error.message.toLowerCase().includes("could not find")) {
      return fetchManagedUserCredentialsFromAuthMetadata(uniqueIds);
    }
    throw error;
  }

  const credentials = new Map<string, CredentialRow>(
    ((data ?? []) as CredentialRow[]).map((row) => [row.auth_user_id, row]),
  );

  const missingIds = uniqueIds.filter((authUserId) => !credentials.has(authUserId));
  if (missingIds.length > 0) {
    const fallbackCredentials = await fetchManagedUserCredentialsFromAuthMetadata(missingIds);
    fallbackCredentials.forEach((row, authUserId) => {
      if (!credentials.has(authUserId)) {
        credentials.set(authUserId, row);
      }
    });
  }

  return credentials;
}

// Update login identifier
export async function updateManagedUserLoginIdentifier(
  actorSupabase: RouteSupabaseClient,
  options: {
    authUserId: string;
    schoolId: string;
    loginIdentifier: string;
  },
) {
  const { error } = await actorSupabase
    .from("managed_user_credentials")
    .update({ login_identifier: options.loginIdentifier })
    .eq("auth_user_id", options.authUserId)
    .eq("school_id", options.schoolId);

  if (error && !isMissingTableError(error, "managed_user_credentials") && !error.message.toLowerCase().includes("could not find")) {
    throw error;
  }

  await patchManagedCredentialMetadata(options.authUserId, {
    login_identifier: options.loginIdentifier,
  });
}

// Upsert credential
export async function upsertManagedUserCredential(
  actorSupabase: RouteSupabaseClient,
  options: {
    authUserId: string;
    schoolId: string;
    loginIdentifier: string;
    temporaryPassword: string;
    touchPrintTimestamp?: boolean;
  },
) {
  const now = new Date().toISOString();
  const passwordHash = hashPassword(options.temporaryPassword);
  const { error } = await actorSupabase.from("managed_user_credentials").upsert(
    {
      auth_user_id: options.authUserId,
      school_id: options.schoolId,
      login_identifier: options.loginIdentifier,
      temporary_password_hash: passwordHash,
      has_pending_setup: true,
      password_last_reset_at: now,
      ...(options.touchPrintTimestamp ? { card_last_printed_at: now } : {}),
    },
    { onConflict: "auth_user_id" },
  );

  if (error && !isMissingTableError(error, "managed_user_credentials")) {
    throw error;
  }

  await patchManagedCredentialMetadata(options.authUserId, {
    login_identifier: options.loginIdentifier,
    temporary_password_hash: passwordHash,
    has_pending_setup: true,
    password_last_reset_at: now,
    ...(options.touchPrintTimestamp ? { card_last_printed_at: now } : {}),
  });
}

// Mark card printed
export async function markAccountCardPrinted(
  actorSupabase: RouteSupabaseClient,
  options: {
    authUserId: string;
    schoolId: string;
  },
) {
  const now = new Date().toISOString();
  const { error } = await actorSupabase
    .from("managed_user_credentials")
    .update({ card_last_printed_at: now })
    .eq("auth_user_id", options.authUserId)
    .eq("school_id", options.schoolId);

  if (error && !isMissingTableError(error, "managed_user_credentials")) {
    throw error;
  }

  await patchManagedCredentialMetadata(options.authUserId, {
    card_last_printed_at: now,
  });
}

// Generate login identifier — simple format: s1234 / t1234
export async function generateManagedLoginIdentifier(
  actorSupabase: RouteSupabaseClient,
  options: {
    schoolId: string;
    role: "student" | "teacher";
    fullName: string;
    preferredEmail?: string | null;
  },
) {
  const preferred = options.preferredEmail?.trim().toLowerCase() || "";
  if (preferred) return preferred;

  const prefix = options.role === "student" ? "s" : "t";

  for (let attempt = 0; attempt < 20; attempt++) {
    // 4-digit code → 1000-9999
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `${prefix}${digits}`;
    // Check uniqueness via managed_user_credentials login_identifier
    const { data } = await actorSupabase
      .from("managed_user_credentials")
      .select("auth_user_id")
      .eq("school_id", options.schoolId)
      .eq("login_identifier", candidate)
      .limit(1)
      .maybeSingle();
    if (!data) return candidate;
  }
  // Fallback: 6 digits
  return `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
}

// Re-export utility for other modules
export { toCredentialSummary, invalidateAuthCredentialCache };
