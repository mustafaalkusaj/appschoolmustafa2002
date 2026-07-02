import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  parseMobileListParams,
} from "@/lib/mobile-api-admin";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "student");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, account } = context.value;
  const studentId = account.student?.id;
  const params = parseMobileListParams(req);

  if (!studentId) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, items: [] });
  }

  const { data: studentRow } = await serviceSupabase
    .from("students")
    .select("class_id")
    .eq("id", studentId)
    .maybeSingle();

  const classId = studentRow?.class_id;
  if (!classId) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, items: [] });
  }

  const { data, error } = await serviceSupabase
    .from("exams")
    .select("*")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "exams"),
      items: [],
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    items: data ?? [],
    page: params.page,
    limit: params.limit,
  });
}
