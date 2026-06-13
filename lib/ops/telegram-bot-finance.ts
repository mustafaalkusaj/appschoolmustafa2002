import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase-server";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sumAmounts(rows: Array<Record<string, unknown>>): number {
  return rows.reduce((sum, p) => {
    const amt =
      typeof p.amount === "number"
        ? p.amount
        : parseFloat(String(p.amount ?? "0")) || 0;
    return sum + amt;
  }, 0);
}

// ─── getRevenueOverview ───────────────────────────────────────────────────────

export async function getRevenueOverview(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

    const [thisMonthResult, lastMonthResult, yearResult, unpaidResult] = await Promise.all([
      supabase.from("payments").select("id, amount").gte("created_at", thisMonthStart),
      supabase
        .from("payments")
        .select("id, amount")
        .gte("created_at", lastMonthStart)
        .lt("created_at", thisMonthStart),
      supabase.from("payments").select("id, amount").gte("created_at", yearStart),
      supabase
        .from("students")
        .select("id", { head: true, count: "exact" })
        .gt("remaining_fee", 0),
    ]);

    const thisMonth = sumAmounts((thisMonthResult.data ?? []) as Array<Record<string, unknown>>);
    const lastMonth = sumAmounts((lastMonthResult.data ?? []) as Array<Record<string, unknown>>);
    const year = sumAmounts((yearResult.data ?? []) as Array<Record<string, unknown>>);

    const monthName = now.toLocaleDateString("ar-IQ", {
      timeZone: "Asia/Baghdad",
      month: "long",
    });
    const lastMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString(
      "ar-IQ",
      { timeZone: "Asia/Baghdad", month: "long" },
    );

    const lines: string[] = [
      `💰 <b>نظرة عامة على الإيرادات</b>`,
      "",
      `${monthName}: <b>${thisMonth.toLocaleString("ar-IQ")} د.ع</b> (${(thisMonthResult.data ?? []).length} دفعة)`,
      `${lastMonthName}: <b>${lastMonth.toLocaleString("ar-IQ")} د.ع</b> (${(lastMonthResult.data ?? []).length} دفعة)`,
      `هذا العام: <b>${year.toLocaleString("ar-IQ")} د.ع</b>`,
      "",
      `طلاب برسوم متبقية: <b>${unpaidResult.count ?? 0}</b>`,
    ];

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر جلب بيانات الإيرادات: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── getUnpaidStudents ────────────────────────────────────────────────────────

export async function getUnpaidStudents(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const { data, error } = await supabase
      .from("students")
      .select("id, school_id, remaining_fee")
      .gt("remaining_fee", 0)
      .order("remaining_fee", { ascending: false });

    if (error) {
      return `❌ تعذر جلب بيانات المديونيات: ${escHtml(error.message.slice(0, 100))}`;
    }

    const students = (data ?? []) as Array<{
      id: string;
      school_id: string | null;
      remaining_fee: number;
    }>;

    if (students.length === 0) {
      return "✅ لا توجد رسوم متبقية لأي طالب.";
    }

    // Group by school
    const bySchool = new Map<string, { count: number; total: number }>();
    for (const s of students) {
      const key = s.school_id ?? "unknown";
      const fee =
        typeof s.remaining_fee === "number"
          ? s.remaining_fee
          : parseFloat(String(s.remaining_fee)) || 0;
      const existing = bySchool.get(key) ?? { count: 0, total: 0 };
      bySchool.set(key, { count: existing.count + 1, total: existing.total + fee });
    }

    const total = students.reduce((sum, s) => {
      const fee =
        typeof s.remaining_fee === "number"
          ? s.remaining_fee
          : parseFloat(String(s.remaining_fee)) || 0;
      return sum + fee;
    }, 0);

    const lines: string[] = [
      `💳 <b>الطلاب ذوو الرسوم المتبقية</b>`,
      "",
      `الإجمالي: <b>${students.length}</b> طالب`,
      `المبلغ الكلي: <b>${total.toLocaleString("ar-IQ")} د.ع</b>`,
      "",
      "<b>حسب المدرسة:</b>",
    ];

    for (const [schoolId, schoolStats] of Array.from(bySchool.entries())) {
      lines.push(
        `  [${escHtml(schoolId.slice(0, 8))}]: ${schoolStats.count} طالب — ${schoolStats.total.toLocaleString("ar-IQ")} د.ع`,
      );
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر جلب بيانات المديونيات: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── getAttendanceToday ───────────────────────────────────────────────────────

export async function getAttendanceToday(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    const tomorrowIso = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("attendance_records")
      .select("id, status, school_id")
      .gte("created_at", todayIso)
      .lt("created_at", tomorrowIso);

    if (error) {
      return `❌ تعذر جلب بيانات الحضور: ${escHtml(error.message.slice(0, 100))}`;
    }

    const records = (data ?? []) as Array<{
      id: string;
      status: string | null;
      school_id: string | null;
    }>;

    const present = records.filter(
      (r) => r.status === "present" || r.status === "حاضر",
    ).length;
    const absent = records.filter(
      (r) => r.status === "absent" || r.status === "غائب",
    ).length;
    const other = records.length - present - absent;

    const dateLabel = today.toLocaleDateString("ar-IQ", { timeZone: "Asia/Baghdad" });

    // Group by school
    const bySchool = new Map<string, number>();
    for (const r of records) {
      const key = r.school_id ?? "unknown";
      bySchool.set(key, (bySchool.get(key) ?? 0) + 1);
    }

    const lines: string[] = [
      `📋 <b>الحضور — ${dateLabel}</b>`,
      "",
      `الإجمالي: <b>${records.length}</b> سجل`,
      `✅ حاضر: <b>${present}</b>`,
      `❌ غائب: <b>${absent}</b>`,
      other > 0 ? `📌 أخرى: <b>${other}</b>` : "",
    ].filter(Boolean);

    if (bySchool.size > 0) {
      lines.push("", "<b>حسب المدرسة:</b>");
      for (const [schoolId, count] of Array.from(bySchool.entries())) {
        lines.push(`  [${escHtml(schoolId.slice(0, 8))}]: ${count} سجل`);
      }
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر جلب بيانات الحضور: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── getGradesToday ───────────────────────────────────────────────────────────

export async function getGradesToday(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    const tomorrowIso = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("grades")
      .select("id, school_id")
      .gte("created_at", todayIso)
      .lt("created_at", tomorrowIso);

    if (error) {
      return `❌ تعذر جلب بيانات الدرجات: ${escHtml(error.message.slice(0, 100))}`;
    }

    const grades = (data ?? []) as Array<{ id: string; school_id: string | null }>;
    const dateLabel = today.toLocaleDateString("ar-IQ", { timeZone: "Asia/Baghdad" });

    if (grades.length === 0) {
      return `📝 لا توجد درجات مُدخلة اليوم (${dateLabel})`;
    }

    const bySchool = new Map<string, number>();
    for (const g of grades) {
      const key = g.school_id ?? "unknown";
      bySchool.set(key, (bySchool.get(key) ?? 0) + 1);
    }

    const lines: string[] = [
      `📝 <b>الدرجات المُدخلة — ${dateLabel}</b>`,
      "",
      `الإجمالي: <b>${grades.length}</b> درجة`,
    ];

    if (bySchool.size > 0) {
      lines.push("", "<b>حسب المدرسة:</b>");
      for (const [schoolId, count] of Array.from(bySchool.entries())) {
        lines.push(`  [${escHtml(schoolId.slice(0, 8))}]: ${count} درجة`);
      }
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر جلب بيانات الدرجات: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}
