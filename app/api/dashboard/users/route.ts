import { NextRequest, NextResponse } from "next/server";

import { SCHOOL_BRAND } from "@/lib/branding";
import { isMissingColumnError, isMissingTableError } from "@/lib/admin-infrastructure";
import {
  MANAGED_USER_INACTIVE_BAN_DURATION,
  MANAGED_USER_ROLES,
  type ManagedUserAccountCard,
  type ManagedUserRecord,
  validateCreateManagedUserInput,
} from "@/lib/managed-users";
import {
  MANAGED_USER_SELECT,
  buildManagedUserAccountCard,
  buildTeacherClassesTaught,
  decorateManagedUsers,
  generateManagedLoginIdentifier,
  generateTemporaryPassword,
  normalizeManagedUserRecord,
  normalizeManagedUserRecords,
  replaceTeacherAssignments,
  resolveManagedUsersActorContext,
  resolveSchoolBranchId,
  upsertManagedUserCredential,
  type ManagedUsersActorContext,
} from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

function jsonError(message: string, status: number, fieldErrors?: Record<string, string>) {
  return NextResponse.json(
    {
      error: {
        message,
        ...(fieldErrors && Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
      },
    },
    { status },
  );
}

function getPostgrestStatus(error: { code?: string | null } | null | undefined, fallback = 500) {
  if (!error?.code) return fallback;
  if (error.code === "23505") return 409;
  if (error.code === "23503" || error.code === "23514") return 400;
  return fallback;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function buildImmediateAccountCard(input: {
  authUserId: string;
  schoolName: string;
  fullName: string;
  className: string;
  section: string | null;
  loginIdentifier: string;
  temporaryPassword: string;
}): ManagedUserAccountCard {
  return {
    auth_user_id: input.authUserId,
    role: "student",
    school_name: input.schoolName,
    school_logo_url: SCHOOL_BRAND.logo,
    full_name: input.fullName,
    class_name: input.className,
    section: input.section,
    login_identifier: input.loginIdentifier,
    temporary_password: input.temporaryPassword,
    instructions: [
      "افتح تطبيق المدرسة على الهاتف.",
      "أدخل معرّف الدخول وكلمة المرور المؤقتة كما هي.",
      "إذا تعذر الدخول، اطلب من الإدارة إعادة تعيين كلمة المرور المؤقتة.",
    ],
    generated_at: new Date().toISOString(),
  };
}

function buildImmediateManagedUser(input: {
  authUserId: string;
  schoolId: string;
  role: "student" | "teacher";
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  loginIdentifier: string;
  temporaryPassword: string;
  studentId?: string | null;
  teacherId?: string | null;
  student?: {
    class_name: string;
    section: string | null;
    address: string | null;
    total_fee: number;
    paid_fee: number;
    discount_value: number;
  } | null;
  teacher?: {
    specialization: string | null;
    notes: string | null;
    assignments: ManagedUserRecord["teacher"]["assignments"];
  } | null;
}): ManagedUserRecord {
  return {
    auth_user_id: input.authUserId,
    school_id: input.schoolId,
    role: input.role,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    is_active: input.isActive,
    created_at: input.createdAt,
    updated_at: input.createdAt,
    student:
      input.role === "student" && input.student
        ? {
            id: input.studentId ?? "",
            full_name: input.fullName,
            class_name: input.student.class_name,
            section: input.student.section,
            address: input.student.address,
            total_fee: input.student.total_fee,
            paid_fee: input.student.paid_fee,
            discount_value: input.student.discount_value,
            status: "active",
          }
        : null,
    teacher:
      input.role === "teacher" && input.teacher
        ? {
            id: input.teacherId ?? "",
            full_name: input.fullName,
            email: input.email,
            phone: input.phone,
            specialization: input.teacher.specialization,
            notes: input.teacher.notes,
            is_active: input.isActive,
            assignments: input.teacher.assignments,
          }
        : null,
    app_account: {
      login_identifier: input.loginIdentifier,
      has_temporary_password: true,
      password_last_reset_at: input.createdAt,
      card_last_printed_at: null,
    },
  };
}

async function tableHasColumn(
  actorSupabase: ManagedUsersActorContext["actorSupabase"],
  table: string,
  column: string,
) {
  const { error } = await actorSupabase.from(table).select(column).limit(1);

  if (!error) {
    return true;
  }

  if (isMissingColumnError(error, table, column)) {
    return false;
  }

  throw error;
}

type TeacherTableCapabilities = {
  specialization: boolean;
  subject: boolean;
  notes: boolean;
  is_active: boolean;
  status: boolean;
  classes_taught: boolean;
};

async function getTeacherTableCapabilities(
  actorSupabase: ManagedUsersActorContext["actorSupabase"],
): Promise<TeacherTableCapabilities> {
  const [
    specialization,
    subject,
    notes,
    is_active,
    status,
    classes_taught,
  ] = await Promise.all([
    tableHasColumn(actorSupabase, "teachers", "specialization"),
    tableHasColumn(actorSupabase, "teachers", "subject"),
    tableHasColumn(actorSupabase, "teachers", "notes"),
    tableHasColumn(actorSupabase, "teachers", "is_active"),
    tableHasColumn(actorSupabase, "teachers", "status"),
    tableHasColumn(actorSupabase, "teachers", "classes_taught"),
  ]);

  return {
    specialization,
    subject,
    notes,
    is_active,
    status,
    classes_taught,
  };
}

async function fallbackListUsersFromUserProfiles(
  actorSupabase: ManagedUsersActorContext["actorSupabase"],
  schoolId: string,
  filters: { roleFilter?: string | null; statusFilter?: string | null },
) {
  let query = actorSupabase
    .from("user_profiles")
    .select("id, school_id, role, full_name, email, phone, is_active, created_at")
    .eq("school_id", schoolId)
    .in("role", ["student", "teacher"])
    .order("created_at", { ascending: false });

  if (filters.roleFilter && MANAGED_USER_ROLES.includes(filters.roleFilter as (typeof MANAGED_USER_ROLES)[number])) {
    query = query.eq("role", filters.roleFilter);
  }

  if (filters.statusFilter === "active") {
    query = query.eq("is_active", true);
  } else if (filters.statusFilter === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data: profiles, error: profilesError } = await query;
  if (profilesError) {
    return { error: profilesError, users: [] as ManagedUserRecord[] };
  }

  const authUserIds = ((profiles ?? []) as Array<Record<string, unknown>>).map((profile) => String(profile.id));
  if (authUserIds.length === 0) {
    return { error: null, users: [] as ManagedUserRecord[] };
  }

  const [studentsLinkAvailable, teachersLinkAvailable] = await Promise.all([
    tableHasColumn(actorSupabase, "students", "auth_user_id"),
    tableHasColumn(actorSupabase, "teachers", "auth_user_id"),
  ]);

  const [studentsResult, teachersResult] = await Promise.all([
    studentsLinkAvailable
      ? actorSupabase.from("students").select("*").in("auth_user_id", authUserIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    teachersLinkAvailable
      ? actorSupabase.from("teachers").select("*").in("auth_user_id", authUserIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ]);

  if (studentsResult.error) {
    return { error: studentsResult.error, users: [] as ManagedUserRecord[] };
  }

  if (teachersResult.error) {
    return { error: teachersResult.error, users: [] as ManagedUserRecord[] };
  }

  const studentsByAuthId = new Map<string, Record<string, unknown>>(
    ((studentsResult.data ?? []) as Array<Record<string, unknown>>)
      .filter((student) => typeof student.auth_user_id === "string")
      .map((student) => [String(student.auth_user_id), student]),
  );
  const teachersByAuthId = new Map<string, Record<string, unknown>>(
    ((teachersResult.data ?? []) as Array<Record<string, unknown>>)
      .filter((teacher) => typeof teacher.auth_user_id === "string")
      .map((teacher) => [String(teacher.auth_user_id), teacher]),
  );

  const users = ((profiles ?? []) as Array<Record<string, unknown>>).map((profile) => {
    const authUserId = String(profile.id);
    const student = studentsByAuthId.get(authUserId) ?? null;
    const teacher = teachersByAuthId.get(authUserId) ?? null;
    const role = profile.role === "teacher" ? "teacher" : "student";
    const teacherStatus = typeof teacher?.status === "string" ? teacher.status.toLowerCase() : "";

    return {
      auth_user_id: authUserId,
      school_id: String(profile.school_id),
      role,
      full_name: typeof profile.full_name === "string" ? profile.full_name : "",
      email: typeof profile.email === "string" ? profile.email : "",
      phone: typeof profile.phone === "string" ? profile.phone : null,
      is_active: Boolean(profile.is_active),
      created_at: typeof profile.created_at === "string" ? profile.created_at : null,
      updated_at: null,
      student:
        role === "student" && student
          ? {
              id: String(student.id),
              full_name: typeof student.full_name === "string" ? student.full_name : null,
              class_name: typeof student.class_name === "string" ? student.class_name : null,
              section: typeof student.section === "string" ? student.section : null,
              address: typeof student.address === "string" ? student.address : null,
              total_fee: normalizeNumber(student.total_fee),
              paid_fee: normalizeNumber(student.paid_fee),
              discount_value: normalizeNumber(student.discount_value),
              status: typeof student.status === "string" ? student.status : null,
            }
          : null,
      teacher:
        role === "teacher" && teacher
          ? {
              id: String(teacher.id),
              full_name: typeof teacher.full_name === "string" ? teacher.full_name : null,
              email: typeof teacher.email === "string" ? teacher.email : null,
              phone: typeof teacher.phone === "string" ? teacher.phone : null,
              specialization:
                typeof teacher.specialization === "string"
                  ? teacher.specialization
                  : typeof teacher.subject === "string"
                    ? teacher.subject
                    : null,
              notes: typeof teacher.notes === "string" ? teacher.notes : null,
              is_active:
                typeof teacher.is_active === "boolean"
                  ? teacher.is_active
                  : teacherStatus !== "inactive" && teacherStatus !== "deleted",
              assignments: [],
            }
          : null,
      app_account: null,
    } satisfies ManagedUserRecord;
  });

  return { error: null, users };
}

async function cleanupCreatedUser(options: {
  actorSupabase?: ManagedUsersActorContext["actorSupabase"];
  authUserId?: string | null;
  role: "student" | "teacher";
  relatedRecordId?: string | null;
}) {
  if (options.authUserId) {
    const serviceSupabase = createServiceSupabaseClient();
    await serviceSupabase.auth.admin.deleteUser(options.authUserId);
  }

  if (options.actorSupabase && options.relatedRecordId) {
    const table = options.role === "student" ? "students" : "teachers";
    await options.actorSupabase.from(table).delete().eq("id", options.relatedRecordId);
  }
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const roleFilter = req.nextUrl.searchParams.get("role");
  const statusFilter = req.nextUrl.searchParams.get("status");

  const context = await resolveManagedUsersActorContext(schoolId);
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;

  let query = actorSupabase
    .from("managed_user_profiles")
    .select(MANAGED_USER_SELECT)
    .eq("school_id", targetSchoolId)
    .order("created_at", { ascending: false });

  if (roleFilter && MANAGED_USER_ROLES.includes(roleFilter as (typeof MANAGED_USER_ROLES)[number])) {
    query = query.eq("role", roleFilter);
  }

  if (statusFilter === "active") {
    query = query.eq("is_active", true);
  } else if (statusFilter === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error, "managed_user_profiles")) {
      const fallback = await fallbackListUsersFromUserProfiles(actorSupabase, targetSchoolId, {
        roleFilter,
        statusFilter,
      });
      if (fallback.error) {
        return jsonError(
          fallback.error.message || "تعذر تحميل الحسابات من ملفات المستخدمين الحالية.",
          getPostgrestStatus(fallback.error),
        );
      }

      const decoratedUsers = await decorateManagedUsers(actorSupabase, fallback.users);
      return NextResponse.json({
        ok: true,
        users: decoratedUsers,
      });
    }

    return jsonError(error.message || "تعذر تحميل الحسابات.", getPostgrestStatus(error));
  }

  const normalizedUsers = normalizeManagedUserRecords((data ?? []) as Record<string, unknown>[]);
  const decoratedUsers = await decorateManagedUsers(actorSupabase, normalizedUsers);

  return NextResponse.json({
    ok: true,
    users: decoratedUsers,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const validation = validateCreateManagedUserInput(body);
  if (!validation.ok) {
    return jsonError(
      "message" in validation ? validation.message : "تحقق من الحقول المطلوبة ثم أعد المحاولة.",
      400,
      "fieldErrors" in validation ? validation.fieldErrors : {},
    );
  }

  const context = await resolveManagedUsersActorContext(validation.value.school_id);
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const serviceSupabase = createServiceSupabaseClient();
  const branchId = await resolveSchoolBranchId(actorSupabase, targetSchoolId);
  const loginIdentifier = await generateManagedLoginIdentifier(actorSupabase, {
    schoolId: targetSchoolId,
    role: validation.value.role,
    fullName: validation.value.full_name,
    preferredEmail: validation.value.email,
  });
  const temporaryPassword = validation.value.password || generateTemporaryPassword();
  const linkTable = validation.value.role === "student" ? "students" : "teachers";
  const linkColumnProbe = await actorSupabase.from(linkTable).select("auth_user_id").limit(1);

  if (isMissingColumnError(linkColumnProbe.error, linkTable, "auth_user_id")) {
    return jsonError(
      `بيئة Supabase الحالية تفتقد عمود الربط \`${linkTable}.auth_user_id\`. شغّل ملفات الترحيل الخاصة بحسابات الطلاب والمدرسين قبل إنشاء الحسابات من لوحة الإدارة.`,
      500,
      {
        role: "قاعدة البيانات الحالية غير مهيأة بعد لربط الحسابات بسجلات الطلاب أو المدرسين.",
      },
    );
  }

  const managedProfileProbe = await actorSupabase.from("managed_user_profiles").select("auth_user_id").limit(1);
  const useManagedProfilesTable = !isMissingTableError(managedProfileProbe.error, "managed_user_profiles");
  const teacherTableCapabilities =
    validation.value.role === "teacher" ? await getTeacherTableCapabilities(actorSupabase) : null;
  const createdAt = new Date().toISOString();
  const { data: schoolRow } = await actorSupabase.from("schools").select("name").eq("id", targetSchoolId).maybeSingle();
  const schoolName = (schoolRow?.name as string | null) ?? SCHOOL_BRAND.nameAr;

  if (validation.value.role === "student" && !branchId) {
    return jsonError("يجب إضافة فرع واحد على الأقل للمدرسة قبل إنشاء حساب طالب.", 400, {
      role: "تعذر إنشاء سجل الطالب لعدم وجود فرع مرتبط بالمدرسة.",
    });
  }

  let relatedRecordId: string | null = null;
  let authUserId: string | null = null;

  try {
    if (validation.value.role === "student") {
      const { data: student, error: studentError } = await actorSupabase
        .from("students")
        .insert({
          school_id: targetSchoolId,
          branch_id: branchId,
          full_name: validation.value.full_name,
          class_name: validation.value.student!.class_name,
          section: validation.value.student!.section || "",
          phone: validation.value.phone,
          address: validation.value.student!.address,
          total_fee: validation.value.student!.total_fee,
          paid_fee: validation.value.student!.paid_fee,
          discount_value: validation.value.student!.discount_value,
          status: "active",
        })
        .select("id")
        .single();

      if (studentError || !student?.id) {
        return jsonError(studentError?.message || "تعذر إنشاء سجل الطالب.", getPostgrestStatus(studentError, 400));
      }

      relatedRecordId = student.id;
    } else {
      const teacherInsertPayload: Record<string, unknown> = {
        school_id: targetSchoolId,
        full_name: validation.value.full_name,
        email: loginIdentifier,
        phone: validation.value.phone,
      };

      if (branchId) {
        teacherInsertPayload.branch_id = branchId;
      }

      if (teacherTableCapabilities?.specialization) {
        teacherInsertPayload.specialization = validation.value.teacher?.specialization ?? null;
      } else if (teacherTableCapabilities?.subject) {
        teacherInsertPayload.subject = validation.value.teacher?.specialization ?? null;
      }

      if (teacherTableCapabilities?.notes) {
        teacherInsertPayload.notes = validation.value.teacher?.notes ?? null;
      }

      if (teacherTableCapabilities?.is_active) {
        teacherInsertPayload.is_active = validation.value.is_active;
      } else if (teacherTableCapabilities?.status) {
        teacherInsertPayload.status = validation.value.is_active ? "active" : "inactive";
      }

      if (teacherTableCapabilities?.classes_taught) {
        teacherInsertPayload.classes_taught = buildTeacherClassesTaught(validation.value.teacher?.assignments ?? []);
      }

      const { data: teacher, error: teacherError } = await actorSupabase
        .from("teachers")
        .insert(teacherInsertPayload)
        .select("id")
        .single();

      if (teacherError || !teacher?.id) {
        return jsonError(teacherError?.message || "تعذر إنشاء سجل المدرس.", getPostgrestStatus(teacherError, 400));
      }

      relatedRecordId = teacher.id;
    }

    const { data: authData, error: createAuthError } = await serviceSupabase.auth.admin.createUser({
      email: loginIdentifier,
      password: temporaryPassword,
      email_confirm: true,
      app_metadata: {
        managed_credentials: {
          login_identifier: loginIdentifier,
          temporary_password: temporaryPassword,
          password_last_reset_at: createdAt,
          card_last_printed_at: null,
        },
      },
      user_metadata: {
        accountType: "managed_user",
        managedRole: validation.value.role,
        schoolId: targetSchoolId,
        full_name: validation.value.full_name,
        loginIdentifier,
        createdBy: actorUserId,
      },
    });

    if (createAuthError || !authData?.user) {
      await cleanupCreatedUser({
        actorSupabase,
        role: validation.value.role,
        relatedRecordId,
      });

      const status = createAuthError?.message?.toLowerCase().includes("already") ? 409 : 400;
      return jsonError(createAuthError?.message || "تعذر إنشاء مستخدم المصادقة.", status, {
        email: "تعذر استخدام معرّف الدخول المحدد.",
      });
    }

    authUserId = authData.user.id;

    if (!validation.value.is_active) {
      const { error: banError } = await serviceSupabase.auth.admin.updateUserById(authUserId, {
        ban_duration: MANAGED_USER_INACTIVE_BAN_DURATION,
      });

      if (banError) {
        await cleanupCreatedUser({
          actorSupabase,
          authUserId,
          role: validation.value.role,
          relatedRecordId,
        });
        return jsonError(banError.message || "تعذر تعطيل الحساب الجديد.", 500);
      }
    }

    const relatedTable = validation.value.role === "student" ? "students" : "teachers";
    const { error: linkRelatedRecordError } = await actorSupabase
      .from(relatedTable)
      .update({ auth_user_id: authUserId })
      .eq("id", relatedRecordId);

    if (linkRelatedRecordError) {
      await cleanupCreatedUser({
        actorSupabase,
        authUserId,
        role: validation.value.role,
        relatedRecordId,
      });
      return jsonError(
        linkRelatedRecordError.message || "تم إنشاء المستخدم لكن تعذر ربطه بالسجل المطلوب.",
        getPostgrestStatus(linkRelatedRecordError, 400),
      );
    }

    const profilePayload = {
      id: authUserId,
      auth_user_id: authUserId,
      school_id: targetSchoolId,
      role: validation.value.role,
      full_name: validation.value.full_name,
      email: loginIdentifier,
      phone: validation.value.phone,
      is_active: validation.value.is_active,
      student_id: validation.value.role === "student" ? relatedRecordId : null,
      teacher_id: validation.value.role === "teacher" ? relatedRecordId : null,
      created_by: actorUserId,
    };

    const profileInsert = useManagedProfilesTable
      ? await actorSupabase.from("managed_user_profiles").insert(profilePayload)
      : await serviceSupabase.from("user_profiles").insert({
          id: authUserId,
          school_id: targetSchoolId,
          role: validation.value.role,
          full_name: validation.value.full_name,
          email: loginIdentifier,
          phone: validation.value.phone,
          is_active: validation.value.is_active,
        });

    const profileError = profileInsert.error;
    if (profileError) {
      await cleanupCreatedUser({
        authUserId,
        actorSupabase,
        role: validation.value.role,
        relatedRecordId,
      });

      return jsonError(profileError.message || "تعذر إنشاء ملف الحساب.", getPostgrestStatus(profileError, 400));
    }

    if (validation.value.role === "teacher" && relatedRecordId) {
      await replaceTeacherAssignments(actorSupabase, {
        schoolId: targetSchoolId,
        teacherId: relatedRecordId,
        assignments: validation.value.teacher?.assignments ?? [],
      });
    }

    try {
      await upsertManagedUserCredential(actorSupabase, {
        authUserId,
        schoolId: targetSchoolId,
        loginIdentifier,
        temporaryPassword,
      });
    } catch (credentialError) {
      if (!isMissingTableError(credentialError, "managed_user_credentials")) {
        throw credentialError;
      }
    }

    let decoratedUser: ManagedUserRecord | null = null;
    let accountCard: ManagedUserAccountCard | null = null;

    if (useManagedProfilesTable) {
      const { data: createdUser, error: fetchError } = await actorSupabase
        .from("managed_user_profiles")
        .select(MANAGED_USER_SELECT)
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (fetchError) {
        return jsonError(fetchError.message || "تم إنشاء الحساب لكن تعذر تحميله.", 500);
      }

      [decoratedUser] = await decorateManagedUsers(
        actorSupabase,
        createdUser ? [normalizeManagedUserRecord(createdUser as Record<string, unknown>)] : [],
      );
      accountCard = validation.value.role === "student" && decoratedUser
        ? await buildManagedUserAccountCard(actorSupabase, decoratedUser)
        : null;
    } else {
      decoratedUser = buildImmediateManagedUser({
        authUserId,
        schoolId: targetSchoolId,
        role: validation.value.role,
        fullName: validation.value.full_name,
        email: loginIdentifier,
        phone: validation.value.phone,
        isActive: validation.value.is_active,
        createdAt,
        loginIdentifier,
        temporaryPassword,
        studentId: validation.value.role === "student" ? relatedRecordId : null,
        teacherId: validation.value.role === "teacher" ? relatedRecordId : null,
        student:
          validation.value.role === "student"
            ? {
                class_name: validation.value.student!.class_name,
                section: validation.value.student!.section,
                address: validation.value.student!.address,
                total_fee: validation.value.student!.total_fee,
                paid_fee: validation.value.student!.paid_fee,
                discount_value: validation.value.student!.discount_value,
              }
            : null,
        teacher:
          validation.value.role === "teacher"
            ? {
                specialization: validation.value.teacher?.specialization ?? null,
                notes: validation.value.teacher?.notes ?? null,
                assignments:
                  (validation.value.teacher?.assignments ?? []).map((assignment, index) => ({
                    id: `pending-${index}`,
                    subject_id: null,
                    subject_name: assignment.subject_name,
                    class_id: null,
                    class_name: assignment.class_name,
                    section_id: null,
                    section_name: assignment.section,
                    is_active: true,
                  })),
              }
            : null,
      });
      accountCard =
        validation.value.role === "student"
          ? buildImmediateAccountCard({
              authUserId,
              schoolName,
              fullName: validation.value.full_name,
              className: validation.value.student!.class_name,
              section: validation.value.student!.section,
              loginIdentifier,
              temporaryPassword,
            })
          : null;
    }

    return NextResponse.json(
      {
        ok: true,
        user: decoratedUser,
        accountCard,
      },
      { status: 201 },
    );
  } catch (error) {
    await cleanupCreatedUser({
      authUserId,
      actorSupabase,
      role: validation.value.role,
      relatedRecordId,
    });

    return jsonError(
      error instanceof Error ? error.message : "تعذر إنشاء الحساب المطلوب.",
      500,
    );
  }
}
