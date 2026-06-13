import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3030";
const OUTPUT_DIR = path.join(process.cwd(), "artifacts", "reliability-audit");
const ADMIN_STORAGE_STATE = path.join(OUTPUT_DIR, "admin-storage-state.json");
const SUPER_ADMIN_STORAGE_STATE = path.join(OUTPUT_DIR, "super-admin-storage-state.json");

const ADMIN_ROUTES = [
  "/ar/dashboard",
  "/ar/students",
  "/ar/teachers",
  "/ar/payments",
  "/ar/reports",
  "/ar/salaries",
];

const SUPER_ADMIN_ROUTES = ["/ar/super-admin"];

function parseEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function percentile(sortedValues, ratio) {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * ratio) - 1));
  return sortedValues[index];
}

function summarizeLatencies(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);

  return {
    minMs: sorted[0] ?? 0,
    avgMs: sorted.length ? total / sorted.length : 0,
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99),
    maxMs: sorted[sorted.length - 1] ?? 0,
  };
}

async function readStorageStateCookies(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const state = JSON.parse(raw);
    const target = new URL(BASE_URL);
    const cookies = (state.cookies || []).filter((cookie) => {
      const matchesDomain =
        cookie.domain === target.hostname ||
        cookie.domain === `.${target.hostname}` ||
        target.hostname.endsWith(cookie.domain.replace(/^\./, ""));
      return matchesDomain;
    });

    if (cookies.length === 0) {
      return null;
    }

    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  } catch {
    return null;
  }
}

async function expectOk(response, context) {
  if (!response.ok) {
    throw new Error(`${context} returned ${response.status}`);
  }
}

async function createAuthedSupabaseClient(env, email, password) {
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user?.id) {
    throw new Error(`Failed to sign in as ${email}: ${error?.message || "unknown error"}`);
  }

  const { data: profile, error: profileError } = await client
    .from("user_profiles")
    .select("school_id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to load profile for ${email}: ${profileError.message}`);
  }

  return {
    client,
    userId: data.user.id,
    schoolId: typeof profile?.school_id === "string" ? profile.school_id : null,
  };
}

async function hasColumn(client, table, column) {
  const { error } = await client.from(table).select(`id, ${column}`).limit(1);
  if (!error) return true;
  const message = (error.message || "").toLowerCase();
  return !(message.includes(table.toLowerCase()) && message.includes(column.toLowerCase()) && message.includes("does not exist"));
}

