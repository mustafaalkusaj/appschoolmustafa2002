import { NextRequest, NextResponse } from "next/server";

import {
  AVAILABLE_GATE,
  featureGateFromError,
} from "@/lib/mobile-api-admin";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export async function GET(req: NextRequest) {
  const context = await resolveMobileRouteContext(req, "teacher");
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, account } = context.value;
  const teacherId = account.teacher?.id;

  if (!teacherId) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, items: [] });
  }

  const { data: assignments, error: assignError } = await serviceSupabase
    .from("teacher_assignments")
    .select("subject_id")
    .eq("teacher_id", teacherId);

  if (assignError) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(assignError, "teacher_assignments"),
      items: [],
    });
  }

  const subjectIds = (assignments ?? []).map((a) => a.subject_id).filter(Boolean);

  if (!subjectIds.length) {
    return NextResponse.json({ ok: true, gate: AVAILABLE_GATE, items: [] });
  }

  const { data, error } = await serviceSupabase
    .from("subjects")
    .select("*")
    .eq("school_id", schoolId)
    .in("id", subjectIds)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({
      ok: true,
      gate: featureGateFromError(error, "subjects"),
      items: [],
    });
  }

  return NextResponse.json({
    ok: true,
    gate: AVAILABLE_GATE,
    items: data ?? [],
  });
}
