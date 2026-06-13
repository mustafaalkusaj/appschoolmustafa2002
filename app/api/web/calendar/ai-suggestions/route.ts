import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Parse body once — stream can only be read once in Next.js
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("طلب غير صالح.", 400);
  }

  // Auth: must be authenticated school user
  const schoolId = typeof body.schoolId === "string" ? body.schoolId : undefined;
  const context = await resolveSchoolScopedActorContext(
    schoolId ?? null,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "غير مصرح." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح.", "status" in context ? context.status : 401);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "calendar-ai-suggestions",
    windowMs: 60_000,
    maxHits: 5,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError("خدمة الذكاء الاصطناعي غير مهيأة.", 503);
  }

  const upcomingEvents = Array.isArray(body.upcomingEvents)
    ? (body.upcomingEvents as Array<{ title: string; date: string; type: string }>)
    : [];
  const currentMonth = typeof body.currentMonth === "string" ? body.currentMonth : "";
  const schoolName = typeof body.schoolName === "string" ? body.schoolName : "مدرسة عراقية";
  const studentsCount = typeof body.studentsCount === "number" ? body.studentsCount : null;

  const eventsText = upcomingEvents
    .slice(0, 10)
    .map((e) => `- ${e.title} (${e.date}) [${e.type}]`)
    .join("\n");

  const prompt = `أنت مساعد ذكي لإدارة التقويم المدرسي العراقي.
مدرسة: ${schoolName}
عدد الطلاب: ${studentsCount ?? "غير محدد"}
الشهر الحالي: ${currentMonth}

الأحداث القادمة خلال 30 يوم:
${eventsText || "لا توجد أحداث مجدولة"}

قدم 4 اقتراحات عملية وموجزة بالعربية لمساعدة إدارة المدرسة.
كل اقتراح في سطر واحد يبدأ بـ "•"
ركز على: التنبيهات المهمة، التواصل مع أولياء الأمور، الاستعداد للامتحانات، الفعاليات المدرسية.
لا تكرر الأحداث المذكورة فقط — قدم اقتراحات إجرائية وعملية.`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      return jsonError("فشل الاتصال بخدمة الذكاء الاصطناعي.", 502);
    }

    const result = (await anthropicRes.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    const text =
      result.content?.[0]?.type === "text" ? (result.content[0].text ?? "") : "";

    const suggestions = text
      .split("\n")
      .filter((line) => line.trim().startsWith("•"))
      .map((line) => line.replace(/^•\s*/, "").trim())
      .filter(Boolean);

    return NextResponse.json({ ok: true, suggestions });
  } catch (err) {
    console.error("[calendar/ai-suggestions] Error:", err);
    return jsonError("خطأ غير متوقع في خدمة الاقتراحات الذكية.", 500);
  }
}
