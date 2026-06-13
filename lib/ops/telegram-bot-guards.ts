import "server-only";

import { Redis } from "@upstash/redis";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

// ─── Redis client (lazy) ──────────────────────────────────────────────────────

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// ─── Rate limiting: 30 commands per minute per chat_id ───────────────────────

export async function checkRateLimit(chatId: string): Promise<boolean> {
  try {
    const redis = getRedis();
    if (!redis) {
      // No Redis configured — allow all requests
      return true;
    }

    const key = `tg_rl:${chatId}`;
    const count = await redis.incr(key);

    // On first increment, set 60s TTL
    if (count === 1) {
      await redis.expire(key, 60);
    }

    return count <= 30;
  } catch {
    // Fail open on Redis errors so the bot stays functional
    return true;
  }
}

// ─── logUnauthorizedAccess ────────────────────────────────────────────────────

export async function logUnauthorizedAccess(
  chatId: string,
  username: string | undefined,
  command: string,
): Promise<void> {
  try {
    const supabase = createServiceSupabaseClient();
    await supabase.from("bot_access_logs").insert({
      chat_id: chatId,
      username: username ?? null,
      command: command.slice(0, 100),
      is_authorized: false,
    });
  } catch {
    // Best-effort logging
  }
}

// ─── logAuthorizedAccess ──────────────────────────────────────────────────────

export async function logAuthorizedAccess(
  chatId: string,
  command: string,
): Promise<void> {
  try {
    const supabase = createServiceSupabaseClient();
    await supabase.from("bot_access_logs").insert({
      chat_id: chatId,
      username: null,
      command: command.slice(0, 100),
      is_authorized: true,
    });
  } catch {
    // Best-effort logging
  }
}
