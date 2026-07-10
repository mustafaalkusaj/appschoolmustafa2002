import "server-only";

import type { OpsReport } from "@/lib/ops/health-monitor";
import { buildOpsReport } from "@/lib/ops/health-monitor";
import { buildOpsTelegramHtml, classifyNotificationSeverity } from "@/lib/ops/notifier";
import {
  getRecentOpsErrors,
  getOpsErrorById,
  updateOpsErrorStatus,
  type OpsError,
} from "@/lib/ops/error-capture";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { mainMenuKeyboard } from "@/lib/ops/telegram-bot-menus";
import { getSchoolsOverview, getSchoolDetail } from "@/lib/ops/telegram-bot-schools";
import {
  getUsersOverview,
  searchUser,
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
  executeSafeQuery,
  getMaintenanceStatus,
  getEnvSummary,
  getNotificationsSummary,
} from "@/lib/ops/telegram-bot-control";
import {
  aiGenerateReport,
  aiAnalyzeTopic,
  aiPredictMetric,
  aiSuggestImprovements,
  aiAnalyzeError,
} from "@/lib/ops/telegram-bot-ai";

// ─── Telegram update types (minimal) ─────────────────────────────────────────

export type TelegramChat = {
  id: number;
  type: string;
};

export type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  text?: string;
  from?: {
    id: number;
    username?: string;
    first_name?: string;
  };
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
};

export type ParsedCommand = {
  command: string;
  args: string;
  raw: string;
};

// ─── Parsers ──────────────────────────────────────────────────────────────────

export function parseTelegramUpdate(body: unknown): TelegramUpdate | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.update_id !== "number") return null;
  return b as unknown as TelegramUpdate;
}

export function parseTelegramCommand(text: string | undefined): ParsedCommand | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  // Strip @botname suffix (e.g. /status@MyBot → /status)
  const stripped = trimmed.replace(/@\w+/, "");
  const parts = stripped.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(" ");

  return { command, args, raw: trimmed };
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatHelpMessage(): string {
  return [
    "🤖 <b>أوامر Ops Bot — school-iraq.com</b>",
    "",
    "<b>الحالة والتقارير:</b>",
    "/status — حالة النظام المختصرة",
    "/health — فحص شامل للخدمات",
    "/deepcheck — فحص شامل موسّع",
    "/report — تقرير فوري كامل",
    "/version — معلومات النشر",
    "/uptime — إحصائيات Uptime",
    "/speed — أداء المسارات",
    "",
    "<b>الأخطاء:</b>",
    "/errors — آخر 5 أخطاء مفتوحة",
    "/error_&lt;id&gt; — تفاصيل خطأ محدد",
    "/prompt_&lt;id&gt; — Fix Prompt للخطأ",
    "/fixed_&lt;id&gt; — تحديد خطأ كـ fixed",
    "/ignore_&lt;id&gt; — تجاهل خطأ",
    "",
    "<b>المدارس:</b>",
    "/schools — نظرة عامة على المدارس",
    "/school [اسم أو ID] — تفاصيل مدرسة",
    "",
    "<b>المستخدمون:</b>",
    "/users — إحصائيات المستخدمين",
    "/search [نص] — البحث عن مستخدم",
    "/newusers — المستخدمون الجدد اليوم",
    "/inactive — المستخدمون غير النشطين",
    "/add_user email=... role=... name=... school=... — إضافة مستخدم",
    "/confirm_add_user &lt;id&gt; — تأكيد إضافة مستخدم",
    "/cancel &lt;id&gt; — إلغاء عملية معلقة",
    "",
    "<b>الاشتراكات:</b>",
    "/subscriptions — ملخص الاشتراكات",
    "/expired — الاشتراكات المنتهية",
    "/expiring7 — تنتهي خلال 7 أيام",
    "/expiring30 — تنتهي خلال 30 يوماً",
    "",
    "<b>المالية:</b>",
    "/revenue — نظرة عامة على الإيرادات",
    "/unpaid — الطلاب ذوو الرسوم المتبقية",
    "/attendance — الحضور اليوم",
    "/grades — الدرجات المُدخلة اليوم",
    "/finance_today — مدفوعات اليوم",
    "/revenue_week — مدفوعات آخر 7 أيام",
    "/revenue_month — مدفوعات آخر 30 يوماً",
    "/debts — ملخص المديونيات",
    "",
    "<b>المزيد:</b>",
    "/calendar — أحداث التقويم القادمة",
    "/notifications — ملخص الإشعارات",
    "/sql [استعلام] — تنفيذ SELECT فقط",
    "/maintenance — حالة وضع الصيانة",
    "/env — متغيرات البيئة",
    "",
    "<b>الذكاء الاصطناعي:</b>",
    "/ai — قائمة AI",
    "/ai_report — تقرير AI شامل",
    "/ai_analyze [موضوع] — تحليل موضوع",
    "/ai_predict [سؤال] — توقع مؤشر",
    "/ai_suggest — اقتراحات تحسين",
    "",
    "/test — رسالة اختبار",
    "/help — هذه القائمة",
    "/start — القائمة الرئيسية",
  ].join("\n");
}

export function formatStatusMessage(report: OpsReport): string {
  const icon =
    report.status === "healthy" ? "🟢" : report.status === "degraded" ? "🟡" : "🔴";

  const checkLine = (label: string, status: string) => {
    const i = status === "healthy" ? "✅" : status === "degraded" ? "⚠️" : "❌";
    return `${i} ${label}`;
  };

  const lines: string[] = [
    `${icon} <b>حالة school-iraq.com</b>`,
    "",
    `التقييم: <b>${report.score}/100</b>`,
    checkLine("الدومين", report.checks.domain.status),
    checkLine("Supabase Auth", report.checks.supabaseAuth.status),
    checkLine("قاعدة البيانات", report.checks.database.status),
    checkLine("Storage", report.checks.storage.status),
    checkLine("Upstash", report.checks.upstash.status),
    "",
    `الاشتراكات: نشطة ${report.subscriptionSnapshot.active_count ?? "?"} | منتهية ${report.subscriptionSnapshot.expired_count ?? 0}`,
  ];

  if (report.status !== "healthy") {
    lines.push("", `ملاحظة: ${escHtml(report.summary)}`);
  }

  return lines.join("\n");
}

export function formatErrorsMessage(errors: OpsError[]): string {
  if (errors.length === 0) {
    return "✅ لا توجد أخطاء مفتوحة حالياً";
  }

  const lines: string[] = [
    `🚨 <b>أخطاء مفتوحة (${errors.length})</b>`,
    "",
  ];

  for (const err of errors) {
    const sev =
      err.severity === "critical" ? "🔴" : err.severity === "warning" ? "🟡" : "🔵";
    const idShort = err.id.slice(0, 8);
    const route = err.route ? `<code>${escHtml(err.route)}</code>` : "—";
    const msg = escHtml(err.error_message.slice(0, 100));
    const reps = err.occurrence_count > 1 ? ` ×${err.occurrence_count}` : "";

    lines.push(
      `${sev} <code>${idShort}</code>${reps}`,
      `${route}`,
      msg,
      "",
    );
  }

  lines.push("تفاصيل: /error_&lt;8-أحرف-id&gt;");
  return lines.join("\n");
}

