import type { TeacherTableCapabilities, CredentialRow } from "./types";

// Cache constants
export const SCHEMA_CAPABILITY_TTL_MS = 5 * 60 * 1000;
export const AUTH_CREDENTIAL_CACHE_TTL_MS = 5 * 60 * 1000;

// Cache storage
export const schemaCapabilityCache = new Map<string, { value: boolean; expiresAt: number }>();
export const schemaCapabilityPending = new Map<string, Promise<boolean>>();

// Mutable cache state for teacher table capabilities
let _teacherTableCapabilitiesCache: { value: TeacherTableCapabilities; expiresAt: number } | null = null;
let _teacherTableCapabilitiesPending: Promise<TeacherTableCapabilities> | null = null;

export function getTeacherTableCapabilitiesCache() {
  return _teacherTableCapabilitiesCache;
}

export function setTeacherTableCapabilitiesCache(value: { value: TeacherTableCapabilities; expiresAt: number } | null) {
  _teacherTableCapabilitiesCache = value;
}

export function getTeacherTableCapabilitiesPending() {
  return _teacherTableCapabilitiesPending;
}

export function setTeacherTableCapabilitiesPending(value: Promise<TeacherTableCapabilities> | null) {
  _teacherTableCapabilitiesPending = value;
}

export const authCredentialCache = new Map<string, { value: CredentialRow | null; expiresAt: number }>();
export const authCredentialPending = new Map<string, Promise<CredentialRow | null>>();
