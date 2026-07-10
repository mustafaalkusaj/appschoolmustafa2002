import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { InlineKeyboard } from "@/lib/ops/telegram-bot-api";
import fs from "fs";
import path from "path";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── STORAGE ──────────────────────────────────────────────────────────────────

export async function getStorageBuckets(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.storage.listBuckets();

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const buckets = data ?? [];
    if (buckets.length === 0) {
      return "💾 لا توجد buckets في التخزين.";
    }

    const lines = [`💾 <b>Storage Buckets (${buckets.length})</b>`, ""];
    for (const b of buckets) {
      const visibility = b.public ? "🔓 عام" : "🔒 خاص";
      const created = b.created_at
        ? new Date(b.created_at).toLocaleDateString("ar-IQ")
        : "—";
      lines.push(`• <code>${escHtml(b.name)}</code> — ${visibility} — ${created}`);
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

export async function getBucketFiles(
  bucketName: string,
  prefix?: string,
): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(prefix ?? "", { limit: 10 });

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const files = data ?? [];
    if (files.length === 0) {
      return `💾 <b>${escHtml(bucketName)}</b> — لا توجد ملفات${prefix ? ` في <code>${escHtml(prefix)}</code>` : ""}.`;
    }

    const lines = [
      `💾 <b>${escHtml(bucketName)}</b>${prefix ? `/<code>${escHtml(prefix)}</code>` : ""}`,
      `(${files.length} ملف)`,
      "",
    ];

    for (const f of files) {
      const size =
        f.metadata?.size != null
          ? ` — ${Math.round(Number(f.metadata.size) / 1024)} KB`
          : "";
      const created = f.created_at
        ? ` — ${new Date(f.created_at).toLocaleDateString("ar-IQ")}`
        : "";
      lines.push(`• <code>${escHtml(f.name)}</code>${escHtml(size)}${escHtml(created)}`);
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

export async function deleteStorageFile(
  bucketName: string,
  filePath: string,
): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.storage.from(bucketName).remove([filePath]);

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    return `🗑️ تم حذف الملف <code>${escHtml(filePath)}</code> من <code>${escHtml(bucketName)}</code>.`;
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

export async function getStorageSizeDetail(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const lines = [`💾 <b>Storage — تفاصيل الحجم</b>`, ""];

    for (const b of buckets ?? []) {
      try {
        const { data: files } = await supabase.storage.from(b.name).list("", { limit: 100 });
        const count = files?.length ?? 0;
        lines.push(`• <code>${escHtml(b.name)}</code>: ${count} ملف`);
      } catch {
        lines.push(`• <code>${escHtml(b.name)}</code>: —`);
      }
    }

    if (lines.length === 2) {
      lines.push("لا توجد buckets.");
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── RLS POLICIES ─────────────────────────────────────────────────────────────

export async function getRlsPolicies(tableName?: string): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    let query: string;
    if (tableName) {
      query = `SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = '${tableName.replace(/'/g, "''")}' AND schemaname = 'public' LIMIT 20`;
    } else {
      query = `SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename LIMIT 30`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("execute_sql", { sql: query });

    if (error || !data) {
      return [
        `🔐 <b>RLS Policies</b>`,
        ``,
        tableName
          ? `تعذر جلب policies للجدول: <code>${escHtml(tableName)}</code>`
          : "تعذر جلب RLS policies. استخدم Supabase Dashboard لعرض policies.",
        ``,
        "ملاحظة: يمكن عرضها من: Supabase Dashboard → Database → Policies",
      ].join("\n");
    }

    const policies = data as Array<Record<string, string>>;
    if (policies.length === 0) {
      return tableName
        ? `🔐 لا توجد policies للجدول <code>${escHtml(tableName)}</code>.`
        : "🔐 لا توجد RLS policies معرّفة.";
    }

    const lines = [
      `🔐 <b>RLS Policies${tableName ? ` — ${escHtml(tableName)}` : ""}</b>`,
      `(${policies.length} policy)`,
      "",
    ];

    for (const p of policies) {
      if (tableName) {
        lines.push(`• <b>${escHtml(p.policyname ?? "—")}</b> [${escHtml(p.cmd ?? "—")}]`);
        if (p.qual) lines.push(`  <code>${escHtml(String(p.qual).slice(0, 80))}</code>`);
      } else {
        lines.push(
          `• <code>${escHtml(p.tablename ?? "—")}</code> → <b>${escHtml(p.policyname ?? "—")}</b> [${escHtml(p.cmd ?? "—")}]`,
        );
      }
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

export async function runRlsSecurityCheck(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    // Get tables without RLS
    const checkQuery = `
      SELECT c.relname AS tablename
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relrowsecurity = false
      ORDER BY c.relname
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("execute_sql", { sql: checkQuery });

    const noRlsTables = (error || !data)
      ? []
      : (data as Array<{ tablename: string }>).map((r) => r.tablename);

    const lines = [
      `🔐 <b>فحص أمان RLS</b>`,
      ``,
    ];

    if (noRlsTables.length === 0) {
      lines.push("✅ جميع الجداول محمية بـ RLS.");
    } else {
      lines.push(`⚠️ <b>${noRlsTables.length} جدول بدون RLS:</b>`, "");
      for (const t of noRlsTables.slice(0, 15)) {
        lines.push(`• <code>${escHtml(t)}</code>`);
      }
      lines.push(
        "",
        "توصية: فعّل RLS على هذه الجداول من Supabase Dashboard → Database → Tables",
      );
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── MIGRATIONS ───────────────────────────────────────────────────────────────

export async function getMigrationsList(): Promise<string> {
  try {
    // Try filesystem first
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");

    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort()
        .reverse();

      if (files.length === 0) {
        return "📂 مجلد migrations موجود لكن لا توجد ملفات.";
      }

      const lines = [
        `📂 <b>Migrations (${files.length})</b>`,
        "",
        ...files.slice(0, 20).map((f, i) => `${i + 1}. <code>${escHtml(f)}</code>`),
      ];

      if (files.length > 20) {
        lines.push(`... و${files.length - 20} أخرى`);
      }

      return lines.join("\n").slice(0, 4000);
    }

    // Fallback: check Supabase schema_migrations table
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("schema_migrations" as never)
      .select("version")
      .order("version" as never, { ascending: false })
      .limit(20);

    if (error || !data) {
      return "📂 تعذر الوصول إلى migrations. تحقق من مجلد /supabase/migrations/ أو Supabase Dashboard.";
    }

    const migrations = data as Array<{ version: string }>;
    const lines = [
      `📂 <b>Migrations (${migrations.length})</b>`,
      "",
      ...migrations.map((m, i) => `${i + 1}. <code>${escHtml(m.version)}</code>`),
    ];

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

export async function getMigrationContent(nameOrIndex: string): Promise<string> {
  try {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");

    if (!fs.existsSync(migrationsDir)) {
      return "❌ مجلد /supabase/migrations/ غير موجود.";
    }

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    let targetFile: string | undefined;

    // Try by index
    const idx = parseInt(nameOrIndex, 10);
    if (!isNaN(idx) && idx > 0 && idx <= files.length) {
      targetFile = files[files.length - idx]; // reverse order (1 = latest)
    } else {
      // Try by partial name match
      targetFile = files.find((f) => f.includes(nameOrIndex));
    }

    if (!targetFile) {
      return `❌ لم يُعثر على migration: <code>${escHtml(nameOrIndex)}</code>`;
    }

    const content = fs.readFileSync(path.join(migrationsDir, targetFile), "utf-8");

    return [
      `📄 <b>${escHtml(targetFile)}</b>`,
      "",
      `<pre>${escHtml(content.slice(0, 2000))}</pre>`,
      content.length > 2000 ? `\n⚠️ مقطوع (${content.length} حرف إجمالاً)` : "",
    ]
      .join("\n")
      .slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── infraMenuKeyboard ────────────────────────────────────────────────────────

export function infraMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "💾 Storage", callback_data: "cmd_buckets" },
      { text: "🔐 RLS", callback_data: "cmd_rls" },
    ],
    [
      { text: "🛡️ RLS Check", callback_data: "cmd_rlscheck" },
      { text: "📂 Migrations", callback_data: "cmd_migrations" },
    ],
    [{ text: "🔙 الرئيسية", callback_data: "menu_main" }],
  ];
}
