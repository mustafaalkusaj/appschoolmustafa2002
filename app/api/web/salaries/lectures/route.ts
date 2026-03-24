import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function extractMonthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) {
    return null;
  }

  const start = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const endDate = new Date(year, monthNumber, 0).getDate();
  const end = `${year}-${String(monthNumber).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`;
  return { from: start, to: end };
}

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const view = req.nextUrl.searchParams.get("view")?.trim() || "calendar";
  const month = req.nextUrl.searchParams.get("month")?.trim() || "";
  const teacherId = req.nextUrl.searchParams.get("teacherId")?.trim() || "";

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "بيانات المحاضرات متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const range = extractMonthRange(month);
  if (!range) {
    return jsonError("الشهر المطلوب غير صالح.", 400);
  }

  if (view === "summary") {
    if (!teacherId) {
      return jsonError("الأستاذ المطلوب غير صالح.", 400);
    }

    const [{ data: teacher, error: teacherError }, { data: lectures, error: lecturesError }] = await Promise.all([
      context.value.actorSupabase
        .from("teachers")
        .select("id, lecture_price")
        .eq("id", teacherId)
        .eq("school_id", context.value.targetSchoolId)
        .maybeSingle(),
      context.value.actorSupabase
        .from("daily_lectures")
        .select("price")
        .eq("teacher_id", teacherId)
        .eq("school_id", context.value.targetSchoolId)
        .gte("lecture_date", range.from)
        .lte("lecture_date", range.to),
    ]);

    if (teacherError || !teacher?.id) {
      return jsonError("الأستاذ المطلوب غير موجود ضمن المدرسة الحالية.", 404);
    }

    if (lecturesError) {
      return jsonError(lecturesError.message || "تعذر تحميل ملخص محاضرات الأستاذ.", 500);
    }

    const fallbackPrice = Number(teacher.lecture_price ?? 0);
    const summary = (lectures ?? []).reduce(
      (acc, lecture) => {
        const price = Math.max(0, Number(lecture.price ?? 0) || fallbackPrice);
        acc.count += 1;
        acc.total += price;
        return acc;
      },
      { count: 0, total: 0 },
    );

    return NextResponse.json({
      ok: true,
      summary,
    });
  }

  const { data, error } = await context.value.actorSupabase
    .from("daily_lectures")
    .select("lecture_date")
    .eq("school_id", context.value.targetSchoolId)
    .gte("lecture_date", range.from)
    .lte("lecture_date", range.to)
    .order("lecture_date", { ascending: false });

  if (error) {
    return jsonError(error.message || "تعذر تحميل تقويم المحاضرات.", 500);
  }

  const dates = Array.from(new Set((data ?? []).map((item) => item.lecture_date).filter(Boolean)));
  return NextResponse.json({
    ok: true,
    dates,
  });
}
