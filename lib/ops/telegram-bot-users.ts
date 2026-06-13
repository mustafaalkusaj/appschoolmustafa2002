import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase-server";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── getUsersOverview ─────────────────────────────────────────────────────────

export async function getUsersOverview(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const monthStart = new Date(now);
    monthStart.setDate(now.getDate() - 30);

    const [allResult, todayResult, weekResult, monthResult] = await Promise.all([
      supabase.from("managed_user_profiles").select("id, role"),
      supabase
        .from("managed_user_profiles")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("managed_user_profiles")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", weekStart.toISOString()),
      supabase
        .from("managed_user_profiles")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", monthStart.toISOString()),
    ]);

    const all = (allResult.data ?? []) as Array<{ role: string }>;
    const roleCounts: Record<string, number> = {};
    for (const row of all) {
      const r = row.role ?? "unknown";
      roleCounts[r] = (roleCounts[r] ?? 0) + 1;
    }

    const lines: string[] = [
      `👥 <b>نظرة عامة على المستخدمين</b>`,
      "",
      `الإجمالي: <b>${all.length}</b>`,
      "",
      "<b>حسب الدور:</b>",
      ...Object.entries(roleCounts).map(
        ([role, count]) => `  ${escHtml(role)}: <b>${count}</b>`,
      ),
      "",
      "<b>الحسابات الجديدة:</b>",
      `  اليوم: <b>${todayResult.count ?? 0}</b>`,
      `  هذا الأسبوع: <b>${weekResult.count ?? 0}</b>`,
      `  هذا الشهر: <b>${monthResult.count ?? 0}</b>`,
    ];

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر جلب بيانات المستخدمين: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── searchUser ───────────────────────────────────────────────────────────────

export async function searchUser(query: string): Promise<string> {
  try {
    if (!query?.trim()) {
      return "⚠️ مطلوب: نص البحث\nمثال: /search أحمد";
    }

    const supabase = createServiceSupabaseClient();

    const { data, error } = await supabase
      .from("managed_user_profiles")
      .select("id, full_name, role, school_id, is_active")
      .ilike("full_name", `%${query.trim()}%`)
      .limit(5);

    if (error) {
      return `❌ تعذر البحث: ${escHtml(error.message.slice(0, 100))}`;
    }

    const users = (data ?? []) as Array<{
      id: string;
      full_name: string | null;
      role: string | null;
      school_id: string | null;
      is_active: boolean | null;
    }>;

    if (users.length === 0) {
      return `🔍 لا نتائج لـ "<b>${escHtml(query.slice(0, 50))}</b>"`;
    }

    const lines: string[] = [
      `🔍 <b>نتائج البحث عن "${escHtml(query.slice(0, 30))}"</b>`,
      `${users.length} نتيجة`,
      "",
    ];

    for (const user of users) {
      const active = user.is_active !== false ? "✅" : "❌";
      lines.push(
        `${active} <b>${escHtml(user.full_name ?? "—")}</b>`,
        `  الدور: ${escHtml(user.role ?? "—")} | المدرسة: ${user.school_id ? "[id]" : "—"}`,
      );
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر البحث: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── getNewUsers ──────────────────────────────────────────────────────────────

export async function getNewUsers(days = 1): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("managed_user_profiles")
      .select("id, full_name, role, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (error) {
      return `❌ تعذر جلب المستخدمين الجدد: ${escHtml(error.message.slice(0, 100))}`;
    }

    const users = (data ?? []) as Array<{
      id: string;
      full_name: string | null;
      role: string | null;
      created_at: string;
    }>;

    const label = days === 1 ? "اليوم" : `آخر ${days} أيام`;

    if (users.length === 0) {
      return `👥 لا مستخدمين جدد (${label})`;
    }

    const roleCounts: Record<string, number> = {};
    for (const u of users) {
      const r = u.role ?? "unknown";
      roleCounts[r] = (roleCounts[r] ?? 0) + 1;
    }

    const lines: string[] = [
      `🆕 <b>المستخدمون الجدد — ${label}</b>`,
      `الإجمالي: <b>${users.length}</b>`,
      "",
      "<b>حسب الدور:</b>",
      ...Object.entries(roleCounts).map(([r, c]) => `  ${escHtml(r)}: ${c}`),
      "",
      "<b>آخر 5:</b>",
      ...users.slice(0, 5).map((u) => {
        const date = new Date(u.created_at).toLocaleString("ar-IQ", {
          timeZone: "Asia/Baghdad",
          hour: "2-digit",
          minute: "2-digit",
        });
        return `• ${escHtml(u.full_name ?? "—")} (${escHtml(u.role ?? "—")}) — ${date}`;
      }),
    ];

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر جلب المستخدمين الجدد: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── getInactiveUsers ─────────────────────────────────────────────────────────

export async function getInactiveUsers(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const [inactiveResult, totalResult] = await Promise.all([
      supabase
        .from("managed_user_profiles")
        .select("id, role")
        .eq("is_active", false),
      supabase
        .from("managed_user_profiles")
        .select("id", { head: true, count: "exact" }),
    ]);

    const inactive = (inactiveResult.data ?? []) as Array<{ role: string }>;
    const total = totalResult.count ?? 0;

    const roleCounts: Record<string, number> = {};
    for (const u of inactive) {
      const r = u.role ?? "unknown";
      roleCounts[r] = (roleCounts[r] ?? 0) + 1;
    }

    const lines: string[] = [
      `💤 <b>المستخدمون غير النشطين</b>`,
      "",
      `إجمالي المستخدمين: <b>${total}</b>`,
      `غير نشطين: <b>${inactive.length}</b>`,
    ];

    if (inactive.length > 0) {
      lines.push(
        "",
        "<b>حسب الدور:</b>",
        ...Object.entries(roleCounts).map(([r, c]) => `  ${escHtml(r)}: ${c}`),
      );
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر جلب المستخدمين غير النشطين: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}
