import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) return context.response;

    const { serviceSupabase, schoolId } = context.value;

    const url = new URL(req.url);
    const subject = url.searchParams.get("subject");
    const difficulty = url.searchParams.get("difficulty");
    const type = url.searchParams.get("type");
    const search = url.searchParams.get("search");
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));
    const limit = 50;

    let query = serviceSupabase
      .from("questions")
      .select("id, subject, unit, difficulty, type, prompt, options, answer, created_at, tags, times_used, avg_score")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (subject) query = query.eq("subject", subject);
    if (difficulty) query = query.eq("difficulty", difficulty);
    if (type) query = query.eq("type", type);
    if (search) query = query.ilike("prompt", `%${search}%`);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ok: false, error: "تعذر تحميل بنك الأسئلة." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch {
    return NextResponse.json({ ok: false, error: "خطأ داخلي في الخادم." }, { status: 500 });
  }
}
