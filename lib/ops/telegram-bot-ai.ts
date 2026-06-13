import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── buildSystemContext ───────────────────────────────────────────────────────

async function buildSystemContext(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      schoolsResult,
      studentsResult,
      teachersResult,
      errorsResult,
      paymentsResult,
      unpaidResult,
      gradesResult,
      attendanceResult,
    ] = await Promise.all([
      supabase.from("schools").select("id", { head: true, count: "exact" }),
      supabase.from("students").select("id", { head: true, count: "exact" }),
      supabase.from("teachers").select("id", { head: true, count: "exact" }),
      supabase
        .from("error_logs")
        .select("id", { head: true, count: "exact" })
        .eq("is_resolved", false),
      supabase
        .from("payments")
        .select("amount")
        .gte("created_at", monthStart),
      supabase
        .from("students")
        .select("id", { head: true, count: "exact" })
        .gt("remaining_fee", 0),
      supabase
        .from("grades")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", monthStart),
      supabase
        .from("attendance_records")
        .select("id", { head: true, count: "exact" })
        .gte("created_at", monthStart),
    ]);

    const payments = (paymentsResult.data ?? []) as Array<{ amount: number }>;
    const monthlyRevenue = payments.reduce((sum, p) => {
      const amt = typeof p.amount === "number" ? p.amount : parseFloat(String(p.amount ?? "0")) || 0;
      return sum + amt;
    }, 0);

    return [
      `نظام إدارة مدارس — بيانات الحالة الراهنة:`,
      `التاريخ: ${now.toLocaleDateString("ar-IQ", { timeZone: "Asia/Baghdad" })}`,
      ``,
      `البيانات:`,
      `- عدد المدارس: ${schoolsResult.count ?? 0}`,
      `- عدد الطلاب: ${studentsResult.count ?? 0}`,
      `- عدد المعلمين: ${teachersResult.count ?? 0}`,
      `- الأخطاء غير المحلولة: ${errorsResult.count ?? 0}`,
      `- إيرادات هذا الشهر: ${monthlyRevenue.toLocaleString("ar-IQ")} د.ع`,
      `- طلاب برسوم متبقية: ${unpaidResult.count ?? 0}`,
      `- درجات مُدخلة هذا الشهر: ${gradesResult.count ?? 0}`,
      `- سجلات حضور هذا الشهر: ${attendanceResult.count ?? 0}`,
    ].join("\n");
  } catch {
    return "بيانات النظام: تعذر جلب البيانات التفصيلية.";
  }
}

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ─── aiGenerateReport ─────────────────────────────────────────────────────────

