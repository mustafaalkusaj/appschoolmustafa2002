import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { InlineKeyboard } from "@/lib/ops/telegram-bot-api";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function trunc(val: unknown, max = 30): string {
  const s = String(val ?? "");
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// ─── Table whitelist ──────────────────────────────────────────────────────────

const TABLE_WHITELIST = new Set([
  "students",
  "teachers",
  "schools",
  "branches",
  "grades",
  "attendance_records",
  "notifications",
  "payments",
  "assignments",
  "classes",
  "managed_user_profiles",
  "calendar_events",
  "sections",
  "crm_leads",
  "invoices",
  "changelog_entries",
  "trial_activations",
  "health_checks",
  "error_logs",
  "hourly_stats",
  "daily_reports",
  "bot_settings",
  "bot_access_logs",
  "survey_results",
  "ops_errors",
  "ops_pending_actions",
  "user_profiles",
  "subscriptions",
]);

// Field edit whitelist per table (table -> allowed fields)
const FIELD_WHITELIST: Record<string, Set<string>> = {
  crm_leads: new Set(["status", "notes", "contact_name", "phone", "last_contact_at"]),
  invoices: new Set(["status", "notes", "paid_at", "due_date"]),
  changelog_entries: new Set(["description", "notification_sent"]),
  trial_activations: new Set(["is_active", "notes", "days", "ends_at"]),
  bot_settings: new Set(["value"]),
  schools: new Set(["name"]),
};

// ─── getTablesOverview ────────────────────────────────────────────────────────

export async function getTablesOverview(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    // Get table names from information_schema
    const { data: tables, error: tErr } = await supabase
      .from("information_schema.tables" as never)
      .select("table_name")
      .eq("table_schema" as never, "public")
      .eq("table_type" as never, "BASE TABLE")
      .limit(30);

    if (tErr || !tables) {
      // Fallback: query from whitelisted tables
      const knownTables = Array.from(TABLE_WHITELIST).slice(0, 20);
      const lines = ["🗄️ <b>جداول قاعدة البيانات</b>", ""];
      for (const t of knownTables) {
        try {
          const { count } = await supabase
            .from(t as never)
            .select("id", { head: true, count: "exact" });
          lines.push(`• <code>${escHtml(t)}</code>: ${count ?? "?"} صف`);
        } catch {
          lines.push(`• <code>${escHtml(t)}</code>: —`);
        }
      }
      return lines.join("\n").slice(0, 4000);
    }

    const tableNames = (tables as Array<{ table_name: string }>)
      .map((r) => r.table_name)
      .slice(0, 20);

    const lines = [`🗄️ <b>جداول قاعدة البيانات (${tableNames.length})</b>`, ""];

    for (const t of tableNames) {
      try {
        const { count } = await supabase
          .from(t as never)
          .select("id", { head: true, count: "exact" });
        lines.push(`• <code>${escHtml(t)}</code>: ${count ?? "?"} صف`);
      } catch {
        lines.push(`• <code>${escHtml(t)}</code>: —`);
      }
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getTableRows ─────────────────────────────────────────────────────────────

export async function getTableRows(
  tableName: string,
  page = 0,
): Promise<{ text: string; hasMore: boolean }> {
  if (!TABLE_WHITELIST.has(tableName)) {
    return {
      text: `❌ الجدول <code>${escHtml(tableName)}</code> غير مسموح به.`,
      hasMore: false,
    };
  }

  try {
    const supabase = createServiceSupabaseClient();
    const pageSize = 5;
    const offset = page * pageSize;

    const { data, error } = await supabase
      .from(tableName as never)
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize);

    if (error) {
      return {
        text: `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`,
        hasMore: false,
      };
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    if (rows.length === 0) {
      return { text: `📋 <b>${escHtml(tableName)}</b> — لا توجد بيانات.`, hasMore: false };
    }

    const lines = [
      `📋 <b>${escHtml(tableName)}</b> — صفحة ${page + 1}`,
      `(صفوف ${offset + 1}–${offset + rows.length})`,
      "",
    ];

    for (const row of rows) {
      const id = String(row.id ?? "—").slice(0, 8);
      const entries = Object.entries(row)
        .slice(0, 4)
        .map(([k, v]) => `${escHtml(k)}: ${escHtml(trunc(v))}`)
        .join(" | ");
      lines.push(`• <code>${id}</code> — ${entries}`);
    }

    return {
      text: lines.join("\n").slice(0, 4000),
      hasMore: rows.length === pageSize + 1,
    };
  } catch (err) {
    return {
      text: `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`,
      hasMore: false,
    };
  }
}

// ─── getRowDetail ─────────────────────────────────────────────────────────────

export async function getRowDetail(tableName: string, id: string): Promise<string> {
  if (!TABLE_WHITELIST.has(tableName)) {
    return `❌ الجدول <code>${escHtml(tableName)}</code> غير مسموح به.`;
  }

  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from(tableName as never)
      .select("*")
      .eq("id" as never, id)
      .single();

    if (error) {
      return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;
    }

    if (!data) {
      return `❌ لم يُعثر على صف بـ id: <code>${escHtml(id)}</code>`;
    }

    const row = data as Record<string, unknown>;
    const lines = [`🔍 <b>${escHtml(tableName)}</b> — <code>${escHtml(id.slice(0, 8))}</code>`, ""];

    for (const [key, val] of Object.entries(row)) {
      const display = val === null ? "<i>null</i>" : escHtml(String(val).slice(0, 100));
      lines.push(`<b>${escHtml(key)}</b>: ${display}`);
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getTableSchema ───────────────────────────────────────────────────────────

export async function getTableSchema(tableName: string): Promise<string> {
  if (!TABLE_WHITELIST.has(tableName)) {
    return `❌ الجدول <code>${escHtml(tableName)}</code> غير مسموح به.`;
  }

  try {
    const supabase = createServiceSupabaseClient();

    // Use RPC or raw query for information_schema
    const { data, error } = await supabase.rpc("get_table_schema" as never, {
      p_table: tableName,
    });

    if (error || !data) {
      // Fallback: select one row and infer columns
      const { data: row } = await supabase
        .from(tableName as never)
        .select("*")
        .limit(1)
        .single();

      if (!row) {
        return `📐 <b>schema: ${escHtml(tableName)}</b>\n\nلا يمكن الوصول إلى معلومات الـ schema حالياً.`;
      }

      const cols = Object.keys(row as Record<string, unknown>);
      const lines = [
        `📐 <b>schema: ${escHtml(tableName)}</b>`,
        `(مستنتج من البيانات — ${cols.length} حقل)`,
        "",
        ...cols.map((c) => `• <code>${escHtml(c)}</code>`),
      ];
      return lines.join("\n").slice(0, 4000);
    }

    const cols = data as Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>;

    const lines = [
      `📐 <b>schema: ${escHtml(tableName)}</b>`,
      `(${cols.length} حقل)`,
      "",
    ];

    for (const col of cols) {
      const nullable = col.is_nullable === "YES" ? "?" : "!";
      const def = col.column_default ? ` = ${trunc(col.column_default, 20)}` : "";
      lines.push(
        `• <code>${escHtml(col.column_name)}</code> <i>${escHtml(col.data_type)}</i>${nullable}${escHtml(def)}`,
      );
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── countRows ────────────────────────────────────────────────────────────────

export async function countRows(
  tableName: string,
  filterCol?: string,
  filterVal?: string,
): Promise<string> {
  if (!TABLE_WHITELIST.has(tableName)) {
    return `❌ الجدول <code>${escHtml(tableName)}</code> غير مسموح به.`;
  }

  try {
    const supabase = createServiceSupabaseClient();

    let query = supabase.from(tableName as never).select("id", { head: true, count: "exact" });

    if (filterCol && filterVal) {
      query = query.eq(filterCol as never, filterVal);
    }

    const { count, error } = await query;

    if (error) {
      return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;
    }

    const filter =
      filterCol && filterVal
        ? ` WHERE ${escHtml(filterCol)} = "${escHtml(filterVal)}"`
        : "";

    return `📊 <b>${escHtml(tableName)}</b>${escHtml(filter)}: <b>${count ?? 0}</b> صف`;
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── editRowField ─────────────────────────────────────────────────────────────

export async function editRowField(
  tableName: string,
  id: string,
  field: string,
  newValue: string,
): Promise<string> {
  if (!TABLE_WHITELIST.has(tableName)) {
    return `❌ الجدول <code>${escHtml(tableName)}</code> غير مسموح به.`;
  }

  const allowedFields = FIELD_WHITELIST[tableName];
  if (!allowedFields || !allowedFields.has(field)) {
    return `❌ الحقل <code>${escHtml(field)}</code> غير مسموح بتعديله في <code>${escHtml(tableName)}</code>.`;
  }

  try {
    const supabase = createServiceSupabaseClient();

    // Get old value first
    const { data: existing } = await supabase
      .from(tableName as never)
      .select(field as never)
      .eq("id" as never, id)
      .single();

    const oldValue = existing ? String((existing as unknown as Record<string, unknown>)[field] ?? "null") : "—";

    const updatePayload: Record<string, unknown> = { [field]: newValue };

    const { error } = await supabase
      .from(tableName as never)
      .update(updatePayload as never)
      .eq("id" as never, id);

    if (error) {
      return `❌ خطأ في التحديث: ${escHtml(error.message.slice(0, 100))}`;
    }

    return [
      `✅ <b>تم التحديث</b>`,
      `الجدول: <code>${escHtml(tableName)}</code>`,
      `ID: <code>${escHtml(id.slice(0, 8))}</code>`,
      `الحقل: <code>${escHtml(field)}</code>`,
      `القيمة القديمة: <code>${escHtml(trunc(oldValue, 50))}</code>`,
      `القيمة الجديدة: <code>${escHtml(trunc(newValue, 50))}</code>`,
    ].join("\n");
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── dbMenuKeyboard ───────────────────────────────────────────────────────────

export function dbMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "📋 الجداول", callback_data: "cmd_tables" },
      { text: "📊 إحصاء", callback_data: "cmd_dbcount" },
    ],
    [{ text: "🔙 الرئيسية", callback_data: "menu_main" }],
  ];
}
