import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { createClient, type PostgrestError, type SupabaseClient, type User } from "@supabase/supabase-js";

type EnvMap = Record<string, string>;

type SupportedAccountKey =
  | "super_admin"
  | "school_admin_a"
  | "school_admin_b"
  | "branch_admin_a"
  | "branch_admin_b"
  | "normal_user_a";

type SeedStatus = "created" | "reused";

type SeedAccountRecord = {
  key: SupportedAccountKey;
  email: string;
  role: "super_admin" | "admin" | "employee";
  schoolName: string | null;
  branchName: string | null;
  scopeLevel: "super_admin" | "group_admin" | "branch_user";
  createdOrReused: SeedStatus;
};

type SchemaFlags = {
  schoolsHasGroupId: boolean;
  schoolsHasPlan: boolean;
  schoolsHasIsActive: boolean;
  schoolsHasLogoUrl: boolean;
  branchesHasSchoolId: boolean;
  branchesHasIsActive: boolean;
  branchesHasLogoUrl: boolean;
  subscriptionsExists: boolean;
  subscriptionsHasPlan: boolean;
  subscriptionsHasStatus: boolean;
  subscriptionsHasStartDate: boolean;
  subscriptionsHasEndDate: boolean;
  schoolGroupsExists: boolean;
  teachersExists: boolean;
  teachersHasAuthUserId: boolean;
  studentsExists: boolean;
  studentsHasAuthUserId: boolean;
  studentsHasBranchId: boolean;
  userProfilesHasBranchId: boolean;
  userProfilesHasDefaultBranchId: boolean;
  userProfilesHasScopeLevel: boolean;
  userProfilesHasCustomPermissions: boolean;
};

type SeedContext = {
  env: EnvMap;
  supabase: SupabaseClient;
  schema: SchemaFlags;
  existingE2EEnv: EnvMap;
};

const OUTPUT_ENV_FILE = ".env.e2e.local";
const QA_SEED_FLAG = "QA_ALLOW_PRODUCTION_SEED";
const FUTURE_END_DATE = (() => {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 2);
  return date.toISOString().slice(0, 10);
})();
const TODAY = new Date().toISOString().slice(0, 10);

const SCHOOL_A_NAME = "QA_TEST_SCHOOL_A";
const SCHOOL_B_NAME = "QA_TEST_SCHOOL_B";
const BRANCH_A_NAME = "QA_TEST_BRANCH_A";
const BRANCH_B_NAME = "QA_TEST_BRANCH_B";
const GROUP_A_NAME = "QA_TEST_GROUP_A";
const GROUP_B_NAME = "QA_TEST_GROUP_B";

const ACCOUNT_DEFINITIONS: Array<{
  key: SupportedAccountKey;
  email: string;
  role: "super_admin" | "admin" | "employee";
  scopeLevel: "super_admin" | "group_admin" | "branch_user";
  schoolName: string | null;
  branchName: string | null;
  fullName: string;
}> = [
  {
    key: "super_admin",
    email: "qa.superadmin@example.test",
    role: "super_admin",
    scopeLevel: "super_admin",
    schoolName: null,
    branchName: null,
    fullName: "QA_TEST Super Admin",
  },
  {
    key: "school_admin_a",
    email: "qa.schooladmin.a@example.test",
    role: "admin",
    scopeLevel: "group_admin",
    schoolName: SCHOOL_A_NAME,
    branchName: null,
    fullName: "QA_TEST School Admin A",
  },
  {
    key: "school_admin_b",
    email: "qa.schooladmin.b@example.test",
    role: "admin",
    scopeLevel: "group_admin",
    schoolName: SCHOOL_B_NAME,
    branchName: null,
    fullName: "QA_TEST School Admin B",
  },
  {
    key: "branch_admin_a",
    email: "qa.branchadmin.a@example.test",
    role: "admin",
    scopeLevel: "branch_user",
    schoolName: SCHOOL_A_NAME,
    branchName: BRANCH_A_NAME,
    fullName: "QA_TEST Branch Admin A",
  },
  {
    key: "branch_admin_b",
    email: "qa.branchadmin.b@example.test",
    role: "admin",
    scopeLevel: "branch_user",
    schoolName: SCHOOL_A_NAME,
    branchName: BRANCH_B_NAME,
    fullName: "QA_TEST Branch Admin B",
  },
  {
    key: "normal_user_a",
    email: "qa.student.a@example.test",
    role: "employee",
    scopeLevel: "branch_user",
    schoolName: SCHOOL_A_NAME,
    branchName: BRANCH_A_NAME,
    fullName: "QA_TEST Normal User A",
  },
];

