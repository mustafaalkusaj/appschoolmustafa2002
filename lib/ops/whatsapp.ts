import "server-only";

import type { OpsReport } from "@/lib/ops/health-monitor";

type WhatsAppSendResult = {
  status: "sent" | "failed" | "skipped";
  reason?: "not_configured" | "disabled" | "request_failed";
  maskedPhone: string | null;
  providerMessageId?: string | null;
};

type OpsAlertLike = {
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function normalizeEnabled(value: string) {
  return value !== "0" && value.toLowerCase() !== "false";
}

function toIndicator(status: "healthy" | "degraded" | "down") {
  if (status === "healthy") return "✅";
  if (status === "degraded") return "⚠️";
  return "❌";
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  return last4 ? `***${last4}` : "***";
}

export function isWhatsAppConfigured() {
  const accessToken = env("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
  const toPhone = env("WHATSAPP_TO_PHONE");
  const enabled = normalizeEnabled(env("OPS_WHATSAPP_ENABLED") || "true");

  return {
    configured: Boolean(accessToken && phoneNumberId && toPhone),
    enabled,
    maskedPhone: toPhone ? maskPhone(toPhone) : null,
  };
}

export async function sendWhatsAppText(message: string): Promise<WhatsAppSendResult> {
  const accessToken = env("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
  const toPhone = env("WHATSAPP_TO_PHONE");
  const { configured, enabled, maskedPhone } = isWhatsAppConfigured();

  if (!enabled) {
    return {
      status: "skipped",
      reason: "disabled",
      maskedPhone,
    };
  }

  if (!configured || !accessToken || !phoneNumberId || !toPhone) {
    return {
      status: "skipped",
      reason: "not_configured",
      maskedPhone,
    };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone,
        type: "text",
        text: {
          body: message,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const payload = (await response.json().catch(() => null)) as
      | { messages?: Array<{ id?: string }> }
      | { error?: { message?: string } }
      | null;

    if (!response.ok) {
      return {
        status: "failed",
        reason: "request_failed",
        maskedPhone,
      };
    }

    return {
      status: "sent",
      maskedPhone,
      providerMessageId: payload && "messages" in payload ? payload.messages?.[0]?.id ?? null : null,
    };
  } catch {
    return {
      status: "failed",
      reason: "request_failed",
      maskedPhone,
    };
  }
}

export function buildDailyWhatsAppMessage(report: OpsReport) {
  const subscriptions = report.subscriptionSnapshot;

  return [
    "تقرير تشغيل school-iraq.com",
    "",
    `الحالة: ${report.status}`,
    `التقييم: ${report.score}/100`,
    "",
    `الدومين: ${toIndicator(report.checks.domain.status)}`,
    `Vercel: ${toIndicator(report.checks.vercel.status)}`,
    `Supabase Auth: ${toIndicator(report.checks.supabaseAuth.status)}`,
    `Database: ${toIndicator(report.checks.database.status)}`,
    `Storage: ${toIndicator(report.checks.storage.status)}`,
    `Upstash: ${toIndicator(report.checks.upstash.status)}`,
    "",
    "الاشتراكات:",
    `- منتهية: ${subscriptions.expired_count ?? "?"}`,
    `- تنتهي خلال 7 أيام: ${subscriptions.expiring_7_days_count ?? "?"}`,
    `- تنتهي خلال 30 يوم: ${subscriptions.expiring_30_days_count ?? "?"}`,
    "",
    "ملاحظات:",
    `- ${report.summary}`,
    "",
    `وقت التقرير: ${new Date().toISOString()}`,
  ].join("\n");
}

export function buildCriticalWhatsAppMessage(alert: OpsAlertLike) {
  return [
    "🚨 تنبيه حرج",
    "",
    `العنوان: ${alert.title}`,
    `الخطورة: ${alert.severity}`,
    `التفاصيل: ${alert.message}`,
    `الوقت: ${new Date().toISOString()}`,
  ].join("\n");
}
