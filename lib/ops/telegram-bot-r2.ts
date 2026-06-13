import "server-only";

import type { InlineKeyboard } from "@/lib/ops/telegram-bot-api";

const CF_API = "https://api.cloudflare.com/client/v4";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cfHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.CF_API_TOKEN ?? ""}`,
    "Content-Type": "application/json",
  };
}

function checkToken(): string | null {
  if (!process.env.CF_API_TOKEN) {
    return "⚠️ CF_API_TOKEN غير مضبوط";
  }
  if (!process.env.CF_ACCOUNT_ID) {
    return "⚠️ CF_ACCOUNT_ID غير مضبوط";
  }
  return null;
}

function accountId(): string {
  return process.env.CF_ACCOUNT_ID ?? "";
}

// ─── getR2Overview ────────────────────────────────────────────────────────────

export async function getR2Overview(): Promise<string> {
  const tokenErr = checkToken();
  if (tokenErr) return tokenErr;

  try {
    const url = `${CF_API}/accounts/${accountId()}/r2/buckets`;
    const res = await fetch(url, {
      headers: cfHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return `❌ Cloudflare API: ${res.status} ${escHtml(res.statusText)}`;
    }

    const json = (await res.json()) as {
      success?: boolean;
      result?: { buckets?: Array<{ name: string; creation_date?: string }> };
      errors?: Array<{ message: string }>;
    };

    if (!json.success) {
      const errMsg = json.errors?.[0]?.message ?? "خطأ غير معروف";
      return `❌ Cloudflare: ${escHtml(errMsg)}`;
    }

    const buckets = json.result?.buckets ?? [];

    if (buckets.length === 0) {
      return "☁️ لا توجد R2 buckets.";
    }

    const lines = [`☁️ <b>R2 Buckets (${buckets.length})</b>`, ""];
    for (const b of buckets) {
      const date = b.creation_date
        ? new Date(b.creation_date).toLocaleDateString("ar-IQ")
        : "—";
      lines.push(`• <code>${escHtml(b.name)}</code> — ${date}`);
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getR2BucketObjects ───────────────────────────────────────────────────────

export async function getR2BucketObjects(bucketName: string): Promise<string> {
  const tokenErr = checkToken();
  if (tokenErr) return tokenErr;

  if (!bucketName) return "⚠️ مطلوب: اسم الـ bucket";

  try {
    const url = `${CF_API}/accounts/${accountId()}/r2/buckets/${encodeURIComponent(bucketName)}/objects?limit=10`;
    const res = await fetch(url, {
      headers: cfHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return `❌ Cloudflare API: ${res.status} ${escHtml(res.statusText)}`;
    }

    const json = (await res.json()) as {
      success?: boolean;
      result?: {
        objects?: Array<{
          key: string;
          size?: number;
          uploaded?: string;
        }>;
      };
      errors?: Array<{ message: string }>;
    };

    if (!json.success) {
      const errMsg = json.errors?.[0]?.message ?? "خطأ غير معروف";
      return `❌ Cloudflare: ${escHtml(errMsg)}`;
    }

    const objects = json.result?.objects ?? [];

    if (objects.length === 0) {
      return `☁️ <b>${escHtml(bucketName)}</b> — لا توجد ملفات.`;
    }

    const lines = [`☁️ <b>R2: ${escHtml(bucketName)}</b>`, `(${objects.length} ملف)`, ""];

    for (const o of objects) {
      const size = o.size != null ? ` — ${Math.round(o.size / 1024)} KB` : "";
      lines.push(`• <code>${escHtml(o.key)}</code>${escHtml(size)}`);
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── deleteR2Object ───────────────────────────────────────────────────────────

export async function deleteR2Object(bucketName: string, objectKey: string): Promise<string> {
  const tokenErr = checkToken();
  if (tokenErr) return tokenErr;

  if (!bucketName || !objectKey) return "⚠️ مطلوب: bucket و objectKey";

  try {
    const url = `${CF_API}/accounts/${accountId()}/r2/buckets/${encodeURIComponent(bucketName)}/objects/${encodeURIComponent(objectKey)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: cfHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return `❌ Cloudflare API: ${res.status} ${escHtml(res.statusText)}`;
    }

    return `🗑️ تم حذف <code>${escHtml(objectKey)}</code> من <code>${escHtml(bucketName)}</code>.`;
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getR2SizeDetail ──────────────────────────────────────────────────────────

export async function getR2SizeDetail(): Promise<string> {
  const tokenErr = checkToken();
  if (tokenErr) return tokenErr;

  try {
    const url = `${CF_API}/accounts/${accountId()}/r2/buckets`;
    const res = await fetch(url, {
      headers: cfHeaders(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return `❌ Cloudflare API: ${res.status}`;
    }

    const json = (await res.json()) as {
      success?: boolean;
      result?: { buckets?: Array<{ name: string }> };
    };

    const buckets = json.result?.buckets ?? [];
    const lines = [`☁️ <b>R2 Storage — تفاصيل</b>`, ""];

    for (const b of buckets) {
      try {
        const objUrl = `${CF_API}/accounts/${accountId()}/r2/buckets/${encodeURIComponent(b.name)}/objects?limit=1000`;
        const objRes = await fetch(objUrl, {
          headers: cfHeaders(),
          signal: AbortSignal.timeout(10_000),
        });

        if (!objRes.ok) {
          lines.push(`• <code>${escHtml(b.name)}</code>: —`);
          continue;
        }

        const objJson = (await objRes.json()) as {
          result?: { objects?: Array<{ size?: number }> };
        };
        const objects = objJson.result?.objects ?? [];
        const totalSize = objects.reduce((sum, o) => sum + (o.size ?? 0), 0);
        const sizeKb = Math.round(totalSize / 1024);
        lines.push(
          `• <code>${escHtml(b.name)}</code>: ${objects.length} ملف (${sizeKb} KB)`,
        );
      } catch {
        lines.push(`• <code>${escHtml(b.name)}</code>: —`);
      }
    }

    if (lines.length === 2) lines.push("لا توجد buckets.");

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── r2MenuKeyboard ───────────────────────────────────────────────────────────

export function r2MenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "☁️ Buckets", callback_data: "cmd_r2" },
      { text: "📊 الحجم", callback_data: "cmd_r2size" },
    ],
    [{ text: "🔙 الرئيسية", callback_data: "menu_main" }],
  ];
}
