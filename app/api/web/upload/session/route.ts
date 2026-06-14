import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const schoolId = body?.schoolId ?? null;

  if (!schoolId) {
    return jsonError("schoolId is required.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "غير مصرح بالوصول." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "Unauthorized",
      "status" in context ? context.status : 403,
    );
  }

  const { targetSchoolId } = context.value;
  const studentId = typeof body?.studentId === "string" && body.studentId ? body.studentId : null;

  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase
    .from("upload_sessions")
    .insert({
      school_id: targetSchoolId,
      student_id: studentId,
      status: "pending",
    })
    .select("token, expires_at")
    .single();

  if (error || !data) {
    return jsonError(error?.message ?? "Failed to create upload session.", 500);
  }

  return NextResponse.json({ ok: true, token: data.token, expires_at: data.expires_at });
}