const LEGACY_E2E_KEY_MAP: Partial<Record<SupportedAccountKey, string>> = {
  super_admin: "E2E_SUPER_ADMIN",
  school_admin_a: "E2E_SCHOOL_ADMIN_A",
  branch_admin_a: "E2E_BRANCH_ADMIN_A",
  branch_admin_b: "E2E_BRANCH_ADMIN_B",
  normal_user_a: "E2E_NORMAL_USER",
};

function loadEnvFile(fileName: string): EnvMap {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return {};

  const result: EnvMap = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key) continue;

    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function mergeEnv(...envMaps: EnvMap[]) {
  const result: EnvMap = {};

  for (const envMap of envMaps) {
    for (const [key, value] of Object.entries(envMap)) {
      if (typeof value !== "string") continue;
      if (!value.trim()) continue;
      result[key] = value;
    }
  }

  return result;
}

function ensureRequiredEnv(env: EnvMap) {
  const missing = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (env[QA_SEED_FLAG] !== "true" && process.env[QA_SEED_FLAG] !== "true") {
    throw new Error(`${QA_SEED_FLAG} must be set to true before seeding production QA accounts.`);
  }
}

function generateStrongPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_+=";
  const alphabetLength = alphabet.length;
  const maxUnbiasedByte = Math.floor(256 / alphabetLength) * alphabetLength;
  let value = "Qa!";

  while (value.length < 27) {
    const byte = randomBytes(1)[0];
    if (byte >= maxUnbiasedByte) continue;
    value += alphabet[byte % alphabetLength];
  }

  return value;
}

function escapeEnvValue(value: string) {
  return JSON.stringify(value);
}

async function selectWorks(supabase: SupabaseClient, table: string, select: string) {
  const { error } = await supabase.from(table).select(select).limit(1);
  return !error;
}

async function tableExists(supabase: SupabaseClient, table: string) {
  const { error } = await supabase.from(table).select("id").limit(1);
  if (!error) return true;

  const code = (error as PostgrestError | null)?.code ?? "";
  const message = error.message.toLowerCase();
  if (code === "42P01" || code === "PGRST205" || message.includes("does not exist") || message.includes("could not find the table")) {
    return false;
  }

  throw error;
}

