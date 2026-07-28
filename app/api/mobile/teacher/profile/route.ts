import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function PUT(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) return context.response;

    const { serviceSupabase, schoolId, authUserId } = context.value;

    const body = (await req.json().catch(() => null)) as {
      phone?: string;
      phone_secondary?: string;
      email_personal?: string;
      address?: string;
      city?: string;
    } | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: "طلب غير صالح." },
        { status: 400 },
      );
    }

    const { data, error } = await serviceSupabase
      .from("teachers")
      .update({
        phone: body.phone?.trim() || null,
        phone_secondary: body.phone_secondary?.trim() || null,
        email_personal: body.email_personal?.trim() || null,
        address: body.address?.trim() || null,
        city: body.city?.trim() || null,
      })
      .eq("auth_user_id", authUserId)
      .eq("school_id", schoolId)
      .select(
        "id, full_name, subject, phone, phone_secondary, email_personal, address, city",
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "تعذر تحديث الملف الشخصي." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "خطأ داخلي في الخادم." },
      { status: 500 },
    );
  }
}
