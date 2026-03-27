import { NextRequest, NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/admin-infrastructure";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveSchoolScopedActorContext, tableHasColumn } from "@/lib/managed-users-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

type SettledQuery<T> = PromiseSettledResult<{ data: T | null; error: { message?: string } | null }>;

function readSettledData<T>(result: SettledQuery<T>, fallback: T): T {
  if (result.status !== "fulfilled") return fallback;
  if (result.value.error) return fallback;
  return (result.value.data ?? fallback) as T;
}

function readSettledWarning<T>(result: SettledQuery<T>, label: string) {
  if (result.status !== "fulfilled") {
    return `تعذر تحميل ${label} حالياً.`;
  }
  if (result.value.error) {
    return result.value.error.message || `تعذر تحميل ${label} حالياً.`;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const scope = (req.nextUrl.searchParams.get("scope")?.trim() || "all").toLowerCase();
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة الرواتب متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const rateLimited = enforceRateLimit(req, {
    namespace: "salaries-bootstrap",
    windowMs: 60_000,
    maxHits: 90,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const includeCore = scope === "all" || scope === "core";
  const includeReference = scope === "all" || scope === "reference";
  const includeArchive = scope === "all" || scope === "archive";

  const includeLecturePrice = includeCore
    ? await tableHasColumn(actorSupabase, "teachers", "lecture_price").catch(() => true)
    : true;
  const teacherSelect = includeLecturePrice
    ? "id, school_id, branch_id, full_name, subject, job_title, salary_type, phone, address, base_salary, lecture_price, weekly_hours, classes_taught, status"
    : "id, school_id, branch_id, full_name, subject, job_title, salary_type, phone, address, base_salary, weekly_hours, classes_taught, status";

  const results = await Promise.allSettled([
    includeCore
      ? actorSupabase
          .from("teachers")
          .select(teacherSelect)
          .eq("school_id", targetSchoolId)
          .order("full_name")
      : Promise.resolve({ data: [], error: null }),
    includeCore
      ? actorSupabase
          .from("salaries")
          .select("id, school_id, branch_id, teacher_id, gross_salary, deductions, month, is_paid, paid_at, notes, created_at, teachers(full_name,subject)")
          .eq("school_id", targetSchoolId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    includeReference
      ? actorSupabase
          .from("classes")
          .select("id, school_id, branch_id, grade, section")
          .eq("school_id", targetSchoolId)
          .order("grade")
          .order("section")
      : Promise.resolve({ data: [], error: null }),
    includeReference
      ? actorSupabase
          .from("subjects")
          .select("id, school_id, name")
          .eq("school_id", targetSchoolId)
          .order("name")
      : Promise.resolve({ data: [], error: null }),
    includeReference
      ? actorSupabase
          .from("job_titles")
          .select("id, school_id, name")
          .eq("school_id", targetSchoolId)
          .order("name")
      : Promise.resolve({ data: [], error: null }),
    includeReference
      ? actorSupabase
          .from("lesson_times")
          .select("id, school_id, period, session_type, start_time, end_time")
          .eq("school_id", targetSchoolId)
          .order("session_type")
          .order("period")
      : Promise.resolve({ data: [], error: null }),
    includeReference
      ? actorSupabase
          .from("lecture_prices")
          .select("id, school_id, grade, price_per_lecture")
          .eq("school_id", targetSchoolId)
      : Promise.resolve({ data: [], error: null }),
    includeArchive
      ? actorSupabase
          .from("salary_archives")
          .select("id, school_id, month, total_teachers, total_amount, data, archive_date")
          .eq("school_id", targetSchoolId)
          .order("archive_date", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const archiveResult = results[7];
  const archiveWarning =
    archiveResult.status === "fulfilled" &&
    archiveResult.value.error &&
    isMissingTableError(archiveResult.value.error, "salary_archives")
      ? null
      : readSettledWarning(archiveResult, "أرشيف الرواتب");

  return NextResponse.json({
    ok: true,
    teachers: readSettledData(results[0], []),
    salaries:
      readSettledData(results[1], []).map((item: Record<string, unknown>) => ({
        ...item,
        teachers: Array.isArray(item.teachers) ? item.teachers[0] ?? null : item.teachers ?? null,
      })),
    classes: readSettledData(results[2], []),
    subjects: readSettledData(results[3], []),
    jobTitles: readSettledData(results[4], []),
    lessonTimes: readSettledData(results[5], []),
    lecturePrices: readSettledData(results[6], []),
    archives:
      archiveResult.status === "fulfilled" && archiveResult.value.error && isMissingTableError(archiveResult.value.error, "salary_archives")
        ? []
        : readSettledData(results[7], []),
    warnings: [
      readSettledWarning(results[0], "قائمة الأساتذة"),
      readSettledWarning(results[1], "سجل الرواتب"),
      readSettledWarning(results[2], "الصفوف"),
      readSettledWarning(results[3], "المواد"),
      readSettledWarning(results[4], "المسميات الوظيفية"),
      readSettledWarning(results[5], "توقيتات الدروس"),
      readSettledWarning(results[6], "أسعار المحاضرات"),
      archiveWarning,
    ].filter(Boolean),
  });
}
