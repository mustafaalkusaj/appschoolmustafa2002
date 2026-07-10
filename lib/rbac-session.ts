import { getServerEnv, shouldUseSecureCookies } from "@/lib/env/server";
import { getPathForPageCode } from "@/lib/authorization/page-access";
import {
  buildTemplatePermissions,
  normalizePermissions,
  type Permission,
  type UserRole,
} from "@/types/roles";
import type { DeepPermissionMap, SidebarModuleNode } from "@/types/deep-permissions";

export const RBAC_COOKIE_NAME = "school_rbac";
export const RBAC_SESSION_MAX_AGE = 60 * 60 * 1;
let devFallbackSecret = "";

export interface RBACSessionPayload {
  userId: string;
  role: UserRole;
  permissions: Permission[];
  schoolId: string | null;
  branchId: string | null;
  allowedBranchIds: string[];
  userActive: boolean;
  schoolActive: boolean;
  subscriptionStatus: string | null;
  subscriptionEnd: string | null;
  scopeLevel: 'super_admin' | 'group_admin' | 'branch_user' | 'restricted' | null;
  allowedModule: string | null;
  allowedModules: string[];
  allowedPages: string[];
  defaultPath: string;
  isSinglePageUser: boolean;
  hierarchyLevel: number | null;
  permissionsVersion: number;
  groupId: string | null;
  /** Deep 5-level permission map (version 3+). Absent in older sessions. */
  deepPermissions?: DeepPermissionMap;
  /** Dynamic sidebar built from deepPermissions (version 3+). */
  sidebar?: SidebarModuleNode[];
  iat: number;
  exp: number;
  version: 1 | 2 | 3;
}

function getSecretKeyMaterial(): string {
  const dedicated = getServerEnv().rbacCookieSecret;
  if (dedicated) return dedicated;

  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error(
      "FATAL SECURITY ERROR: RBAC_COOKIE_SECRET is not configured. " +
      "Refusing to start in production without a secure key. " +
      "Generate one with: openssl rand -base64 48"
    );
  }

  if (!devFallbackSecret) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    devFallbackSecret = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    devFallbackSecret = btoa(devFallbackSecret);
    
    console.warn(
      "[rbac-session] WARNING: Using ephemeral development secret. " +
      "Persistent sessions will not work across restarts."
    );
  }

  return devFallbackSecret;
}

export function hasRBACSecret() {
  try {
    return getSecretKeyMaterial().length > 0;
  } catch {
    return false;
  }
}

function compactPermissionsForPayload(role: UserRole, permissions: Permission[]) {
  const normalized = normalizePermissions(permissions, role);
  const defaults = buildTemplatePermissions(role);
  const normalizedSet = new Set(normalized);

  if (
    normalized.length === defaults.length &&
    defaults.every((permission) => normalizedSet.has(permission))
  ) {
    return [] as Permission[];
  }

  return normalized;
}

export function buildRBACSessionPayload(input: Omit<RBACSessionPayload, "iat" | "exp" | "version">): RBACSessionPayload {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    ...input,
    permissions: compactPermissionsForPayload(input.role, input.permissions),
    iat: nowSec,
    exp: nowSec + RBAC_SESSION_MAX_AGE,
    version: input.deepPermissions ? 3 : 2,
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i += 1) {
    str += String.fromCharCode(bytes[i]);
  }

  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  const padded = normalized + "=".repeat(padding);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signValue(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

async function verifyValue(value: string, signature: string, secret: string): Promise<boolean> {
  const expected = await signValue(value, secret);
  if (expected.length !== signature.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export async function signRBACSession(payload: RBACSessionPayload): Promise<string | null> {
  let secret: string;
  try {
    secret = getSecretKeyMaterial();
  } catch {
    return null;
  }
  if (!secret) return null;

  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await signValue(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyRBACSession(token: string | undefined | null): Promise<RBACSessionPayload | null> {
  let secret: string;
  try {
    secret = getSecretKeyMaterial();
  } catch {
    return null;
  }
  if (!secret || !token) return null;

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  const valid = await verifyValue(payloadPart, signaturePart, secret);
  if (!valid) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(payloadPart));
    const parsed = JSON.parse(json) as RBACSessionPayload;

    if (!parsed || (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3)) return null;
    if (!parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;

    return {
      ...parsed,
      userId: typeof parsed.userId === "string" ? parsed.userId : "",
      branchId: typeof parsed.branchId === "string" ? parsed.branchId : null,
      allowedBranchIds: Array.isArray(parsed.allowedBranchIds)
        ? parsed.allowedBranchIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : [],
      allowedModules: Array.isArray(parsed.allowedModules)
        ? parsed.allowedModules.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : [],
      allowedPages: Array.isArray(parsed.allowedPages)
        ? parsed.allowedPages.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : [],
      defaultPath:
        typeof parsed.defaultPath === "string" && parsed.defaultPath.trim().length > 0
          ? parsed.defaultPath
          : getPathForPageCode(typeof parsed.allowedModule === "string" ? parsed.allowedModule : null) ?? "/dashboard",
      isSinglePageUser:
        typeof parsed.isSinglePageUser === "boolean"
          ? parsed.isSinglePageUser
          : (Array.isArray(parsed.allowedPages) ? parsed.allowedPages.length === 1 : parsed.scopeLevel === "restricted"),
      hierarchyLevel:
        typeof parsed.hierarchyLevel === "number" && Number.isFinite(parsed.hierarchyLevel)
          ? parsed.hierarchyLevel
          : null,
      permissionsVersion:
        typeof parsed.permissionsVersion === "number" && Number.isFinite(parsed.permissionsVersion)
          ? parsed.permissionsVersion
          : 1,
      permissions: normalizePermissions(parsed.permissions, parsed.role),
    };
  } catch {
    return null;
  }
}

export function getRBACCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: RBAC_SESSION_MAX_AGE,
  };
}

export function getExpiredRBACCookieOptions() {
  return {
    ...getRBACCookieOptions(),
    maxAge: 0,
  };
}
