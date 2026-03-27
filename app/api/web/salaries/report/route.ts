import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const teacherId = req.nextUrl.searchParams.get("teacherId");
  const view = req.nextUrl.searchParams.get("view")?.trim() || "details";
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "تقارير الرواتب متاحة للإدارة فقط.",
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
    namespace: "salaries-report",
    windowMs: 60_000,
    maxHits: 75,
    identifier: actorUserId,
  });
  if (rateLimited) {
    return rateLimited;
  }

  let query = actorSupabase
    .from("daily_lectures")
    .select("id, teacher_id, grade, section, period, session_type, lecture_date, price, teachers(full_name,subject)")
    .eq("school_id", targetSchoolId)
    .order("lecture_date", { ascending: false });

  if (teacherId) {
    query = query.eq("teacher_id", teacherId);
  }

  const { data, error } = await query;
  if (error) {
    return jsonError(error.message || "تعذر تحميل التقرير التفصيلي للرواتب.", 500);
  }

  if (view === "summary") {
    const summaryMap = new Map<
      string,
      {
        teacher_id: string;
        full_name: string;
        subject: string;
        lectureCount: number;
        lectureTotal: number;
        byGrade: Record<string, number>;
      }
    >();

    for (const lecture of data ?? []) {
      const teacher = Array.isArray(lecture.teachers) ? lecture.teachers[0] ?? null : lecture.teachers ?? null;
      const key = String(lecture.teacher_id ?? "");
      if (!key) continue;

      const current =
        summaryMap.get(key) ??
        {
          teacher_id: key,
          full_name: String(teacher?.full_name ?? "—"),
          subject: String(teacher?.subject ?? ""),
          lectureCount: 0,
          lectureTotal: 0,
          byGrade: {},
        };

      const grade = String(lecture.grade ?? "—");
      current.lectureCount += 1;
      current.lectureTotal += Number(lecture.price ?? 0) || 0;
      current.byGrade[grade] = (current.byGrade[grade] ?? 0) + 1;
      summaryMap.set(key, current);
    }

    const summary = Array.from(summaryMap.values()).sort((left, right) => right.lectureTotal - left.lectureTotal);
    return NextResponse.json({
      ok: true,
      summary,
      totals: {
        lectureCount: summary.reduce((sum, item) => sum + item.lectureCount, 0),
        total: summary.reduce((sum, item) => sum + item.lectureTotal, 0),
      },
    });
  }

  return NextResponse.json({
    ok: true,
    lectures: (data ?? []).map((item) => ({
      ...item,
      teachers: Array.isArray(item.teachers) ? item.teachers[0] ?? null : item.teachers ?? null,
    })),
  });
}
