import "server-only";

import { isMissingColumnError, isMissingTableError } from "@/lib/admin-infrastructure";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export type DashboardServiceSupabase = ReturnType<typeof createServiceSupabaseClient>;

type DashboardSchemaCompat = {
  classFeesBranchScope: boolean;
  classesBranchScope: boolean;
  classFeesSchoolScope: boolean;
  classesNameColumn: boolean;
  sectionsSchoolScope: boolean;
};

const DASHBOARD_CLASS_NAME_REFERENCES = [
  { table: "assignments", column: "class_name" },
  { table: "class_fees", column: "class_name" },
  { table: "class_schedules", column: "class_name" },
  { table: "daily_lectures", column: "grade" },
  { table: "dashboard_homework_monitoring", column: "class_name" },
  { table: "exams", column: "class_name" },
  { table: "lecture_prices", column: "grade" },
  { table: "students", column: "class_name" },
  { table: "teacher_qualifications", column: "grade" },
  { table: "weekly_schedule", column: "grade" },
] as const;

export type DashboardClassItem = {
  id: string;
  name: string;
  legacyClassIds?: string[];
  branch_id?: string | null;
};

export type DashboardSectionItem = {
  id: string;
  class_id: string;
  name: string;
};

export type DashboardClassFeeItem = {
  id: string;
  class_name: string;
  total_fee: number;
  installments: number;
  installment_amount: number;
  notes: string;
  created_at: string;
};

