import { NextRequest, NextResponse } from "next/server";

import {
  logAdminMobileRouteError,
  resolveAdminMobileRouteContext,
} from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, serviceSupabase } = context.value;

    const { data, error } = await serviceSupabase
      .from("classes")
      .select("id, name, grade, section")
      .eq("school_id", schoolId)
      .order("grade", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    const items = (data ?? []).map((c) => ({
      id: c.id as string,
      name: (c.name as string | null) ?? "",
      grade: (c.grade as string | null) ?? null,
      section: (c.section as string | null) ?? null,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    logAdminMobileRouteError("GET /api/mobile/admin/classes", error);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { schoolId, branchId, serviceSupabase } = context.value;
    const body = (await req.json()) as Record<string, unknown>;

    // Canonical column names, with legacy client field-name fallback for OTA rollout.
    const name =
      (typeof body.name === "string" && body.name) ||
      (typeof body.name_ar === "string" && body.name_ar) ||
      "";
    const grade =
      (typeof body.grade === "string" && body.grade) ||
      (body.grade_level != null ? String(body.grade_level) : "");
    const section = (typeof body.section === "string" && body.section) || "";

    if (!name.trim()) {
      return NextResponse.json(
        { ok: false, error: "missing_required_field" },
        { status: 400 },
      );
    }

    // `classes.grade` and `classes.section` are both NOT NULL with no default.
    // Reject explicitly rather than inserting empty placeholders.
    if (!grade.trim()) {
      return NextResponse.json(
        { ok: false, error: "المرحلة الدراسية مطلوبة." },
        { status: 400 },
      );
    }

    if (!section.trim()) {
      return NextResponse.json(
        { ok: false, error: "الشعبة مطلوبة." },
        { status: 400 },
      );
    }

    const { data, error } = await serviceSupabase
      .from("classes")
      .insert({
        school_id: schoolId,
        branch_id: branchId,
        name: name.trim(),
        grade: grade.trim(),
        section: section.trim(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      item: { id: data.id, name: name.trim() },
    });
  } catch (error) {
    logAdminMobileRouteError("POST /api/mobile/admin/classes", error);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