async function detectSchema(supabase: SupabaseClient): Promise<SchemaFlags> {
  const [
    schoolsHasGroupId,
    schoolsHasPlan,
    schoolsHasIsActive,
    schoolsHasLogoUrl,
    branchesHasSchoolId,
    branchesHasIsActive,
    branchesHasLogoUrl,
    subscriptionsExists,
    subscriptionsHasPlan,
    subscriptionsHasStatus,
    subscriptionsHasStartDate,
    subscriptionsHasEndDate,
    schoolGroupsExists,
    teachersExists,
    teachersHasAuthUserId,
    studentsExists,
    studentsHasAuthUserId,
    studentsHasBranchId,
    userProfilesHasBranchId,
    userProfilesHasDefaultBranchId,
    userProfilesHasScopeLevel,
    userProfilesHasCustomPermissions,
  ] = await Promise.all([
    selectWorks(supabase, "schools", "id,group_id").catch(() => false),
    selectWorks(supabase, "schools", "id,plan").catch(() => false),
    selectWorks(supabase, "schools", "id,is_active").catch(() => false),
    selectWorks(supabase, "schools", "id,logo_url").catch(() => false),
    selectWorks(supabase, "branches", "id,school_id").catch(() => false),
    selectWorks(supabase, "branches", "id,is_active").catch(() => false),
    selectWorks(supabase, "branches", "id,logo_url").catch(() => false),
    tableExists(supabase, "subscriptions").catch(() => false),
    selectWorks(supabase, "subscriptions", "id,plan").catch(() => false),
    selectWorks(supabase, "subscriptions", "id,status").catch(() => false),
    selectWorks(supabase, "subscriptions", "id,start_date").catch(() => false),
    selectWorks(supabase, "subscriptions", "id,end_date").catch(() => false),
    tableExists(supabase, "school_groups").catch(() => false),
    tableExists(supabase, "teachers").catch(() => false),
    selectWorks(supabase, "teachers", "id,auth_user_id").catch(() => false),
    tableExists(supabase, "students").catch(() => false),
    selectWorks(supabase, "students", "id,auth_user_id").catch(() => false),
    selectWorks(supabase, "students", "id,branch_id").catch(() => false),
    selectWorks(supabase, "user_profiles", "id,branch_id").catch(() => false),
    selectWorks(supabase, "user_profiles", "id,default_branch_id").catch(() => false),
    selectWorks(supabase, "user_profiles", "id,scope_level").catch(() => false),
    selectWorks(supabase, "user_profiles", "id,custom_permissions").catch(() => false),
  ]);

  return {
    schoolsHasGroupId,
    schoolsHasPlan,
    schoolsHasIsActive,
    schoolsHasLogoUrl,
    branchesHasSchoolId,
    branchesHasIsActive,
    branchesHasLogoUrl,
    subscriptionsExists,
    subscriptionsHasPlan,
    subscriptionsHasStatus,
    subscriptionsHasStartDate,
    subscriptionsHasEndDate,
    schoolGroupsExists,
    teachersExists,
    teachersHasAuthUserId,
    studentsExists,
    studentsHasAuthUserId,
    studentsHasBranchId,
    userProfilesHasBranchId,
    userProfilesHasDefaultBranchId,
    userProfilesHasScopeLevel,
    userProfilesHasCustomPermissions,
  };
}

async function ensureSchoolGroup(context: SeedContext, name: string) {
  if (!context.schema.schoolGroupsExists) return null;

  const { data: existing, error: existingError } = await context.supabase
    .from("school_groups")
    .select("id,name")
    .eq("name", name)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.id) return String(existing.id);

  const { data: created, error: createError } = await context.supabase
    .from("school_groups")
    .insert({ name })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw createError ?? new Error(`Failed to create school group ${name}.`);
  }

  return String(created.id);
}

async function ensureSchool(context: SeedContext, schoolName: string, groupName: string) {
  const { data: existing, error: existingError } = await context.supabase
    .from("schools")
    .select("id,name,group_id,is_active,plan,logo_url")
    .eq("name", schoolName)
    .maybeSingle();

  if (existingError) throw existingError;

  const groupId = context.schema.schoolsHasGroupId ? await ensureSchoolGroup(context, groupName) : null;
  const payload: Record<string, unknown> = {
    name: schoolName,
  };

  if (context.schema.schoolsHasIsActive) {
    payload.is_active = true;
  }
  if (context.schema.schoolsHasPlan) {
    payload.plan = "basic";
  }
  if (context.schema.schoolsHasLogoUrl) {
    payload.logo_url = null;
  }
  if (context.schema.schoolsHasGroupId && groupId) {
    payload.group_id = groupId;
  }

  if (existing?.id) {
    const { error: updateError } = await context.supabase
      .from("schools")
      .update(payload)
      .eq("id", existing.id);

    if (updateError) throw updateError;
    return { id: String(existing.id), status: "reused" as const };
  }

  const { data: created, error: createError } = await context.supabase
    .from("schools")
    .insert(payload)
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw createError ?? new Error(`Failed to create school ${schoolName}.`);
  }

  return { id: String(created.id), status: "created" as const };
}

