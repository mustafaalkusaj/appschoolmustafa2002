import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

type Params = { params: Promise<{ id: string }> };

// Generated database types are updated after migrations are applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reportsTable(client: unknown): any {
  return (client as { from: (table: string) => unknown }).from(
    "messaging_reports",
  );
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const status = typeof body?.status === "string" ? body.status.trim() : "";
    const note =
      typeof body?.resolution_note === "string"
        ? body.resolution_note.trim().slice(0, 1000)
        : "";
    if (!new Set(["reviewing", "resolved", "dismissed"]).has(status)) {
      return NextResponse.json(
        { ok: false, error: "إجراء المراجعة غير صالح." },
        { status: 400 },
      );
    }

    const { data, error } = await reportsTable(context.value.serviceSupabase)
      .update({
        status,
        resolution_note: note || null,
        reviewed_by: context.value.authUserId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("school_id", context.value.schoolId)
      .select("id, status, reviewed_at")
      .maybeSingle();

    if (error)
      return NextResponse.json(
        { ok: false, error: "تعذر تحديث البلاغ." },
        { status: 500 },
      );
    if (!data)
      return NextResponse.json(
        { ok: false, error: "البلاغ غير موجود." },
        { status: 404 },
      );
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
