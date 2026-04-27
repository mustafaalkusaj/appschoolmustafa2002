import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { sendTelegramMessage } from "@/lib/ops/telegram";

// ─── Types ───────────────────────────────────────────────────────────────────

export type OpsErrorSeverity = "info" | "warning" | "critical";
export type OpsErrorStatus = "open" | "investigating" | "fixed" | "ignored";
export type OpsErrorSource = "api" | "frontend" | "storage" | "supabase" | "rbac" | "ops";

export interface OpsError {
  id: string;
  created_at: string;
  environment: string;
  severity: OpsErrorSeverity;
  status: OpsErrorStatus;
  source: OpsErrorSource;
  route: string | null;
  method: string | null;
  page_url: string | null;
  action: string | null;
  user_role: string | null;
  school_id: string | null;
  branch_id: string | null;
  auth_user_id: string | null;
  status_code: number | null;
  error_code: string | null;
  error_message: string;
  safe_stack: string | null;
  request_id: string | null;
  deployment_id: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  fix_prompt: string | null;
  last_seen_at: string;
  occurrence_count: number;
}

export interface CaptureOpsErrorInput {
  severity?: OpsErrorSeverity;
  source: OpsErrorSource;
  route?: string | null;
  method?: string | null;
  page_url?: string | null;
  action?: string | null;
  user_role?: string | null;
  school_id?: string | null;
  branch_id?: string | null;
  auth_user_id?: string | null;
  status_code?: number | null;
  error_code?: string | null;
  error_message: string;
  stack?: string | null;
  request_id?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
}

// ─── Sanitize ─────────────────────────────────────────────────────────────────

