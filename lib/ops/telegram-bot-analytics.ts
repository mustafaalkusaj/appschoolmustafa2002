import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { InlineKeyboard } from "@/lib/ops/telegram-bot-api";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function barBlock(count: number, max: number, width = 10): string {
  if (max === 0) return "▱".repeat(width);
  const filled = Math.round((count / max) * width);
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

// ─── getFeatureUsage ──────────────────────────────────────────────────────────

export async function getFeatureUsage(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      gradesResult,
      attendanceResult,
      notificationsResult,
      assignmentsResult,
      calendarResult,
      paymentsResult,
    ] = await Promise.all([
      supabase
        .from("grades")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", monthStart),
      supabase
        .from("attendance_records")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", monthStart),
      supabase
        .from("notifications")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", monthStart),
      supabase
        .from("assignments")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", monthStart),
      supabase
        .from("calendar_events")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", monthStart),
      supabase
        .from("payments")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", monthStart),
    ]);

    const features = [
      { name: "الدرجات", count: gradesResult.count ?? 0, icon: "📝" },
      { name: "الحضور", count: attendanceResult.count ?? 0, icon: "📋" },
      { name: "الإشعارات", count: notificationsResult.count ?? 0, icon: "🔔" },
      { name: "الواجبات", count: assignmentsResult.count ?? 0, icon: "📚" },
      { name: "التقويم", count: calendarResult.count ?? 0, icon: "📅" },
      { name: "المدفوعات", count: paymentsResult.count ?? 0, icon: "💰" },
    ];

    const maxCount = Math.max(...features.map((f) => f.count), 1);
    const monthLabel = now.toLocaleDateString("ar-IQ", { month: "long", year: "numeric" });

    const lines = [
      `📊 <b>استخدام الميزات — ${escHtml(monthLabel)}</b>`,
      "",
    ];

    for (const f of features) {
      const bar = barBlock(f.count, maxCount);
      lines.push(`${f.icon} ${escHtml(f.name)}: ${bar} ${f.count}`);
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getUserJourneyStats ──────────────────────────────────────────────────────

export async function getUserJourneyStats(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const { data: profilesData } = await supabase
      .from("managed_user_profiles")
      .select("role, created_at, last_sign_in_at");

    const profiles = (profilesData ?? []) as Array<{
      role: string | null;
      created_at: string;
      last_sign_in_at: string | null;
    }>;

    // Count by role
    const roleCounts: Record<string, number> = {};
    const activeByRole: Record<string, number> = {};
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const p of profiles) {
      const role = p.role ?? "unknown";
      roleCounts[role] = (roleCounts[role] ?? 0) + 1;
      if (p.last_sign_in_at && new Date(p.last_sign_in_at) > sevenDaysAgo) {
        activeByRole[role] = (activeByRole[role] ?? 0) + 1;
      }
    }

    const lines = [
      `🛤️ <b>إحصائيات المستخدمين</b>`,
      `(تقدير بناءً على البيانات المتاحة)`,
      "",
      `الإجمالي: <b>${profiles.length}</b>`,
      `نشطون (7 أيام): <b>${Object.values(activeByRole).reduce((a, b) => a + b, 0)}</b>`,
      "",
      "<b>حسب الدور:</b>",
    ];

    for (const [role, total] of Object.entries(roleCounts)) {
      const active = activeByRole[role] ?? 0;
      const rate = total > 0 ? Math.round((active / total) * 100) : 0;
      lines.push(`• ${escHtml(role)}: ${total} (نشط: ${active} — ${rate}%)`);
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getSatisfactionResults ───────────────────────────────────────────────────

export async function getSatisfactionResults(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const { data, error } = await supabase
      .from("survey_results")
      .select("score, feedback, role, responded_at")
      .not("score", "is", null)
      .order("responded_at", { ascending: false })
      .limit(20);

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const results = (data ?? []) as Array<{
      score: number;
      feedback: string | null;
      role: string | null;
      responded_at: string | null;
    }>;

    if (results.length === 0) {
      return "📊 لا توجد نتائج استبيانات بعد.";
    }

    const avgScore =
      results.reduce((sum, r) => sum + (r.score ?? 0), 0) / results.length;

    const stars = "⭐".repeat(Math.round(avgScore));

    const lines = [
      `⭐ <b>نتائج رضا المستخدمين</b>`,
      "",
      `متوسط التقييم: ${stars} <b>${avgScore.toFixed(1)}/5</b>`,
      `عدد الردود: <b>${results.length}</b>`,
      "",
      "<b>آخر التعليقات:</b>",
    ];

    for (const r of results.slice(0, 5)) {
      if (r.feedback) {
        lines.push(
          `• ${escHtml(r.role ?? "—")} — ⭐${r.score}: ${escHtml(r.feedback.slice(0, 100))}`,
        );
      }
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── sendSatisfactionSurvey ───────────────────────────────────────────────────

export async function sendSatisfactionSurvey(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    // Count active managed users
    const { count } = await supabase
      .from("managed_user_profiles")
      .select("id", { head: true, count: "exact" });

    const userCount = count ?? 0;

    // Insert placeholder survey results
    const { error: insertError } = await supabase.from("survey_results").insert({
      score: null,
      feedback: null,
      role: "batch_survey",
      survey_sent_at: new Date().toISOString(),
      responded_at: null,
    });

    if (insertError) {
      // Non-blocking — log but proceed
      console.warn("[telegram-bot-analytics] survey insert warning:", insertError.message);
    }

    // Send notification to all active users
    const { data: users } = await supabase
      .from("managed_user_profiles")
      .select("user_id, role")
      .limit(500);

    if (users && users.length > 0) {
      const notifications = (users as Array<{ user_id: string; role: string | null }>).map(
        (u) => ({
          user_id: u.user_id,
          title: "استبيان رضا المستخدمين",
          body: "قيّم تجربتك مع النظام من 1-5 — رأيك يهمنا لتحسين الخدمة",
          type: "survey",
          is_read: false,
        }),
      );

      // Batch insert notifications
      await supabase.from("notifications").insert(notifications);
    }

    return [
      `✅ <b>تم إرسال الاستبيان</b>`,
      `عدد المستخدمين: <b>${userCount}</b>`,
      `السؤال: "قيّم تجربتك مع النظام من 1-5"`,
      "",
      "ستظهر النتائج في /satisfaction",
    ].join("\n");
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── SECURITY ─────────────────────────────────────────────────────────────────

export async function getRolesOverview(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const [managedResult, profilesResult] = await Promise.all([
      supabase.from("managed_user_profiles").select("role"),
      supabase.from("user_profiles").select("role"),
    ]);

    const countByRole = (rows: Array<{ role: string | null }>): Record<string, number> => {
      const counts: Record<string, number> = {};
      for (const r of rows) {
        const role = r.role ?? "unknown";
        counts[role] = (counts[role] ?? 0) + 1;
      }
      return counts;
    };

    const managedCounts = countByRole(
      (managedResult.data ?? []) as Array<{ role: string | null }>,
    );
    const profileCounts = countByRole(
      (profilesResult.data ?? []) as Array<{ role: string | null }>,
    );

    const lines = [
      `🔐 <b>نظرة عامة على الأدوار</b>`,
      "",
      "<b>managed_user_profiles:</b>",
      ...Object.entries(managedCounts).map(([r, n]) => `• ${escHtml(r)}: ${n}`),
      "",
      "<b>user_profiles:</b>",
      ...Object.entries(profileCounts).map(([r, n]) => `• ${escHtml(r)}: ${n}`),
      "",
      "<b>صلاحيات الأدوار:</b>",
      "• super_admin — وصول كامل للنظام",
      "• admin — إدارة المدرسة",
      "• teacher — الدرجات والحضور",
      "• student — عرض البيانات الشخصية",
      "• employee — وصول محدود",
    ];

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── get2faStatus ─────────────────────────────────────────────────────────────

export async function get2faStatus(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    // Count admin/super_admin users
    const { count: adminCount } = await supabase
      .from("user_profiles")
      .select("id", { head: true, count: "exact" })
      .in("role", ["admin", "super_admin"]);

    return [
      `🔑 <b>حالة المصادقة الثنائية (2FA)</b>`,
      "",
      `عدد المسؤولين: <b>${adminCount ?? "?"}</b>`,
      "",
      "ملاحظة: Supabase Auth يتحكم في إعدادات 2FA.",
      "لعرض وضبط إنفاذ 2FA:",
      "Supabase Dashboard → Authentication → Policies",
      "",
      "التوصية: فعّل 2FA الإلزامي لجميع super_admin.",
    ].join("\n");
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getRealtimeStats ─────────────────────────────────────────────────────────

export async function getRealtimeStats(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    // Query hourly_stats for recent data
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("hourly_stats")
      .select("active_users_web, active_users_mobile, recorded_at")
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: false })
      .limit(5);

    const lines = [`⚡ <b>إحصائيات Realtime</b>`, ""];

    if (error || !data || (data as Array<unknown>).length === 0) {
      lines.push("لا توجد بيانات realtime حديثة في hourly_stats.");
    } else {
      const stats = data as Array<{
        active_users_web: number | null;
        active_users_mobile: number | null;
        recorded_at: string;
      }>;

      for (const s of stats) {
        const time = new Date(s.recorded_at).toLocaleTimeString("ar-IQ", {
          timeZone: "Asia/Baghdad",
        });
        lines.push(
          `• ${escHtml(time)} — ويب: ${s.active_users_web ?? 0} | موبايل: ${s.active_users_mobile ?? 0}`,
        );
      }
    }

    lines.push(
      "",
      "ملاحظة: للمراقبة الدقيقة: Supabase Dashboard → Realtime",
    );

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── Keyboards ────────────────────────────────────────────────────────────────

export function analyticsMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "📊 الاستخدام", callback_data: "cmd_usage" },
      { text: "⭐ الرضا", callback_data: "cmd_satisfaction" },
    ],
    [
      { text: "⚡ Realtime", callback_data: "cmd_realtime" },
      { text: "🔙 الرئيسية", callback_data: "menu_main" },
    ],
  ];
}

export function securityMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "🔐 الأدوار", callback_data: "cmd_roles" },
      { text: "🔑 2FA", callback_data: "cmd_2fa" },
    ],
    [{ text: "🔙 الرئيسية", callback_data: "menu_main" }],
  ];
}