// ─── Command Dispatcher ───────────────────────────────────────────────────────

export async function handleTelegramCommand(
  parsed: ParsedCommand,
): Promise<string> {
  const { command } = parsed;

  try {
    if (command === "/start") {
      const baghdadDate = new Date().toLocaleDateString("ar-IQ", {
        timeZone: "Asia/Baghdad",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return [
        "🎛️ <b>مركز قيادة نظام المدارس</b>",
        "━━━━━━━━━━━━━━━━━━━",
        "مرحباً مصطفى 👋",
        `📅 ${escHtml(baghdadDate)}`,
        "حالة النظام: 🟢 مستقر",
        "",
        "اختر من القائمة:",
      ].join("\n");
    }

    if (command === "/help") {
      return formatHelpMessage();
    }

    if (command === "/test") {
      return "Telegram bot commands تعمل ✅";
    }

    if (command === "/version") {
      const deployId = process.env.VERCEL_DEPLOYMENT_ID ?? null;
      const gitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? null;
      const nodeEnv = process.env.NODE_ENV ?? "unknown";
      const baghdadTime = new Date().toLocaleString("ar-IQ", {
        timeZone: "Asia/Baghdad",
      });

      return [
        "📦 <b>معلومات النشر</b>",
        `Deployment: ${deployId ? `<code>${escHtml(deployId.slice(0, 24))}</code>` : "—"}`,
        `Git SHA: ${gitSha ? `<code>${escHtml(gitSha)}</code>` : "—"}`,
        `Environment: ${escHtml(nodeEnv)}`,
        `توقيت بغداد: ${escHtml(baghdadTime)}`,
      ].join("\n");
    }

    if (command === "/status") {
      const report = await buildOpsReport();
      return formatStatusMessage(report);
    }

    if (command === "/health") {
      const report = await buildOpsReport();
      return buildOpsTelegramHtml(report, classifyNotificationSeverity(report));
    }

    if (command === "/report") {
      const report = await buildOpsReport();
      const severity = classifyNotificationSeverity(report);
      return buildOpsTelegramHtml(report, severity);
    }

    if (command === "/errors") {
      const errors = await getRecentOpsErrors({ limit: 5, status: "open" });
      return formatErrorsMessage(errors);
    }

    if (command.startsWith("/error_")) {
      const idPrefix = command.slice("/error_".length);
      if (!idPrefix || idPrefix.length < 4) {
        return "⚠️ مطلوب: /error_&lt;أول-8-أحرف-من-id&gt;";
      }

      const errors = await getRecentOpsErrors({ limit: 100 });
      const match = errors.find((e) => e.id.startsWith(idPrefix));

      if (!match) {
        return `❌ لم يُعثر على خطأ يبدأ بـ <code>${escHtml(idPrefix)}</code>`;
      }

      return [
        `🔍 <b>تفاصيل الخطأ</b>`,
        `ID: <code>${escHtml(match.id)}</code>`,
        `الخطورة: ${match.severity}`,
        `الحالة: ${match.status}`,
        `المصدر: ${escHtml(match.source)}`,
        match.route ? `المسار: <code>${escHtml(match.route)}</code>` : null,
        match.method ? `الطريقة: ${escHtml(match.method)}` : null,
        match.page_url ? `الصفحة: ${escHtml(match.page_url.slice(0, 120))}` : null,
        match.action ? `الإجراء: ${escHtml(match.action)}` : null,
        match.user_role ? `الدور: ${escHtml(match.user_role)}` : null,
        match.school_id ? `المدرسة: [masked]` : null,
        match.branch_id ? `الفرع: [masked]` : null,
        `كود HTTP: ${match.status_code ?? "—"}`,
        match.error_code ? `كود الخطأ: ${escHtml(match.error_code)}` : null,
        `التكرار: ${match.occurrence_count}`,
        `الرسالة: <code>${escHtml(match.error_message.slice(0, 200))}</code>`,
        "",
        `Fix Prompt: /prompt_${match.id.slice(0, 8)}`,
        `تحديد كـ fixed: /fixed_${match.id.slice(0, 8)}`,
        `تجاهل: /ignore_${match.id.slice(0, 8)}`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (command.startsWith("/prompt_")) {
      const idPrefix = command.slice("/prompt_".length);
      if (!idPrefix || idPrefix.length < 4) {
        return "⚠️ مطلوب: /prompt_&lt;أول-8-أحرف-من-id&gt;";
      }

      const errors = await getRecentOpsErrors({ limit: 100 });
      const match = errors.find((e) => e.id.startsWith(idPrefix));

      if (!match) {
        return `❌ لم يُعثر على خطأ يبدأ بـ <code>${escHtml(idPrefix)}</code>`;
      }

      const full = await getOpsErrorById(match.id);
      if (!full?.fix_prompt) {
        return "❌ لا يوجد Fix Prompt لهذا الخطأ.";
      }

      const prompt = full.fix_prompt;
      // Telegram max is 4096 chars, keep buffer for <pre> tags
      const MAX = 3600;

      if (prompt.length <= MAX) {
        return `<pre>${escHtml(prompt)}</pre>`;
      }

      return [
        `<pre>${escHtml(prompt.slice(0, MAX))}</pre>`,
        "",
        `⚠️ Prompt مقطوع (${prompt.length} حرف إجمالاً).`,
        `النسخة الكاملة: افتح Super Admin → أخطاء الإنتاج → نسخ Fix Prompt`,
      ].join("\n");
    }

    // /fixed_<id> — mark error as fixed
    if (command.startsWith("/fixed_")) {
      const idPrefix = command.slice("/fixed_".length);
      if (!idPrefix || idPrefix.length < 4) {
        return "⚠️ مطلوب: /fixed_&lt;أول-8-أحرف-من-id&gt;";
      }

      const errors = await getRecentOpsErrors({ limit: 100 });
      const match = errors.find((e) => e.id.startsWith(idPrefix));

      if (!match) {
        return `❌ لم يُعثر على خطأ يبدأ بـ <code>${escHtml(idPrefix)}</code>`;
      }

      const idShort = match.id.slice(0, 8);
      await updateOpsErrorStatus(match.id, "fixed");

      writeAuditLog({
        actor_source: "telegram_ops_bot",
        action_type: "error_status_change",
        entity_type: "ops_error",
        entity_id: match.id,
        summary: `تم تحديد الخطأ ${idShort} كـ fixed`,
        metadata: { previous_status: match.status, new_status: "fixed" },
      }).catch(() => {});

      return `✅ تم تحديد الخطأ <code>${escHtml(idShort)}</code> كـ <b>fixed</b>`;
    }

    // /ignore_<id> — mark error as ignored
    if (command.startsWith("/ignore_")) {
      const idPrefix = command.slice("/ignore_".length);
      if (!idPrefix || idPrefix.length < 4) {
        return "⚠️ مطلوب: /ignore_&lt;أول-8-أحرف-من-id&gt;";
      }

      const errors = await getRecentOpsErrors({ limit: 100 });
      const match = errors.find((e) => e.id.startsWith(idPrefix));

      if (!match) {
        return `❌ لم يُعثر على خطأ يبدأ بـ <code>${escHtml(idPrefix)}</code>`;
      }

      const idShort = match.id.slice(0, 8);
      await updateOpsErrorStatus(match.id, "ignored");

      writeAuditLog({
        actor_source: "telegram_ops_bot",
        action_type: "error_status_change",
        entity_type: "ops_error",
        entity_id: match.id,
        summary: `تم تجاهل الخطأ ${idShort}`,
        metadata: { previous_status: match.status, new_status: "ignored" },
      }).catch(() => {});

      return `✅ تم تجاهل الخطأ <code>${escHtml(idShort)}</code>`;
    }

    // /deepcheck — comprehensive system check
    if (command === "/deepcheck") {
      const supabase = createServiceSupabaseClient();
      const [report, openResult, criticalResult] = await Promise.all([
        buildOpsReport(),
        supabase
          .from("ops_errors")
          .select("id", { head: true, count: "exact" })
          .eq("status", "open"),
        supabase
          .from("ops_errors")
          .select("id", { head: true, count: "exact" })
          .eq("status", "open")
          .eq("severity", "critical"),
      ]);

      const baghdadTime = new Date().toLocaleString("ar-IQ", {
        timeZone: "Asia/Baghdad",
      });
      const icon =
        report.status === "healthy"
          ? "🟢"
          : report.status === "degraded"
            ? "🟡"
            : "🔴";

      const checkLine = (label: string, status: string) => {
        const i =
          status === "healthy" ? "✅" : status === "degraded" ? "⚠️" : "❌";
        return `${i} ${label}`;
      };

      const lines: string[] = [
        `${icon} <b>فحص شامل — school-iraq.com</b>`,
        `التقييم: <b>${report.score}/100</b>`,
        `الحالة: ${report.status}`,
        "",
        checkLine("الدومين", report.checks.domain.status),
        checkLine("Vercel", report.checks.vercel.status),
        checkLine("Supabase Auth", report.checks.supabaseAuth.status),
        checkLine("قاعدة البيانات", report.checks.database.status),
        checkLine("Storage", report.checks.storage.status),
        checkLine("Upstash", report.checks.upstash.status),
        checkLine("الاشتراكات", report.checks.subscriptions.status),
        "",
        `الاشتراكات النشطة: ${report.subscriptionSnapshot.active_count ?? "?"}`,
        `الاشتراكات المنتهية: ${report.subscriptionSnapshot.expired_count ?? 0}`,
        `تنتهي خلال 7 أيام: ${report.subscriptionSnapshot.expiring_7_days_count ?? 0}`,
        "",
        `الأخطاء المفتوحة: ${openResult.count ?? "?"}`,
        `الأخطاء الحرجة: ${criticalResult.count ?? "?"}`,
        "",
        `توقيت بغداد: ${escHtml(baghdadTime)}`,
      ];

      return lines.join("\n").slice(0, 4000);
    }

    // /users — user statistics with masked emails
    if (command === "/users") {
      const supabase = createServiceSupabaseClient();
      const [totalResult, byRoleResult, recentResult] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("id", { head: true, count: "exact" }),
        supabase
          .from("user_profiles")
          .select("role"),
        supabase
          .from("user_profiles")
          .select("id, full_name, email, role, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const totalCount = totalResult.count ?? 0;
      const roleCounts: Record<string, number> = {};
      for (const row of byRoleResult.data ?? []) {
        const r = (row as Record<string, unknown>).role as string ?? "unknown";
        roleCounts[r] = (roleCounts[r] ?? 0) + 1;
      }

      const recentUsers = (recentResult.data ?? []) as Array<Record<string, unknown>>;

      const maskEmail = (email: unknown): string => {
        if (typeof email !== "string" || !email.includes("@")) return "—";
        const [local, domain] = email.split("@");
        const masked = local.slice(0, 2) + "***";
        return `${masked}@${domain}`;
      };

      const lines: string[] = [
        `👥 <b>إحصائيات المستخدمين</b>`,
        "",
        `الإجمالي: <b>${totalCount}</b>`,
        ...Object.entries(roleCounts).map(
          ([role, count]) => `${escHtml(role)}: ${count}`,
        ),
        "",
        `<b>آخر 5 مستخدمين:</b>`,
        ...recentUsers.map((u) =>
          `• ${escHtml(String(u.full_name ?? "—"))} — ${escHtml(maskEmail(u.email))} (${escHtml(String(u.role ?? "—"))})`,
        ),
      ];

      return lines.join("\n").slice(0, 4000);
    }

    // /add_user email=<email> role=<role> name="<name>" school=<school_id>
    if (command === "/add_user") {
      const args = parsed.args.trim();
      if (!args) {
        return [
          "📋 <b>إضافة مستخدم</b>",
          "",
          "الاستخدام:",
          "<code>/add_user email=user@example.com role=admin name=\"الاسم الكامل\" school=school-id</code>",
          "",
          "الأدوار المتاحة: super_admin, admin, employee",
        ].join("\n");
      }

      // Parse key=value pairs
      const parseArgs = (raw: string): Record<string, string> => {
        const result: Record<string, string> = {};
        const regex = /(\w+)=(?:"([^"]*)"|([\S]+))/g;
        let m: RegExpExecArray | null;
        while ((m = regex.exec(raw)) !== null) {
          result[m[1]] = m[2] ?? m[3] ?? "";
        }
        return result;
      };

      const parsed_args = parseArgs(args);
      const email = parsed_args.email ?? "";
      const role = parsed_args.role ?? "employee";
      const name = parsed_args.name ?? "";
      const school = parsed_args.school ?? "";

      if (!email || !email.includes("@")) {
        return "❌ البريد الإلكتروني مطلوب وصحيح.";
      }

      const ALLOWED_ROLES = ["super_admin", "admin", "employee"];
      if (!ALLOWED_ROLES.includes(role)) {
        return `❌ الدور غير صالح. المتاح: ${ALLOWED_ROLES.join(", ")}`;
      }

      const supabase = createServiceSupabaseClient();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";

      const maskEmail = (em: string): string => {
        if (!em.includes("@")) return "—";
        const [local, domain] = em.split("@");
        return `${local.slice(0, 2)}***@${domain}`;
      };

      const { data: pending, error: insertError } = await supabase
        .from("ops_pending_actions")
        .insert({
          expires_at: expiresAt,
          type: "add_user",
          requested_by_chat_id: chatId,
          payload: { email, role, name, school_id: school },
        })
        .select("id")
        .single();

      if (insertError) {
        return `❌ تعذر إنشاء الطلب: ${escHtml(insertError.message.slice(0, 100))}`;
      }

      const pendingId = (pending as Record<string, unknown>).id as string;
      const shortId = pendingId.slice(0, 8);

      return [
        `📋 <b>طلب إضافة مستخدم</b>`,
        "",
        `البريد: ${escHtml(maskEmail(email))}`,
        `الدور: ${escHtml(role)}`,
        `الاسم: ${name ? escHtml(name) : "—"}`,
        `المدرسة: ${school ? "[id]" : "—"}`,
        "",
        `ID الطلب: <code>${escHtml(shortId)}</code>`,
        `ينتهي خلال: 30 دقيقة`,
        "",
        `للتأكيد: /confirm_add_user ${escHtml(shortId)}`,
        `للإلغاء: /cancel ${escHtml(shortId)}`,
      ].join("\n");
    }

    // /confirm_add_user <pending_id>
    if (command.startsWith("/confirm_add_user")) {
      const pendingIdPrefix = (parsed.args ?? "").trim() || command.slice("/confirm_add_user".length).trim();
      if (!pendingIdPrefix || pendingIdPrefix.length < 4) {
        return "⚠️ مطلوب: /confirm_add_user &lt;id&gt;";
      }

      const supabase = createServiceSupabaseClient();
      const { data: actions } = await supabase
        .from("ops_pending_actions")
        .select("id, expires_at, payload")
        .eq("type", "add_user")
        .eq("status", "pending");

      const match = (actions ?? []).find((a: Record<string, unknown>) =>
        String(a.id).startsWith(pendingIdPrefix),
      );

      if (!match) {
        return `❌ لم يُعثر على طلب معلق يبدأ بـ <code>${escHtml(pendingIdPrefix)}</code>`;
      }

      const action = match as Record<string, unknown>;
      const expiresAt = new Date(action.expires_at as string);
      if (expiresAt < new Date()) {
        await supabase
          .from("ops_pending_actions")
          .update({ status: "expired" })
          .eq("id", action.id as string);
        return "❌ انتهت صلاحية الطلب.";
      }

      const payload = action.payload as Record<string, unknown>;
      const email = typeof payload.email === "string" ? payload.email : null;
      if (!email) {
        return "❌ البريد الإلكتروني مفقود في بيانات الطلب.";
      }

      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: payload.name ?? null,
            role: payload.role ?? "employee",
            school_id: payload.school_id ?? null,
          },
        });

      if (createError) {
        return `❌ تعذر إنشاء المستخدم: ${escHtml(createError.message.slice(0, 150))}`;
      }

      await supabase
        .from("ops_pending_actions")
        .update({
          status: "confirmed",
          result: { user_id: newUser?.user?.id ?? null },
        })
        .eq("id", action.id as string);

      const maskEmail = (em: string): string => {
        if (!em.includes("@")) return "—";
        const [local, domain] = em.split("@");
        return `${local.slice(0, 2)}***@${domain}`;
      };

      writeAuditLog({
        actor_source: "telegram_ops_bot",
        action_type: "create",
        entity_type: "user",
        entity_id: newUser?.user?.id ?? undefined,
        summary: `User created via Telegram confirm`,
        metadata: {
          pending_action_id: action.id,
          role: payload.role,
          school_id: payload.school_id,
        },
      }).catch(() => {});

      return `✅ تم إنشاء المستخدم <b>${escHtml(maskEmail(email))}</b> بنجاح.`;
    }

    // /cancel <pending_id>
    if (command === "/cancel") {
      const pendingIdPrefix = parsed.args.trim();
      if (!pendingIdPrefix || pendingIdPrefix.length < 4) {
        return "⚠️ مطلوب: /cancel &lt;id&gt;";
      }

      const supabase = createServiceSupabaseClient();
      const { data: actions } = await supabase
        .from("ops_pending_actions")
        .select("id, status")
        .eq("status", "pending");

      const match = (actions ?? []).find((a: Record<string, unknown>) =>
        String(a.id).startsWith(pendingIdPrefix),
      );

      if (!match) {
        return `❌ لم يُعثر على طلب معلق يبدأ بـ <code>${escHtml(pendingIdPrefix)}</code>`;
      }

      await supabase
        .from("ops_pending_actions")
        .update({ status: "cancelled" })
        .eq("id", (match as Record<string, unknown>).id as string);

      return `✅ تم إلغاء الطلب <code>${escHtml(pendingIdPrefix)}</code>`;
    }

    // /subscriptions — subscription summary
    if (command === "/subscriptions") {
      const report = await buildOpsReport();
      const snap = report.subscriptionSnapshot;
      const lines: string[] = [
        `📊 <b>ملخص الاشتراكات</b>`,
        "",
        `نشطة: <b>${snap.active_count ?? "?"}</b>`,
        `منتهية: <b>${snap.expired_count ?? 0}</b>`,
        `تنتهي خلال 7 أيام: <b>${snap.expiring_7_days_count ?? 0}</b>`,
        `تنتهي خلال 30 يوماً: <b>${snap.expiring_30_days_count ?? 0}</b>`,
      ];

      if (snap.expiring_soon_school_names && snap.expiring_soon_school_names.length > 0) {
        lines.push("", "<b>تنتهي قريباً:</b>");
        for (const name of snap.expiring_soon_school_names.slice(0, 10)) {
          lines.push(`• ${escHtml(name)}`);
        }
      }

      return lines.join("\n").slice(0, 4000);
    }

    // /expired — expired subscriptions
    if (command === "/expired") {
      const report = await buildOpsReport();
      const snap = report.subscriptionSnapshot;
      const lines: string[] = [
        `🔴 <b>الاشتراكات المنتهية (${snap.expired_count ?? 0})</b>`,
        "",
      ];

      if (!snap.expired_school_names || snap.expired_school_names.length === 0) {
        lines.push("لا توجد اشتراكات منتهية.");
      } else {
        for (const name of snap.expired_school_names.slice(0, 20)) {
          lines.push(`• ${escHtml(name)}`);
        }
        if (snap.expired_school_names.length > 20) {
          lines.push(`... و${snap.expired_school_names.length - 20} أخرى`);
        }
      }

      return lines.join("\n").slice(0, 4000);
    }

    // /expiring7 — expiring in 7 days
    if (command === "/expiring7") {
      const report = await buildOpsReport();
      const snap = report.subscriptionSnapshot;
      const lines: string[] = [
        `🟡 <b>تنتهي خلال 7 أيام (${snap.expiring_7_days_count ?? 0})</b>`,
        "",
      ];

      if (!snap.expiring_soon_school_names || snap.expiring_soon_school_names.length === 0) {
        lines.push("لا توجد اشتراكات تنتهي قريباً.");
      } else {
        for (const name of snap.expiring_soon_school_names.slice(0, 20)) {
          lines.push(`• ${escHtml(name)}`);
        }
      }

      return lines.join("\n").slice(0, 4000);
    }

    // /expiring30 — expiring in 30 days
    if (command === "/expiring30") {
      const report = await buildOpsReport();
      const snap = report.subscriptionSnapshot;
      const lines: string[] = [
        `🟡 <b>تنتهي خلال 30 يوماً (${snap.expiring_30_days_count ?? 0})</b>`,
        "",
      ];

      if (!snap.expiring_soon_school_names || snap.expiring_soon_school_names.length === 0) {
        lines.push("لا توجد اشتراكات تنتهي في هذه الفترة.");
      } else {
        for (const name of snap.expiring_soon_school_names.slice(0, 20)) {
          lines.push(`• ${escHtml(name)}`);
        }
      }

      return lines.join("\n").slice(0, 4000);
    }

    // /finance_today — today's payments (aggregates only)
    if (command === "/finance_today") {
      const supabase = createServiceSupabaseClient();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const { data, error } = await supabase
        .from("payments")
        .select("id, amount")
        .gte("created_at", todayIso);

      if (error) {
        return `❌ تعذر جلب بيانات المدفوعات: ${escHtml(error.message.slice(0, 100))}`;
      }

      const payments = (data ?? []) as Array<Record<string, unknown>>;
      const count = payments.length;
      const total = payments.reduce((sum, p) => {
        const amt = typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount ?? "0")) || 0;
        return sum + amt;
      }, 0);

      return [
        `💰 <b>مدفوعات اليوم</b>`,
        "",
        `العدد: <b>${count}</b>`,
        `الإجمالي: <b>${total.toLocaleString("ar-IQ")} د.ع</b>`,
      ].join("\n");
    }

    // /revenue_week — last 7 days payments
    if (command === "/revenue_week") {
      const supabase = createServiceSupabaseClient();
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("payments")
        .select("id, amount")
        .gte("created_at", since);

      if (error) {
        return `❌ تعذر جلب بيانات المدفوعات: ${escHtml(error.message.slice(0, 100))}`;
      }

      const payments = (data ?? []) as Array<Record<string, unknown>>;
      const count = payments.length;
      const total = payments.reduce((sum, p) => {
        const amt = typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount ?? "0")) || 0;
        return sum + amt;
      }, 0);

      return [
        `💰 <b>مدفوعات آخر 7 أيام</b>`,
        "",
        `العدد: <b>${count}</b>`,
        `الإجمالي: <b>${total.toLocaleString("ar-IQ")} د.ع</b>`,
      ].join("\n");
    }

    // /revenue_month — last 30 days payments
    if (command === "/revenue_month") {
      const supabase = createServiceSupabaseClient();
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("payments")
        .select("id, amount")
        .gte("created_at", since);

      if (error) {
        return `❌ تعذر جلب بيانات المدفوعات: ${escHtml(error.message.slice(0, 100))}`;
      }

      const payments = (data ?? []) as Array<Record<string, unknown>>;
      const count = payments.length;
      const total = payments.reduce((sum, p) => {
        const amt = typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount ?? "0")) || 0;
        return sum + amt;
      }, 0);

      return [
        `💰 <b>مدفوعات آخر 30 يوماً</b>`,
        "",
        `العدد: <b>${count}</b>`,
        `الإجمالي: <b>${total.toLocaleString("ar-IQ")} د.ع</b>`,
      ].join("\n");
    }

    // /debts — outstanding balances summary (aggregates only)
    if (command === "/debts") {
      const supabase = createServiceSupabaseClient();
      // Query students with outstanding balance > 0 (aggregate only)
      const { data, error } = await supabase
        .from("students")
        .select("id, outstanding_balance")
        .gt("outstanding_balance", 0);

      if (error) {
        // Table might not have outstanding_balance column, show a safe fallback
        return [
          `💳 <b>ملخص المديونيات</b>`,
          "",
          "تعذر جلب بيانات المديونيات. تحقق من schema الجدول.",
        ].join("\n");
      }

      const debtors = (data ?? []) as unknown as Array<Record<string, unknown>>;
      const count = debtors.length;
      const total = debtors.reduce((sum, s) => {
        const bal = typeof s.outstanding_balance === "number"
          ? s.outstanding_balance
          : parseFloat(String(s.outstanding_balance ?? "0")) || 0;
        return sum + bal;
      }, 0);

      return [
        `💳 <b>ملخص المديونيات</b>`,
        "",
        `عدد الطلاب المدينين: <b>${count}</b>`,
        `الإجمالي المستحق: <b>${total.toLocaleString("ar-IQ")} د.ع</b>`,
      ].join("\n");
    }

    // ── Schools ──────────────────────────────────────────────────────────────

    if (command === "/schools") {
      return await getSchoolsOverview();
    }

    if (command === "/school") {
      return await getSchoolDetail(parsed.args);
    }

    // ── Extended Users ────────────────────────────────────────────────────────

    if (command === "/search") {
      return await searchUser(parsed.args);
    }

    if (command === "/newusers") {
      return await getNewUsers(1);
    }

    if (command === "/inactive") {
      return await getInactiveUsers();
    }

    // ── Finance / Activity ────────────────────────────────────────────────────

    if (command === "/revenue") {
      return await getRevenueOverview();
    }

    if (command === "/unpaid") {
      return await getUnpaidStudents();
    }

    if (command === "/attendance") {
      return await getAttendanceToday();
    }

    if (command === "/grades") {
      return await getGradesToday();
    }

    // ── Calendar ──────────────────────────────────────────────────────────────

    if (command === "/calendar") {
      const supabase = createServiceSupabaseClient();
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, title, start_date, end_date, school_id")
        .gte("start_date", now.toISOString())
        .lte("start_date", sevenDays)
        .order("start_date", { ascending: true })
        .limit(10);

      if (error) {
        return `❌ تعذر جلب أحداث التقويم: ${escHtml(error.message.slice(0, 100))}`;
      }

      const events = (data ?? []) as unknown as Array<{
        id: string;
        title: string | null;
        start_date: string;
        end_date: string | null;
        school_id: string | null;
      }>;

      if (events.length === 0) {
        return "📅 لا توجد أحداث في التقويم للأيام السبعة القادمة.";
      }

      const lines: string[] = [
        `📅 <b>أحداث التقويم — الأيام السبعة القادمة</b>`,
        "",
      ];

      for (const ev of events) {
        const startDate = new Date(ev.start_date).toLocaleDateString("ar-IQ", {
          timeZone: "Asia/Baghdad",
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        lines.push(`• <b>${escHtml(ev.title ?? "—")}</b> — ${startDate}`);
      }

      return lines.join("\n").slice(0, 4000);
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    if (command === "/notifications") {
      return await getNotificationsSummary();
    }

    // ── SQL ───────────────────────────────────────────────────────────────────

    if (command === "/sql") {
      return await executeSafeQuery(parsed.args);
    }

    // ── Maintenance ───────────────────────────────────────────────────────────

    if (command === "/maintenance") {
      return await getMaintenanceStatus();
    }

    // ── Env ───────────────────────────────────────────────────────────────────

    if (command === "/env") {
      return await getEnvSummary();
    }

    // ── AI commands ───────────────────────────────────────────────────────────

    if (command === "/ai") {
      return [
        "🤖 <b>أوامر الذكاء الاصطناعي</b>",
        "",
        "/ai_report — تقرير شامل بالذكاء الاصطناعي",
        "/ai_analyze [موضوع] — تحليل موضوع محدد",
        "/ai_predict [سؤال] — توقع مؤشر",
        "/ai_suggest — اقتراحات تحسين",
      ].join("\n");
    }

    if (command === "/ai_report") {
      return await aiGenerateReport();
    }

    if (command === "/ai_analyze") {
      return await aiAnalyzeTopic(parsed.args);
    }

    if (command === "/ai_predict") {
      return await aiPredictMetric(parsed.args);
    }

    if (command === "/ai_suggest") {
      return await aiSuggestImprovements();
    }

    // /ai_error_<id> — AI analyze a specific error
    if (command.startsWith("/ai_error_")) {
      const idPrefix = command.slice("/ai_error_".length);
      if (!idPrefix || idPrefix.length < 4) {
        return "⚠️ مطلوب: /ai_error_&lt;أول-8-أحرف-من-id&gt;";
      }

      const errors = await getRecentOpsErrors({ limit: 100 });
      const match = errors.find((e) => e.id.startsWith(idPrefix));

      if (!match) {
        return `❌ لم يُعثر على خطأ يبدأ بـ <code>${escHtml(idPrefix)}</code>`;
      }

      return await aiAnalyzeError(
        match.error_message,
        match.route ?? "—",
        undefined,
      );
    }

    // ── Uptime ────────────────────────────────────────────────────────────────

    if (command === "/uptime") {
      const supabase = createServiceSupabaseClient();
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("health_checks")
        .select("service, status, response_ms, checked_at")
        .gte("checked_at", since)
        .order("checked_at", { ascending: false });

      if (error) {
        return `❌ تعذر جلب بيانات الـ Uptime: ${escHtml(error.message.slice(0, 100))}`;
      }

      const checks = (data ?? []) as Array<{
        service: string;
        status: string;
        response_ms: number | null;
        checked_at: string;
      }>;

      if (checks.length === 0) {
        return "📈 لا توجد بيانات Uptime خلال آخر 30 يوماً.";
      }

      // Group by service
      const byService = new Map<string, { total: number; up: number; avgMs: number[] }>();
      for (const c of checks) {
        const s = c.service ?? "unknown";
        const existing = byService.get(s) ?? { total: 0, up: 0, avgMs: [] };
        existing.total += 1;
        if (c.status === "up" || c.status === "healthy") existing.up += 1;
        if (c.response_ms !== null) existing.avgMs.push(c.response_ms);
        byService.set(s, existing);
      }

      const lines: string[] = [
        `📈 <b>Uptime — آخر 30 يوماً</b>`,
        `إجمالي الفحوصات: ${checks.length}`,
        "",
      ];

      for (const [service, stats] of Array.from(byService.entries())) {
        const uptime = stats.total > 0 ? ((stats.up / stats.total) * 100).toFixed(1) : "—";
        const avgMs =
          stats.avgMs.length > 0
            ? Math.round(stats.avgMs.reduce((a: number, b: number) => a + b, 0) / stats.avgMs.length)
            : null;
        const icon = parseFloat(uptime) >= 99 ? "🟢" : parseFloat(uptime) >= 95 ? "🟡" : "🔴";
        lines.push(
          `${icon} ${escHtml(service)}: ${uptime}%${avgMs !== null ? ` (avg ${avgMs}ms)` : ""}`,
        );
      }

      return lines.join("\n").slice(0, 4000);
    }

    // ── Speed ─────────────────────────────────────────────────────────────────

    if (command === "/speed") {
      const supabase = createServiceSupabaseClient();
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("error_logs")
        .select("route, status_code, occurrence_count")
        .gte("created_at", since)
        .order("occurrence_count", { ascending: false })
        .limit(10);

      if (error) {
        return `❌ تعذر جلب بيانات الأداء: ${escHtml(error.message.slice(0, 100))}`;
      }

      const logs = (data ?? []) as Array<{
        route: string | null;
        status_code: number | null;
        occurrence_count: number;
      }>;

      if (logs.length === 0) {
        return "⚡ لا توجد أخطاء مسجلة آخر 7 أيام.";
      }

      const lines: string[] = [
        `⚡ <b>أداء المسارات — آخر 7 أيام</b>`,
        `(مسارات بأعلى تكرار أخطاء)`,
        "",
      ];

      for (const log of logs) {
        const route = log.route ?? "—";
        lines.push(
          `• <code>${escHtml(route.slice(0, 50))}</code> — ${log.occurrence_count} خطأ`,
        );
      }

      return lines.join("\n").slice(0, 4000);
    }

    // ── Part 28 — DB ──────────────────────────────────────────────────────────

    if (command === "/tables") {
      const { getTablesOverview } = await import("@/lib/ops/telegram-bot-supabase");
      return await getTablesOverview();
    }

    if (command === "/table") {
      const { getTableRows } = await import("@/lib/ops/telegram-bot-supabase");
      const tableName = parsed.args.split(" ")[0] ?? "";
      const { text } = await getTableRows(tableName, 0);
      return text;
    }

    if (command === "/row") {
      const { getRowDetail } = await import("@/lib/ops/telegram-bot-supabase");
      const parts = parsed.args.split(" ");
      return await getRowDetail(parts[0] ?? "", parts[1] ?? "");
    }

    if (command === "/count") {
      const { countRows } = await import("@/lib/ops/telegram-bot-supabase");
      const parts = parsed.args.split(" ");
      const filter = parts[1] ?? "";
      const filterCol = filter.includes("=") ? filter.split("=")[0] : undefined;
      const filterVal = filter.includes("=") ? filter.split("=")[1] : undefined;
      return await countRows(parts[0] ?? "", filterCol, filterVal);
    }

    if (command === "/schema") {
      const { getTableSchema } = await import("@/lib/ops/telegram-bot-supabase");
      return await getTableSchema(parsed.args.trim());
    }

    if (command === "/editrow") {
      const parts = parsed.args.trim().split(" ");
      if (parts.length < 4) {
        return [
          "✏️ <b>تعديل صف</b>",
          "",
          "الاستخدام: /editrow [جدول] [id] [حقل] [قيمة]",
          "مثال: /editrow crm_leads abc123 status hot",
          "",
          "الجداول المسموح بتعديلها: crm_leads, invoices, changelog_entries, trial_activations, bot_settings",
        ].join("\n");
      }
      const { editRowField } = await import("@/lib/ops/telegram-bot-supabase");
      return await editRowField(parts[0], parts[1], parts[2], parts.slice(3).join(" "));
    }

    // ── Part 29 — Auth ────────────────────────────────────────────────────────

    if (command === "/authusers") {
      const { getAuthUsersOverview } = await import("@/lib/ops/telegram-bot-supabase-auth");
      return await getAuthUsersOverview();
    }

    if (command === "/authuser") {
      const { getAuthUserDetail } = await import("@/lib/ops/telegram-bot-supabase-auth");
      return await getAuthUserDetail(parsed.args.trim());
    }

    if (command === "/authstats") {
      const { getAuthStats } = await import("@/lib/ops/telegram-bot-supabase-auth");
      return await getAuthStats();
    }

    if (command === "/disableauth") {
      const userId = parsed.args.trim();
      if (!userId) return "⚠️ مطلوب: /disableauth [user-id]";
      return [
        "⚠️ <b>تأكيد تعطيل المستخدم</b>",
        `ID: <code>${escHtml(userId.slice(0, 8))}</code>`,
        "",
        "لتنفيذ الأمر ابعث:",
        `/confirm_disableauth ${escHtml(userId)}`,
      ].join("\n");
    }

    if (command.startsWith("/confirm_disableauth")) {
      const userId = parsed.args.trim() || command.slice("/confirm_disableauth".length).trim();
      if (!userId) return "⚠️ مطلوب: user-id";
      const { disableAuthUser } = await import("@/lib/ops/telegram-bot-supabase-auth");
      return await disableAuthUser(userId);
    }

    if (command === "/enableauth") {
      const { enableAuthUser } = await import("@/lib/ops/telegram-bot-supabase-auth");
      return await enableAuthUser(parsed.args.trim());
    }

    if (command === "/deleteauth") {
      const userId = parsed.args.trim();
      if (!userId) return "⚠️ مطلوب: /deleteauth [user-id]";
      return [
        "🚨 <b>تحذير: حذف مستخدم نهائي</b>",
        `ID: <code>${escHtml(userId.slice(0, 8))}</code>`,
        "",
        "هذا الإجراء لا يمكن التراجع عنه!",
        "",
        "للتأكيد مرتين — ابعث:",
        `/confirm_deleteauth ${escHtml(userId)}`,
      ].join("\n");
    }

    if (command.startsWith("/confirm_deleteauth")) {
      const userId = parsed.args.trim() || command.slice("/confirm_deleteauth".length).trim();
      if (!userId) return "⚠️ مطلوب: user-id";
      return [
        "🚨 <b>تأكيد نهائي مطلوب</b>",
        `سيتم حذف المستخدم: <code>${escHtml(userId.slice(0, 8))}</code>`,
        "",
        "ابعث: /confirm_deleteauth2 " + escHtml(userId),
      ].join("\n");
    }

    if (command.startsWith("/confirm_deleteauth2")) {
      const userId = parsed.args.trim() || command.slice("/confirm_deleteauth2".length).trim();
      if (!userId) return "⚠️ مطلوب: user-id";
      const { deleteAuthUser } = await import("@/lib/ops/telegram-bot-supabase-auth");
      return await deleteAuthUser(userId);
    }

    // ── Part 30 — Storage ─────────────────────────────────────────────────────

    if (command === "/buckets") {
      const { getStorageBuckets } = await import("@/lib/ops/telegram-bot-supabase-infra");
      return await getStorageBuckets();
    }

    if (command === "/bucket") {
      const { getBucketFiles } = await import("@/lib/ops/telegram-bot-supabase-infra");
      return await getBucketFiles(parsed.args.trim());
    }

    if (command === "/storagesize") {
      const { getStorageSizeDetail } = await import("@/lib/ops/telegram-bot-supabase-infra");
      return await getStorageSizeDetail();
    }

    // ── Part 31 — RLS ─────────────────────────────────────────────────────────

    if (command === "/rls") {
      const { getRlsPolicies } = await import("@/lib/ops/telegram-bot-supabase-infra");
      return await getRlsPolicies(parsed.args.trim() || undefined);
    }

    if (command === "/rlscheck") {
      const { runRlsSecurityCheck } = await import("@/lib/ops/telegram-bot-supabase-infra");
      return await runRlsSecurityCheck();
    }

    // ── Part 32 — Migrations ──────────────────────────────────────────────────

    if (command === "/migrations") {
      const { getMigrationsList } = await import("@/lib/ops/telegram-bot-supabase-infra");
      return await getMigrationsList();
    }

    if (command === "/migration") {
      const { getMigrationContent } = await import("@/lib/ops/telegram-bot-supabase-infra");
      return await getMigrationContent(parsed.args.trim());
    }

    // ── Part 33 — Vercel ──────────────────────────────────────────────────────

    if (command === "/deploys") {
      const { getDeployments } = await import("@/lib/ops/telegram-bot-vercel");
      return await getDeployments();
    }

    if (command === "/deploy") {
      return [
        "🚀 <b>إعادة النشر</b>",
        "",
        "هذا الأمر يتطلب تأكيداً.",
        "لإعادة النشر ابعث: /confirm_deploy",
      ].join("\n");
    }

    if (command === "/confirm_deploy") {
      return "⚠️ إعادة النشر التلقائي غير مدعوم حالياً عبر Bot. استخدم Vercel Dashboard أو GitHub.";
    }

    if (command === "/buildlog") {
      const { getBuildLogs } = await import("@/lib/ops/telegram-bot-vercel");
      return await getBuildLogs(parsed.args.trim());
    }

    if (command === "/vcllogs") {
      const { getRuntimeLogs } = await import("@/lib/ops/telegram-bot-vercel");
      return await getRuntimeLogs();
    }

    if (command === "/vclenv") {
      const { getVercelEnvVars } = await import("@/lib/ops/telegram-bot-vercel");
      return await getVercelEnvVars();
    }

    // ── Part 34 — R2 ──────────────────────────────────────────────────────────

    if (command === "/r2") {
      if (parsed.args.trim()) {
        const { getR2BucketObjects } = await import("@/lib/ops/telegram-bot-r2");
        return await getR2BucketObjects(parsed.args.trim());
      }
      const { getR2Overview } = await import("@/lib/ops/telegram-bot-r2");
      return await getR2Overview();
    }

    if (command === "/r2size") {
      const { getR2SizeDetail } = await import("@/lib/ops/telegram-bot-r2");
      return await getR2SizeDetail();
    }

    // ── Part 35 — Diagnostics ─────────────────────────────────────────────────

    if (command === "/diagnose") {
      const { diagnoseRoute } = await import("@/lib/ops/telegram-bot-diagnostics");
      return await diagnoseRoute(parsed.args.trim());
    }

    if (command === "/healthcheck") {
      const { runHealthCheck } = await import("@/lib/ops/telegram-bot-diagnostics");
      return await runHealthCheck();
    }

    if (command === "/test_api") {
      const parts = parsed.args.trim().split(" ");
      const method = parts[0] ?? "GET";
      const route = parts[1] ?? "";
      const body = parts.slice(2).join(" ") || undefined;
      const { testApiRoute } = await import("@/lib/ops/telegram-bot-diagnostics");
      return await testApiRoute(method, route, body);
    }

    // ── Part 36 — Edge Functions ──────────────────────────────────────────────

    if (command === "/functions") {
      const { getEdgeFunctions } = await import("@/lib/ops/telegram-bot-diagnostics");
      return await getEdgeFunctions();
    }

    if (command === "/runfunction") {
      const fnName = parsed.args.trim();
      if (!fnName) return "⚠️ مطلوب: اسم الـ function";
      return [
        `⚡ <b>تشغيل Edge Function</b>`,
        `الاسم: <code>${escHtml(fnName)}</code>`,
        "",
        "للتأكيد ابعث: /confirm_runfunction " + escHtml(fnName),
      ].join("\n");
    }

    if (command.startsWith("/confirm_runfunction")) {
      const fnName = parsed.args.trim() || command.slice("/confirm_runfunction".length).trim();
      if (!fnName) return "⚠️ مطلوب: اسم الـ function";
      const { invokeEdgeFunction } = await import("@/lib/ops/telegram-bot-diagnostics");
      return await invokeEdgeFunction(fnName);
    }

    // ── Part 37 — CRM ─────────────────────────────────────────────────────────

    if (command === "/crm") {
      const { getCrmOverview } = await import("@/lib/ops/telegram-bot-business");
      return await getCrmOverview();
    }

    if (command === "/addlead") {
      if (!parsed.args.trim()) {
        return [
          "📋 <b>إضافة عميل جديد</b>",
          "",
          "الاستخدام: /addlead [مدرسة]|[تواصل]|[هاتف]|[ملاحظات]",
          "مثال: /addlead مدرسة النور|أحمد محمد|07701234567|مهتم بالنظام",
        ].join("\n");
      }
      const parts = parsed.args.split("|");
      const { addCrmLead } = await import("@/lib/ops/telegram-bot-business");
      return await addCrmLead(
        parts[0]?.trim() ?? "",
        parts[1]?.trim() ?? "",
        parts[2]?.trim() ?? "",
        parts[3]?.trim() ?? "",
      );
    }

    if (command === "/followup") {
      const { getFollowups } = await import("@/lib/ops/telegram-bot-business");
      return await getFollowups();
    }

    // ── Part 38 — Invoices ────────────────────────────────────────────────────

    if (command === "/invoices") {
      const { getInvoicesOverview } = await import("@/lib/ops/telegram-bot-business");
      return await getInvoicesOverview();
    }

    if (command === "/markinvoice") {
      const { markInvoicePaid } = await import("@/lib/ops/telegram-bot-business");
      return await markInvoicePaid(parsed.args.trim());
    }

    // ── Part 39 — Business ────────────────────────────────────────────────────

    if (command === "/pnl") {
      const { getPnlReport } = await import("@/lib/ops/telegram-bot-business");
      return await getPnlReport();
    }

    if (command === "/roi") {
      const { getRoiReport } = await import("@/lib/ops/telegram-bot-business");
      return await getRoiReport();
    }

    if (command === "/forecast") {
      const { getRevenueForecast } = await import("@/lib/ops/telegram-bot-business");
      return await getRevenueForecast();
    }

    // ── Part 40 — Subscriptions ───────────────────────────────────────────────

    if (command === "/subs") {
      const { getSubscriptionsDetail } = await import("@/lib/ops/telegram-bot-business");
      return await getSubscriptionsDetail();
    }

    // ── Part 41 — Changelog ───────────────────────────────────────────────────

    if (command === "/changelog") {
      const { getChangelog } = await import("@/lib/ops/telegram-bot-business");
      return await getChangelog();
    }

    if (command === "/release") {
      if (!parsed.args.trim()) {
        return [
          "📝 <b>إضافة Changelog</b>",
          "",
          "الاستخدام: /release [version]|[وصف]",
          "مثال: /release 2.1.0|إضافة نظام الرواتب للمعلمين",
        ].join("\n");
      }
      const parts = parsed.args.split("|");
      const { addChangelog } = await import("@/lib/ops/telegram-bot-business");
      return await addChangelog(parts[0]?.trim() ?? "", parts[1]?.trim() ?? "");
    }

    if (command === "/trial") {
      const parts = parsed.args.trim().split(" ");
      if (parts.length < 2) {
        return "⚠️ الاستخدام: /trial [اسم المدرسة] [عدد الأيام]";
      }
      const days = parseInt(parts[parts.length - 1], 10);
      const schoolName = parts.slice(0, -1).join(" ");
      const { activateTrial } = await import("@/lib/ops/telegram-bot-business");
      return await activateTrial(schoolName, days);
    }

    // ── Part 42 — Analytics ───────────────────────────────────────────────────

    if (command === "/usage") {
      const { getFeatureUsage } = await import("@/lib/ops/telegram-bot-analytics");
      return await getFeatureUsage();
    }

    if (command === "/journey") {
      const { getUserJourneyStats } = await import("@/lib/ops/telegram-bot-analytics");
      return await getUserJourneyStats();
    }

    if (command === "/satisfaction") {
      const { getSatisfactionResults } = await import("@/lib/ops/telegram-bot-analytics");
      return await getSatisfactionResults();
    }

    if (command === "/sendsurvey") {
      const { sendSatisfactionSurvey } = await import("@/lib/ops/telegram-bot-analytics");
      return await sendSatisfactionSurvey();
    }

    // ── Part 43 — Security ────────────────────────────────────────────────────

    if (command === "/roles") {
      const { getRolesOverview } = await import("@/lib/ops/telegram-bot-analytics");
      return await getRolesOverview();
    }

    if (command === "/2fa") {
      const { get2faStatus } = await import("@/lib/ops/telegram-bot-analytics");
      return await get2faStatus();
    }

    // ── Part 44 — Realtime ────────────────────────────────────────────────────

    if (command === "/realtime") {
      const { getRealtimeStats } = await import("@/lib/ops/telegram-bot-analytics");
      return await getRealtimeStats();
    }

    // ── Broadcast (show confirmation) ─────────────────────────────────────────

    if (command === "/broadcast") {
      if (!parsed.args.trim()) {
        return "⚠️ مطلوب: /broadcast [الرسالة]";
      }
      return [
        "📢 <b>بث رسالة</b>",
        "",
        `الرسالة: ${escHtml(parsed.args.slice(0, 200))}`,
        "",
        "هذا الأمر متاح عبر لوحة الإدارة فقط لأسباب أمنية.",
      ].join("\n");
    }

    // Unknown command — show help
    return [
      `❓ أمر غير معروف: <code>${escHtml(command)}</code>`,
      "",
      formatHelpMessage(),
    ].join("\n");
  } catch (err) {
    // Log internally but never expose error details over Telegram
    console.error(
      "[telegram-cmd] error handling",
      command,
      err instanceof Error ? err.message : String(err ?? ""),
    );
    return "⚠️ تعذر تنفيذ الأمر. يرجى المحاولة لاحقاً.";
  }
}