// Patterns that may contain secrets — redacted before storage
const SECRET_PATTERNS: RegExp[] = [
  /bearer\s+[a-zA-Z0-9._\-+/=]{10,}/gi,
  /authorization:\s*[^\n]*/gi,
  /cookie:\s*[^\n]*/gi,
  /set-cookie:\s*[^\n]*/gi,
  /x-supabase-api-key:\s*[^\n]*/gi,
  // JWT tokens
  /eyJ[a-zA-Z0-9._-]{20,}/g,
  // Stripe / Supabase service-role-like prefixes
  /sk_[a-zA-Z0-9]{20,}/g,
  /service_role[^\s"',]*/gi,
  // Generic secret/password/token/key = value patterns
  /password["'\s:=]+[^\s"',\n]{3,}/gi,
  /secret["'\s:=]+[^\s"',\n]{3,}/gi,
  /token["'\s:=]+[^\s"',\n]{8,}/gi,
  /\bkey["'\s:=]+[^\s"',\n]{8,}/gi,
];

export function sanitizeError(input: unknown): string {
  let text: string;

  if (typeof input === "string") {
    text = input;
  } else if (input instanceof Error) {
    text = input.message;
  } else if (input !== null && typeof input === "object") {
    try {
      text = JSON.stringify(input);
    } catch {
      text = String(input);
    }
  } else {
    text = String(input ?? "");
  }

  // Hard length cap before any processing
  text = text.slice(0, 2000);

  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "[REDACTED]");
  }

  // Catch any remaining FOO_BAR=value style env leaks
  text = text.replace(/[A-Z_]{4,}=[^\s&]{4,}/g, "[ENV_REDACTED]");

  return text;
}

function sanitizeStack(stack: string | null | undefined): string | null {
  if (!stack) return null;

  let s = stack.slice(0, 3000);
  for (const pattern of SECRET_PATTERNS) {
    s = s.replace(pattern, "[REDACTED]");
  }
  s = s.replace(/[A-Z_]{4,}=[^\s&]{4,}/g, "[ENV_REDACTED]");

  // Keep only first 10 lines to limit size
  const lines = s.split("\n").slice(0, 10);
  return lines.join("\n");
}

// ─── Classify Severity ────────────────────────────────────────────────────────

export function classifySeverity(input: {
  status_code?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  source?: OpsErrorSource | null;
}): OpsErrorSeverity {
  const { status_code, error_code, source } = input;
  const msg = (input.error_message ?? "").toLowerCase();

  if (status_code === 500) return "critical";

  if (
    source === "supabase" &&
    (msg.includes("connection") || msg.includes("timeout") || msg.includes("unavailable"))
  ) {
    return "critical";
  }

  if (
    error_code?.startsWith("DB_") ||
    error_code?.startsWith("SUPABASE_") ||
    error_code?.includes("CONNECTION")
  ) {
    return "critical";
  }

  if (
    msg.includes("rls") ||
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("new row violates")
  ) {
    return "warning";
  }

  if (status_code === 403 || status_code === 401) return "warning";
  if (source === "storage") return "warning";
  if (source === "rbac") return "warning";
  if (status_code !== null && status_code !== undefined && status_code >= 400) return "warning";

  return "info";
}

// ─── Build Fix Prompt ─────────────────────────────────────────────────────────

export function buildFixPrompt(
  record: Partial<OpsError> & { error_message: string },
): string {
  const safeMsg = sanitizeError(record.error_message);

  const fields: Array<[string, string | number | null | undefined]> = [
    ["severity", record.severity ?? "unknown"],
    ["source", record.source ?? "unknown"],
    ["route", record.route ?? "—"],
    ["method", record.method ?? "—"],
    ["page", record.page_url ?? "—"],
    ["action", record.action ?? "—"],
    ["role", record.user_role ?? "—"],
    ["school_id", record.school_id ? "[masked]" : "—"],
    ["branch_id", record.branch_id ? "[masked]" : "—"],
    ["status_code", record.status_code ?? "—"],
    ["error_code", record.error_code ?? "—"],
    ["message", safeMsg],
    ["request_id", record.request_id ?? "—"],
    ["occurrence_count", record.occurrence_count ?? 1],
  ];

  const fieldLines = fields.map(([k, v]) => `- ${k}: ${v ?? "—"}`).join("\n");

  const stackSection = record.safe_stack
    ? `\nSafe Stack:\n\`\`\`\n${record.safe_stack}\n\`\`\``
    : "";

  return `أريدك تصلح خطأ إنتاج في مشروع school-iraq.com.

المشروع:
- Next.js
- Vercel
- Supabase
- RBAC
- Domain: https://school-iraq.com
- نشر بدون GitHub عبر npx vercel --prod

قواعد أمان:
- لا تطبع secrets
- لا ترفع env files
- لا تستخدم GitHub
- لا تشغل Supabase destructive commands
- استخدم QA_TEST فقط
- لا تنشر إلا بعد نجاح lint/typecheck/test/build

تفاصيل الخطأ:
${fieldLines}
${stackSection}
خطوات إعادة المشكلة:
1. افتح ${record.page_url ?? record.route ?? "المسار المذكور"}
2. نفذ ${record.action ?? "العملية المذكورة"}
3. لاحظ الخطأ: ${safeMsg.slice(0, 200)}

المطلوب:
1. حدد السبب الحقيقي
2. أصلحه من الجذر
3. حسّن رسالة المستخدم
4. أضف test
5. شغّل:
   npm run lint
   npm run typecheck
   npm test
   env -u NODE_ENV npm run build
6. انشر:
   npx vercel --prod
7. اختبر production
8. حدّث QA_AUTOMATED_REPORT.md`.trim();
}

// ─── Telegram Alert ───────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildErrorTelegramHtml(
  record: Partial<OpsError> & { error_message: string },
): string {
  const severityEmoji = record.severity === "critical" ? "🔴" : "🟡";
  const severityLabel = record.severity === "critical" ? "حرج" : "تحذير";

  const lines: Array<string | null> = [
    `${severityEmoji} <b>خطأ إنتاجي — school-iraq.com</b>`,
    "",
    `الخطورة: <b>${escHtml(severityLabel)}</b>`,
    `المصدر: ${escHtml(record.source ?? "—")}`,
    `المسار: <code>${escHtml(record.route ?? "—")}</code>`,
    record.page_url ? `الصفحة: ${escHtml(record.page_url)}` : null,
    record.action ? `الإجراء: ${escHtml(record.action)}` : null,
    `الكود: ${record.status_code ?? "—"}`,
    record.user_role ? `الدور: ${escHtml(record.user_role)}` : null,
    record.school_id ? `المدرسة: [masked]` : null,
    record.branch_id ? `الفرع: [masked]` : null,
    `عدد التكرار: ${record.occurrence_count ?? 1}`,
    "",
    `السبب المختصر:`,
    `<code>${escHtml(sanitizeError(record.error_message).slice(0, 200))}</code>`,
    "",
    `الإجراء المقترح:`,
    `افتح Super Admin → أخطاء الإنتاج`,
    `انسخ Fix Prompt وشغّله في Codex`,
  ];

  return lines.filter(Boolean).join("\n");
}

// ─── Dedup Window ─────────────────────────────────────────────────────────────

const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// ─── Main Capture Function ────────────────────────────────────────────────────

export async function captureOpsError(input: CaptureOpsErrorInput): Promise<void> {
  try {
    const safeMessage = sanitizeError(input.error_message);
    const safeStack = sanitizeStack(input.stack);

    const severity: OpsErrorSeverity =
      input.severity ??
      classifySeverity({
        status_code: input.status_code,
        error_code: input.error_code,
        error_message: input.error_message,
        source: input.source,
      });

    const db = createServiceSupabaseClient();
    const oneHourAgo = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();

    // Dedup: same route + same sanitized message within 1 hour → increment counter
    const { data: existing } = await db
      .from("ops_errors")
      .select("id, occurrence_count")
      .eq("route", input.route ?? "")
      .eq("error_message", safeMessage)
      .gte("last_seen_at", oneHourAgo)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();

    if (existing) {
      await db
        .from("ops_errors")
        .update({
          occurrence_count: (existing.occurrence_count ?? 1) + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      return;
    }

    const partialRecord: Partial<OpsError> & { error_message: string } = {
      severity,
      source: input.source,
      route: input.route ?? null,
      method: input.method ?? null,
      page_url: input.page_url ?? null,
      action: input.action ?? null,
      user_role: input.user_role ?? null,
      school_id: input.school_id ?? null,
      branch_id: input.branch_id ?? null,
      status_code: input.status_code ?? null,
      error_code: input.error_code ?? null,
      error_message: safeMessage,
      safe_stack: safeStack,
      request_id: input.request_id ?? null,
      occurrence_count: 1,
    };

    const fix_prompt = buildFixPrompt(partialRecord);

    const { error: insertError } = await db.from("ops_errors").insert({
      environment:
        process.env.NODE_ENV === "production" ? "production" : "development",
      severity,
      status: "open",
      source: input.source,
      route: input.route ?? null,
      method: input.method ?? null,
      page_url: input.page_url ?? null,
      action: input.action ?? null,
      user_role: input.user_role ?? null,
      school_id: input.school_id ?? null,
      branch_id: input.branch_id ?? null,
      auth_user_id: input.auth_user_id ?? null,
      status_code: input.status_code ?? null,
      error_code: input.error_code ?? null,
      error_message: safeMessage,
      safe_stack: safeStack,
      request_id: input.request_id ?? null,
      deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      user_agent: input.user_agent ?? null,
      metadata: input.metadata ?? {},
      fix_prompt,
    });

    if (insertError) {
      console.error("[ops-errors] insert failed:", insertError.message);
      return;
    }

    // Telegram alert for warning/critical — fire and forget
    if (severity === "critical" || severity === "warning") {
      const html = buildErrorTelegramHtml(partialRecord);
      sendTelegramMessage(html).catch(() => {
        // swallow — never block caller
      });
    }
  } catch (err) {
    // Never throw — error capture must not break the original request
    console.error(
      "[ops-errors] captureOpsError failed:",
      err instanceof Error ? err.message : String(err ?? ""),
    );
  }
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

export async function getRecentOpsErrors(options?: {
  limit?: number;
  status?: OpsErrorStatus;
  severity?: OpsErrorSeverity;
}): Promise<OpsError[]> {
  const db = createServiceSupabaseClient();

  let query = db
    .from("ops_errors")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.severity) {
    query = query.eq("severity", options.severity);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as OpsError[];
}

export async function getOpsErrorById(id: string): Promise<OpsError | null> {
  const db = createServiceSupabaseClient();
  const { data, error } = await db
    .from("ops_errors")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as OpsError | null;
}

export async function updateOpsErrorStatus(
  id: string,
  status: OpsErrorStatus,
): Promise<void> {
  const db = createServiceSupabaseClient();
  const { error } = await db
    .from("ops_errors")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
