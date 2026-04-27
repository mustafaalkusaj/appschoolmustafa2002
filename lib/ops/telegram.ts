import "server-only";

type TelegramSendResult = {
  provider: "telegram";
  status: "sent" | "failed" | "skipped";
  reason?: "not_configured" | "request_failed";
  messageId?: number | null;
};

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function normalizeEnabled(value: string) {
  return value !== "0" && value.toLowerCase() !== "false";
}

export function maskChatId(chatId: string) {
  if (chatId.length <= 4) return "***";
  return `***${chatId.slice(-4)}`;
}

export function isTelegramConfigured() {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_CHAT_ID");
  const enabled = normalizeEnabled(env("OPS_TELEGRAM_ENABLED") || "true");

  return {
    configured: Boolean(token && chatId),
    enabled,
    maskedChatId: chatId ? maskChatId(chatId) : null,
  };
}

/**
 * Send a message directly via the Bot API, bypassing OPS_TELEGRAM_ENABLED.
 * Use for bot command replies — the user expects a response regardless of
 * whether alert notifications are enabled.
 */
export async function sendTelegramBotReply(
  text: string,
  chatId?: string,
): Promise<TelegramSendResult> {
  const token = env("TELEGRAM_BOT_TOKEN");
  const targetChatId = chatId ?? env("TELEGRAM_CHAT_ID");

  if (!token || !targetChatId) {
    return { provider: "telegram", status: "skipped", reason: "not_configured" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      return { provider: "telegram", status: "failed", reason: "request_failed" };
    }

    const payload = (await response.json().catch(() => null)) as
      | { result?: { message_id?: number } }
      | null;

    return {
      provider: "telegram",
      status: "sent",
      messageId: payload?.result?.message_id ?? null,
    };
  } catch {
    return { provider: "telegram", status: "failed", reason: "request_failed" };
  }
}

export async function sendTelegramMessage(message: string): Promise<TelegramSendResult> {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_CHAT_ID");
  const { configured, enabled, maskedChatId } = isTelegramConfigured();

  if (!enabled) {
    return { provider: "telegram", status: "skipped", reason: "not_configured" };
  }

  if (!configured || !token || !chatId) {
    return { provider: "telegram", status: "skipped", reason: "not_configured" };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { description?: string } | null;
      void maskedChatId; // used for logging context only
      void errorBody;
      return { provider: "telegram", status: "failed", reason: "request_failed" };
    }

    const payload = (await response.json().catch(() => null)) as
      | { result?: { message_id?: number } }
      | null;

    return {
      provider: "telegram",
      status: "sent",
      messageId: payload?.result?.message_id ?? null,
    };
  } catch {
    return { provider: "telegram", status: "failed", reason: "request_failed" };
  }
}
