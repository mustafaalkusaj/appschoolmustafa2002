import { NextRequest, NextResponse } from "next/server";
import { isOpsTokenAuthorized } from "@/lib/ops/security";

function notFound() {
  return NextResponse.json(
    { ok: false, message: "Not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * POST /api/ops/telegram-webhook/delete
 *
 * Removes the Telegram webhook via deleteWebhook API.
 * Protected by OPS_ALERT_TOKEN.
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

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`,
      {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      },
    );

    const payload = (await res.json().catch(() => null)) as {
      ok?: boolean;
      description?: string;
    } | null;

    return NextResponse.json(
      {
        ok: payload?.ok === true,
        description: payload?.description ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
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