async function ensureSubscription(context: SeedContext, schoolId: string) {
  if (!context.schema.subscriptionsExists) return;

  const { data: existing, error: existingError } = await context.supabase
    .from("subscriptions")
    .select("id,school_id,plan,status,start_date,end_date")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const payload: Record<string, unknown> = {
    school_id: schoolId,
  };

  if (context.schema.subscriptionsHasPlan) {
    payload.plan = "basic";
  }
  if (context.schema.subscriptionsHasStatus) {
    payload.status = "active";
  }
  if (context.schema.subscriptionsHasStartDate) {
    payload.start_date = TODAY;
  }
  if (context.schema.subscriptionsHasEndDate) {
    payload.end_date = FUTURE_END_DATE;
  }

  if (existing?.id) {
    const { error: updateError } = await context.supabase
      .from("subscriptions")
      .update(payload)
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: createError } = await context.supabase.from("subscriptions").insert(payload);
  if (createError) throw createError;
}

async function ensureBranch(context: SeedContext, schoolId: string, branchName: string) {
  const { data: existing, error: existingError } = await context.supabase
    .from("branches")
    .select("id,school_id,name,is_active,logo_url")
    .eq("school_id", schoolId)
    .eq("name", branchName)
    .maybeSingle();

  if (existingError) throw existingError;

  const payload: Record<string, unknown> = {
    school_id: schoolId,
    name: branchName,
  };

  if (context.schema.branchesHasIsActive) {
    payload.is_active = true;
  }
  if (context.schema.branchesHasLogoUrl) {
    payload.logo_url = null;
  }

  if (existing?.id) {
    const { error: updateError } = await context.supabase
      .from("branches")
      .update(payload)
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return { id: String(existing.id), status: "reused" as const };
  }

  const { data: created, error: createError } = await context.supabase
    .from("branches")
    .insert(payload)
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw createError ?? new Error(`Failed to create branch ${branchName}.`);
  }

  return { id: String(created.id), status: "created" as const };
}

async function listAllAuthUsersByEmail(context: SeedContext) {
  const usersByEmail = new Map<string, User>();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await context.supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data.users ?? [];
    for (const user of users) {
      if (user.email) {
        usersByEmail.set(user.email.toLowerCase(), user);
      }
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return usersByEmail;
}

async function ensureAuthUser(
  context: SeedContext,
  existingUsersByEmail: Map<string, User>,
  email: string,
  password: string,
  metadata: Record<string, unknown>,
) {
  const existing = existingUsersByEmail.get(email.toLowerCase());
  if (existing?.id) {
    const { data, error } = await context.supabase.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        ...metadata,
      },
    });

    if (error || !data.user) {
      throw error ?? new Error(`Failed to update auth user ${email}.`);
    }

    existingUsersByEmail.set(email.toLowerCase(), data.user);
    return { user: data.user, status: "reused" as const };
  }

  const { data, error } = await context.supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error || !data.user) {
    throw error ?? new Error(`Failed to create auth user ${email}.`);
  }

  existingUsersByEmail.set(email.toLowerCase(), data.user);
  return { user: data.user, status: "created" as const };
}

