import "server-only";

type EmailSendResult = {
  provider: "email";
  status: "sent" | "failed" | "skipped";
  reason?: "not_configured" | "request_failed";
  messageId?: string | null;
  maskedTo?: string | null;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function normalizeEnabled(value: string) {
  return value !== "0" && value.toLowerCase() !== "false";
}

export function maskEmail(email: string) {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}***${domain}`;
}

export function isEmailConfigured() {
  const apiKey = env("RESEND_API_KEY");
  const from = env("OPS_ALERT_EMAIL_FROM");
  const to = env("OPS_ALERT_EMAIL_TO");
  const enabled = normalizeEnabled(env("OPS_EMAIL_ENABLED") || "true");

  return {
    configured: Boolean(apiKey && from && to),
    enabled,
    maskedTo: to ? maskEmail(to) : null,
  };
}

export async function sendOpsEmail(subject: string, message: string): Promise<EmailSendResult> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("OPS_ALERT_EMAIL_FROM");
  const to = env("OPS_ALERT_EMAIL_TO");
  const { configured, enabled, maskedTo } = isEmailConfigured();

  if (!enabled) {
    return { provider: "email", status: "skipped", reason: "not_configured", maskedTo };
  }

  if (!configured || !apiKey || !from || !to) {
    return { provider: "email", status: "skipped", reason: "not_configured", maskedTo };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: message,
        html: `<pre style="white-space:pre-wrap;font-family:monospace">${message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return { provider: "email", status: "failed", reason: "request_failed", maskedTo };
    }

    const payload = (await response.json().catch(() => null)) as { id?: string } | null;

    return {
      provider: "email",
      status: "sent",
      messageId: payload?.id ?? null,
      maskedTo,
    };
  } catch {
    return { provider: "email", status: "failed", reason: "request_failed", maskedTo };
  }
}
