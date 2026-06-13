import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Derive a Telegram-compatible secret token from the raw TELEGRAM_WEBHOOK_SECRET.
 *
 * Telegram's setWebhook secret_token only allows: A-Z, a-z, 0-9, _ and -
 * The env var may contain base64 characters (+, /, =) which are not allowed.
 *
 * We SHA256-hash the raw secret to produce a 64-char hex string (0-9, a-f)
 * which is always within Telegram's allowed character set.
 *
 * Both the setup route (setWebhook) and the webhook handler must use this
 * function so they agree on the token value.
 */
export function getTelegramSecretToken(rawSecret: string): string {
  return createHash("sha256").update(rawSecret).digest("hex");
}

export function verifyTelegramSecret(provided: string, rawSecret: string): boolean {
  const expected = getTelegramSecretToken(rawSecret);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
