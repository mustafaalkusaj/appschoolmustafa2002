import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "missing_id" },
        { status: 400 },
      );
    }

    // Scope check: verify subject belongs to this school
    const { data: existing, error: findError } = await serviceSupabase
      .from("subjects")
      .select("id")
      .eq("id", id)
      .eq("school_id", schoolId)
      .single();

    if (findError || !existing) {
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 },
      );
    }

    const body = (await req.json()) as Record<string, unknown>;

    // Build allowed update payload
    const allowed: Record<string, unknown> = {};
    const fields = ["name", "is_active"] as const;
    for (const field of fields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        allowed[field] = body[field];
      }
    }

    // Support legacy field name from mobile client
    if (!allowed.name && typeof body.name_ar === "string" && body.name_ar) {
      allowed.name = body.name_ar;
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json(
        { ok: false, error: "no_fields_to_update" },
        { status: 400 },
      );
    }

    // Trim name if present
    if (typeof allowed.name === "string") {
      allowed.name = (allowed.name as string).trim();
      if (!allowed.name) {
        return NextResponse.json(
          { ok: false, error: "missing_required_field" },
          { status: 400 },
        );
      }
    }

    const { data, error } = await serviceSupabase
      .from("subjects")
      .update(allowed)
      .eq("id", id)
      .eq("school_id", schoolId)
      .select("id, name, is_active")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, item: data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
