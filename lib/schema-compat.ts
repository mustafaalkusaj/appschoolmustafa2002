import { isMissingColumnError } from "@/lib/admin-infrastructure";
import { supabase } from "@/lib/supabase";

export type AppSchemaCompat = {
  schoolColors: boolean;
  branchesIsMain: boolean;
  classFeesSchoolScope: boolean;
  classesNameColumn: boolean;
  sectionsSchoolScope: boolean;
};

const DEFAULT_COMPAT: AppSchemaCompat = {
  schoolColors: false,
  branchesIsMain: false,
  classFeesSchoolScope: false,
  classesNameColumn: false,
  sectionsSchoolScope: false,
};

let compatPromise: Promise<AppSchemaCompat> | null = null;

type SchemaCompatClient = {
  from: (table: string) => any;
};

async function probeColumnWithClient(client: SchemaCompatClient, table: string, column: string) {
  try {
    const { error } = await client.from(table).select(`id, ${column}`).limit(1);
    if (!error) return true;
    if (isMissingColumnError(error, table, column)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function probeColumn(table: string, column: string) {
  return probeColumnWithClient(supabase, table, column);
}

export async function detectAppSchemaCompatWithClient(client: SchemaCompatClient): Promise<AppSchemaCompat> {
  return Promise.all([
    probeColumnWithClient(client, "schools", "primary_color"),
    probeColumnWithClient(client, "branches", "is_main"),
    probeColumnWithClient(client, "class_fees", "school_id"),
    probeColumnWithClient(client, "classes", "name"),
    probeColumnWithClient(client, "sections", "school_id"),
  ])
    .then(([schoolColors, branchesIsMain, classFeesSchoolScope, classesNameColumn, sectionsSchoolScope]) => ({
      schoolColors,
      branchesIsMain,
      classFeesSchoolScope,
      classesNameColumn,
      sectionsSchoolScope,
    }))
    .catch(() => DEFAULT_COMPAT);
}

export async function detectAppSchemaCompat(): Promise<AppSchemaCompat> {
  if (!compatPromise) {
    compatPromise = detectAppSchemaCompatWithClient(supabase);
  }

  return compatPromise;
}

export function resetAppSchemaCompatCache() {
  compatPromise = null;
}