function normalizeDashboardEntityName(value: string | null | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

function uniqueNormalizedSections(sectionNames: string[]) {
  return Array.from(
    new Set(sectionNames.map((value) => normalizeDashboardEntityName(value)).filter(Boolean)),
  );
}

function buildLegacySections(sectionNames: string[]) {
  const normalized = uniqueNormalizedSections(sectionNames);
  return normalized.length > 0 ? normalized : [""];
}

// Module-level cache for schema compat — 10 min TTL, avoids 5 extra queries per mutation
let schemaCompatCache: { value: DashboardSchemaCompat; expiresAt: number } | null = null;
const SCHEMA_COMPAT_TTL_MS = 10 * 60 * 1000;

async function probeColumn(client: DashboardServiceSupabase, table: string, column: string) {
  try {
    const { error } = await client.from(table).select(`id, ${column}`).limit(1);
    if (!error) {
      return true;
    }

    if (isMissingColumnError(error, table, column) || isMissingTableError(error, table)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function detectDashboardSchemaCompat(client: DashboardServiceSupabase): Promise<DashboardSchemaCompat> {
  const now = Date.now();
  if (schemaCompatCache && now < schemaCompatCache.expiresAt) {
    return schemaCompatCache.value;
  }

  const [
    classFeesBranchScope,
    classesBranchScope,
    classFeesSchoolScope,
    classesNameColumn,
    sectionsSchoolScope,
  ] = await Promise.all([
    probeColumn(client, "class_fees", "branch_id"),
    probeColumn(client, "classes", "branch_id"),
    probeColumn(client, "class_fees", "school_id"),
    probeColumn(client, "classes", "name"),
    probeColumn(client, "sections", "school_id"),
  ]);

  const value: DashboardSchemaCompat = {
    classFeesBranchScope,
    classesBranchScope,
    classFeesSchoolScope,
    classesNameColumn,
    sectionsSchoolScope,
  };

  schemaCompatCache = { value, expiresAt: now + SCHEMA_COMPAT_TTL_MS };
  return value;
}

async function renameDashboardClassReferences(
  client: DashboardServiceSupabase,
  options: {
    schoolId: string;
    branchId: string | null;
    branchScoped: boolean;
    previousName: string;
    nextName: string;
  },
) {
  if (!options.previousName || options.previousName === options.nextName) return;

  for (const reference of DASHBOARD_CLASS_NAME_REFERENCES) {
    const [hasNameColumn, hasSchoolId, hasBranchId] = await Promise.all([
      probeColumn(client, reference.table, reference.column),
      probeColumn(client, reference.table, "school_id"),
      probeColumn(client, reference.table, "branch_id"),
    ]);

    if (!hasNameColumn || !hasSchoolId) continue;

    // A branch rename must never mutate same-named records in sibling branches.
    // Tables without branch_id are therefore only updated for school-wide edits.
    if (options.branchScoped && (!options.branchId || !hasBranchId)) continue;

    let query = client
      .from(reference.table)
      .update({ [reference.column]: options.nextName })
      .eq(reference.column, options.previousName)
      .eq("school_id", options.schoolId);

    if (options.branchScoped && options.branchId) {
      query = query.eq("branch_id", options.branchId);
    }

    const { error } = await query;
    if (error && !isMissingColumnError(error, reference.table, reference.column) && !isMissingTableError(error, reference.table)) {
      throw error;
    }
  }
}

export async function loadDashboardStructure(
  client: DashboardServiceSupabase,
  options: {
    schoolId: string;
    branchId?: string | null;
    branchScoped?: boolean;
  },
) {
  const compat = await detectDashboardSchemaCompat(client);
  const branchId = options.branchScoped ? options.branchId?.trim() || null : null;

  if (compat.classesNameColumn) {
    let classQuery = client
      .from("classes")
      .select("id, name, branch_id")
      .eq("school_id", options.schoolId)
      .order("name", { ascending: true });

    if (branchId && compat.classesBranchScope) {
      classQuery = classQuery.eq("branch_id", branchId);
    }

    const { data: classRows, error: classError } = await classQuery;
    if (classError) {
      throw classError;
    }

    const classes = ((classRows ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      name: normalizeDashboardEntityName(typeof row.name === "string" ? row.name : ""),
      branch_id: typeof row.branch_id === "string" ? row.branch_id : null,
    }));

    const classIds = classes.map((row) => row.id);
    if (classIds.length === 0) {
      return { compat, classes, sections: [] as DashboardSectionItem[] };
    }

    let sectionQuery = client
      .from("sections")
      .select("id, class_id, name, school_id")
      .order("name", { ascending: true });

    if (compat.sectionsSchoolScope) {
      sectionQuery = sectionQuery.eq("school_id", options.schoolId);
    }

    sectionQuery = sectionQuery.in("class_id", classIds);

    const { data: sectionRows, error: sectionError } = await sectionQuery;
    if (sectionError) {
      if (isMissingTableError(sectionError, "sections")) {
        return { compat, classes, sections: [] as DashboardSectionItem[] };
      }
      throw sectionError;
    }

    const sections = ((sectionRows ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      class_id: String(row.class_id),
      name: normalizeDashboardEntityName(typeof row.name === "string" ? row.name : ""),
    }));

    return { compat, classes, sections };
  }

  let legacyQuery = client
    .from("classes")
    .select("id, school_id, branch_id, grade, section")
    .eq("school_id", options.schoolId)
    .order("grade", { ascending: true })
    .order("section", { ascending: true });

  if (branchId) {
    legacyQuery = legacyQuery.eq("branch_id", branchId);
  }

  const { data: legacyRows, error: legacyError } = await legacyQuery;
  if (legacyError) {
    throw legacyError;
  }

  const classGroups = new Map<string, DashboardClassItem>();
  const sections: DashboardSectionItem[] = [];

  ((legacyRows ?? []) as Array<Record<string, unknown>>).forEach((row) => {
    const grade = normalizeDashboardEntityName(typeof row.grade === "string" ? row.grade : "");
    const section = normalizeDashboardEntityName(typeof row.section === "string" ? row.section : "");
    const branchValue = typeof row.branch_id === "string" ? row.branch_id : null;

    if (!grade) {
      return;
    }

    const existing = classGroups.get(grade);
    if (existing) {
      existing.legacyClassIds = [...(existing.legacyClassIds ?? []), String(row.id)];
    } else {
      classGroups.set(grade, {
        id: `legacy:${grade}`,
        name: grade,
        legacyClassIds: [String(row.id)],
        branch_id: branchValue,
      });
    }

    if (section) {
      sections.push({
        id: String(row.id),
        class_id: `legacy:${grade}`,
        name: section,
      });
    }
  });

  return {
    compat,
    classes: Array.from(classGroups.values()),
    sections,
  };
}

export async function saveDashboardClass(
  client: DashboardServiceSupabase,
  options: {
    schoolId: string;
    branchId?: string | null;
    branchScoped?: boolean;
    editingClassId?: string | null;
    legacyClassIds?: string[];
    name: string;
    sections: string[];
  },
) {
  const compat = await detectDashboardSchemaCompat(client);
  const normalizedClassName = normalizeDashboardEntityName(options.name);
  const normalizedBranchId = typeof options.branchId === "string" && options.branchId.trim().length > 0
    ? options.branchId.trim()
    : null;

  if (!normalizedClassName) {
    throw new Error("يرجى إدخال اسم الصف.");
  }

  if (compat.classesNameColumn) {
    if (options.editingClassId) {
      const classesHaveGrade = await probeColumn(client, "classes", "grade");
      let currentClassQuery = client
        .from("classes")
        .select(classesHaveGrade ? "name, grade" : "name")
        .eq("id", options.editingClassId)
        .eq("school_id", options.schoolId);

      if (options.branchScoped && compat.classesBranchScope && normalizedBranchId) {
        currentClassQuery = currentClassQuery.eq("branch_id", normalizedBranchId);
      }

      const { data: rawCurrentClass, error: currentClassError } = await currentClassQuery.maybeSingle();
      const currentClass = rawCurrentClass as unknown as Record<string, unknown> | null;
      if (currentClassError) throw currentClassError;
      if (!currentClass) throw new Error("الصف غير موجود ضمن نطاقك الحالي.");

      const previousClassName = normalizeDashboardEntityName(
        typeof currentClass.name === "string"
          ? currentClass.name
          : typeof currentClass.grade === "string"
            ? currentClass.grade
            : "",
      );
      const classUpdatePayload: Record<string, unknown> = { name: normalizedClassName };
      if (classesHaveGrade) classUpdatePayload.grade = normalizedClassName;

      let classUpdate = client
        .from("classes")
        .update(classUpdatePayload)
        .eq("id", options.editingClassId)
        .eq("school_id", options.schoolId);

      if (options.branchScoped && compat.classesBranchScope && normalizedBranchId) {
        classUpdate = classUpdate.eq("branch_id", normalizedBranchId);
      }

      const { error: updateError } = await classUpdate;
      if (updateError) {
        throw updateError;
      }

      let sectionDelete = client.from("sections").delete().eq("class_id", options.editingClassId);
      if (compat.sectionsSchoolScope) {
        sectionDelete = sectionDelete.eq("school_id", options.schoolId);
      }
      const { error: deleteError } = await sectionDelete;
      if (deleteError && !isMissingTableError(deleteError, "sections")) {
        throw deleteError;
      }

      for (const sectionName of uniqueNormalizedSections(options.sections)) {
        const { error: insertError } = await client.from("sections").insert({
          class_id: options.editingClassId,
          ...(compat.sectionsSchoolScope ? { school_id: options.schoolId } : {}),
          name: sectionName,
        });
        if (insertError) {
          throw insertError;
        }
      }

      await renameDashboardClassReferences(client, {
        schoolId: options.schoolId,
        branchId: normalizedBranchId,
        branchScoped: Boolean(options.branchScoped),
        previousName: previousClassName,
        nextName: normalizedClassName,
      });

      return;
    }

    const classPayload: Record<string, unknown> = {
      name: normalizedClassName,
      grade: normalizedClassName,
      section: "",
      school_id: options.schoolId,
    };

    if (options.branchScoped && compat.classesBranchScope && normalizedBranchId) {
      classPayload.branch_id = normalizedBranchId;
    }

    const { data: insertedClass, error: insertClassError } = await client
      .from("classes")
      .insert(classPayload)
      .select("id")
      .single();

    if (insertClassError || !insertedClass?.id) {
      throw insertClassError ?? new Error("تعذر إضافة الصف.");
    }

    for (const sectionName of uniqueNormalizedSections(options.sections)) {
      const { error: insertSectionError } = await client.from("sections").insert({
        class_id: insertedClass.id,
        ...(compat.sectionsSchoolScope ? { school_id: options.schoolId } : {}),
        name: sectionName,
      });
      if (insertSectionError) {
        throw insertSectionError;
      }
    }

    return;
  }

  const legacyClassIds = Array.isArray(options.legacyClassIds) ? options.legacyClassIds : [];
  if (legacyClassIds.length > 0) {
    const { error: deleteLegacyError } = await client.from("classes").delete().in("id", legacyClassIds);
    if (deleteLegacyError) {
      throw deleteLegacyError;
    }
  }

  for (const sectionName of buildLegacySections(options.sections)) {
    const { error: insertLegacyError } = await client.from("classes").insert({
      school_id: options.schoolId,
      branch_id: options.branchScoped ? normalizedBranchId : null,
      grade: normalizedClassName,
      section: sectionName,
    });
    if (insertLegacyError) {
      throw insertLegacyError;
    }
  }
}

export async function deleteDashboardClass(
  client: DashboardServiceSupabase,
  options: {
    schoolId: string;
    branchId?: string | null;
    branchScoped?: boolean;
    classId: string;
    legacyClassIds?: string[];
  },
) {
  const compat = await detectDashboardSchemaCompat(client);
  const normalizedBranchId = typeof options.branchId === "string" && options.branchId.trim().length > 0
    ? options.branchId.trim()
    : null;

  if (compat.classesNameColumn) {
    let currentClassQuery = client
      .from("classes")
      .select("name")
      .eq("id", options.classId)
      .eq("school_id", options.schoolId);

    if (options.branchScoped && compat.classesBranchScope && normalizedBranchId) {
      currentClassQuery = currentClassQuery.eq("branch_id", normalizedBranchId);
    }

    const { data: currentClass, error: currentClassError } = await currentClassQuery.maybeSingle();
    if (currentClassError) throw currentClassError;
    if (!currentClass) throw new Error("الصف غير موجود ضمن نطاقك الحالي.");
    const currentClassName = normalizeDashboardEntityName(currentClass.name);

    let classDelete = client
      .from("classes")
      .delete()
      .eq("id", options.classId)
      .eq("school_id", options.schoolId);

    if (options.branchScoped && compat.classesBranchScope && normalizedBranchId) {
      classDelete = classDelete.eq("branch_id", normalizedBranchId);
    }

    const { error: classDeleteError } = await classDelete;
    if (classDeleteError) {
      throw classDeleteError;
    }

    let sectionDelete = client.from("sections").delete().eq("class_id", options.classId);
    if (compat.sectionsSchoolScope) {
      sectionDelete = sectionDelete.eq("school_id", options.schoolId);
    }
    const { error: sectionDeleteError } = await sectionDelete;
    if (sectionDeleteError && !isMissingTableError(sectionDeleteError, "sections")) {
      throw sectionDeleteError;
    }

    if (currentClassName && (!options.branchScoped || compat.classFeesBranchScope)) {
      let feeDelete = client.from("class_fees").delete().eq("class_name", currentClassName);
      if (compat.classFeesSchoolScope) {
        feeDelete = feeDelete.eq("school_id", options.schoolId);
      }
      if (options.branchScoped && compat.classFeesBranchScope && normalizedBranchId) {
        feeDelete = feeDelete.eq("branch_id", normalizedBranchId);
      }
      const { error: feeDeleteError } = await feeDelete;
      if (feeDeleteError && !isMissingTableError(feeDeleteError, "class_fees")) {
        throw feeDeleteError;
      }
    }

    return;
  }

  const legacyIds = Array.isArray(options.legacyClassIds) ? options.legacyClassIds : [];
  if (legacyIds.length === 0) {
    return;
  }

  const { error } = await client.from("classes").delete().in("id", legacyIds);
  if (error) {
    throw error;
  }
}

// Verifies a section's parent class belongs to the expected branch.
// Sections table has no branch_id column — isolation enforced via parent class.
async function assertSectionBranchOwnership(
  client: DashboardServiceSupabase,
  sectionId: string,
  branchId: string,
): Promise<void> {
  const { data: sectionRow } = await client
    .from("sections")
    .select("class_id")
    .eq("id", sectionId)
    .maybeSingle();

  if (!sectionRow?.class_id) {
    throw new Error("الشعبة غير موجودة.");
  }

  const { data: classRow } = await client
    .from("classes")
    .select("id")
    .eq("id", sectionRow.class_id)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (!classRow) {
    throw new Error("الشعبة لا تنتمي إلى فرعك.");
  }
}

export async function saveDashboardSection(
  client: DashboardServiceSupabase,
  options: {
    schoolId: string;
    branchId?: string | null;
    branchScoped?: boolean;
    classId: string;
    className?: string | null;
    sectionId?: string | null;
    name: string;
  },
) {
  const compat = await detectDashboardSchemaCompat(client);
  const normalizedSectionName = normalizeDashboardEntityName(options.name);
  const normalizedBranchId = typeof options.branchId === "string" && options.branchId.trim().length > 0
    ? options.branchId.trim()
    : null;

  if (!normalizedSectionName) {
    throw new Error("يرجى إدخال اسم الشعبة.");
  }

  if (compat.classesNameColumn) {
    if (options.sectionId) {
      // Verify branch ownership before updating a section in branch-scoped mode
      if (options.branchScoped && normalizedBranchId && compat.classesBranchScope) {
        await assertSectionBranchOwnership(client, options.sectionId, normalizedBranchId);
      }

      let updateQuery = client
        .from("sections")
        .update({ name: normalizedSectionName })
        .eq("id", options.sectionId);

      if (compat.sectionsSchoolScope) {
        updateQuery = updateQuery.eq("school_id", options.schoolId);
      }

      const { error } = await updateQuery;
      if (error) {
        throw error;
      }
      return;
    }

    const { error } = await client.from("sections").insert({
      class_id: options.classId,
      ...(compat.sectionsSchoolScope ? { school_id: options.schoolId } : {}),
      name: normalizedSectionName,
    });

    if (error) {
      throw error;
    }
    return;
  }

  if (options.sectionId) {
    const { error } = await client
      .from("classes")
      .update({ section: normalizedSectionName })
      .eq("id", options.sectionId);
    if (error) {
      throw error;
    }
    return;
  }

  const gradeName = normalizeDashboardEntityName(options.className);
  if (!gradeName) {
    throw new Error("تعذر تحديد الصف الحالي لهذه الشعبة.");
  }

  // Check for duplicate grade+section before inserting (legacy schema has no unique constraint)
  const { data: existing } = await client
    .from("classes")
    .select("id")
    .eq("school_id", options.schoolId)
    .eq("grade", gradeName)
    .eq("section", normalizedSectionName)
    .limit(1)
    .maybeSingle();

  if (existing) {
    throw new Error("هذه الشعبة مضافة مسبقاً لهذا الصف.");
  }

  const { error } = await client.from("classes").insert({
    school_id: options.schoolId,
    branch_id: options.branchScoped ? normalizedBranchId : null,
    grade: gradeName,
    section: normalizedSectionName,
  });
  if (error) {
    throw error;
  }
}

export async function deleteDashboardSection(
  client: DashboardServiceSupabase,
  options: {
    schoolId: string;
    sectionId: string;
    branchId?: string | null;
    branchScoped?: boolean;
  },
) {
  const compat = await detectDashboardSchemaCompat(client);
  const normalizedBranchId = typeof options.branchId === "string" && options.branchId.trim().length > 0
    ? options.branchId.trim()
    : null;

  if (compat.classesNameColumn) {
    // Verify branch ownership before deleting — sections have no branch_id column,
    // isolation is enforced through the parent class
    if (options.branchScoped && normalizedBranchId && compat.classesBranchScope) {
      await assertSectionBranchOwnership(client, options.sectionId, normalizedBranchId);
    }

    let deleteQuery = client.from("sections").delete().eq("id", options.sectionId);
    if (compat.sectionsSchoolScope) {
      deleteQuery = deleteQuery.eq("school_id", options.schoolId);
    }
    const { error } = await deleteQuery;
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await client.from("classes").delete().eq("id", options.sectionId);
  if (error) {
    throw error;
  }
}

function mapClassFeeRow(row: Record<string, unknown>): DashboardClassFeeItem {
  return {
    id: String(row.id),
    class_name: normalizeDashboardEntityName(typeof row.class_name === "string" ? row.class_name : ""),
    total_fee: Number(row.total_fee ?? 0),
    installments: Number(row.installments ?? 0),
    installment_amount: Number(row.installment_amount ?? 0),
    notes: typeof row.notes === "string" ? row.notes : "",
    created_at: typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString(),
  };
}

async function findExistingClassFee(
  client: DashboardServiceSupabase,
  compat: DashboardSchemaCompat,
  options: {
    schoolId: string;
    branchId?: string | null;
    branchScoped?: boolean;
    className: string;
    excludeId?: string | null;
  },
) {
  let query = client
    .from("class_fees")
    .select("id, class_name, total_fee, installments, installment_amount, notes, created_at")
    .eq("class_name", options.className)
    .limit(1);

  if (compat.classFeesSchoolScope) {
    query = query.eq("school_id", options.schoolId);
  }

  if (options.branchScoped && compat.classFeesBranchScope && options.branchId) {
    query = query.eq("branch_id", options.branchId);
  }

  if (options.excludeId) {
    query = query.neq("id", options.excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw error;
  }

  return data ? mapClassFeeRow(data as Record<string, unknown>) : null;
}

async function ensureClassExists(
  client: DashboardServiceSupabase,
  compat: DashboardSchemaCompat,
  options: {
    schoolId: string;
    branchId: string | null;
    branchScoped?: boolean;
    className: string;
  },
) {
  let query = client
    .from("classes")
    .select("id")
    .eq("school_id", options.schoolId);

  if (compat.classesNameColumn) {
    query = query.eq("name", options.className);
  } else {
    query = query.eq("grade", options.className);
  }

  if (options.branchScoped && compat.classesBranchScope && options.branchId) {
    query = query.eq("branch_id", options.branchId);
  }

  const { data } = await query.limit(1);
  if (data && data.length > 0) return;

  const classPayload: Record<string, unknown> = {
    school_id: options.schoolId,
    grade: options.className,
    section: "",
  };
  if (compat.classesNameColumn) {
    classPayload.name = options.className;
  }
  if (options.branchScoped && compat.classesBranchScope && options.branchId) {
    classPayload.branch_id = options.branchId;
  }

  await client.from("classes").insert(classPayload);
}

export async function saveDashboardClassFee(
  client: DashboardServiceSupabase,
  options: {
    schoolId: string;
    branchId?: string | null;
    branchScoped?: boolean;
    feeId?: string | null;
    className: string;
    totalFee: number;
    installments: number;
    notes?: string | null;
  },
) {
  const compat = await detectDashboardSchemaCompat(client);
  const normalizedClassName = normalizeDashboardEntityName(options.className);
  const normalizedBranchId = typeof options.branchId === "string" && options.branchId.trim().length > 0
    ? options.branchId.trim()
    : null;
  const notes = normalizeDashboardEntityName(options.notes ?? "");

  if (!normalizedClassName) {
    throw new Error("يرجى إدخال اسم الصف.");
  }

  const duplicate = await findExistingClassFee(client, compat, {
    schoolId: options.schoolId,
    branchId: normalizedBranchId,
    branchScoped: options.branchScoped,
    className: normalizedClassName,
    excludeId: options.feeId,
  });

  if (!options.feeId && duplicate) {
    return {
      status: "duplicate" as const,
      existingFee: duplicate,
    };
  }

  const installmentAmount = Math.round(options.totalFee / options.installments);

  if (options.feeId) {
    let query = client
      .from("class_fees")
      .update({
        class_name: normalizedClassName,
        total_fee: options.totalFee,
        installments: options.installments,
        installment_amount: installmentAmount,
        notes,
      })
      .eq("id", options.feeId);

    if (compat.classFeesSchoolScope) {
      query = query.eq("school_id", options.schoolId);
    }

    if (options.branchScoped && compat.classFeesBranchScope && normalizedBranchId) {
      query = query.eq("branch_id", normalizedBranchId);
    }

    const { error } = await query;
    if (error) {
      throw error;
    }

    return { status: "updated" as const };
  }

  const payload: Record<string, unknown> = {
    ...(compat.classFeesSchoolScope ? { school_id: options.schoolId } : {}),
    class_name: normalizedClassName,
    total_fee: options.totalFee,
    installments: options.installments,
    installment_amount: installmentAmount,
    notes,
  };

  // Only write branch_id when explicitly operating in branch-scoped mode
  if (options.branchScoped && compat.classFeesBranchScope && normalizedBranchId) {
    payload.branch_id = normalizedBranchId;
  }

  const { error } = await client.from("class_fees").insert(payload);
  if (error) {
    if (error.code === "23505") {
      const existingFee = await findExistingClassFee(client, compat, {
        schoolId: options.schoolId,
        branchId: normalizedBranchId,
        branchScoped: options.branchScoped,
        className: normalizedClassName,
      });
      return {
        status: "duplicate" as const,
        existingFee,
      };
    }
    throw error;
  }

  await ensureClassExists(client, compat, {
    schoolId: options.schoolId,
    branchId: normalizedBranchId,
    branchScoped: options.branchScoped,
    className: normalizedClassName,
  });

  return { status: "created" as const };
}

export async function deleteDashboardClassFee(
  client: DashboardServiceSupabase,
  options: {
    schoolId: string;
    branchId?: string | null;
    branchScoped?: boolean;
    feeId: string;
  },
) {
  const compat = await detectDashboardSchemaCompat(client);
  const normalizedBranchId = typeof options.branchId === "string" && options.branchId.trim().length > 0
    ? options.branchId.trim()
    : null;

  let query = client.from("class_fees").delete().eq("id", options.feeId);
  if (compat.classFeesSchoolScope) {
    query = query.eq("school_id", options.schoolId);
  }
  if (options.branchScoped && compat.classFeesBranchScope && normalizedBranchId) {
    query = query.eq("branch_id", normalizedBranchId);
  }

  const { error } = await query;
  if (error) {
    throw error;
  }
}
