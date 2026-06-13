import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { InlineKeyboard } from "@/lib/ops/telegram-bot-api";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── getSchoolsOverview ───────────────────────────────────────────────────────

export async function getSchoolsOverview(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const [schoolsResult, studentsResult, teachersResult, subsResult] = await Promise.all([
      supabase.from("schools").select("id, name, is_active"),
      supabase.from("students").select("id, school_id"),
      supabase.from("teachers").select("id, school_id"),
      supabase
        .from("subscriptions")
        .select("school_id, status, end_date")
        .order("created_at", { ascending: false }),
    ]);

    const schools = (schoolsResult.data ?? []) as Array<{
      id: string;
      name: string;
      is_active: boolean | null;
    }>;

    if (schools.length === 0) {
      return "🏫 لا توجد مدارس مسجلة.";
    }

    // Build lookup maps
    const studentsBySchool = new Map<string, number>();
    for (const s of (studentsResult.data ?? []) as Array<{ school_id: string }>) {
      studentsBySchool.set(s.school_id, (studentsBySchool.get(s.school_id) ?? 0) + 1);
    }

    const teachersBySchool = new Map<string, number>();
    for (const t of (teachersResult.data ?? []) as Array<{ school_id: string }>) {
      teachersBySchool.set(t.school_id, (teachersBySchool.get(t.school_id) ?? 0) + 1);
    }

    // Latest subscription per school
    const latestSub = new Map<string, { status: string; end_date: string | null }>();
    for (const sub of (subsResult.data ?? []) as Array<{
      school_id: string;
      status: string;
      end_date: string | null;
    }>) {
      if (!latestSub.has(sub.school_id)) {
        latestSub.set(sub.school_id, { status: sub.status, end_date: sub.end_date });
      }
    }

    const lines: string[] = [
      `🏫 <b>المدارس — نظرة عامة</b>`,
      `الإجمالي: <b>${schools.length}</b> مدرسة`,
      "",
    ];

    for (const school of schools) {
      const students = studentsBySchool.get(school.id) ?? 0;
      const teachers = teachersBySchool.get(school.id) ?? 0;
      const sub = latestSub.get(school.id);
      const subStatus = sub?.status ?? "—";
      const subIcon =
        subStatus === "active" ? "🟢" : subStatus === "expired" ? "🔴" : "🟡";
      const activeIcon = school.is_active !== false ? "✅" : "❌";

      lines.push(
        `${activeIcon} <b>${escHtml(school.name)}</b>`,
        `  طلاب: ${students} | معلمون: ${teachers} | اشتراك: ${subIcon} ${escHtml(subStatus)}`,
      );
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر جلب بيانات المدارس: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ غير معروف")}`;
  }
}

// ─── getSchoolDetail ──────────────────────────────────────────────────────────

export async function getSchoolDetail(schoolNameOrId: string): Promise<string> {
  try {
    if (!schoolNameOrId?.trim()) {
      return "⚠️ مطلوب: اسم المدرسة أو ID";
    }

    const supabase = createServiceSupabaseClient();

    // Try by ID first, then by name
    let { data: schools } = await supabase
      .from("schools")
      .select("id, name, is_active, created_at")
      .eq("id", schoolNameOrId.trim())
      .limit(1);

    if (!schools || schools.length === 0) {
      const result = await supabase
        .from("schools")
        .select("id, name, is_active, created_at")
        .ilike("name", `%${schoolNameOrId.trim()}%`)
        .limit(1);
      schools = result.data;
    }

    if (!schools || schools.length === 0) {
      return `❌ لم يُعثر على مدرسة: <code>${escHtml(schoolNameOrId.slice(0, 50))}</code>`;
    }

    const school = schools[0] as {
      id: string;
      name: string;
      is_active: boolean | null;
      created_at: string;
    };

    const [studentsResult, teachersResult, subsResult, gradesResult, attendanceResult] =
      await Promise.all([
        supabase
          .from("students")
          .select("id", { head: true, count: "exact" })
          .eq("school_id", school.id),
        supabase
          .from("teachers")
          .select("id", { head: true, count: "exact" })
          .eq("school_id", school.id),
        supabase
          .from("subscriptions")
          .select("status, plan, end_date")
          .eq("school_id", school.id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("grades")
          .select("id", { head: true, count: "exact" })
          .eq("school_id", school.id),
        supabase
          .from("attendance_records")
          .select("id", { head: true, count: "exact" })
          .eq("school_id", school.id),
      ]);

    const sub = (subsResult.data ?? [])[0] as
      | { status: string; plan: string | null; end_date: string | null }
      | undefined;

    const subIcon =
      sub?.status === "active" ? "🟢" : sub?.status === "expired" ? "🔴" : "🟡";

    const createdDate = new Date(school.created_at).toLocaleDateString("ar-IQ", {
      timeZone: "Asia/Baghdad",
    });

    const lines: string[] = [
      `🏫 <b>${escHtml(school.name)}</b>`,
      `الحالة: ${school.is_active !== false ? "✅ نشطة" : "❌ معطلة"}`,
      `تاريخ الإنشاء: ${createdDate}`,
      "",
      `👨‍🎓 الطلاب: <b>${studentsResult.count ?? 0}</b>`,
      `👨‍🏫 المعلمون: <b>${teachersResult.count ?? 0}</b>`,
      `📝 الدرجات: <b>${gradesResult.count ?? 0}</b>`,
      `📋 الحضور: <b>${attendanceResult.count ?? 0}</b>`,
    ];

    if (sub) {
      lines.push(
        "",
        `الاشتراك: ${subIcon} ${escHtml(sub.status)}`,
        sub.plan ? `الخطة: ${escHtml(sub.plan)}` : "",
        sub.end_date
          ? `ينتهي في: ${new Date(sub.end_date).toLocaleDateString("ar-IQ", { timeZone: "Asia/Baghdad" })}`
          : "",
      );
    } else {
      lines.push("", "الاشتراك: لا يوجد");
    }

    return lines.filter((l) => l !== "").join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر جلب تفاصيل المدرسة: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── buildSchoolsButtons ──────────────────────────────────────────────────────

export function buildSchoolsButtons(
  schools: Array<{ id: string; name: string }>,
): InlineKeyboard {
  const rows: InlineKeyboard = [];
  for (const school of schools.slice(0, 10)) {
    rows.push([
      {
        text: `🏫 ${school.name.slice(0, 30)}`,
        callback_data: `school_${school.id.slice(0, 36)}`,
      },
    ]);
  }
  return rows;
}
