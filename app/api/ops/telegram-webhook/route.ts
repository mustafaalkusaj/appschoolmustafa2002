import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import {
  handleTelegramCommand,
  parseTelegramCommand,
  parseTelegramUpdate,
} from "@/lib/ops/telegram-commands";
import { maskChatId, sendTelegramBotReply } from "@/lib/ops/telegram";
import { getTelegramSecretToken, verifyTelegramSecret } from "@/lib/ops/telegram-secret";
import { botAnswerCallback, botEditMessage, botSendMessage } from "@/lib/ops/telegram-bot-api";
import { checkRateLimit, logUnauthorizedAccess } from "@/lib/ops/telegram-bot-guards";
import {
  mainMenuKeyboard,
  statusMenuKeyboard,
  schoolsMenuKeyboard,
  usersMenuKeyboard,
  errorsMenuKeyboard,
  financeMenuKeyboard,
  controlMenuKeyboard,
  backToMainButton,
} from "@/lib/ops/telegram-bot-menus";
import {
  getTablesOverview,
  dbMenuKeyboard,
} from "@/lib/ops/telegram-bot-supabase";
import {
  getAuthUsersOverview,
  getAuthStats,
  authMenuKeyboard,
} from "@/lib/ops/telegram-bot-supabase-auth";
import {
  getStorageBuckets,
  getStorageSizeDetail,
  getRlsPolicies,
  runRlsSecurityCheck,
  getMigrationsList,
  infraMenuKeyboard,
} from "@/lib/ops/telegram-bot-supabase-infra";
import {
  getDeployments,
  getRuntimeLogs,
  getVercelEnvVars,
  vercelMenuKeyboard,
} from "@/lib/ops/telegram-bot-vercel";
import {
  getR2Overview,
  getR2SizeDetail,
  r2MenuKeyboard,
} from "@/lib/ops/telegram-bot-r2";
import { runHealthCheck } from "@/lib/ops/telegram-bot-diagnostics";
import {
  getCrmOverview,
  getFollowups,
  getInvoicesOverview,
  getPnlReport,
  getRoiReport,
  getRevenueForecast,
  getChangelog,
  businessMenuKeyboard,
  crmMenuKeyboard,
  invoicesMenuKeyboard,
} from "@/lib/ops/telegram-bot-business";
import {
  getFeatureUsage,
  getSatisfactionResults,
  getRolesOverview,
  get2faStatus,
  getRealtimeStats,
  analyticsMenuKeyboard,
  securityMenuKeyboard,
} from "@/lib/ops/telegram-bot-analytics";
import { getSchoolsOverview, getSchoolDetail } from "@/lib/ops/telegram-bot-schools";
import {
  getUsersOverview,
  getNewUsers,
  getInactiveUsers,
} from "@/lib/ops/telegram-bot-users";
import {
  getRevenueOverview,
  getUnpaidStudents,
  getAttendanceToday,
  getGradesToday,
} from "@/lib/ops/telegram-bot-finance";
import {
  getMaintenanceStatus,
  getEnvSummary,
} from "@/lib/ops/telegram-bot-control";
import { aiGenerateReport, aiSuggestImprovements, aiAnalyzeError } from "@/lib/ops/telegram-bot-ai";
import { buildOpsReport } from "@/lib/ops/health-monitor";
import { formatStatusMessage, formatErrorsMessage } from "@/lib/ops/telegram-commands";
import { getRecentOpsErrors } from "@/lib/ops/error-capture";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Always return 200 — Telegram retries on non-200 responses
function ok() {
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── Callback query handler ───────────────────────────────────────────────────

async function handleCallbackQuery(
  callbackQueryId: string,
  callbackData: string,
  chatId: string,
  messageId: number,
): Promise<void> {
  // Answer callback immediately to remove loading state
  await botAnswerCallback(callbackQueryId);

  try {
    // menu_main — show main menu
    if (callbackData === "menu_main") {
      const baghdadDate = new Date().toLocaleDateString("ar-IQ", {
        timeZone: "Asia/Baghdad",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const text = [
        "🎛️ <b>مركز قيادة نظام المدارس</b>",
        "━━━━━━━━━━━━━━━━━━━",
        "مرحباً مصطفى 👋",
        `📅 ${escHtml(baghdadDate)}`,
        "حالة النظام: 🟢 مستقل",
        "",
        "اختر من القائمة:",
      ].join("\n");
      await botEditMessage({ chatId, messageId, text, keyboard: mainMenuKeyboard() });
      return;
    }

    // ── Menu navigation ──────────────────────────────────────────────────────

    if (callbackData === "menu_status") {
      const report = await buildOpsReport();
      const text = formatStatusMessage(report);
      await botEditMessage({ chatId, messageId, text, keyboard: statusMenuKeyboard() });
      return;
    }

    if (callbackData === "menu_schools") {
      const text = await getSchoolsOverview();
      const supabase = createServiceSupabaseClient();
      const { data } = await supabase.from("schools").select("id, name").limit(10);
      const schools = (data ?? []) as Array<{ id: string; name: string }>;
      await botEditMessage({ chatId, messageId, text, keyboard: schoolsMenuKeyboard(schools) });
      return;
    }

    if (callbackData === "menu_users") {
      const text = await getUsersOverview();
      await botEditMessage({ chatId, messageId, text, keyboard: usersMenuKeyboard() });
      return;
    }

    if (callbackData === "menu_errors") {
      const errors = await getRecentOpsErrors({ limit: 5, status: "open" });
      const text = formatErrorsMessage(errors);
      const errorIds = errors.map((e) => e.id);
      await botEditMessage({ chatId, messageId, text, keyboard: errorsMenuKeyboard(errorIds) });
      return;
    }

    if (callbackData === "menu_grades") {
      const text = await getGradesToday();
      await botEditMessage({ chatId, messageId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "menu_attendance") {
      const text = await getAttendanceToday();
      await botEditMessage({ chatId, messageId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "menu_finance") {
      const text = await getRevenueOverview();
      await botEditMessage({ chatId, messageId, text, keyboard: financeMenuKeyboard() });
      return;
    }

    if (callbackData === "menu_notifications") {
      const { getNotificationsSummary } = await import("@/lib/ops/telegram-bot-control");
      const text = await getNotificationsSummary();
      await botEditMessage({ chatId, messageId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "menu_db") {
      const text = await getTablesOverview();
      await botEditMessage({ chatId, messageId, text, keyboard: dbMenuKeyboard() });
      return;
    }

    if (callbackData === "menu_storage") {
      const { getBackupInfo } = await import("@/lib/ops/telegram-bot-control");
      const text = await getBackupInfo();
      await botEditMessage({ chatId, messageId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "menu_storage_detail") {
      const text = await getStorageBuckets();
      await botEditMessage({ chatId, messageId, text, keyboard: infraMenuKeyboard() });
      return;
    }

    if (callbackData === "menu_supabase_auth") {
      const text = await getAuthUsersOverview();
      await botEditMessage({ chatId, messageId, text, keyboard: authMenuKeyboard() });
      return;
    }

    if (callbackData === "menu_vercel") {
      const text = await getDeployments();
      await botEditMessage({ chatId, messageId, text, keyboard: vercelMenuKeyboard() });
      return;
    }

    if (callbackData === "menu_r2") {
      const text = await getR2Overview();
      await botEditMessage({ chatId, messageId, text, keyboard: r2MenuKeyboard() });
      return;
    }

    if (callbackData === "menu_crm") {
      const text = await getCrmOverview();
      await botEditMessage({ chatId, messageId, text, keyboard: crmMenuKeyboard() });
      return;
    }

    if (callbackData === "menu_invoices") {
      const text = await getInvoicesOverview();
      await botEditMessage({ chatId, messageId, text, keyboard: invoicesMenuKeyboard() });
      return;
    }

    if (callbackData === "menu_business") {
      const text = await getPnlReport();
      await botEditMessage({ chatId, messageId, text, keyboard: businessMenuKeyboard() });
      return;
    }

    if (callbackData === "menu_calendar") {
      const supabase = createServiceSupabaseClient();
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("calendar_events")
        .select("id, title, start_date")
        .gte("start_date", now.toISOString())
        .lte("start_date", sevenDays)
        .order("start_date", { ascending: true })
        .limit(10);

      const events = (data ?? []) as unknown as Array<{ title: string | null; start_date: string }>;
      const text =
        events.length === 0
          ? "📅 لا توجد أحداث في الأيام السبعة القادمة."
          : [
              "📅 <b>التقويم — الأيام السبعة القادمة</b>",
              "",
              ...events.map((e) => {
                const d = new Date(e.start_date).toLocaleDateString("ar-IQ", {
                  timeZone: "Asia/Baghdad",
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                return `• <b>${escHtml(e.title ?? "—")}</b> — ${d}`;
              }),
            ].join("\n");

      await botEditMessage({ chatId, messageId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "menu_analytics") {
      const text = [
        "📈 <b>التحليلات</b>",
        "",
        "استخدم أوامر AI للتحليل المتقدم:",
        "",
        "/ai_report — تقرير شامل",
        "/ai_analyze [موضوع] — تحليل موضوع",
        "/ai_predict [سؤال] — توقع",
        "/ai_suggest — اقتراحات",
      ].join("\n");
      await botEditMessage({ chatId, messageId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "menu_control") {
      const text = [
        "🔧 <b>أدوات التحكم</b>",
        "",
        "اختر إجراء:",
      ].join("\n");
      await botEditMessage({ chatId, messageId, text, keyboard: controlMenuKeyboard() });
      return;
    }

    if (callbackData === "menu_settings") {
      const text = await getEnvSummary();
      await botEditMessage({ chatId, messageId, text, keyboard: backToMainButton() });
      return;
    }

    // ── cmd_ actions (execute and send new message) ──────────────────────────

    if (callbackData === "cmd_status") {
      const report = await buildOpsReport();
      const text = formatStatusMessage(report);
      await botSendMessage({ chatId, text, keyboard: statusMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_uptime") {
      const supabase = createServiceSupabaseClient();
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("health_checks")
        .select("service, status, response_ms")
        .gte("checked_at", since);

      const checks = (data ?? []) as Array<{
        service: string;
        status: string;
        response_ms: number | null;
      }>;

      if (checks.length === 0) {
        await botSendMessage({ chatId, text: "📈 لا توجد بيانات Uptime خلال آخر 30 يوماً." });
        return;
      }

      const byService = new Map<string, { total: number; up: number; avgMs: number[] }>();
      for (const c of checks) {
        const s = c.service ?? "unknown";
        const existing = byService.get(s) ?? { total: 0, up: 0, avgMs: [] };
        existing.total += 1;
        if (c.status === "up" || c.status === "healthy") existing.up += 1;
        if (c.response_ms !== null) existing.avgMs.push(c.response_ms);
        byService.set(s, existing);
      }

      const lines: string[] = ["📈 <b>Uptime — آخر 30 يوماً</b>", ""];
      for (const [service, stats] of Array.from(byService.entries())) {
        const uptime = stats.total > 0 ? ((stats.up / stats.total) * 100).toFixed(1) : "—";
        const avgMs =
          stats.avgMs.length > 0
            ? Math.round(stats.avgMs.reduce((a: number, b: number) => a + b, 0) / stats.avgMs.length)
            : null;
        const icon = parseFloat(uptime) >= 99 ? "🟢" : parseFloat(uptime) >= 95 ? "🟡" : "🔴";
        lines.push(`${icon} ${escHtml(service)}: ${uptime}%${avgMs !== null ? ` (avg ${avgMs}ms)` : ""}`);
      }

      await botSendMessage({ chatId, text: lines.join("\n").slice(0, 4000) });
      return;
    }

    if (callbackData === "cmd_speed") {
      const supabase = createServiceSupabaseClient();
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("error_logs")
        .select("route, occurrence_count")
        .gte("created_at", since)
        .order("occurrence_count", { ascending: false })
        .limit(10);

      const logs = (data ?? []) as Array<{ route: string | null; occurrence_count: number }>;
      if (logs.length === 0) {
        await botSendMessage({ chatId, text: "⚡ لا توجد أخطاء مسجلة آخر 7 أيام." });
        return;
      }

      const lines = [
        "⚡ <b>أداء المسارات — آخر 7 أيام</b>",
        "",
        ...logs.map((l) => `• <code>${escHtml((l.route ?? "—").slice(0, 50))}</code> — ${l.occurrence_count} خطأ`),
      ];
      await botSendMessage({ chatId, text: lines.join("\n").slice(0, 4000) });
      return;
    }

    if (callbackData === "cmd_users") {
      const text = await getUsersOverview();
      await botSendMessage({ chatId, text, keyboard: usersMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_newusers") {
      const text = await getNewUsers(1);
      await botSendMessage({ chatId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "cmd_inactive") {
      const text = await getInactiveUsers();
      await botSendMessage({ chatId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "cmd_errors") {
      const errors = await getRecentOpsErrors({ limit: 5, status: "open" });
      const text = formatErrorsMessage(errors);
      const errorIds = errors.map((e) => e.id);
      await botSendMessage({ chatId, text, keyboard: errorsMenuKeyboard(errorIds) });
      return;
    }

    if (callbackData === "cmd_revenue") {
      const text = await getRevenueOverview();
      await botSendMessage({ chatId, text, keyboard: financeMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_unpaid") {
      const text = await getUnpaidStudents();
      await botSendMessage({ chatId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "cmd_finance_today") {
      const supabase = createServiceSupabaseClient();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("payments")
        .select("id, amount")
        .gte("created_at", today.toISOString());

      const payments = (data ?? []) as Array<{ amount: number }>;
      const count = payments.length;
      const total = payments.reduce((sum, p) => {
        const amt = typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount ?? "0")) || 0;
        return sum + amt;
      }, 0);

      await botSendMessage({
        chatId,
        text: [`💰 <b>مدفوعات اليوم</b>`, "", `العدد: <b>${count}</b>`, `الإجمالي: <b>${total.toLocaleString("ar-IQ")} د.ع</b>`].join("\n"),
        keyboard: backToMainButton(),
      });
      return;
    }

    if (callbackData === "cmd_revenue_week") {
      const supabase = createServiceSupabaseClient();
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("payments")
        .select("id, amount")
        .gte("created_at", since);

      const payments = (data ?? []) as Array<{ amount: number }>;
      const count = payments.length;
      const total = payments.reduce((sum, p) => {
        const amt = typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount ?? "0")) || 0;
        return sum + amt;
      }, 0);

      await botSendMessage({
        chatId,
        text: [`💰 <b>مدفوعات آخر 7 أيام</b>`, "", `العدد: <b>${count}</b>`, `الإجمالي: <b>${total.toLocaleString("ar-IQ")} د.ع</b>`].join("\n"),
        keyboard: backToMainButton(),
      });
      return;
    }

    if (callbackData === "cmd_maintenance") {
      const text = await getMaintenanceStatus();
      await botSendMessage({ chatId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "cmd_env") {
      const text = await getEnvSummary();
      await botSendMessage({ chatId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "cmd_ai_report") {
      await botSendMessage({ chatId, text: "⏳ جارٍ توليد التقرير بالذكاء الاصطناعي..." });
      const text = await aiGenerateReport();
      await botSendMessage({ chatId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "cmd_ai_suggest") {
      await botSendMessage({ chatId, text: "⏳ جارٍ توليد الاقتراحات..." });
      const text = await aiSuggestImprovements();
      await botSendMessage({ chatId, text, keyboard: backToMainButton() });
      return;
    }

    // ── New cmd_ handlers (parts 28-44) ──────────────────────────────────────

    if (callbackData === "cmd_tables") {
      const text = await getTablesOverview();
      await botSendMessage({ chatId, text, keyboard: dbMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_authusers") {
      const text = await getAuthUsersOverview();
      await botSendMessage({ chatId, text, keyboard: authMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_authstats") {
      const text = await getAuthStats();
      await botSendMessage({ chatId, text, keyboard: authMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_buckets") {
      const text = await getStorageBuckets();
      await botSendMessage({ chatId, text, keyboard: infraMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_storagesize") {
      const text = await getStorageSizeDetail();
      await botSendMessage({ chatId, text, keyboard: infraMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_rls") {
      const text = await getRlsPolicies();
      await botSendMessage({ chatId, text, keyboard: infraMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_rlscheck") {
      await botSendMessage({ chatId, text: "⏳ جارٍ فحص RLS..." });
      const text = await runRlsSecurityCheck();
      await botSendMessage({ chatId, text, keyboard: infraMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_migrations") {
      const text = await getMigrationsList();
      await botSendMessage({ chatId, text, keyboard: infraMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_deploys") {
      const text = await getDeployments();
      await botSendMessage({ chatId, text, keyboard: vercelMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_vcllogs") {
      await botSendMessage({ chatId, text: "⏳ جارٍ جلب السجلات..." });
      const text = await getRuntimeLogs();
      await botSendMessage({ chatId, text, keyboard: vercelMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_vclenv") {
      const text = await getVercelEnvVars();
      await botSendMessage({ chatId, text, keyboard: vercelMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_r2") {
      const text = await getR2Overview();
      await botSendMessage({ chatId, text, keyboard: r2MenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_r2size") {
      await botSendMessage({ chatId, text: "⏳ جارٍ حساب الحجم..." });
      const text = await getR2SizeDetail();
      await botSendMessage({ chatId, text, keyboard: r2MenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_healthcheck") {
      await botSendMessage({ chatId, text: "⏳ جارٍ فحص المسارات..." });
      const text = await runHealthCheck();
      await botSendMessage({ chatId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "cmd_functions") {
      const { getEdgeFunctions } = await import("@/lib/ops/telegram-bot-diagnostics");
      const text = await getEdgeFunctions();
      await botSendMessage({ chatId, text, keyboard: backToMainButton() });
      return;
    }

    if (callbackData === "cmd_crm") {
      const text = await getCrmOverview();
      await botSendMessage({ chatId, text, keyboard: crmMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_followup") {
      const text = await getFollowups();
      await botSendMessage({ chatId, text, keyboard: crmMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_invoices") {
      const text = await getInvoicesOverview();
      await botSendMessage({ chatId, text, keyboard: invoicesMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_pnl") {
      const text = await getPnlReport();
      await botSendMessage({ chatId, text, keyboard: businessMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_roi") {
      const text = await getRoiReport();
      await botSendMessage({ chatId, text, keyboard: businessMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_forecast") {
      await botSendMessage({ chatId, text: "⏳ جارٍ توليد التوقعات بـ AI..." });
      const text = await getRevenueForecast();
      await botSendMessage({ chatId, text, keyboard: businessMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_changelog") {
      const text = await getChangelog();
      await botSendMessage({ chatId, text, keyboard: businessMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_usage") {
      const text = await getFeatureUsage();
      await botSendMessage({ chatId, text, keyboard: analyticsMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_satisfaction") {
      const text = await getSatisfactionResults();
      await botSendMessage({ chatId, text, keyboard: analyticsMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_realtime") {
      const text = await getRealtimeStats();
      await botSendMessage({ chatId, text, keyboard: analyticsMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_roles") {
      const text = await getRolesOverview();
      await botSendMessage({ chatId, text, keyboard: securityMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_2fa") {
      const text = await get2faStatus();
      await botSendMessage({ chatId, text, keyboard: securityMenuKeyboard() });
      return;
    }

    if (callbackData === "cmd_dbcount") {
      const { countRows } = await import("@/lib/ops/telegram-bot-supabase");
      const tables = ["schools", "students", "teachers", "payments", "grades"];
      const lines = ["📊 <b>إحصاء سريع</b>", ""];
      for (const t of tables) {
        const result = await countRows(t);
        lines.push(`• ${result}`);
      }
      await botSendMessage({ chatId, text: lines.join("\n").slice(0, 4000), keyboard: dbMenuKeyboard() });
      return;
    }

    // ── school_<id> ───────────────────────────────────────────────────────────

    if (callbackData.startsWith("school_")) {
      const schoolId = callbackData.slice("school_".length);
      const text = await getSchoolDetail(schoolId);
      await botEditMessage({ chatId, messageId, text, keyboard: backToMainButton() });
      return;
    }

    // ── error_<id> ────────────────────────────────────────────────────────────

    if (callbackData.startsWith("error_") && !callbackData.startsWith("error_log")) {
      const idPrefix = callbackData.slice("error_".length);
      const errors = await getRecentOpsErrors({ limit: 100 });
      const match = errors.find((e) => e.id.startsWith(idPrefix));

      if (!match) {
        await botSendMessage({
          chatId,
          text: `❌ لم يُعثر على خطأ يبدأ بـ <code>${escHtml(idPrefix)}</code>`,
        });
        return;
      }

      const text = [
        `🔍 <b>تفاصيل الخطأ</b>`,
        `ID: <code>${escHtml(match.id.slice(0, 8))}</code>`,
        `الخطورة: ${match.severity}`,
        `الحالة: ${match.status}`,
        match.route ? `المسار: <code>${escHtml(match.route)}</code>` : null,
        `التكرار: ${match.occurrence_count}`,
        `الرسالة: <code>${escHtml(match.error_message.slice(0, 200))}</code>`,
      ]
        .filter(Boolean)
        .join("\n");

      await botSendMessage({ chatId, text, keyboard: backToMainButton() });
      return;
    }

    // ── ai_error_<id> ─────────────────────────────────────────────────────────

    if (callbackData.startsWith("ai_error_")) {
      const idPrefix = callbackData.slice("ai_error_".length);
      const errors = await getRecentOpsErrors({ limit: 100 });
      const match = errors.find((e) => e.id.startsWith(idPrefix));

      if (!match) {
        await botSendMessage({
          chatId,
          text: `❌ لم يُعثر على خطأ يبدأ بـ <code>${escHtml(idPrefix)}</code>`,
        });
        return;
      }

      await botSendMessage({ chatId, text: "⏳ جارٍ تحليل الخطأ بالذكاء الاصطناعي..." });
      const text = await aiAnalyzeError(match.error_message, match.route ?? "—");
      await botSendMessage({ chatId, text, keyboard: backToMainButton() });
      return;
    }

    // Unhandled callback — ignore silently
    logger.debug("[telegram-webhook] unhandled callback_data", { callbackData });
  } catch (err) {
    console.error(
      "[telegram-webhook] callback handler error:",
      err instanceof Error ? err.message : "unknown",
    );
    await botSendMessage({
      chatId,
      text: "⚠️ تعذر تنفيذ الإجراء. يرجى المحاولة لاحقاً.",
    });
  }
}

// ─── Main POST handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── 1. Verify webhook secret ─────────────────────────────────────────────
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    logger.warn("[telegram-webhook] rejected: TELEGRAM_WEBHOOK_SECRET not configured");
    return unauthorized();
  }
  const provided = request.headers.get("x-telegram-bot-api-secret-token")?.trim() ?? "";
  if (!verifyTelegramSecret(provided, webhookSecret)) {
    logger.warn("[telegram-webhook] rejected: wrong secret");
    return unauthorized();
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logger.warn("[telegram-webhook] rejected: invalid JSON body");
    return ok();
  }

  // ── 3. Parse Telegram update ─────────────────────────────────────────────
  const rawUpdate = body as Record<string, unknown>;
  if (!rawUpdate || typeof rawUpdate !== "object" || typeof rawUpdate.update_id !== "number") {
    logger.warn("[telegram-webhook] rejected: not a valid Telegram update");
    return ok();
  }

  const expectedChatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!expectedChatId) {
    logger.warn("[telegram-webhook] rejected: TELEGRAM_CHAT_ID not configured");
    return ok();
  }

  // ── 4. Handle callback_query ──────────────────────────────────────────────
  if (rawUpdate.callback_query && typeof rawUpdate.callback_query === "object") {
    const cq = rawUpdate.callback_query as Record<string, unknown>;
    const callbackQueryId = String(cq.id ?? "");
    const callbackData = typeof cq.data === "string" ? cq.data : "";
    const from = (cq.from ?? {}) as Record<string, unknown>;
    const message = (cq.message ?? {}) as Record<string, unknown>;
    const chat = (message.chat ?? from) as Record<string, unknown>;
    const incomingChatId = String(chat.id ?? from.id ?? "");
    const messageId = typeof message.message_id === "number" ? message.message_id : 0;
    const username = typeof from.username === "string" ? from.username : undefined;

    // Authorization check
    if (incomingChatId !== expectedChatId) {
      const masked = maskChatId(incomingChatId);
      logger.warn("[telegram-webhook] rejected callback from unauthorized chat", { masked });
      await logUnauthorizedAccess(incomingChatId, username, callbackData);
      // Answer the callback to remove loading state even for unauthorized
      try {
        const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
        if (token) {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: callbackQueryId }),
            signal: AbortSignal.timeout(5_000),
          });
        }
      } catch {}
      return ok();
    }

    // Rate limit check
    const allowed = await checkRateLimit(incomingChatId);
    if (!allowed) {
      logger.warn("[telegram-webhook] rate limited chat", { masked: maskChatId(incomingChatId) });
      await botAnswerCallback(callbackQueryId, "⚠️ طلبات كثيرة — انتظر دقيقة");
      return ok();
    }

    logger.debug("[telegram-webhook] callback_data from authorized chat", { callbackData });
    await handleCallbackQuery(callbackQueryId, callbackData, incomingChatId, messageId);
    return ok();
  }

  // ── 5. Handle message/channel_post ───────────────────────────────────────
  const update = parseTelegramUpdate(body);
  if (!update) {
    logger.warn("[telegram-webhook] rejected: not a valid Telegram update");
    return ok();
  }

  const message = update.message ?? update.channel_post;
  if (!message?.text) return ok(); // photo/sticker/etc — silently ignore

  // Authorization check
  const incomingChatId = String(message.chat.id);
  const authorized = incomingChatId === expectedChatId;

  if (!authorized) {
    const masked = maskChatId(incomingChatId);
    logger.warn("[telegram-webhook] rejected: unauthorized chat", { masked });
    await logUnauthorizedAccess(
      incomingChatId,
      message.from?.username,
      message.text?.slice(0, 100) ?? "",
    );
    return ok();
  }

  // Rate limit check
  const allowed = await checkRateLimit(incomingChatId);
  if (!allowed) {
    logger.warn("[telegram-webhook] rate limited chat", { masked: maskChatId(incomingChatId) });
    await sendTelegramBotReply("⚠️ طلبات كثيرة جداً. انتظر دقيقة ثم أعد المحاولة.");
    return ok();
  }

  // Parse command
  const parsed = parseTelegramCommand(message.text);
  if (!parsed) return ok(); // plain text message — ignore

  logger.debug("[telegram-webhook] command received", { command: parsed.command, authorized: true });

  // Handle /start specially — send with inline keyboard
  if (parsed.command === "/start") {
    const baghdadDate = new Date().toLocaleDateString("ar-IQ", {
      timeZone: "Asia/Baghdad",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const text = [
      "🎛️ <b>مركز قيادة نظام المدارس</b>",
      "━━━━━━━━━━━━━━━━━━━",
      "مرحباً مصطفى 👋",
      `📅 ${escHtml(baghdadDate)}`,
      "حالة النظام: 🟢 مستقر",
      "",
      "اختر من القائمة:",
    ].join("\n");

    await botSendMessage({ chatId: incomingChatId, text, keyboard: mainMenuKeyboard() });
    return ok();
  }

  // Handle command normally
  let reply: string;
  try {
    reply = await handleTelegramCommand(parsed);
  } catch (err) {
    logger.warn("[telegram-webhook] command handler error", {
      error: err instanceof Error ? err.message : "unknown",
    });
    reply = "⚠️ تعذر تنفيذ الأمر. يرجى المحاولة لاحقاً.";
  }

  try {
    const result = await sendTelegramBotReply(reply);
    logger.debug("[telegram-webhook] reply sent", {
      status: result.status,
      reason: result.reason ?? null,
    });
  } catch (err) {
    logger.warn("[telegram-webhook] send error", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  return ok();
}
