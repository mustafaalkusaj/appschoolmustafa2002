import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) return context.response;

    const { serviceSupabase, account } = context.value;
    const teacherId = account.teacher?.id;

    if (!teacherId) {
      return NextResponse.json(
        { ok: false, error: "لم يتم ربط الحساب بسجل معلم." },
        { status: 403 },
      );
    }

    const { data, error } = await serviceSupabase
      .from("salaries")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("month", { ascending: false })
      .limit(24);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "تعذر تحميل سجل الرواتب." },
        { status: 500 },
      );
    }

    // `items` is what the mobile client's getList()/readItems() reads; `salaries`
    // is kept for any caller still using the old envelope key.
    return NextResponse.json({
      ok: true,
      items: data ?? [],
      salaries: data ?? [],
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
