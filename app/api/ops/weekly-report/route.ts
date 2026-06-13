import { NextRequest, NextResponse } from "next/server";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
import { sendTelegramMessage } from "@/lib/ops/telegram";

// ─── Handler ──────────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function handle(request: NextRequest) {
  const tokenAuthorized = isOpsTokenAuthorized(request, [
    process.env.CRON_SECRET,
    process.env.OPS_ALERT_TOKEN,
  ]);

  if (!tokenAuthorized) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const supabase = createServiceSupabaseClient();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date();

    // Fetch daily reports from last 7 days
    const { data: dailyReports } = await supabase
      .from("daily_reports")
      .select(
        "date, total_users, active_users, new_users, total_grades, total_attendance, total_notifications, error_count, avg_response_ms, revenue",
      )
      .gte("date", sevenDaysAgo)
      .order("date", { ascending: false });

    const reports = (dailyReports ?? []) as Array<{
      date: string;
      total_users: number | null;
      active_users: number | null;
      new_users: number | null;
      total_grades: number | null;
      total_attendance: number | null;
      total_notifications: number | null;
      error_count: number | null;
      avg_response_ms: number | null;
      revenue: number | null;
    }>;

    // Aggregate totals from payments this week
    const [paymentsResult, gradesResult, attendanceResult, newUsersResult, errorsResult] =
      await Promise.all([
        supabase
          .from("payments")
          .select("amount")
          .gte("created_at", sevenDaysAgo),
        supabase
          .from("grades")
          .select("id", { head: true, count: "exact" })
          .gte("created_at", sevenDaysAgo),
        supabase
          .from("attendance_records")
          .select("id", { head: true, count: "exact" })
          .gte("created_at", sevenDaysAgo),
        supabase
          .from("managed_user_profiles")
          .select("id", { head: true, count: "exact" })
          .gte("created_at", sevenDaysAgo),
        supabase
          .from("error_logs")
          .select("id", { head: true, count: "exact" })
          .gte("created_at", sevenDaysAgo)
          .eq("is_resolved", false),
      ]);

    const payments = (paymentsResult.data ?? []) as Array<{ amount: number }>;
    const weeklyRevenue = payments.reduce((sum, p) => {
      const amt = typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount ?? "0")) || 0;
      return sum + amt;
    }, 0);

    // Aggregate from daily_reports if available
    const totalNewUsers = reports.reduce((sum, r) => sum + (r.new_users ?? 0), 0);
    const totalErrors = reports.reduce((sum, r) => sum + (r.error_count ?? 0), 0);
    const avgResponseMs =
      reports.filter((r) => r.avg_response_ms !== null).length > 0
        ? Math.round(
            reports
              .filter((r) => r.avg_response_ms !== null)
              .reduce((sum, r) => sum + (r.avg_response_ms ?? 0), 0) /
              reports.filter((r) => r.avg_response_ms !== null).length,
          )
        : null;

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("ar-IQ-u-nu-latn", {
      timeZone: "Asia/Baghdad",
      day: "numeric",
      month: "short",
    });
    const weekEnd = now.toLocaleDateString("ar-IQ-u-nu-latn", {
      timeZone: "Asia/Baghdad",
      day: "numeric",
      month: "short",
    });

    const statusIcon =
      (errorsResult.count ?? 0) === 0 ? "🟢" : (errorsResult.count ?? 0) < 10 ? "🟡" : "🔴";

    const messageLines: string[] = [
      `📊 <b>التقرير الأسبوعي — ${escHtml(weekStart)} إلى ${escHtml(weekEnd)}</b>`,
      "",
      `${statusIcon} <b>الملخص</b>`,
      "",
      `👥 مستخدمون جدد: <b>${newUsersResult.count ?? totalNewUsers}</b>`,
      `📝 درجات مُدخلة: <b>${gradesResult.count ?? 0}</b>`,
      `📋 سجلات حضور: <b>${attendanceResult.count ?? 0}</b>`,
      `💰 إيرادات الأسبوع: <b>${weeklyRevenue.toLocaleString("ar-IQ-u-nu-latn")} د.ع</b>`,
      `⚠️ أخطاء جديدة: <b>${errorsResult.count ?? totalErrors}</b>`,
      avgResponseMs !== null ? `⚡ متوسط وقت الاستجابة: <b>${avgResponseMs}ms</b>` : "",
    ].filter(Boolean);

    if (reports.length > 0) {
      messageLines.push("", "<b>أيام التقارير المتاحة:</b> " + reports.length);
    }

    const message = messageLines.join("\n").slice(0, 4000);

    const telegramResult = await sendTelegramMessage(message).catch(() => ({
      status: "failed" as const,
      reason: "request_failed" as const,
    }));

    return NextResponse.json(
      {
        ok: true,
        period: { from: sevenDaysAgo, to: now.toISOString() },
        stats: {
          new_users: newUsersResult.count ?? 0,
          grades: gradesResult.count ?? 0,
          attendance: attendanceResult.count ?? 0,
          revenue: weeklyRevenue,
          errors: errorsResult.count ?? 0,
        },
        telegram: telegramResult.status,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "weekly report failed",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
