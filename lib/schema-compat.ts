import { isMissingColumnError } from "@/lib/admin-infrastructure";
import { supabase } from "@/lib/supabase";

export type AppSchemaCompat = {
  schoolColors: boolean;
  schoolThemePreset: boolean;
  branchColors: boolean;
  branchUiColors: boolean;
  branchLogo: boolean;
  branchReceiptBg: boolean;
  classFeesBranchScope: boolean;
  classesBranchScope: boolean;
  branchesIsMain: boolean;
  classFeesSchoolScope: boolean;
  classesNameColumn: boolean;
  sectionsSchoolScope: boolean;
};

export const DEFAULT_COMPAT: AppSchemaCompat = {
  schoolColors: false,
  schoolThemePreset: false,
  branchColors: false,
  branchUiColors: false,
  branchLogo: false,
  branchReceiptBg: false,
  classFeesBranchScope: false,
  classesBranchScope: false,
  branchesIsMain: false,
  classFeesSchoolScope: false,
  classesNameColumn: false,
  sectionsSchoolScope: false,
};

let compatPromise: Promise<AppSchemaCompat> | null = null;
let serverSideCacheEntry: { compat: AppSchemaCompat; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getServerCachedCompat(): AppSchemaCompat | null {
  if (!serverSideCacheEntry) return null;
  const age = Date.now() - serverSideCacheEntry.timestamp;
  if (age > CACHE_TTL_MS) {
    serverSideCacheEntry = null;
    return null;
  }
  return serverSideCacheEntry.compat;
}

function setServerCachedCompat(compat: AppSchemaCompat): void {
  serverSideCacheEntry = { compat, timestamp: Date.now() };
}

type SchemaCompatSelectQuery = {
  // Supabase's query builders are thenables (PromiseLike). Keep this intentionally
  // loose so callers can pass different SupabaseClient flavors without type
  // incompatibilities.
  limit: (count: number) => unknown;
};

type SchemaCompatFromQuery = {
  select: (columns: string) => SchemaCompatSelectQuery;
};

type SchemaCompatClient = {
  from: (table: string) => SchemaCompatFromQuery;
};

async function probeColumnWithClient(client: SchemaCompatClient, table: string, column: string) {
  try {
    const result = client.from(table).select(`id, ${column}`).limit(1);
    const { error } = await (result as PromiseLike<{ error?: unknown }>);
    if (!error) return true;
    if (isMissingColumnError(error, table, column)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchCompatFromApi(): Promise<AppSchemaCompat> {
  try {
    const response = await fetch("/api/web/schema-compat", {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return DEFAULT_COMPAT;
    }

    const payload = (await response.json().catch(() => null)) as { compat?: AppSchemaCompat } | null;
    return payload?.compat ?? DEFAULT_COMPAT;
  } catch {
    return DEFAULT_COMPAT;
  }
}

export async function detectAppSchemaCompatWithClient(client: SchemaCompatClient): Promise<AppSchemaCompat> {
  // Check server-side cache first (10-min TTL)
  const cached = getServerCachedCompat();
  if (cached) {
    return cached;
  }

  return Promise.all([
    probeColumnWithClient(client, "schools", "primary_color"),
    probeColumnWithClient(client, "schools", "theme_preset"),
    probeColumnWithClient(client, "branches", "primary_color"),
    probeColumnWithClient(client, "branches", "sidebar_color"),
    probeColumnWithClient(client, "branches", "logo_url"),
    probeColumnWithClient(client, "branches", "receipt_bg_url"),
    probeColumnWithClient(client, "class_fees", "branch_id"),
    probeColumnWithClient(client, "classes", "branch_id"),
    probeColumnWithClient(client, "branches", "is_main"),
    probeColumnWithClient(client, "class_fees", "school_id"),
    probeColumnWithClient(client, "classes", "name"),
    probeColumnWithClient(client, "sections", "school_id"),
  ])
    .then(([
      schoolColors,
      schoolThemePreset,
      branchColors,
      branchUiColors,
      branchLogo,
      branchReceiptBg,
      classFeesBranchScope,
      classesBranchScope,
      branchesIsMain,
      classFeesSchoolScope,
      classesNameColumn,
      sectionsSchoolScope,
    ]) => {
      const result = {
        schoolColors,
        schoolThemePreset,
        branchColors,
        branchUiColors,
        branchLogo,
        branchReceiptBg,
        classFeesBranchScope,
        classesBranchScope,
        branchesIsMain,
        classFeesSchoolScope,
        classesNameColumn,
        sectionsSchoolScope,
      };
      // Store in server cache for future calls
      setServerCachedCompat(result);
      return result;
    })
    .catch(() => {
      // On error, still return DEFAULT_COMPAT but don't cache the error
      return DEFAULT_COMPAT;
    });
}

export async function detectAppSchemaCompat(): Promise<AppSchemaCompat> {
  if (!compatPromise) {
    compatPromise =
      typeof window === "undefined"
        ? detectAppSchemaCompatWithClient(supabase)
        : fetchCompatFromApi();
  }

  return compatPromise;
}

export function resetAppSchemaCompatCache() {
  compatPromise = null;
  serverSideCacheEntry = null;
}

// For testing purposes: reset all caches
export function __TEST_ONLY_resetAllCaches() {
  resetAppSchemaCompatCache();
}