async function ensureUserProfile(
  context: SeedContext,
  input: {
    authUserId: string;
    email: string;
    fullName: string;
    role: "super_admin" | "admin" | "employee";
    schoolId: string | null;
    branchId: string | null;
    scopeLevel: "super_admin" | "group_admin" | "branch_user";
  },
) {
  const payload: Record<string, unknown> = {
    id: input.authUserId,
    email: input.email,
    full_name: input.fullName,
    role: input.role,
    school_id: input.role === "super_admin" ? null : input.schoolId,
    is_active: true,
  };

  if (context.schema.userProfilesHasBranchId) {
    payload.branch_id = input.branchId;
  }
  if (context.schema.userProfilesHasDefaultBranchId) {
    payload.default_branch_id = input.branchId;
  }
  if (context.schema.userProfilesHasScopeLevel) {
    payload.scope_level = input.scopeLevel;
  }
  if (context.schema.userProfilesHasCustomPermissions) {
    payload.custom_permissions = null;
  }

  const { error } = await context.supabase
    .from("user_profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) throw error;
}

async function ensureStudentFixture(
  context: SeedContext,
  input: {
    schoolId: string;
    branchId: string;
    fullName: string;
    className: string;
    section: string;
  },
) {
  if (!context.schema.studentsExists || !context.schema.studentsHasBranchId) return null;

  const { data: existing, error: existingError } = await context.supabase
    .from("students")
    .select("id")
    .eq("school_id", input.schoolId)
    .eq("branch_id", input.branchId)
    .eq("full_name", input.fullName)
    .maybeSingle();

  if (existingError) throw existingError;

  const payload = {
    school_id: input.schoolId,
    branch_id: input.branchId,
    full_name: input.fullName,
    class_name: input.className,
    section: input.section,
    address: "QA_TEST_ADDRESS",
    total_fee: 0,
    paid_fee: 0,
    discount_value: 0,
    status: "active",
  };

  if (existing?.id) {
    const { error: updateError } = await context.supabase
      .from("students")
      .update(payload)
      .eq("id", existing.id);
    if (updateError) throw updateError;
    return { id: String(existing.id), status: "reused" as const };
  }

  const { data: created, error: createError } = await context.supabase
    .from("students")
    .insert(payload)
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw createError ?? new Error(`Failed to create student fixture ${input.fullName}.`);
  }

  return { id: String(created.id), status: "created" as const };
}

async function buildSeedContext() {
  const env = mergeEnv(
    loadEnvFile(".env.local"),
    loadEnvFile(".env.vercel.local"),
    process.env as EnvMap,
  );

  ensureRequiredEnv(env);

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const schema = await detectSchema(supabase);

  if (!schema.userProfilesHasBranchId || !schema.userProfilesHasDefaultBranchId || !schema.userProfilesHasScopeLevel) {
    throw new Error("The production schema is missing scoped authorization columns on user_profiles.");
  }

  if (!schema.branchesHasSchoolId) {
    throw new Error("The production schema is missing branches.school_id, so branch-scoped QA accounts cannot be seeded safely.");
  }

  return {
    env,
    supabase,
    schema,
    existingE2EEnv: loadEnvFile(OUTPUT_ENV_FILE),
  } satisfies SeedContext;
}

