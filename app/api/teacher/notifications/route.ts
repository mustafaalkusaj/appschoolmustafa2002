import { NextRequest, NextResponse } from "next/server";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, userId, schoolId } = ctx;

  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, type, is_read, link, created_at")
    .eq("user_id", userId)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: (data ?? []) as Record<string, unknown>[],
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  const { supabase, userId, schoolId } = ctx;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 },
    );
  }

  const id = body.id as string | undefined;
  const isRead = body.is_read as boolean | undefined;

  if (!id || typeof isRead !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "missing_id_or_is_read" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: isRead })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("school_id", schoolId);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: { id, is_read: isRead } });
}
