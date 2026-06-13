import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase-server";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── SQL guard ────────────────────────────────────────────────────────────────

const BLOCKED_SQL_PATTERN =
  /\b(DELETE|UPDATE|INSERT|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXEC)\b/i;

// ─── executeSafeQuery ─────────────────────────────────────────────────────────

export async function executeSafeQuery(sql: string): Promise<string> {
  try {
    const trimmed = sql?.trim();
    if (!trimmed) {
      return "⚠️ مطلوب: استعلام SQL\nمثال: /sql SELECT COUNT(*) FROM schools";
    }

    if (BLOCKED_SQL_PATTERN.test(trimmed)) {
      return "🚫 مرفوض: الاستعلامات المسموحة هي SELECT فقط.\nالعمليات التالية محظورة: DELETE, UPDATE, INSERT, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE, EXEC";
    }

    if (!trimmed.toUpperCase().trimStart().startsWith("SELECT")) {
      return "🚫 مرفوض: يجب أن يبدأ الاستعلام بـ SELECT";
    }

    const supabase = createServiceSupabaseClient();
    const startTime = Date.now();

    // Use rpc to execute raw SQL via service role
    const { data, error } = await supabase.rpc("exec_readonly_sql", {
      query: trimmed,
    });

    const elapsed = Date.now() - startTime;

    if (error) {
      // Fallback: try a different approach for basic queries
      return `❌ تعذر تنفيذ الاستعلام: ${escHtml(error.message.slice(0, 200))}`;
    }

    const rows = Array.isArray(data) ? data : [];
    const rowCount = rows.length;

    if (rowCount === 0) {
      return [
        `📊 <b>نتائج الاستعلام</b>`,
        `السطور: 0 | الوقت: ${elapsed}ms`,
        "",
        "لا توجد نتائج.",
      ].join("\n");
    }

    const displayRows = rows.slice(0, 10);
    const headers = Object.keys(displayRows[0] as Record<string, unknown>);

    const lines: string[] = [
      `📊 <b>نتائج الاستعلام</b>`,
      `السطور: ${rowCount}${rowCount > 10 ? ` (عرض أول 10)` : ""} | الوقت: ${elapsed}ms`,
      "",
      `<code>${escHtml(headers.join(" | "))}</code>`,
    ];

    for (const row of displayRows) {
      const values = headers.map((h) => {
        const val = (row as Record<string, unknown>)[h];
        return val === null || val === undefined ? "NULL" : String(val).slice(0, 30);
      });
      lines.push(`<code>${escHtml(values.join(" | "))}</code>`);
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ في تنفيذ الاستعلام: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── getMaintenanceStatus ─────────────────────────────────────────────────────

export async function getMaintenanceStatus(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const { data } = await supabase
      .from("bot_settings")
      .select("key, value")
      .in("key", ["maintenance_mode", "maintenance_message"]);

    const settings = (data ?? []) as Array<{ key: string; value: string }>;
    const modeEntry = settings.find((s) => s.key === "maintenance_mode");
    const msgEntry = settings.find((s) => s.key === "maintenance_message");

    const isEnabled = modeEntry?.value === "true" || modeEntry?.value === "1";
    const statusIcon = isEnabled ? "🔴" : "🟢";
    const statusText = isEnabled ? "مُفعّل" : "معطّل";

    const lines: string[] = [
      `🔧 <b>وضع الصيانة</b>`,
      "",
      `الحالة: ${statusIcon} ${statusText}`,
    ];

    if (msgEntry?.value) {
      lines.push(`الرسالة: ${escHtml(msgEntry.value.slice(0, 200))}`);
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر جلب حالة الصيانة: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── setMaintenanceMode ───────────────────────────────────────────────────────

export async function setMaintenanceMode(enabled: boolean, message?: string): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const upserts = [
      {
        key: "maintenance_mode",
        value: enabled ? "true" : "false",
        updated_at: new Date().toISOString(),
      },
    ];

    if (message) {
      upserts.push({
        key: "maintenance_message",
        value: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      });
    }

    const { error } = await supabase
      .from("bot_settings")
      .upsert(upserts, { onConflict: "key" });

    if (error) {
      return `❌ تعذر تحديث وضع الصيانة: ${escHtml(error.message.slice(0, 100))}`;
    }

    const statusIcon = enabled ? "🔴" : "🟢";
    const statusText = enabled ? "مُفعّل" : "معطّل";
    return `✅ تم تغيير وضع الصيانة إلى: ${statusIcon} ${statusText}`;
  } catch (err) {
    return `❌ خطأ: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── getBackupInfo ────────────────────────────────────────────────────────────

export async function getBackupInfo(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const { data } = await supabase
      .from("bot_settings")
      .select("key, value")
      .like("key", "backup_%");

    const settings = (data ?? []) as Array<{ key: string; value: string }>;

    const lines: string[] = [
      `💾 <b>معلومات النسخ الاحتياطي</b>`,
      "",
    ];

    if (settings.length > 0) {
      for (const s of settings) {
        lines.push(`${escHtml(s.key)}: ${escHtml(s.value.slice(0, 100))}`);
      }
    } else {
      lines.push(
        "جدول النسخ الاحتياطي (Supabase):",
        "• النسخ الاحتياطي التلقائي: يومي (Supabase Pro)",
        "• الاحتفاظ بالنسخ: 7 أيام",
        "• Point-in-time Recovery: متاح حسب الخطة",
        "",
        "لا توجد معلومات إضافية في bot_settings.",
      );
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر جلب معلومات النسخ الاحتياطي: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── getEnvSummary ────────────────────────────────────────────────────────────

function maskSecret(value: string | undefined, label: string): string {
  if (!value) return `${label}: ❌ غير مضبوط`;
  if (value.length <= 8) return `${label}: ****** ✅`;
  const masked = `${value.slice(0, 4)}...${value.slice(-4)}`;
  return `${label}: <code>${escHtml(masked)}</code> ✅`;
}

function checkEnv(name: string, label: string): string {
  const val = process.env[name]?.trim();
  if (!val) return `${label}: ❌ غير مضبوط`;
  return `${label}: ✅`;
}

export async function getEnvSummary(): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const maskedSupabaseUrl = supabaseUrl
    ? `✅ ${escHtml(supabaseUrl.replace(/^https:\/\//, "https://").slice(0, 40))}`
    : "❌ غير مضبوط";

  const lines: string[] = [
    "🌍 <b>متغيرات البيئة</b>",
    "",
    `SUPABASE_URL: ${maskedSupabaseUrl}`,
    maskSecret(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"),
    checkEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"),
    maskSecret(process.env.TELEGRAM_BOT_TOKEN, "TELEGRAM_BOT_TOKEN"),
    maskSecret(process.env.TELEGRAM_CHAT_ID, "TELEGRAM_CHAT_ID"),
    checkEnv("TELEGRAM_WEBHOOK_SECRET", "TELEGRAM_WEBHOOK_SECRET"),
    maskSecret(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY"),
    checkEnv("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_URL"),
    checkEnv("UPSTASH_REDIS_REST_TOKEN", "UPSTASH_REDIS_REST_TOKEN"),
    checkEnv("CRON_SECRET", "CRON_SECRET"),
    "",
    `NODE_ENV: ${escHtml(process.env.NODE_ENV ?? "unknown")}`,
    `VERCEL_ENV: ${escHtml(process.env.VERCEL_ENV ?? "—")}`,
    `VERCEL_REGION: ${escHtml(process.env.VERCEL_REGION ?? "—")}`,
  ];

  return lines.join("\n").slice(0, 4000);
}

// ─── getNotificationsSummary ──────────────────────────────────────────────────

export async function getNotificationsSummary(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const [notifResult, appNotifResult] = await Promise.all([
      supabase.from("notifications").select("id", { head: true, count: "exact" }),
      supabase.from("app_notifications").select("is_read"),
    ]);

    const appNotifs = (appNotifResult.data ?? []) as Array<{ is_read: boolean | null }>;
    const unread = appNotifs.filter((n) => !n.is_read).length;
    const read = appNotifs.filter((n) => n.is_read).length;

    const lines: string[] = [
      `🔔 <b>الإشعارات</b>`,
      "",
      `الإشعارات الكلاسيكية: <b>${notifResult.count ?? 0}</b>`,
      "",
      `إشعارات التطبيق:`,
      `  الإجمالي: <b>${appNotifs.length}</b>`,
      `  غير مقروءة: <b>${unread}</b>`,
      `  مقروءة: <b>${read}</b>`,
    ];

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ تعذر جلب بيانات الإشعارات: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}
