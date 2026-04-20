import { isMissingTableError } from "@/lib/admin-infrastructure";
import { chunkArray } from "@/lib/students/import-processor";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase-server";

type SchoolArchiveSupabaseClient =
  | ReturnType<typeof createServiceSupabaseClient>
  | Awaited<ReturnType<typeof createRouteSupabaseClient>>;

type SchoolArchiveDataset = {
  table: string;
  rows: Array<Record<string, unknown>>;
};

type SchoolArchiveDefinition = {
  table: string;
  orderBy?: string;
  schoolScoped?: boolean;
  resetDeletedMarkers?: boolean;
  nullifyAuthLink?: boolean;
};

const SCHOOL_ARCHIVE_DEFINITIONS: SchoolArchiveDefinition[] = [
  { table: "branches", orderBy: "created_at", schoolScoped: true, resetDeletedMarkers: true },
  { table: "subscriptions", orderBy: "created_at", schoolScoped: true },
  { table: "expense_types", orderBy: "created_at", schoolScoped: true },
  { table: "classes", orderBy: "created_at", schoolScoped: true },
  { table: "students", orderBy: "created_at", schoolScoped: true, nullifyAuthLink: true },
  { table: "payments", orderBy: "created_at", schoolScoped: true },
  { table: "expenses", orderBy: "created_at", schoolScoped: true },
  { table: "teachers", orderBy: "created_at", schoolScoped: true, nullifyAuthLink: true },
  { table: "salaries", orderBy: "created_at", schoolScoped: true },
  { table: "attendance_records", orderBy: "attendance_date", schoolScoped: true },
  { table: "account_archives", orderBy: "archive_date", schoolScoped: true },
  { table: "custom_roles", orderBy: "created_at", schoolScoped: true },
  { table: "rbac_roles", orderBy: "created_at", schoolScoped: true },
  { table: "user_profiles", orderBy: "created_at", schoolScoped: true, resetDeletedMarkers: true },
  { table: "user_page_access", orderBy: "created_at", schoolScoped: true, resetDeletedMarkers: true },
  { table: "user_role_assignments", orderBy: "created_at", schoolScoped: true, resetDeletedMarkers: true },
];

export type SchoolArchivePayload = {
  version: 1;
  exported_at: string;
  school: Record<string, unknown>;
  datasets: SchoolArchiveDataset[];
};

export type SchoolArchiveRecord = {
  id: string;
  school_id: string | null;
  school_name: string;
  archive_source: "manual_export" | "soft_delete" | "hard_delete";
  payload: SchoolArchivePayload;
  created_at: string;
  created_by: string | null;
};

type PersistArchiveOptions = {
  schoolId: string;
  schoolName: string;
  actorUserId: string | null;
  source: SchoolArchiveRecord["archive_source"];
  payload: SchoolArchivePayload;
};

async function querySchoolScopedTable(
  client: SchoolArchiveSupabaseClient,
  definition: SchoolArchiveDefinition,
  schoolId: string,
) {
  let query = client.from(definition.table).select("*");

  if (definition.schoolScoped !== false) {
    query = query.eq("school_id", schoolId);
  }

  if (definition.orderBy) {
    query = query.order(definition.orderBy, { ascending: true });
  }

  const result = await query;
  if (result.error) {
    if (isMissingTableError(result.error, definition.table)) {
      return { skipped: true as const, rows: [] as Array<Record<string, unknown>> };
    }
    throw result.error;
  }

  return {
    skipped: false as const,
    rows: ((result.data ?? []) as Array<Record<string, unknown>>),
  };
}

export async function buildSchoolArchivePayload(
  client: SchoolArchiveSupabaseClient,
  schoolId: string,
): Promise<SchoolArchivePayload> {
  const { data: school, error: schoolError } = await client
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolError) {
    throw schoolError;
  }

  if (!school) {
    throw new Error("المدرسة المطلوبة غير موجودة لإنشاء نسخة الأرشيف.");
  }

  const datasetResults = await Promise.all(
    SCHOOL_ARCHIVE_DEFINITIONS.map(async (definition) => {
      const result = await querySchoolScopedTable(client, definition, schoolId);
      return result.skipped
        ? null
        : {
            table: definition.table,
            rows: result.rows,
          };
    }),
  );

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    school: school as Record<string, unknown>,
    datasets: datasetResults.filter((dataset): dataset is SchoolArchiveDataset => Boolean(dataset)),
  };
}

export async function persistSchoolArchiveSnapshot(
  client: SchoolArchiveSupabaseClient,
  options: PersistArchiveOptions,
) {
  const insertResult = await client
    .from("school_data_archives")
    .insert({
      school_id: options.schoolId,
      school_name: options.schoolName,
      archive_source: options.source,
      payload: options.payload,
      created_by: options.actorUserId,
    })
    .select("id, school_id, school_name, archive_source, payload, created_at, created_by")
    .single();

  if (insertResult.error) {
    if (isMissingTableError(insertResult.error, "school_data_archives")) {
      throw new Error(
        "جدول school_data_archives غير موجود بعد. شغّل migration 20260421_010000_school_data_archives.sql أولاً.",
      );
    }
    throw insertResult.error;
  }

  return insertResult.data as SchoolArchiveRecord;
}

