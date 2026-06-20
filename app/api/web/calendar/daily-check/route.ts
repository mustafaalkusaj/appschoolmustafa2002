import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createInsiteNotification } from "@/lib/notifications/insite-service";
import type { NotificationCategory } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

// Called by Vercel Cron daily at 21:00 UTC (00:00 Baghdad GMT+3)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  // Fetch events happening tomorrow through next 7 days
  const { data: events, error: eventsError } = await supabase
    .from("calendar_events")
    .select("*")
    .gte("date", tomorrowStr)
    .lte("date", nextWeekStr);

  if (eventsError) {
    console.error("[calendar/daily-check] Events fetch error:", eventsError.message);
    return NextResponse.json({ ok: false, error: eventsError.message }, { status: 500 });
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ ok: true, message: "لا توجد أحداث قادمة", notified: 0 });
  }

  // Fetch all schools
  const { data: schools, error: schoolsError } = await supabase
    .from("schools")
    .select("id, name");

  if (schoolsError) {
    console.error("[calendar/daily-check] Schools fetch error:", schoolsError.message);
    return NextResponse.json({ ok: false, error: schoolsError.message }, { status: 500 });
  }

  let notified = 0;

  for (const school of schools ?? []) {
    const relevantEvents = events.filter(
      (e) => e.is_global || e.school_id === school.id,
    );
    if (relevantEvents.length === 0) continue;

    const tomorrowEvents = relevantEvents.filter((e) => e.date === tomorrowStr);
    const weekEvents = relevantEvents.filter((e) => e.date > tomorrowStr);

    const parts: string[] = [];

    if (tomorrowEvents.length > 0) {
      parts.push(`غداً: ${tomorrowEvents.map((e) => e.title).join("، ")}`);
    }

    if (weekEvents.length > 0) {
      const examEvents = weekEvents.filter((e) => e.type === "exam");
      if (examEvents.length > 0) {
        parts.push(`امتحانات خلال الأسبوع: ${examEvents.map((e) => e.title).join("، ")}`);
      }
      const holidayEvents = weekEvents.filter(
        (e) => e.type === "holiday" || e.type === "religious" || e.type === "national",
      );
      if (holidayEvents.length > 0) {
        parts.push(`عطلة قادمة: ${holidayEvents.map((e) => e.title).join("، ")}`);
      }
    }

    if (parts.length === 0) continue;

    const hasExamTomorrow = tomorrowEvents.some((e) => e.type === "exam");
    const hasHolidayTomorrow = tomorrowEvents.some(
      (e) => e.type === "holiday" || e.type === "religious" || e.type === "national",
    );

    const priority = hasExamTomorrow ? "urgent" : hasHolidayTomorrow ? "important" : "normal";
    const category: NotificationCategory = hasExamTomorrow
      ? "exams"
      : hasHolidayTomorrow
        ? "holiday"
        : "general";

    // ننشئ الإشعار عبر آلية الإرسال الموحّدة حتى تُملأ notification_recipients
    // (صندوق الوارد/غير المقروء يقرأ من هذا الجدول)، وإلا لن تصل التذكيرات للمستخدمين.
    // sentByUserId = null لأنه إشعار صادر عن النظام (cron) بلا فاعل بشري.
    const result = await createInsiteNotification(supabase, {
      schoolId: school.id,
      type: "insite",
      title: "تذكير بالتقويم المدرسي",
      body: parts.join(" | "),
      target: { targetType: "all" },
      priority,
      category,
      template: "reminder",
      sentByUserId: null,
    });

    if (!result.ok) {
      console.error(
        `[calendar/daily-check] Failed to notify school ${school.id}:`,
        result.error,
      );
    } else {
      notified++;
    }
  }

  return NextResponse.json({
    ok: true,
    notified,
    eventsFound: events.length,
    date: tomorrowStr,
  });
}
