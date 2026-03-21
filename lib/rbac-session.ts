import type { Permission, UserRole } from "@/types/roles";

export const RBAC_COOKIE_NAME = "school_rbac";
export const RBAC_SESSION_MAX_AGE = 60 * 60 * 8;

export interface RBACSessionPayload {
  role: UserRole;
  permissions: Permission[];
  schoolId: string | null;
  userActive: boolean;
  schoolActive: boolean;
  subscriptionStatus: string | null;
  subscriptionEnd: string | null;
  iat: number;
  exp: number;
  version: 1;
}

function getSecretKeyMaterial(): string {
  return process.env.RBAC_COOKIE_SECRET || process.env.SUPABASE_JWT_SECRET || "";
}

export function hasRBACSecret() {
  return getSecretKeyMaterial().length > 0;
}

export function buildRBACSessionPayload(input: Omit<RBACSessionPayload, "iat" | "exp" | "version">): RBACSessionPayload {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    ...input,
    iat: nowSec,
    exp: nowSec + RBAC_SESSION_MAX_AGE,
    version: 1,
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
  const secret = getSecretKeyMaterial();
  if (!secret) return null;

  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await signValue(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyRBACSession(token: string | undefined | null): Promise<RBACSessionPayload | null> {
  const secret = getSecretKeyMaterial();
  if (!secret || !token) return null;

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  const valid = await verifyValue(payloadPart, signaturePart, secret);
  if (!valid) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(payloadPart));
    const parsed = JSON.parse(json) as RBACSessionPayload;

    if (!parsed || parsed.version !== 1) return null;
    if (!parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function getRBACCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RBAC_SESSION_MAX_AGE,
  };
}
