import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
  parseMobileListParams,
} from "@/lib/mobile-api-admin";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "teacher");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, account } = context.value;
  const teacherId = account.teacher?.id;
  const params = parseMobileListParams(req);

  if (!teacherId) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, items: [] });
  }

  const url = new URL(req.url);
  const subjectId = url.searchParams.get("subject_id");

  let query = serviceSupabase
    .from("questions")
    .select("*")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (subjectId) {
    query = query.eq("subject_id", subjectId);
  }

  if (params.search) {
    query = query.ilike("question_text", `%${params.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "questions"),
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
