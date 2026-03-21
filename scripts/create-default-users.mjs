import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().replace(/^\uFEFF/, "");
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
}

const cwd = process.cwd();
const envFromFile = loadEnvFile(path.join(cwd, ".env.local"));
const env = { ...envFromFile, ...process.env };

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const missingEnv = [];
if (!supabaseUrl) missingEnv.push("NEXT_PUBLIC_SUPABASE_URL");
if (!serviceRoleKey) missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");

if (missingEnv.length > 0) {
  console.error("[seed-users] Missing required env vars:");
  for (const key of missingEnv) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEFAULT_USERS = [
  {
    key: "super_admin",
    email: env.SEED_SUPER_ADMIN_EMAIL || "super.admin@schoolapp.com",
    password: env.SEED_SUPER_ADMIN_PASSWORD || "Owner@12345",
    full_name: "System Owner",
    role: "super_admin",
  },
  {
    key: "admin",
    email: env.SEED_ADMIN_EMAIL || "admin@schoolapp.com",
    password: env.SEED_ADMIN_PASSWORD || "Admin@12345",
    full_name: "School Admin",
    role: "admin",
  },
  {
    key: "employee",
    email: env.SEED_EMPLOYEE_EMAIL || "employee@schoolapp.com",
    password: env.SEED_EMPLOYEE_PASSWORD || "Employee@12345",
    full_name: "School Employee",
    role: "employee",
  },
  {
    key: "teacher",
    email: env.SEED_TEACHER_EMAIL || "teacher@schoolapp.com",
    password: env.SEED_TEACHER_PASSWORD || "Teacher@12345",
    full_name: "School Teacher",
    role: "teacher",
  },
];

async function ensureSchoolAndSubscription() {
  const schoolIdFromEnv = env.SEED_SCHOOL_ID || env.DEFAULT_SCHOOL_ID;
  if (schoolIdFromEnv) return schoolIdFromEnv;

  const { data: existingSchools, error: listErr } = await supabase
    .from("schools")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  if (listErr) {
    throw new Error(`Failed to load schools: ${listErr.message}`);
  }

  if (existingSchools?.[0]?.id) return existingSchools[0].id;

  const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: newSchool, error: schoolErr } = await supabase
    .from("schools")
    .insert({
      name: "المدرسة الافتراضية",
      is_active: true,
      subscription_end: endDate,
      city: "بغداد",
      plan: "basic",
    })
    .select("id")
    .single();

  if (schoolErr || !newSchool?.id) {
    throw new Error(`Failed to create school: ${schoolErr?.message || "unknown"}`);
  }

  await supabase.from("subscriptions").insert({
    school_id: newSchool.id,
    plan: "basic",
    status: "active",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: endDate,
  });

  await supabase.from("branches").insert({
    school_id: newSchool.id,
    name: "الفرع الرئيسي",
    is_main: true,
  });

  return newSchool.id;
}

async function loadAllUsersByEmail() {
  const perPage = 200;
  let page = 1;
  const all = [];

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Failed to list auth users: ${error.message}`);
    const users = data?.users || [];
    all.push(...users);
    if (users.length < perPage) break;
    page += 1;
  }

  const byEmail = new Map();
  for (const user of all) {
    if (user.email) byEmail.set(user.email.toLowerCase(), user);
  }
  return byEmail;
}

async function ensureAuthUser({ email, password }) {
  const emailLc = email.toLowerCase();
  const usersByEmail = await loadAllUsersByEmail();
  const existing = usersByEmail.get(emailLc);

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: { seeded: true },
    });
    if (error) throw new Error(`Failed to update auth user ${email}: ${error.message}`);
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { seeded: true },
  });

  if (error || !data?.user) {
    throw new Error(`Failed to create auth user ${email}: ${error?.message || "unknown"}`);
  }

  return data.user;
}

async function upsertProfile({ authUser, role, full_name, school_id }) {
  const payload = {
    id: authUser.id,
    email: authUser.email,
    full_name,
    role,
    school_id,
    is_active: true,
  };

  const { error } = await supabase
    .from("user_profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(`Failed to upsert profile for ${authUser.email}: ${error.message}`);
  }
}

async function main() {
  const schoolId = await ensureSchoolAndSubscription();
  const results = [];

  for (const account of DEFAULT_USERS) {
    const authUser = await ensureAuthUser(account);
    const school_id = account.role === "super_admin" ? null : schoolId;

    await upsertProfile({
      authUser,
      role: account.role,
      full_name: account.full_name,
      school_id,
    });

    results.push({
      role: account.role,
      email: account.email,
      password: account.password,
      school_id: school_id || "(none)",
    });
  }

  console.log("\n✅ Default users are ready:\n");
  console.table(results);
}

main().catch((err) => {
  console.error("\n❌ seed failed:");
  console.error(err.message || err);
  process.exit(1);
});