export async function aiGenerateReport(): Promise<string> {
  try {
    const context = await buildSystemContext();
    const client = getClient();

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            `أنت مساعد تحليل بيانات لنظام إدارة مدارس. قم بتحليل البيانات التالية وأعط تقريراً شاملاً بالعربية.`,
            ``,
            context,
            ``,
            `قدم التقرير في هذه الأقسام:`,
            `1. ✅ إيجابيات`,
            `2. ⚠️ تحتاج انتباه`,
            `3. 💡 توصيات`,
            ``,
            `اجعل التقرير موجزاً ومفيداً (لا تتجاوز 3000 حرف).`,
          ].join("\n"),
        },
      ],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "لا يوجد رد من الذكاء الاصطناعي.";

    return [
      "🤖 <b>تقرير الذكاء الاصطناعي</b>",
      "",
      escHtml(text.slice(0, 3400)),
    ]
      .join("\n")
      .slice(0, 4000);
  } catch (err) {
    return `❌ تعذر توليد التقرير: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── aiAnalyzeTopic ───────────────────────────────────────────────────────────

export async function aiAnalyzeTopic(topic: string): Promise<string> {
  try {
    if (!topic?.trim()) {
      return "⚠️ مطلوب: موضوع التحليل\nمثال: /ai_analyze الحضور";
    }

    const context = await buildSystemContext();
    const client = getClient();

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            `أنت مساعد تحليل بيانات لنظام إدارة مدارس.`,
            ``,
            context,
            ``,
            `قم بتحليل هذا الموضوع تحديداً: ${topic}`,
            ``,
            `قدم تحليلاً مركزاً ومفيداً بالعربية (لا تتجاوز 3000 حرف).`,
          ].join("\n"),
        },
      ],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "لا يوجد رد.";

    return [
      `🤖 <b>تحليل: ${escHtml(topic.slice(0, 50))}</b>`,
      "",
      escHtml(text.slice(0, 3400)),
    ]
      .join("\n")
      .slice(0, 4000);
  } catch (err) {
    return `❌ تعذر التحليل: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── aiPredictMetric ──────────────────────────────────────────────────────────

export async function aiPredictMetric(question: string): Promise<string> {
  try {
    if (!question?.trim()) {
      return "⚠️ مطلوب: سؤال التنبؤ\nمثال: /ai_predict ما هو المتوقع للإيرادات الشهر القادم؟";
    }

    const context = await buildSystemContext();
    const client = getClient();

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            `أنت مساعد تحليل بيانات لنظام إدارة مدارس. بناءً على البيانات المتاحة، قدم توقعاً منطقياً.`,
            ``,
            context,
            ``,
            `السؤال: ${question}`,
            ``,
            `قدم توقعاً مبنياً على البيانات مع ذكر مستوى الثقة بالتوقع. الرد بالعربية (لا تتجاوز 3000 حرف).`,
          ].join("\n"),
        },
      ],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "لا يوجد رد.";

    return [
      `🔮 <b>توقع: ${escHtml(question.slice(0, 50))}</b>`,
      "",
      escHtml(text.slice(0, 3400)),
    ]
      .join("\n")
      .slice(0, 4000);
  } catch (err) {
    return `❌ تعذر التنبؤ: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── aiSuggestImprovements ────────────────────────────────────────────────────

export async function aiSuggestImprovements(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const context = await buildSystemContext();

    // Also fetch recent errors for more context
    const { data: recentErrors } = await supabase
      .from("error_logs")
      .select("route, error_message, occurrence_count")
      .eq("is_resolved", false)
      .order("occurrence_count", { ascending: false })
      .limit(5);

    const errorsContext =
      recentErrors && recentErrors.length > 0
        ? `\nأكثر الأخطاء تكراراً:\n` +
          (recentErrors as Array<{ route: string | null; error_message: string; occurrence_count: number }>)
            .map((e) => `- ${e.route ?? "—"}: ${e.error_message.slice(0, 80)} (×${e.occurrence_count})`)
            .join("\n")
        : "";

    const client = getClient();

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            `أنت مساعد تحسين لنظام إدارة مدارس. بناءً على البيانات التالية، قدم اقتراحات تحسين عملية.`,
            ``,
            context,
            errorsContext,
            ``,
            `اقترح تحسينات في هذه المجالات:`,
            `1. 🐛 معالجة الأخطاء المتكررة`,
            `2. 💰 تحسين تحصيل الرسوم`,
            `3. 📊 تحسين أداء النظام`,
            `4. 👥 تجربة المستخدم`,
            ``,
            `اجعل الاقتراحات عملية وقابلة للتنفيذ (لا تتجاوز 3000 حرف).`,
          ].join("\n"),
        },
      ],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "لا يوجد رد.";

    return [
      "💡 <b>اقتراحات التحسين (AI)</b>",
      "",
      escHtml(text.slice(0, 3400)),
    ]
      .join("\n")
      .slice(0, 4000);
  } catch (err) {
    return `❌ تعذر توليد الاقتراحات: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}

// ─── aiAnalyzeError ───────────────────────────────────────────────────────────

export async function aiAnalyzeError(
  errorMessage: string,
  route: string,
  stack?: string,
): Promise<string> {
  try {
    const client = getClient();

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            `أنت خبير تحليل أخطاء لتطبيق Next.js + Supabase. حلل هذا الخطأ وقدم تشخيصاً دقيقاً.`,
            ``,
            `المسار: ${route}`,
            `رسالة الخطأ: ${errorMessage}`,
            stack ? `Stack Trace:\n${stack.slice(0, 500)}` : "",
            ``,
            `قدم الإجابة بهذا الشكل:`,
            `🔍 السبب المحتمل: [شرح مختصر]`,
            `🔧 الحل المقترح: [خطوات عملية]`,
            `⚡ الأولوية: [عالية / متوسطة / منخفضة]`,
            ``,
            `الرد بالعربية (لا تتجاوز 2500 حرف).`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "لا يوجد رد.";

    return [
      `🤖 <b>تحليل الخطأ — AI</b>`,
      `المسار: <code>${escHtml(route.slice(0, 80))}</code>`,
      "",
      escHtml(text.slice(0, 3400)),
    ]
      .join("\n")
      .slice(0, 4000);
  } catch (err) {
    return `❌ تعذر تحليل الخطأ: ${escHtml(err instanceof Error ? err.message.slice(0, 100) : "خطأ")}`;
  }
}
