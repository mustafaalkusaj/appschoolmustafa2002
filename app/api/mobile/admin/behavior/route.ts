import { NextRequest, NextResponse } from "next/server";

import {
  parseMobileListParams,
  queryMobileBehaviorLogs,
  type MobileRouteContext,
} from "@/lib/mobile-api-server";
import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) {
      return context.response;
    }

    const params = parseMobileListParams(req, { limit: 20, maxLimit: 100 });
    const url = new URL(req.url);

    // queryMobileBehaviorLogs only reads serviceSupabase + schoolId, both present
    // on the admin context. Cast to the shared shape to reuse the query.
    const result = await queryMobileBehaviorLogs(
      context.value as unknown as MobileRouteContext,
      params,
      { studentId: url.searchParams.get("student_id")?.trim() || undefined },
    );

    return NextResponse.json({
      ok: true,
      gate: result.gate,
      items: result.items,
      page: params.page,
      limit: params.limit,
    });
  } catch {
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

    const { schoolId, serviceSupabase } = context.value;
    const body = (await req.json()) as {
      student_id?: string;
      student_name?: string;
      behavior_type?: string;
      points?: number;
      note?: string;
    };

    const { student_id, student_name, behavior_type, points, note } = body;

    if (
      !student_name ||
      typeof student_name !== "string" ||
      !student_name.trim()
    ) {
      return NextResponse.json(
        { ok: false, error: "missing_required_field", field: "student_name" },
        { status: 400 },
      );
    }

    if (
      typeof points !== "number" ||
      !Number.isInteger(points) ||
      points === 0 ||
      points < -50 ||
      points > 50
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid_points", field: "points" },
        { status: 400 },
      );
    }

    const { data, error } = await serviceSupabase
      .from("behavior_logs")
      .insert({
        school_id: schoolId,
        student_id: student_id ?? null,
        student_name: student_name.trim(),
        behavior_type: behavior_type ?? null,
        points,
        note: note ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select(
        "id, student_id, student_name, behavior_type, points, note, created_at",
      )
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
