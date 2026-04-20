import { isMissingColumnError } from "@/lib/admin-infrastructure";
import { supabase } from "@/lib/supabase";

export type AppSchemaCompat = {
  schoolColors: boolean;
  schoolThemePreset: boolean;
  branchColors: boolean;
  branchUiColors: boolean;
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
  branchesIsMain: false,
  classFeesSchoolScope: false,
  classesNameColumn: false,
  sectionsSchoolScope: false,
};

let compatPromise: Promise<AppSchemaCompat> | null = null;

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
  return Promise.all([
    probeColumnWithClient(client, "schools", "primary_color"),
    probeColumnWithClient(client, "schools", "theme_preset"),
    probeColumnWithClient(client, "branches", "primary_color"),
    probeColumnWithClient(client, "branches", "sidebar_color"),
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
      branchesIsMain,
      classFeesSchoolScope,
      classesNameColumn,
      sectionsSchoolScope,
    ]) => ({
      schoolColors,
      schoolThemePreset,
      branchColors,
      branchUiColors,
      branchesIsMain,
      classFeesSchoolScope,
      classesNameColumn,
      sectionsSchoolScope,
    }))
    .catch(() => DEFAULT_COMPAT);
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
}
