// ============================================================
// Expo Push Notifications Service
// Uses Expo's free push API: https://exp.host/--/api/v2/push/send
// No VAPID keys needed. Works with ExponentPushToken[...] tokens.
// ============================================================

export interface ExpoPushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: "default" | "normal" | "high";
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
}

export interface PushResult {
  sent: number;
  failed: number;
  errors: string[];
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data: ExpoTicket[];
}

function isValidExpoToken(token: string): boolean {
  return (
    token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")
  );
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * إرسال إشعارات Expo Push لقائمة من التوكنات.
 * يعمل مع ExponentPushToken[...] و ExpoPushToken[...].
 * لا يرمي استثناءات — يُعيد { sent, failed, errors } دائماً.
 */
export async function sendExpoPushToTokens(
  tokens: string[],
  payload: ExpoPushPayload,
): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, errors: [] };

  const validTokens = tokens.filter(isValidExpoToken);

  if (validTokens.length === 0) {
    return result;
  }

  const chunks = chunkArray(validTokens, 100);

  for (const chunk of chunks) {
    try {
      const messages = chunk.map((token) => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        priority: payload.priority ?? "high",
        sound: payload.sound !== undefined ? payload.sound : "default",
        ...(payload.badge !== undefined ? { badge: payload.badge } : {}),
        channelId: payload.channelId ?? "default",
      }));

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => `HTTP ${response.status}`);
        result.failed += chunk.length;
        result.errors.push(`Expo API error ${response.status}: ${errorText.slice(0, 200)}`);
        continue;
      }

      const json = (await response.json()) as ExpoPushResponse;
      const tickets: ExpoTicket[] = Array.isArray(json?.data) ? json.data : [];

      for (const ticket of tickets) {
        if (ticket.status === "ok") {
          result.sent++;
        } else {
          result.failed++;
          if (ticket.message) {
            result.errors.push(ticket.message);
          }
        }
      }

      // Handle mismatch between chunk size and returned tickets
      const unaccounted = chunk.length - tickets.length;
      if (unaccounted > 0) {
        result.failed += unaccounted;
      }
    } catch (error) {
      result.failed += chunk.length;
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error sending push chunk",
      );
    }
  }

  return result;
}
