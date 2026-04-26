import { NextRequest, NextResponse } from "next/server";

import {
  handleTelegramCommand,
  parseTelegramCommand,
  parseTelegramUpdate,
} from "@/lib/ops/telegram-commands";
import { maskChatId, sendTelegramBotReply } from "@/lib/ops/telegram";
import { getTelegramSecretToken } from "@/lib/ops/telegram-secret";

// Always return 200 — Telegram retries on non-200 responses
function ok() {
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  // ── 1. Verify webhook secret ────────────────────────────────────────────────
  // Secret is read from X-Telegram-Bot-Api-Secret-Token header (set via Telegram
  // setWebhook secret_token param). Query param was removed — URL-embedded secrets
  // appear in Vercel access logs and Telegram's side as part of the webhook URL.
  // Fail-closed: if TELEGRAM_WEBHOOK_SECRET is not set, reject all requests.
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    console.log("[telegram-webhook] rejected: TELEGRAM_WEBHOOK_SECRET not configured");
    return ok();
  }
  const provided = request.headers.get("x-telegram-bot-api-secret-token")?.trim() ?? "";
  if (provided !== getTelegramSecretToken(webhookSecret)) {
    console.log("[telegram-webhook] rejected: wrong secret");
    return ok();
  }

  // ── 2. Parse body ───────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.log("[telegram-webhook] rejected: invalid JSON body");
    return ok();
  }

  // ── 3. Parse Telegram update ────────────────────────────────────────────────
  const update = parseTelegramUpdate(body);
  if (!update) {
    console.log("[telegram-webhook] rejected: not a valid Telegram update");
    return ok();
  }

  const message = update.message ?? update.channel_post;
  if (!message?.text) return ok(); // photo/sticker/etc — silently ignore

  // ── 4. Verify authorized chat ─────────────────────────────────────────────
  const expectedChatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!expectedChatId) {
    console.log("[telegram-webhook] rejected: TELEGRAM_CHAT_ID not configured");
    return ok();
  }

  // Convert Telegram's numeric chat.id to string for reliable comparison
  const incomingChatId = String(message.chat.id);
  const authorized = incomingChatId === expectedChatId;

  if (!authorized) {
    // Mask chat id in log — never log raw ids that could identify users
    const masked = maskChatId(incomingChatId);
    console.log(`[telegram-webhook] rejected: unauthorized chat ${masked}`);
    return ok();
  }

  // ── 5. Parse command ────────────────────────────────────────────────────────
  const parsed = parseTelegramCommand(message.text);
  if (!parsed) return ok(); // plain text message — ignore

  console.log(`[telegram-webhook] command received: ${parsed.command} authorized: true`);

  // ── 6. Handle command ───────────────────────────────────────────────────────
  let reply: string;
  try {
    reply = await handleTelegramCommand(parsed);
  } catch (err) {
    console.log(
      "[telegram-webhook] command handler error:",
      err instanceof Error ? err.message : "unknown",
    );
    reply = "⚠️ تعذر تنفيذ الأمر. يرجى المحاولة لاحقاً.";
  }

  // ── 7. Send reply ──────────────────────────────────────────────────────────
  // Use sendTelegramBotReply — bypasses OPS_TELEGRAM_ENABLED so commands
  // always get a response even if alert notifications are disabled.
  try {
    const result = await sendTelegramBotReply(reply);
    console.log(
      `[telegram-webhook] reply status: ${result.status}${result.reason ? ` (${result.reason})` : ""}`,
    );
  } catch (err) {
    console.log(
      "[telegram-webhook] send error:",
      err instanceof Error ? err.message : "unknown",
    );
  }

  return ok();
}
