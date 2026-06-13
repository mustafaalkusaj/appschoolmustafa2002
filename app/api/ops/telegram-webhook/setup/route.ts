import { NextRequest, NextResponse } from "next/server";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
import { getTelegramSecretToken } from "@/lib/ops/telegram-secret";

function notFound() {
  return NextResponse.json(
    { ok: false, message: "Not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * POST /api/ops/telegram-webhook/setup
 *
 * Registers the webhook URL with Telegram's setWebhook API.
 * Protected by OPS_ALERT_TOKEN.
 * Never logs or returns TELEGRAM_BOT_TOKEN.
 */
export async function POST(request: NextRequest) {
  const authorized = isOpsTokenAuthorized(request, [
    process.env.OPS_ALERT_TOKEN,
  ]);
  if (!authorized) return notFound();

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const domain = (
    process.env.OFFICIAL_DOMAIN_URL?.trim() ?? "https://school-iraq.com"
  ).replace(/\/$/, "");

  const webhookPath = "/api/ops/telegram-webhook";
  const webhookUrl = `${domain}${webhookPath}`;
  // Secret is passed via Telegram's secret_token parameter (sent as
  // X-Telegram-Bot-Api-Secret-Token header on each webhook call).
  // This keeps the secret out of the URL / access logs.

  const setWebhookBody: Record<string, unknown> = {
    url: webhookUrl,
    allowed_updates: ["message", "channel_post", "callback_query"],
    drop_pending_updates: true,
  };
  if (webhookSecret) {
    // Telegram only allows A-Z, a-z, 0-9, _ and - in secret_token.
    // Hash to hex (0-9, a-f) so any raw secret value works.
    setWebhookBody.secret_token = getTelegramSecretToken(webhookSecret);
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setWebhookBody),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      },
    );

    const payload = (await res.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
      error_code?: number;
    } | null;

    const success = payload?.ok === true;

    return NextResponse.json(
      {
        ok: success,
        description: payload?.description ?? null,
        webhook_domain: domain,
        webhook_path: webhookPath,
        secret_configured: Boolean(webhookSecret),
      },
      {
        status: success ? 200 : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "request_failed",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