async function runStage(name, concurrency, iterationsPerWorker, task) {
  const latencies = [];
  const failures = [];
  let completed = 0;
  let succeeded = 0;

  await Promise.all(
    Array.from({ length: concurrency }, async (_, workerIndex) => {
      for (let iteration = 0; iteration < iterationsPerWorker; iteration += 1) {
        const startedAt = performance.now();
        try {
          await task({ workerIndex, iteration });
          succeeded += 1;
        } catch (error) {
          failures.push(error instanceof Error ? error.message : String(error));
        } finally {
          latencies.push(performance.now() - startedAt);
          completed += 1;
        }
      }
    }),
  );

  return {
    name,
    concurrency,
    iterationsPerWorker,
    completed,
    succeeded,
    failed: failures.length,
    latency: summarizeLatencies(latencies),
    sampleFailures: failures.slice(0, 5),
  };
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const env = parseEnv(await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8"));
  const adminCookies = await readStorageStateCookies(ADMIN_STORAGE_STATE);
  const superAdminCookies = await readStorageStateCookies(SUPER_ADMIN_STORAGE_STATE);
  const adminAuth = await createAuthedSupabaseClient(env, "admin@schoolapp.com", "Admin@12345");
  const compat = {
    classFeesSchoolScope: await hasColumn(adminAuth.client, "class_fees", "school_id"),
  };

  const tasks = {
    async adminRouteRequest() {
      if (!adminCookies) {
        throw new Error("Missing admin storage state cookies. Run browser-functional-audit first.");
      }

      const route = pickRandom(ADMIN_ROUTES);
      const response = await fetch(`${BASE_URL}${route}`, {
        headers: { cookie: adminCookies },
      });
      await expectOk(response, route);
      await response.text();
    },
    async superAdminRouteRequest() {
      if (!superAdminCookies) {
        throw new Error("Missing super-admin storage state cookies. Run browser-functional-audit first.");
      }

      const route = pickRandom(SUPER_ADMIN_ROUTES);
      const response = await fetch(`${BASE_URL}${route}`, {
        headers: { cookie: superAdminCookies },
      });
      await expectOk(response, route);
      await response.text();
    },
    async teachersApiRequest() {
      if (!adminCookies || !adminAuth.schoolId) {
        throw new Error("Admin school context is unavailable for teachers API audit.");
      }

      const response = await fetch(
        `${BASE_URL}/api/dashboard/users?schoolId=${encodeURIComponent(adminAuth.schoolId)}&role=teacher&page=1&pageSize=25&search=admin`,
        {
          headers: { cookie: adminCookies },
        },
      );
      await expectOk(response, "teachers API");
      await response.json();
    },
    async dashboardQuerySet() {
      if (!adminAuth.schoolId) {
        throw new Error("Admin school context is unavailable for dashboard query audit.");
      }

      const schoolId = adminAuth.schoolId;
      let compatClassFees = adminAuth.client
        .from("class_fees")
        .select("*")
        .order("class_name", { ascending: true });
      if (compat.classFeesSchoolScope) {
        compatClassFees = compatClassFees.eq("school_id", schoolId);
      }

      const [studentsResult, paymentsResult, feesResult] = await Promise.all([
        adminAuth.client
          .from("students")
          .select("id, full_name, class_name, total_fee, paid_fee, remaining_fee, discount_value, status")
          .eq("school_id", schoolId)
          .neq("status", "deleted"),
        adminAuth.client
          .from("payments")
          .select("id, amount, created_at, student_id")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(5),
        compatClassFees,
      ]);

      if (studentsResult.error || paymentsResult.error || feesResult.error) {
        throw new Error(
          studentsResult.error?.message ||
            paymentsResult.error?.message ||
            feesResult.error?.message ||
            "Dashboard query set failed.",
        );
      }
    },
    async studentsQuerySet() {
      if (!adminAuth.schoolId) {
        throw new Error("Admin school context is unavailable for student query audit.");
      }

      const { error } = await adminAuth.client
        .from("students")
        .select("*", { count: "exact", head: false })
        .eq("school_id", adminAuth.schoolId)
        .in("status", ["active", "graduated", "archived", "withdrawn"])
        .range(0, 49)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
    },
    async reportsQuerySet() {
      if (!adminAuth.schoolId) {
        throw new Error("Admin school context is unavailable for reports query audit.");
      }

      const schoolId = adminAuth.schoolId;
      const [studentsResult, paymentsResult, expensesResult, salariesResult] = await Promise.all([
        adminAuth.client
          .from("students")
          .select("id, full_name, class_name, total_fee, paid_fee, remaining_fee, status, phone, address")
          .eq("school_id", schoolId)
          .neq("status", "deleted")
          .order("created_at", { ascending: false }),
        adminAuth.client
          .from("payments")
          .select("id, amount, created_at, payment_method, receipt_number, notes, students(full_name,class_name)")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false }),
        adminAuth.client
          .from("expenses")
          .select("id, amount, expense_date, recipient, receipt_number, notes, expense_types(name)")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false }),
        adminAuth.client
          .from("salaries")
          .select("id, gross_salary, deductions, month, paid_at, is_paid, teachers(full_name,subject)")
          .eq("school_id", schoolId)
          .order("paid_at", { ascending: false }),
      ]);

      if (studentsResult.error || paymentsResult.error || expensesResult.error || salariesResult.error) {
        throw new Error(
          studentsResult.error?.message ||
            paymentsResult.error?.message ||
            expensesResult.error?.message ||
            salariesResult.error?.message ||
            "Reports query set failed.",
        );
      }
    },
    async salariesQuerySet() {
      if (!adminAuth.schoolId) {
        throw new Error("Admin school context is unavailable for salaries query audit.");
      }

      const schoolId = adminAuth.schoolId;
      const [teachersResult, salariesResult, classesResult, subjectsResult, jobTitlesResult, lessonTimesResult, lecturePricesResult, archivesResult] =
        await Promise.all([
          adminAuth.client.from("teachers").select("*").eq("school_id", schoolId).order("full_name"),
          adminAuth.client
            .from("salaries")
            .select("*, teachers(full_name,subject)")
            .eq("school_id", schoolId)
            .order("created_at", { ascending: false }),
          adminAuth.client.from("classes").select("*").eq("school_id", schoolId).order("grade"),
          adminAuth.client.from("subjects").select("*").eq("school_id", schoolId).order("name"),
          adminAuth.client.from("job_titles").select("*").eq("school_id", schoolId).order("name"),
          adminAuth.client
            .from("lesson_times")
            .select("*")
            .eq("school_id", schoolId)
            .order("session_type")
            .order("period"),
          adminAuth.client.from("lecture_prices").select("*").eq("school_id", schoolId),
          adminAuth.client
            .from("salary_archives")
            .select("*")
            .eq("school_id", schoolId)
            .order("archive_date", { ascending: false }),
        ]);

      const firstError =
        teachersResult.error ||
        salariesResult.error ||
        classesResult.error ||
        subjectsResult.error ||
        jobTitlesResult.error ||
        lessonTimesResult.error ||
        lecturePricesResult.error ||
        archivesResult.error;

      if (firstError) {
        throw new Error(firstError.message);
      }
    },
    async loginCycle() {
      const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await client.auth.signInWithPassword({
        email: "employee@schoolapp.com",
        password: "Employee@12345",
      });
      if (error) {
        throw new Error(error.message);
      }
      await client.auth.signOut();
    },
  };

  const results = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    adminSchoolId: adminAuth.schoolId,
    storageStateAvailable: {
      admin: Boolean(adminCookies),
      superAdmin: Boolean(superAdminCookies),
    },
    stages: [],
  };

  const stageDefinitions = [
    { name: "low-admin-routes", concurrency: 1, iterationsPerWorker: 4, task: tasks.adminRouteRequest },
    { name: "low-super-admin-routes", concurrency: 1, iterationsPerWorker: 3, task: tasks.superAdminRouteRequest },
    { name: "low-teachers-api", concurrency: 1, iterationsPerWorker: 4, task: tasks.teachersApiRequest },
    { name: "low-dashboard-queries", concurrency: 1, iterationsPerWorker: 4, task: tasks.dashboardQuerySet },
    { name: "low-students-query", concurrency: 1, iterationsPerWorker: 4, task: tasks.studentsQuerySet },
    { name: "moderate-admin-routes", concurrency: 4, iterationsPerWorker: 5, task: tasks.adminRouteRequest },
    { name: "moderate-teachers-api", concurrency: 4, iterationsPerWorker: 5, task: tasks.teachersApiRequest },
    { name: "moderate-dashboard-queries", concurrency: 4, iterationsPerWorker: 5, task: tasks.dashboardQuerySet },
    { name: "moderate-reports-queries", concurrency: 4, iterationsPerWorker: 3, task: tasks.reportsQuerySet },
    { name: "high-students-query", concurrency: 8, iterationsPerWorker: 4, task: tasks.studentsQuerySet },
    { name: "high-salaries-queries", concurrency: 6, iterationsPerWorker: 3, task: tasks.salariesQuerySet },
    { name: "burst-teachers-api", concurrency: 16, iterationsPerWorker: 2, task: tasks.teachersApiRequest },
    { name: "login-cycle", concurrency: 2, iterationsPerWorker: 3, task: tasks.loginCycle },
  ];

  for (const definition of stageDefinitions) {
    results.stages.push(await runStage(definition.name, definition.concurrency, definition.iterationsPerWorker, definition.task));
  }

  const outputPath = path.join(OUTPUT_DIR, "load-audit.json");
  await fs.writeFile(outputPath, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  await adminAuth.client.auth.signOut();
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
