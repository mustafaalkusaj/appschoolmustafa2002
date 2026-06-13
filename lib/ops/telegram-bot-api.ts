import "server-only";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

export type InlineKeyboard = InlineKeyboardButton[][];

type BotSendOptions = {
  chatId?: string;
  text: string;
  keyboard?: InlineKeyboard;
  parseMode?: "HTML" | "Markdown";
  disablePreview?: boolean;
};

type BotEditOptions = {
  chatId: string;
  messageId: number;
  text: string;
  keyboard?: InlineKeyboard;
  parseMode?: "HTML" | "Markdown";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

function getDefaultChatId(): string {
  return process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
}

function apiUrl(method: string): string {
  const token = getToken();
  return `https://api.telegram.org/bot${token}/${method}`;
}

// ─── botSendMessage ───────────────────────────────────────────────────────────

export async function botSendMessage(opts: BotSendOptions): Promise<number | null> {
  const token = getToken();
  const chatId = opts.chatId ?? getDefaultChatId();

  if (!token || !chatId) return null;

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: opts.text.slice(0, 4096),
      parse_mode: opts.parseMode ?? "HTML",
      disable_web_page_preview: opts.disablePreview ?? true,
    };

    if (opts.keyboard && opts.keyboard.length > 0) {
      body.reply_markup = { inline_keyboard: opts.keyboard };
    }

    const response = await fetch(apiUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return null;

    const payload = (await response.json().catch(() => null)) as
      | { result?: { message_id?: number } }
      | null;

    return payload?.result?.message_id ?? null;
  } catch {
    return null;
  }
}

// ─── botEditMessage ───────────────────────────────────────────────────────────

export async function botEditMessage(opts: BotEditOptions): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const body: Record<string, unknown> = {
      chat_id: opts.chatId,
      message_id: opts.messageId,
      text: opts.text.slice(0, 4096),
      parse_mode: opts.parseMode ?? "HTML",
      disable_web_page_preview: true,
    };

    if (opts.keyboard) {
      body.reply_markup = { inline_keyboard: opts.keyboard };
    }

    const response = await fetch(apiUrl("editMessageText"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// ─── botAnswerCallback ────────────────────────────────────────────────────────

export async function botAnswerCallback(callbackQueryId: string, text?: string): Promise<void> {
  const token = getToken();
  if (!token) return;

  try {
    await fetch(apiUrl("answerCallbackQuery"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text ?? "",
        show_alert: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Silent — callback answer is best-effort
  }
}

// ─── botSendDocument ──────────────────────────────────────────────────────────

export async function botSendDocument(
  chatId: string,
  filename: string,
  content: string,
  caption?: string,
): Promise<void> {
  const token = getToken();
  if (!token || !chatId) return;

  try {
    const formData = new FormData();
    formData.append("chat_id", chatId);
    const blob = new Blob([content], { type: "text/plain" });
    formData.append("document", blob, filename);
    if (caption) {
      formData.append("caption", caption.slice(0, 1024));
    }

    await fetch(apiUrl("sendDocument"), {
      method: "POST",
      body: formData,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Silent
  }
}
