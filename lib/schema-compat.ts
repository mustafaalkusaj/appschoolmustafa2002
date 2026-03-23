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

async function probeColumn(table: string, column: string) {
  try {
    const { error } = await supabase.from(table).select(`id, ${column}`).limit(1);
    if (!error) return true;
    if (isMissingColumnError(error, table, column)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function detectAppSchemaCompat(): Promise<AppSchemaCompat> {
  if (!compatPromise) {
    compatPromise = Promise.all([
      probeColumn("schools", "primary_color"),
      probeColumn("branches", "is_main"),
      probeColumn("class_fees", "school_id"),
      probeColumn("classes", "name"),
      probeColumn("sections", "school_id"),
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

  return compatPromise;
}

export function resetAppSchemaCompatCache() {
  compatPromise = null;
}