function resetArchiveRow(
  definition: SchoolArchiveDefinition,
  row: Record<string, unknown>,
  targetSchoolId: string,
) {
  const nextRow: Record<string, unknown> = {
    ...row,
    school_id: targetSchoolId,
  };

  if (definition.resetDeletedMarkers) {
    if ("deleted_at" in nextRow) {
      nextRow.deleted_at = null;
    }
    if ("deleted_by" in nextRow) {
      nextRow.deleted_by = null;
    }
  }

  if (definition.nullifyAuthLink && "auth_user_id" in nextRow) {
    nextRow.auth_user_id = null;
  }

  return nextRow;
}

async function upsertArchiveDataset(
  client: SchoolArchiveSupabaseClient,
  definition: SchoolArchiveDefinition,
  targetSchoolId: string,
  rows: Array<Record<string, unknown>>,
) {
  if (rows.length === 0) {
    return { restored: 0, warning: null as string | null };
  }

  const sanitizedRows = rows.map((row) => resetArchiveRow(definition, row, targetSchoolId));

  for (const chunk of chunkArray(sanitizedRows, 200)) {
    const insertResult = await client
      .from(definition.table)
      .upsert(chunk, { onConflict: "id", ignoreDuplicates: false });

    if (insertResult.error) {
      if (isMissingTableError(insertResult.error, definition.table)) {
        return {
          restored: 0,
          warning: `تم تخطي جدول ${definition.table} لأن هذا الجدول غير موجود في البيئة الحالية.`,
        };
      }

      if (definition.table === "user_profiles") {
        return {
          restored: 0,
          warning:
            "تم تخطي استرجاع حسابات المستخدمين لأن بعض معرفات المصادقة غير متاحة في البيئة الحالية. يمكن إعادة إنشاء الحسابات يدويًا بعد الاسترجاع.",
        };
      }

      throw insertResult.error;
    }
  }

  return { restored: sanitizedRows.length, warning: null as string | null };
}

export async function restoreSchoolArchivePayload(
  client: SchoolArchiveSupabaseClient,
  targetSchoolId: string,
  payload: SchoolArchivePayload,
) {
  if (!payload || payload.version !== 1 || !Array.isArray(payload.datasets)) {
    throw new Error("ملف الأرشيف غير صالح أو لا يطابق إصدار النظام الحالي.");
  }

  const schoolRecord = payload.school ?? {};
  const schoolUpdatePayload = {
    name: typeof schoolRecord.name === "string" ? schoolRecord.name : undefined,
    address: typeof schoolRecord.address === "string" ? schoolRecord.address : null,
    phone: typeof schoolRecord.phone === "string" ? schoolRecord.phone : null,
    owner_email: typeof schoolRecord.owner_email === "string" ? schoolRecord.owner_email : null,
    city: typeof schoolRecord.city === "string" ? schoolRecord.city : null,
    logo_url: typeof schoolRecord.logo_url === "string" ? schoolRecord.logo_url : null,
    primary_color: typeof schoolRecord.primary_color === "string" ? schoolRecord.primary_color : null,
    secondary_color: typeof schoolRecord.secondary_color === "string" ? schoolRecord.secondary_color : null,
    plan:
      schoolRecord.plan === "premium" || schoolRecord.plan === "enterprise"
        ? schoolRecord.plan
        : "basic",
    is_active: true,
    deleted_at: null,
    deleted_by: null,
  };

  const updateSchoolResult = await client
    .from("schools")
    .update(schoolUpdatePayload)
    .eq("id", targetSchoolId)
    .select("id, name")
    .maybeSingle();

  if (updateSchoolResult.error || !updateSchoolResult.data) {
    throw new Error(updateSchoolResult.error?.message || "تعذر تحديث المدرسة المستهدفة قبل الاسترجاع.");
  }

  const warnings: string[] = [];
  const restoredTables: Array<{ table: string; restored: number }> = [];

  for (const dataset of payload.datasets) {
    const definition = SCHOOL_ARCHIVE_DEFINITIONS.find((item) => item.table === dataset.table);
    if (!definition) {
      warnings.push(`تم تخطي جدول ${dataset.table} لأنه غير مدعوم في الاسترجاع الحالي.`);
      continue;
    }

    const result = await upsertArchiveDataset(client, definition, targetSchoolId, dataset.rows);
    if (result.warning) {
      warnings.push(result.warning);
    }
    restoredTables.push({
      table: dataset.table,
      restored: result.restored,
    });
  }

  return {
    school: updateSchoolResult.data,
    restoredTables,
    warnings,
  };
}
