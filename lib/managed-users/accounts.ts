import { isMissingTableError } from "@/lib/admin-infrastructure";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { ManagedUserRole, ManagedUserRecord } from "@/lib/managed-users";
import type { RouteSupabaseClient } from "./types";
import { syncManagedAuthIdentityMetadata, upsertManagedUserCredential } from "./credentials";

// Utility functions
function _nullableText(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function normalizeLookupText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getClassLookupName(row: Record<string, unknown> | null | undefined) {
  return normalizeLookupText(row?.name) || normalizeLookupText(row?.grade);
}

function getSectionLookupName(row: Record<string, unknown> | null | undefined) {
  return normalizeLookupText(row?.name) || normalizeLookupText(row?.section) || null;
}

function matchesLookupText(left: string | null | undefined, right: string | null | undefined) {
  const normalizedLeft = (left ?? "").trim().toLowerCase();
  const normalizedRight = (right ?? "").trim().toLowerCase();
  return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
}

function normalizeMatchKey(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function teacherAssignmentMatchesStudent(
  assignment: Record<string, unknown>,
  className: string,
  section: string | null,
) {
  const assignmentClassName = normalizeMatchKey(assignment.class_name ?? assignment.grade);
  if (!assignmentClassName || assignmentClassName !== normalizeMatchKey(className)) {
    return false;
  }

  const assignmentSectionRaw = normalizeMatchKey(assignment.section ?? assignment.section_name);
  if (!assignmentSectionRaw) {
    return true;
  }

  return assignmentSectionRaw === normalizeMatchKey(section);
}

function parseTeacherClassesTaught(rawValue: unknown) {
  if (Array.isArray(rawValue)) {
    return rawValue.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }

  if (typeof rawValue === "string" && rawValue.trim()) {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

// Normalize user records
export function normalizeManagedUserRecord(record: Record<string, unknown>): ManagedUserRecord {
  const student = firstRelation(record.student as Record<string, unknown> | Record<string, unknown>[] | null | undefined);
  const teacher = firstRelation(record.teacher as Record<string, unknown> | Record<string, unknown>[] | null | undefined);

  return {
    auth_user_id: String(record.auth_user_id),
    school_id: String(record.school_id),
    role: record.role === "teacher" ? "teacher" : "student",
    full_name: typeof record.full_name === "string" ? record.full_name : "",
    email: typeof record.email === "string" ? record.email : "",
    phone: typeof record.phone === "string" ? record.phone : null,
    is_active: Boolean(record.is_active),
    created_at: typeof record.created_at === "string" ? record.created_at : null,
    updated_at: typeof record.updated_at === "string" ? record.updated_at : null,
    student: student
      ? {
          id: String(student.id),
          full_name: typeof student.full_name === "string" ? student.full_name : null,
          class_name: typeof student.class_name === "string" ? student.class_name : null,
          section: typeof student.section === "string" ? student.section : null,
          address: typeof student.address === "string" ? student.address : null,
          total_fee: typeof student.total_fee === "number" ? student.total_fee : Number(student.total_fee ?? 0),
          paid_fee: typeof student.paid_fee === "number" ? student.paid_fee : Number(student.paid_fee ?? 0),
          discount_value:
            typeof student.discount_value === "number"
              ? student.discount_value
              : Number(student.discount_value ?? 0),
          status: typeof student.status === "string" ? student.status : null,
        }
      : null,
    teacher: teacher
      ? {
          id: String(teacher.id),
          full_name: typeof teacher.full_name === "string" ? teacher.full_name : null,
          email: typeof teacher.email === "string" ? teacher.email : null,
          phone: typeof teacher.phone === "string" ? teacher.phone : null,
          specialization: typeof teacher.specialization === "string" ? teacher.specialization : null,
          notes: typeof teacher.notes === "string" ? teacher.notes : null,
          is_active: typeof teacher.is_active === "boolean" ? teacher.is_active : null,
          assignments: [],
        }
      : null,
    app_account: null,
  };
}

export function normalizeManagedUserRecords(records: Record<string, unknown>[] | null | undefined) {
  return (records ?? []).map((record) => normalizeManagedUserRecord(record));
}

// Build legacy user record
function buildLegacyManagedUserRecord(input: {
  profile: Record<string, unknown>;
  student: Record<string, unknown> | null;
  teacher: Record<string, unknown> | null;
}): ManagedUserRecord | null {
  const role =
    input.profile.role === "teacher" ? "teacher" : input.profile.role === "student" ? "student" : null;
  if (!role) {
    return null;
  }

  const teacherStatus = typeof input.teacher?.status === "string" ? input.teacher.status.toLowerCase() : "";

  return {
    auth_user_id: String(input.profile.id),
    school_id: String(input.profile.school_id),
    role,
    full_name: typeof input.profile.full_name === "string" ? input.profile.full_name : "",
    email: typeof input.profile.email === "string" ? input.profile.email : "",
    phone: typeof input.profile.phone === "string" ? input.profile.phone : null,
    is_active: typeof input.profile.is_active === "boolean" ? input.profile.is_active : true,
    created_at: typeof input.profile.created_at === "string" ? input.profile.created_at : null,
    updated_at: null,
    student:
      role === "student" && input.student
        ? {
            id: String(input.student.id),
            full_name: typeof input.student.full_name === "string" ? input.student.full_name : null,
            class_name: typeof input.student.class_name === "string" ? input.student.class_name : null,
            section: typeof input.student.section === "string" ? input.student.section : null,
            address: typeof input.student.address === "string" ? input.student.address : null,
            total_fee: typeof input.student.total_fee === "number" ? input.student.total_fee : Number(input.student.total_fee ?? 0),
            paid_fee: typeof input.student.paid_fee === "number" ? input.student.paid_fee : Number(input.student.paid_fee ?? 0),
            discount_value:
              typeof input.student.discount_value === "number"
                ? input.student.discount_value
                : Number(input.student.discount_value ?? 0),
            status: typeof input.student.status === "string" ? input.student.status : null,
          }
        : null,
    teacher:
      role === "teacher" && input.teacher
        ? {
            id: String(input.teacher.id),
            full_name: typeof input.teacher.full_name === "string" ? input.teacher.full_name : null,
            email: typeof input.teacher.email === "string" ? input.teacher.email : null,
            phone: typeof input.teacher.phone === "string" ? input.teacher.phone : null,
            specialization:
              typeof input.teacher.specialization === "string"
                ? input.teacher.specialization
                : typeof input.teacher.subject === "string"
                  ? input.teacher.subject
                  : null,
            notes: typeof input.teacher.notes === "string" ? input.teacher.notes : null,
            is_active:
              typeof input.teacher.is_active === "boolean"
                ? input.teacher.is_active
                : teacherStatus !== "inactive" && teacherStatus !== "deleted",
            assignments: [],
          }
        : null,
    app_account: null,
  };
}

// Persist managed user profile
export async function persistManagedUserProfile(
  actorSupabase: RouteSupabaseClient,
  options: {
    mode: "insert" | "update";
    authUserId: string;
    schoolId: string;
    role: ManagedUserRole;
    fullName: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    studentId?: string | null;
    teacherId?: string | null;
    createdBy?: string | null;
  },
) {
  const managedPayload = {
    auth_user_id: options.authUserId,
    school_id: options.schoolId,
    role: options.role,
    full_name: options.fullName,
    email: options.email,
    phone: options.phone,
    is_active: options.isActive,
    student_id: options.studentId ?? null,
    teacher_id: options.teacherId ?? null,
    created_by: options.createdBy ?? null,
  };

  const managedQuery =
    options.mode === "insert"
      ? actorSupabase.from("managed_user_profiles").insert(managedPayload)
      : actorSupabase.from("managed_user_profiles").update({
          full_name: options.fullName,
          email: options.email,
          phone: options.phone,
          is_active: options.isActive,
          student_id: options.studentId ?? null,
          teacher_id: options.teacherId ?? null,
        }).eq("auth_user_id", options.authUserId).eq("school_id", options.schoolId);

  const { error } = await managedQuery;
  if (!error) {
    return;
  }

  if (!isMissingTableError(error, "managed_user_profiles")) {
    throw error;
  }

  const serviceSupabase = createServiceSupabaseClient();
  const legacyPayload = {
    id: options.authUserId,
    school_id: options.schoolId,
    role: options.role,
    full_name: options.fullName,
    email: options.email,
    phone: options.phone,
    is_active: options.isActive,
  };

  const legacyResult =
    options.mode === "insert"
      ? await serviceSupabase.from("user_profiles").upsert(legacyPayload, { onConflict: "id" })
      : await serviceSupabase.from("user_profiles").update(legacyPayload).eq("id", options.authUserId);

  if (legacyResult.error) {
    throw legacyResult.error;
  }
}

// Ensure profile link exists
export async function ensureManagedUserProfileLink(
  actorSupabase: RouteSupabaseClient,
  options: {
    authUserId: string;
    schoolId: string;
    role: ManagedUserRole;
    fullName: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    studentId?: string | null;
    teacherId?: string | null;
    createdBy?: string | null;
  },
) {
  try {
    await persistManagedUserProfile(actorSupabase, {
      mode: "insert",
      authUserId: options.authUserId,
      schoolId: options.schoolId,
      role: options.role,
      fullName: options.fullName,
      email: options.email,
      phone: options.phone,
      isActive: options.isActive,
      studentId: options.studentId,
      teacherId: options.teacherId,
      createdBy: options.createdBy,
    });
    return;
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: string | null }).code ?? "")
        : "";

    if (code !== "23505") {
      throw error;
    }
  }

  await persistManagedUserProfile(actorSupabase, {
    mode: "update",
    authUserId: options.authUserId,
    schoolId: options.schoolId,
    role: options.role,
    fullName: options.fullName,
    email: options.email,
    phone: options.phone,
    isActive: options.isActive,
    studentId: options.studentId,
    teacherId: options.teacherId,
    createdBy: options.createdBy,
  });
}

// Sync account state
export async function syncManagedUserAccountState(
  actorSupabase: RouteSupabaseClient,
  options: {
    authUserId: string;
    schoolId: string;
    role: ManagedUserRole;
    fullName: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    studentId?: string | null;
    teacherId?: string | null;
    createdBy?: string | null;
    temporaryPassword?: string | null;
    touchPrintTimestamp?: boolean;
  },
) {
  await ensureManagedUserProfileLink(actorSupabase, {
    authUserId: options.authUserId,
    schoolId: options.schoolId,
    role: options.role,
    fullName: options.fullName,
    email: options.email,
    phone: options.phone,
    isActive: options.isActive,
    studentId: options.studentId,
    teacherId: options.teacherId,
    createdBy: options.createdBy,
  });

  if (typeof options.temporaryPassword === "string" && options.temporaryPassword.trim()) {
    await upsertManagedUserCredential(actorSupabase, {
      authUserId: options.authUserId,
      schoolId: options.schoolId,
      loginIdentifier: options.email,
      temporaryPassword: options.temporaryPassword,
      touchPrintTimestamp: options.touchPrintTimestamp,
    });
  }

  await syncManagedAuthIdentityMetadata({
    authUserId: options.authUserId,
    role: options.role,
    schoolId: options.schoolId,
    fullName: options.fullName,
    loginIdentifier: options.email,
    createdBy: options.createdBy,
    isActive: options.isActive,
  });
}

// Build teacher classes taught
export function buildTeacherClassesTaught(assignments: { subject_name: string; class_name: string; section?: string | null }[]) {
  return assignments.map((assignment) => ({
    subject_name: assignment.subject_name,
    class_name: assignment.class_name,
    section: assignment.section,
    grade: assignment.class_name,
  }));
}

// Re-export utilities for queries module
export {
  buildLegacyManagedUserRecord,
  firstRelation,
  getClassLookupName,
  getSectionLookupName,
  matchesLookupText,
  normalizeMatchKey,
  parseTeacherClassesTaught,
  teacherAssignmentMatchesStudent,
};
