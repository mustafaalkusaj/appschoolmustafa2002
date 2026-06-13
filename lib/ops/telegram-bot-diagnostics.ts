import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { InlineKeyboard } from "@/lib/ops/telegram-bot-api";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const BASE_URL = "https://school-iraq.com";

// ─── diagnoseRoute ────────────────────────────────────────────────────────────

export async function diagnoseRoute(route: string): Promise<string> {
  if (!route) return "⚠️ مطلوب: مسار (مثال: /api/health)";

  try {
    const supabase = createServiceSupabaseClient();
    const url = `${BASE_URL}${route.startsWith("/") ? route : "/" + route}`;

    const start = Date.now();
    let status = 0;
    let latency = 0;

    try {
      const res = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(10_000),
      });
      status = res.status;
      latency = Date.now() - start;
    } catch {
      latency = Date.now() - start;
    }

    // Check recent errors for this route
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: errData } = await supabase
      .from("error_logs")
      .select("id, error_message, occurrence_count")
      .eq("route" as never, route)
      .gte("created_at" as never, since)
      .order("occurrence_count" as never, { ascending: false })
      .limit(3);

    const recentErrors = (errData ?? []) as Array<{
      id: string;
      error_message: string;
      occurrence_count: number;
    }>;

    const statusIcon =
      status >= 200 && status < 300 ? "✅" : status === 0 ? "❌" : status >= 500 ? "🔴" : "🟡";

    const lines = [
      `🔍 <b>تشخيص المسار</b>`,
      `المسار: <code>${escHtml(route)}</code>`,
      "",
      `الحالة: ${statusIcon} <b>${status || "timeout"}</b>`,
      `زمن الاستجابة: <b>${latency}ms</b>`,
      "",
      `أخطاء اليوم: <b>${recentErrors.length}</b>`,
    ];

    if (recentErrors.length > 0) {
      lines.push("", "<b>آخر الأخطاء:</b>");
      for (const e of recentErrors) {
        lines.push(
          `• ${escHtml(e.error_message.slice(0, 80))} (×${e.occurrence_count})`,
        );
      }

      // AI analysis if errors exist
      if (recentErrors.length > 0) {
        try {
          const aiAnalysis = await autoAnalyzeError(
            recentErrors[0].error_message,
            route,
          );
          lines.push("", "🤖 <b>تحليل AI:</b>", aiAnalysis.slice(0, 500));
        } catch {
          // skip AI if fails
        }
      }
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── testApiRoute ─────────────────────────────────────────────────────────────

export async function testApiRoute(
  method: string,
  route: string,
  body?: string,
): Promise<string> {
  const allowedMethods = ["GET", "POST", "PUT"];
  const upperMethod = method.toUpperCase();

  if (!allowedMethods.includes(upperMethod)) {
    return `❌ الطريقة غير مسموحة. المتاح: ${allowedMethods.join(", ")}`;
  }

  if (!route.startsWith("/api/")) {
    return "❌ المسار يجب أن يبدأ بـ /api/";
  }

  try {
    const url = `${BASE_URL}${route}`;
    const start = Date.now();

    const fetchOpts: RequestInit = {
      method: upperMethod,
      signal: AbortSignal.timeout(15_000),
      headers: { "Content-Type": "application/json" },
    };

    if (body && (upperMethod === "POST" || upperMethod === "PUT")) {
      fetchOpts.body = body;
    }

    const res = await fetch(url, fetchOpts);
    const latency = Date.now() - start;

    let responseBody = "";
    try {
      responseBody = await res.text();
    } catch {
      responseBody = "[لا يمكن قراءة الاستجابة]";
    }

    const icon = res.status >= 200 && res.status < 300 ? "✅" : "❌";

    return [
      `🧪 <b>اختبار API</b>`,
      `${upperMethod} ${escHtml(route)}`,
      "",
      `${icon} الحالة: <b>${res.status}</b>`,
      `الزمن: <b>${latency}ms</b>`,
      "",
      `<b>الاستجابة:</b>`,
      `<code>${escHtml(responseBody.slice(0, 500))}</code>`,
    ]
      .join("\n")
      .slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── runHealthCheck ───────────────────────────────────────────────────────────

export async function runHealthCheck(): Promise<string> {
  const routes = [
    "/api/health",
    "/api/ops/health-check",
    "/api/mobile/auth/login",
    "/api/mobile/student/dashboard",
    "/api/mobile/teacher/dashboard",
    "/api/mobile/admin/expenses",
    "/api/web/notifications/insite",
    "/ar",
    "/en",
  ];

  const lines = [`🏥 <b>Health Check — ${routes.length} مسارات</b>`, ""];
  let ok = 0;
  let fail = 0;

  for (const route of routes) {
    const url = `${BASE_URL}${route}`;
    try {
      const start = Date.now();
      const res = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(8_000),
      });
      const ms = Date.now() - start;
      const icon = res.status < 400 ? "✅" : "❌";
      if (res.status < 400) ok++;
      else fail++;
      lines.push(`${icon} <code>${escHtml(route)}</code> — ${res.status} (${ms}ms)`);
    } catch {
      fail++;
      lines.push(`❌ <code>${escHtml(route)}</code> — timeout/error`);
    }
  }

  lines.push("", `الملخص: ✅ ${ok} / ❌ ${fail}`);

  return lines.join("\n").slice(0, 4000);
}

// ─── getEdgeFunctions ─────────────────────────────────────────────────────────

export async function getEdgeFunctions(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const fnClient = supabase.functions as unknown as { list(): Promise<{ data: unknown[] | null; error: Error | null }> };
    const { data, error } = await fnClient.list();

    if (error) {
      return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;
    }

    const functions = data ?? [];
    if (functions.length === 0) {
      return "⚡ لا توجد Edge Functions.";
    }

    const lines = [`⚡ <b>Edge Functions (${functions.length})</b>`, ""];
    for (const f of functions) {
      const fn = f as Record<string, unknown>;
      const name = String(fn.name ?? "—");
      const created = fn.created_at
        ? new Date(String(fn.created_at)).toLocaleDateString("ar-IQ")
        : "—";
      lines.push(`• <code>${escHtml(name)}</code> — ${created}`);
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── invokeEdgeFunction ───────────────────────────────────────────────────────

export async function invokeEdgeFunction(functionName: string): Promise<string> {
  if (!functionName) return "⚠️ مطلوب: اسم الـ function";

  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.functions.invoke(functionName);

    if (error) {
      return `❌ خطأ في تشغيل <code>${escHtml(functionName)}</code>: ${escHtml(error.message.slice(0, 100))}`;
    }

    const result = JSON.stringify(data ?? {}).slice(0, 300);
    return [
      `✅ <b>تم تشغيل: ${escHtml(functionName)}</b>`,
      "",
      `الاستجابة: <code>${escHtml(result)}</code>`,
    ].join("\n");
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── getEdgeFunctionLogs ──────────────────────────────────────────────────────

export async function getEdgeFunctionLogs(functionName: string): Promise<string> {
  return [
    `📋 <b>سجلات Edge Function: ${escHtml(functionName)}</b>`,
    "",
    "لعرض السجلات التفصيلية:",
    "Supabase Dashboard → Edge Functions → Logs",
    "",
    "استخدم /runfunction للتشغيل المباشر واختبار الاستجابة.",
  ].join("\n");
}

// ─── autoAnalyzeError ─────────────────────────────────────────────────────────

export async function autoAnalyzeError(
  errorMessage: string,
  route: string,
  stack?: string,
): Promise<string> {
  try {
    const client = new Anthropic();

    const prompt = [
      `خطأ في المسار: ${route}`,
      `رسالة الخطأ: ${errorMessage.slice(0, 500)}`,
      stack ? `Stack trace: ${stack.slice(0, 500)}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system:
        "أنت مهندس برمجيات خبير. حلل هذا الخطأ بالنظام المدرسي وقدم:\n1. السبب المحتمل\n2. الحل المقترح\n3. خطوات التنفيذ\n4. الأولوية (حرجة/متوسطة/منخفضة)\nأجب باللغة العربية بشكل مختصر وعملي.",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    return escHtml(text).slice(0, 1500);
  } catch (err) {
    return `❌ تعذر تحليل الخطأ بـ AI: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── diagnosticsMenuKeyboard ──────────────────────────────────────────────────

export function diagnosticsMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "🏥 Health Check", callback_data: "cmd_healthcheck" },
      { text: "⚡ Edge Functions", callback_data: "cmd_functions" },
    ],
    [{ text: "🔙 الرئيسية", callback_data: "menu_main" }],
  ];
}