async function main() {
  const context = await buildSeedContext();
  const existingUsersByEmail = await listAllAuthUsersByEmail(context);

  const schoolA = await ensureSchool(context, SCHOOL_A_NAME, GROUP_A_NAME);
  const schoolB = await ensureSchool(context, SCHOOL_B_NAME, GROUP_B_NAME);

  await Promise.all([
    ensureSubscription(context, schoolA.id),
    ensureSubscription(context, schoolB.id),
  ]);

  const branchA = await ensureBranch(context, schoolA.id, BRANCH_A_NAME);
  const branchB = await ensureBranch(context, schoolA.id, BRANCH_B_NAME);

  await Promise.all([
    ensureStudentFixture(context, {
      schoolId: schoolA.id,
      branchId: branchA.id,
      fullName: "QA_TEST_BRANCH_A_STUDENT",
      className: "QA_TEST_CLASS_A",
      section: "QA_TEST_SECTION_A",
    }),
    ensureStudentFixture(context, {
      schoolId: schoolA.id,
      branchId: branchB.id,
      fullName: "QA_TEST_BRANCH_B_STUDENT",
      className: "QA_TEST_CLASS_B",
      section: "QA_TEST_SECTION_B",
    }),
  ]);

  const seededAccounts: SeedAccountRecord[] = [];
  const envLines = [
    "# Auto-generated by scripts/qa-seed-e2e-accounts.ts",
    `PLAYWRIGHT_BASE_URL=${escapeEnvValue("https://appschoolmustafa2002.vercel.app")}`,
    `QA_E2E_SCHOOL_A_ID=${escapeEnvValue(schoolA.id)}`,
    `QA_E2E_SCHOOL_B_ID=${escapeEnvValue(schoolB.id)}`,
    `QA_E2E_BRANCH_A_ID=${escapeEnvValue(branchA.id)}`,
    `QA_E2E_BRANCH_B_ID=${escapeEnvValue(branchB.id)}`,
  ];

  for (const definition of ACCOUNT_DEFINITIONS) {
    const existingPassword = context.existingE2EEnv[`QA_E2E_${definition.key.toUpperCase()}_PASSWORD`];
    const password = existingPassword || generateStrongPassword();
    const schoolId =
      definition.schoolName === SCHOOL_A_NAME
        ? schoolA.id
        : definition.schoolName === SCHOOL_B_NAME
          ? schoolB.id
          : null;
    const branchId =
      definition.branchName === BRANCH_A_NAME
        ? branchA.id
        : definition.branchName === BRANCH_B_NAME
          ? branchB.id
          : null;

    const authState = await ensureAuthUser(
      context,
      existingUsersByEmail,
      definition.email,
      password,
      {
        qa_seeded: true,
        qa_seed_scope: "e2e",
        qa_seed_key: definition.key,
      },
    );

    await ensureUserProfile(context, {
      authUserId: authState.user.id,
      email: definition.email,
      fullName: definition.fullName,
      role: definition.role,
      schoolId,
      branchId,
      scopeLevel: definition.scopeLevel,
    });

    seededAccounts.push({
      key: definition.key,
      email: definition.email,
      role: definition.role,
      schoolName: definition.schoolName,
      branchName: definition.branchName,
      scopeLevel: definition.scopeLevel,
      createdOrReused: authState.status,
    });

    const envKeyPrefix = `QA_E2E_${definition.key.toUpperCase()}`;
    envLines.push(`${envKeyPrefix}_EMAIL=${escapeEnvValue(definition.email)}`);
    envLines.push(`${envKeyPrefix}_PASSWORD=${escapeEnvValue(password)}`);

    const legacyKeyPrefix = LEGACY_E2E_KEY_MAP[definition.key];
    if (legacyKeyPrefix) {
      envLines.push(`${legacyKeyPrefix}_EMAIL=${escapeEnvValue(definition.email)}`);
      envLines.push(`${legacyKeyPrefix}_PASSWORD=${escapeEnvValue(password)}`);
    }
  }

  fs.writeFileSync(path.join(process.cwd(), OUTPUT_ENV_FILE), `${envLines.join("\n")}\n`, "utf8");

  console.log(JSON.stringify({
    ok: true,
    schools: [
      { name: SCHOOL_A_NAME, status: schoolA.status, school_id: schoolA.id },
      { name: SCHOOL_B_NAME, status: schoolB.status, school_id: schoolB.id },
    ],
    branches: [
      { name: BRANCH_A_NAME, status: branchA.status, branch_id: branchA.id, school_id: schoolA.id },
      { name: BRANCH_B_NAME, status: branchB.status, branch_id: branchB.id, school_id: schoolA.id },
    ],
    accounts: seededAccounts.map((account) => ({
      email: account.email,
      role: account.role,
      scope_level: account.scopeLevel,
      school: account.schoolName,
      branch: account.branchName,
      created_or_reused: account.createdOrReused,
    })),
    unsupported: [
      {
        requested: "teacher",
        reason: "Current web RBAC only supports super_admin, admin, and employee roles in user_profiles.",
      },
    ],
    envFile: OUTPUT_ENV_FILE,
  }, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(1);
});
