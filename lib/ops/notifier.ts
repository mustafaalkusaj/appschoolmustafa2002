import "server-only";

import type { OpsCheckResult, OpsReport } from "@/lib/ops/health-monitor";
import { sendOpsEmail } from "@/lib/ops/email";
import { sendTelegramMessage } from "@/lib/ops/telegram";
import { isThrottled, markThrottled } from "@/lib/ops/throttle";
import { isWhatsAppConfigured, sendWhatsAppText } from "@/lib/ops/whatsapp";

export type NotifySeverity = "info" | "warning" | "critical";

type NotifyInput = {
  title: string;
  message: string;
  telegramHtml?: string;
  severity: NotifySeverity;
};

type ProviderResult = {
  status: "sent" | "failed" | "skipped";
  reason?: string;
};

type NotifyResult = {
  telegram: ProviderResult;
  email: ProviderResult;
  whatsapp: ProviderResult;
  throttled?: boolean;
};

// 6 hours for warnings, 23 hours for daily (info) reports
const THROTTLE_WINDOW: Record<NotifySeverity, number> = {
  critical: 0,
  warning: 6 * 3600,
  info: 23 * 3600,
};

function normalizeEnabled(value: string) {
  return value !== "0" && value.toLowerCase() !== "false";
}

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toBaghdadTime(date: Date): string {
  try {
    return date.toLocaleString("ar-IQ", {
      timeZone: "Asia/Baghdad",
      weekday: "short",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return date.toISOString();
  }
}

function headerEmoji(severity: NotifySeverity): string {
  if (severity === "critical") return "🔴";
  if (severity === "warning") return "🟡";
  return "🟢";
}

function headerTitle(severity: NotifySeverity): string {
  if (severity === "critical") return "تنبيه حرج";
  if (severity === "warning") return "تحذير";
  return "تقرير يومي";
}

function scoreLabel(score: number): string {
  if (score < 70) return "حرج 🚨";
  if (score < 90) return "متدهور ⚠️";
  return "سليم ✅";
}

function checkReasonSuffix(check: OpsCheckResult): string {
  if (check.status === "healthy") return "";
  if (check.reason) return ` — ${check.reason}`;
  if (check.message && check.message.length <= 50) return ` — ${check.message}`;
  return "";
}

function checkLineHtml(label: string, check: OpsCheckResult): string {
  const icon = check.status === "healthy" ? "✅" : check.status === "degraded" ? "⚠️" : "❌";
  const suffix = checkReasonSuffix(check);
  return `${icon} ${escHtml(label)}${escHtml(suffix)}`;
}

function checkLinePlain(label: string, check: OpsCheckResult): string {
  const icon = check.status === "healthy" ? "✅" : check.status === "degraded" ? "⚠️" : "❌";
  const suffix = checkReasonSuffix(check);
  return `${icon} ${label}${suffix}`;
}

function buildActionItems(report: OpsReport): string[] {
  const items: string[] = [];

  if (report.checks.domain.status === "down") {
    items.push("🔴 مراجعة DNS والدومين — قد يكون الموقع لا يعمل");
  }
  if (report.checks.supabaseAuth.status === "down") {
    items.push("🔴 مراجعة Supabase Auth فوراً — تسجيل الدخول متأثر");
  }
  if (report.checks.database.status === "down") {
    items.push("🔴 مراجعة قاعدة البيانات فوراً — البيانات غير متاحة");
  }
  if (report.checks.storage.status !== "healthy") {
    items.push(`⚠️ مراجعة Storage buckets${report.checks.storage.reason ? " (" + report.checks.storage.reason + ")" : ""}`);
  }
  if (report.checks.upstash.status !== "healthy") {
    const r = report.checks.upstash.reason;
    if (r === "missing_env") {
      items.push("⚠️ إعداد Upstash Redis (UPSTASH_REDIS_REST_URL و TOKEN) لأن auth login سيعتمد مؤقتاً على memory fallback");
    } else {
      items.push("⚠️ مراجعة Upstash Redis — ping failed وauth login قد يتحول إلى memory fallback");
    }
  }

  const expired = report.subscriptionSnapshot.expired_count ?? 0;
  if (expired > 0) {
    const names = report.subscriptionSnapshot.expired_school_names;
    const nameStr = names && names.length > 0 ? `: ${names.slice(0, 5).join("، ")}` : ` (${expired})`;
    items.push(`⚠️ تجديد اشتراكات منتهية${nameStr}`);
  }

  const expiringSoon = report.subscriptionSnapshot.expiring_7_days_count ?? 0;
  if (expiringSoon > 0) {
    const names = report.subscriptionSnapshot.expiring_soon_school_names;
    const nameStr = names && names.length > 0 ? `: ${names.slice(0, 5).join("، ")}` : ` (${expiringSoon})`;
    items.push(`⚠️ تجديد اشتراكات تنتهي خلال 7 أيام${nameStr}`);
  }

  return items;
}

export function buildOpsTelegramHtml(report: OpsReport, severity: NotifySeverity = "info"): string {
  const now = new Date();
  const timeStr = toBaghdadTime(now);
  const sub = report.subscriptionSnapshot;
  const actions = buildActionItems(report);

  const lines: string[] = [
    `${headerEmoji(severity)} <b>${escHtml(headerTitle(severity))} — school-iraq.com</b>`,
    "",
    `📅 ${escHtml(timeStr)} (بغداد)`,
    `📊 <b>${report.score}/100</b> — ${scoreLabel(report.score)}`,
    "",
    "<b>الخدمات</b>",
    checkLineHtml("الدومين", report.checks.domain),
    checkLineHtml("Vercel", report.checks.vercel),
    checkLineHtml("Supabase Auth", report.checks.supabaseAuth),
    checkLineHtml("Database", report.checks.database),
    checkLineHtml("Storage", report.checks.storage),
    checkLineHtml("Upstash", report.checks.upstash),
    "",
    "<b>الاشتراكات</b>",
  ];

  const expired = sub.expired_count ?? 0;
  const expiringSoon = sub.expiring_7_days_count ?? 0;
  const expiring30 = sub.expiring_30_days_count ?? 0;
  const active = sub.active_count ?? 0;

  if (expired > 0) {
    const names = sub.expired_school_names;
    const namePart = names && names.length > 0 ? ` — ${names.slice(0, 5).map(escHtml).join("، ")}` : "";
    lines.push(`⚠️ منتهية: ${expired}${namePart}`);
  }
  if (expiringSoon > 0) {
    const names = sub.expiring_soon_school_names;
    const namePart = names && names.length > 0 ? ` — ${names.slice(0, 5).map(escHtml).join("، ")}` : "";
    lines.push(`⚠️ تنتهي خلال 7 أيام: ${expiringSoon}${namePart}`);
  }
  if (expiring30 > expiringSoon) {
    lines.push(`تنتهي خلال 30 يوم: ${expiring30}`);
  }
  lines.push(`✅ نشطة: ${active}`);

  if (actions.length > 0) {
    lines.push("");
    lines.push("<b>الإجراء المطلوب</b>");
    for (const action of actions) {
      lines.push(escHtml(action));
    }
  }

  lines.push("");
  lines.push("<b>روابط</b>");
  lines.push(
    `<a href="https://school-iraq.com">🌐 الموقع</a> · ` +
    `<a href="https://school-iraq.com/ar/super-admin">⚙️ الإدارة</a> · ` +
    `<a href="https://school-iraq.com/ar/subscriptions">💳 الاشتراكات</a>`,
  );

  return lines.join("\n");
}

export function buildOpsNotificationMessage(report: OpsReport, severity: NotifySeverity = "info"): string {
  const now = new Date();
  const timeStr = toBaghdadTime(now);
  const sub = report.subscriptionSnapshot;
  const prefix = severity === "critical" ? "🚨 تنبيه حرج\n\n" : "";
  const actions = buildActionItems(report);

  const lines: string[] = [
    `${headerEmoji(severity)} ${headerTitle(severity)} — school-iraq.com`,
    "",
    `التاريخ: ${timeStr} (بغداد)`,
    `التقييم: ${report.score}/100 — ${scoreLabel(report.score)}`,
    "",
    "الخدمات:",
    checkLinePlain("الدومين", report.checks.domain),
    checkLinePlain("Vercel", report.checks.vercel),
    checkLinePlain("Supabase Auth", report.checks.supabaseAuth),
    checkLinePlain("Database", report.checks.database),
    checkLinePlain("Storage", report.checks.storage),
    checkLinePlain("Upstash", report.checks.upstash),
    "",
    "الاشتراكات:",
  ];

  const expired = sub.expired_count ?? 0;
  const expiringSoon = sub.expiring_7_days_count ?? 0;

  if (expired > 0) {
    const names = sub.expired_school_names;
    const nameStr = names && names.length > 0 ? ` — ${names.join("، ")}` : "";
    lines.push(`- منتهية: ${expired}${nameStr}`);
  } else {
    lines.push(`- منتهية: 0`);
  }

  if (expiringSoon > 0) {
    const names = sub.expiring_soon_school_names;
    const nameStr = names && names.length > 0 ? ` — ${names.join("، ")}` : "";
    lines.push(`- تنتهي خلال 7 أيام: ${expiringSoon}${nameStr}`);
  } else {
    lines.push(`- تنتهي خلال 7 أيام: 0`);
  }

  lines.push(`- تنتهي خلال 30 يوم: ${sub.expiring_30_days_count ?? "?"}`);
  lines.push(`- نشطة: ${sub.active_count ?? "?"}`);

  if (actions.length > 0) {
    lines.push("");
    lines.push("الإجراء المطلوب:");
    for (const action of actions) {
      lines.push(`• ${action}`);
    }
  }

  lines.push("");
  lines.push("روابط:");
  lines.push("- https://school-iraq.com");
  lines.push("- https://school-iraq.com/ar/super-admin");
  lines.push("- https://school-iraq.com/ar/subscriptions");

  return prefix + lines.join("\n");
}

export function classifyNotificationSeverity(report: OpsReport): NotifySeverity {
  if (
    report.checks.domain.status === "down" ||
    report.checks.database.status === "down" ||
    report.checks.supabaseAuth.status === "down" ||
    report.score < 70
  ) {
    return "critical";
  }
  if (
    report.status === "degraded" ||
    report.score < 90 ||
    (report.subscriptionSnapshot.expired_count ?? 0) > 0
  ) {
    return "warning";
  }
  return "info";
}

export async function sendOpsNotification(input: NotifyInput): Promise<NotifyResult> {
  const telegramEnabled = normalizeEnabled(process.env.OPS_TELEGRAM_ENABLED?.trim() || "true");
  const emailEnabled = normalizeEnabled(process.env.OPS_EMAIL_ENABLED?.trim() || "true");
  const whatsappEnabled = normalizeEnabled(process.env.OPS_WHATSAPP_ENABLED?.trim() || "false");

  // Throttle non-critical notifications
  if (input.severity !== "critical") {
    const throttleKey = `notification_${input.severity}`;
    const throttled = await isThrottled(throttleKey);
    if (throttled) {
      return {
        telegram: { status: "skipped", reason: "throttled" },
        email: { status: "skipped", reason: "throttled" },
        whatsapp: { status: "skipped", reason: "throttled" },
        throttled: true,
      };
    }
  }

  const telegramMsg = input.telegramHtml ?? input.message;

  const telegramResult: ProviderResult = telegramEnabled
    ? await sendTelegramMessage(telegramMsg).catch(() => ({
        provider: "telegram" as const,
        status: "failed" as const,
        reason: "request_failed",
      }))
    : { status: "skipped", reason: "disabled" };

  const emailResult: ProviderResult = emailEnabled
    ? await sendOpsEmail(input.title, input.message).catch(() => ({
        provider: "email" as const,
        status: "failed" as const,
        reason: "request_failed",
      }))
    : { status: "skipped", reason: "disabled" };

  let whatsappResult: ProviderResult = { status: "skipped", reason: "disabled" };
  if (whatsappEnabled) {
    const { configured } = isWhatsAppConfigured();
    if (configured) {
      const wa = await sendWhatsAppText(input.message).catch(() => ({
        status: "failed" as const,
        reason: "request_failed" as const,
        maskedPhone: null,
      }));
      whatsappResult = { status: wa.status, reason: wa.reason };
    } else {
      whatsappResult = { status: "skipped", reason: "not_configured" };
    }
  }

  const anySent =
    telegramResult.status === "sent" ||
    emailResult.status === "sent" ||
    whatsappResult.status === "sent";

  if (input.severity !== "critical" && anySent) {
    const windowSeconds = THROTTLE_WINDOW[input.severity];
    if (windowSeconds > 0) {
      await markThrottled(`notification_${input.severity}`, windowSeconds);
    }
  }

  return { telegram: telegramResult, email: emailResult, whatsapp: whatsappResult };
}
