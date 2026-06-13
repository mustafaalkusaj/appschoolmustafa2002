import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { InlineKeyboard } from "@/lib/ops/telegram-bot-api";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function maskEmail(email: string): string {
  if (!email.includes("@")) return "—";
  const [local, domain] = email.split("@");
  return `${(local ?? "").slice(0, 2)}***@${domain}`;
}

// ─── getAuthUsersOverview ─────────────────────────────────────────────────────

export async function getAuthUsersOverview(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 10 });

    if (error) {
      return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;
    }

    const users = data?.users ?? [];
    const total = data?.total ?? users.length;
    const confirmed = users.filter((u) => u.email_confirmed_at).length;
    const unconfirmed = users.length - confirmed;

    const lines = [
      `👤 <b>مستخدمو Supabase Auth</b>`,
      ``,
      `الإجمالي (أول 10): <b>${users.length}</b> من ${total}`,
      `مؤكدون: <b>${confirmed}</b>`,
      `غير مؤكدين: <b>${unconfirmed}</b>`,
      ``,
      `<b>آخر 5 مستخدمين:</b>`,
    ];

    for (const u of users.slice(0, 5)) {
      const email = maskEmail(u.email ?? "");
      const confirmed_icon = u.email_confirmed_at ? "✅" : "❓";
      const banned = (u as unknown as Record<string, unknown>).banned_until ? " 🚫" : "";
      lines.push(`• ${confirmed_icon}${banned} ${escHtml(email)} — <code>${u.id.slice(0, 8)}</code>`);
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getAuthUserDetail ────────────────────────────────────────────────────────

export async function getAuthUserDetail(identifier: string): Promise<string> {
  if (!identifier) {
    return "⚠️ مطلوب: UUID أو بريد إلكتروني";
  }

  try {
    const supabase = createServiceSupabaseClient();

    const isUuid = /^[0-9a-f-]{36}$/i.test(identifier.trim());

    if (isUuid) {
      const { data, error } = await supabase.auth.admin.getUserById(identifier.trim());
      if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;
      if (!data.user) return `❌ لم يُعثر على مستخدم بهذا الـ ID`;

      const u = data.user;
      const bannedUntil = (u as unknown as Record<string, unknown>).banned_until as string | null | undefined;
      return [
        `👤 <b>تفاصيل المستخدم</b>`,
        ``,
        `ID: <code>${escHtml(u.id)}</code>`,
        `البريد: ${escHtml(maskEmail(u.email ?? ""))}`,
        `مؤكد: ${u.email_confirmed_at ? "✅" : "❌"}`,
        `محظور: ${bannedUntil ? `🚫 حتى ${escHtml(String(bannedUntil))}` : "لا"}`,
        `أنشئ: ${escHtml(new Date(u.created_at).toLocaleDateString("ar-IQ"))}`,
        `آخر دخول: ${u.last_sign_in_at ? escHtml(new Date(u.last_sign_in_at).toLocaleDateString("ar-IQ")) : "—"}`,
      ].join("\n");
    }

    // Search by email
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 50,
    });

    if (listError) return `❌ خطأ: ${escHtml(listError.message.slice(0, 100))}`;

    const found = (listData?.users ?? []).find(
      (u) => u.email?.toLowerCase() === identifier.toLowerCase(),
    );

    if (!found) return `❌ لم يُعثر على مستخدم بالبريد: ${escHtml(maskEmail(identifier))}`;

    const bannedUntil = (found as unknown as Record<string, unknown>).banned_until as string | null | undefined;
    return [
      `👤 <b>تفاصيل المستخدم</b>`,
      ``,
      `ID: <code>${escHtml(found.id)}</code>`,
      `البريد: ${escHtml(maskEmail(found.email ?? ""))}`,
      `مؤكد: ${found.email_confirmed_at ? "✅" : "❌"}`,
      `محظور: ${bannedUntil ? `🚫 حتى ${escHtml(String(bannedUntil))}` : "لا"}`,
      `أنشئ: ${escHtml(new Date(found.created_at).toLocaleDateString("ar-IQ"))}`,
      `آخر دخول: ${found.last_sign_in_at ? escHtml(new Date(found.last_sign_in_at).toLocaleDateString("ar-IQ")) : "—"}`,
    ].join("\n");
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── disableAuthUser ──────────────────────────────────────────────────────────

export async function disableAuthUser(userId: string): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: "876600h", // ~100 years
    });

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    return `✅ تم تعطيل المستخدم <code>${escHtml(userId.slice(0, 8))}</code>`;
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── enableAuthUser ───────────────────────────────────────────────────────────

export async function enableAuthUser(userId: string): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    return `✅ تم تفعيل المستخدم <code>${escHtml(userId.slice(0, 8))}</code>`;
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── deleteAuthUser ───────────────────────────────────────────────────────────

export async function deleteAuthUser(userId: string): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    return `🗑️ تم حذف المستخدم <code>${escHtml(userId.slice(0, 8))}</code> نهائياً.`;
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getAuthStats ─────────────────────────────────────────────────────────────

export async function getAuthStats(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 50 });

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const users = data?.users ?? [];
    const total = data?.total ?? users.length;
    const confirmed = users.filter((u) => u.email_confirmed_at).length;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = users.filter((u) => new Date(u.created_at) > sevenDaysAgo).length;
    const banned = users.filter((u) => (u as unknown as Record<string, unknown>).banned_until).length;

    return [
      `📊 <b>إحصائيات Auth</b>`,
      ``,
      `الإجمالي: <b>${total}</b>`,
      `مؤكدون: <b>${confirmed}</b>`,
      `غير مؤكدين: <b>${users.length - confirmed}</b>`,
      `جدد (7 أيام): <b>${recent}</b>`,
      `محظورون: <b>${banned}</b>`,
    ].join("\n");
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── authMenuKeyboard ─────────────────────────────────────────────────────────

export function authMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "👥 المستخدمون", callback_data: "cmd_authusers" },
      { text: "📊 الإحصائيات", callback_data: "cmd_authstats" },
    ],
    [{ text: "🔙 الرئيسية", callback_data: "menu_main" }],
  ];
}
