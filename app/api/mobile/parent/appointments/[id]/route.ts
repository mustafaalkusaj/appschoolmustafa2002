import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

type Params = { params: Promise<{ id: string }> };

// Generated database types are updated after migrations are applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function appointmentsTable(client: unknown): any {
  return (client as { from: (table: string) => unknown }).from(
    "teacher_appointments",
  );
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const context = await resolveMobileRouteContext(req, "parent");
    if (context.ok === false) return context.response;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "معرّف الموعد مطلوب." },
        { status: 400 },
      );
    }

    const { data: existing, error: findError } = await appointmentsTable(
      context.value.serviceSupabase,
    )
      .select("id, status")
      .eq("id", id)
      .eq("school_id", context.value.schoolId)
      .eq("parent_user_id", context.value.authUserId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { ok: false, error: "تعذر التحقق من الموعد." },
        { status: 500 },
      );
    }
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "الموعد غير موجود." },
        { status: 404 },
      );
    }
    if (!new Set(["pending", "confirmed"]).has(existing.status)) {
      return NextResponse.json(
        { ok: false, error: "لا يمكن إلغاء الموعد في حالته الحالية." },
        { status: 409 },
      );
    }

    const { data, error } = await appointmentsTable(
      context.value.serviceSupabase,
    )
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("parent_user_id", context.value.authUserId)
      .select("id, status")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "تعذر إلغاء الموعد." },
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
