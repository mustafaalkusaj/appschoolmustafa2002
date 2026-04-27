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
    "",
    "<b>الأخطاء:</b>",
    "/errors — آخر 5 أخطاء مفتوحة",
    "/error_&lt;id&gt; — تفاصيل خطأ محدد",
    "/prompt_&lt;id&gt; — Fix Prompt للخطأ",
    "/fixed_&lt;id&gt; — تحديد خطأ كـ fixed",
    "/ignore_&lt;id&gt; — تجاهل خطأ",
    "",
    "<b>المستخدمون:</b>",
    "/users — إحصائيات المستخدمين",
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
    "<b>المالية (إجماليات فقط):</b>",
    "/finance_today — مدفوعات اليوم",
    "/revenue_week — مدفوعات آخر 7 أيام",
    "/revenue_month — مدفوعات آخر 30 يوماً",
    "/debts — ملخص المديونيات",
    "",
    "/test — رسالة اختبار",
    "/help — هذه القائمة",
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
    if (command === "/help" || command === "/start") {
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
        .select("*")
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

      const debtors = (data ?? []) as Array<Record<string, unknown>>;
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
