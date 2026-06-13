import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const schoolId = params.get("schoolId");

  // ── Auth ────────────────────────────────────────────────────────────────────
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "إدارة الدرجات متاحة ضمن نطاق المدرسة الحالية فقط.",
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

  // ── Rate limit ───────────────────────────────────────────────────────────────
  const rateLimited = await enforceRateLimit(req, {
    namespace: "grades-my-summary",
    windowMs: 60_000,
    maxHits: 60,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  // ── Permission ──────────────────────────────────────────────────────────────
  const canView = await routeUserHasPermission(actorSupabase, actorUserId, "view_grades");
  if (!canView) {
    return jsonError("ليس لديك صلاحية عرض الدرجات.", 403);
  }

  const gate = { available: true };

  // ── Resolve teacher_id from auth_user_id ────────────────────────────────────
  const { data: teacherRows, error: teacherError } = await actorSupabase
    .from("teachers")
    .select("id")
    .eq("school_id", targetSchoolId)
    .eq("auth_user_id", actorUserId)
    .limit(1);

  if (teacherError) {
    // Non-teacher roles (admin) get an empty summary rather than an error
    return NextResponse.json({ ok: true, gate, data: [] });
  }

  const teacherRow = (teacherRows ?? [])[0] as { id: string } | undefined;

  if (!teacherRow) {
    // User is not a teacher in this school — return empty list
    return NextResponse.json({ ok: true, gate, data: [] });
  }

  const teacherId = teacherRow.id;

  // ── Fetch grade_entries for this teacher ─────────────────────────────────────
  const { data: entries, error: entriesError } = await actorSupabase
    .from("grade_entries")
    .select("subject_id, class_id, status, total_score")
    .eq("school_id", targetSchoolId)
    .eq("teacher_id", teacherId);

  if (entriesError) {
    if (entriesError.message?.includes("could not find the table")) {
      return NextResponse.json({
        ok: false,
        gate: { available: false, code: "missing_table", message: "جدول grade_entries غير جاهز بعد في Supabase." },
        data: [],
      });
    }
    return jsonError("تعذر تحميل ملخص الدرجات.", 500);
  }

  const rows = (entries ?? []) as Array<{
    subject_id: string | null;
    class_id: string | null;
    status: string;
    total_score: number | null;
  }>;

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, gate, data: [] });
  }

  // ── Lookup subject and class names ──────────────────────────────────────────
  const subjectIds = Array.from(new Set(rows.map((r) => r.subject_id).filter(Boolean))) as string[];
  const classIds = Array.from(new Set(rows.map((r) => r.class_id).filter(Boolean))) as string[];

  const [{ data: subjectData }, { data: classData }] = await Promise.all([
    actorSupabase.from("subjects").select("id, name").in("id", subjectIds),
    actorSupabase.from("classes").select("id, name").in("id", classIds),
  ]);

  const subjectMap = new Map<string, string>(
    ((subjectData ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]),
  );
  const classMap = new Map<string, string>(
    ((classData ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]),
  );

  // ── Group by (subject_id, class_id) ─────────────────────────────────────────
  type SummaryKey = string;
  interface SummaryAccumulator {
    subjectId: string;
    subjectName: string;
    classId: string | null;
    className: string | null;
    totalEntries: number;
    draftCount: number;
    confirmedCount: number;
    lockedCount: number;
    totalScoreSum: number;
    scoredCount: number;
  }

  const grouped = new Map<SummaryKey, SummaryAccumulator>();

  for (const row of rows) {
    const key = `${row.subject_id ?? ""}__${row.class_id ?? ""}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        subjectId: row.subject_id ?? "",
        subjectName: row.subject_id ? (subjectMap.get(row.subject_id) ?? row.subject_id) : "",
        classId: row.class_id ?? null,
        className: row.class_id ? (classMap.get(row.class_id) ?? null) : null,
        totalEntries: 0,
        draftCount: 0,
        confirmedCount: 0,
        lockedCount: 0,
        totalScoreSum: 0,
        scoredCount: 0,
      });
    }
    const acc = grouped.get(key)!;
    acc.totalEntries += 1;
    if (row.status === "draft") acc.draftCount += 1;
    else if (row.status === "confirmed") acc.confirmedCount += 1;
    else if (row.status === "locked") acc.lockedCount += 1;
    if (row.total_score !== null) {
      acc.totalScoreSum += row.total_score;
      acc.scoredCount += 1;
    }
  }

  const summary = Array.from(grouped.values()).map((acc) => ({
    subjectId: acc.subjectId,
    subjectName: acc.subjectName,
    classId: acc.classId,
    className: acc.className,
    totalEntries: acc.totalEntries,
    draftCount: acc.draftCount,
    confirmedCount: acc.confirmedCount,
    lockedCount: acc.lockedCount,
    avgScore: acc.scoredCount > 0 ? Math.round((acc.totalScoreSum / acc.scoredCount) * 10) / 10 : null,
  }));

  return NextResponse.json({ ok: true, gate, data: summary });
}
