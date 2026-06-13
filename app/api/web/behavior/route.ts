import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "super_admin", "employee"] as const;
const MANAGE_ROLES = ["admin", "super_admin", "employee"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const context = await resolveSchoolScopedActorContext(
    searchParams.get("schoolId"),
    { allowedRoles: [...ALLOWED_ROLES], roleDeniedMessage: "ليس لديك صلاحية عرض سجل السلوك." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const studentId = searchParams.get("studentId");
  const behaviorType = searchParams.get("type");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = actorSupabase
    .from("behavior_logs")
    .select("id, school_id, student_id, student_name, behavior_type, points, note, created_at", {
      count: "exact",
    })
    .eq("school_id", targetSchoolId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (studentId) query = query.eq("student_id", studentId);
  if (behaviorType) query = query.eq("behavior_type", behaviorType);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [], page, limit, total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.student_name || typeof body.student_name !== "string") {
    return NextResponse.json({ ok: false, error: "student_name is required" }, { status: 400 });
  }
  if (!body?.behavior_type || typeof body.behavior_type !== "string") {
    return NextResponse.json({ ok: false, error: "behavior_type is required" }, { status: 400 });
  }

  const context = await resolveSchoolScopedActorContext(
    body.schoolId ?? null,
    { allowedRoles: [...MANAGE_ROLES], roleDeniedMessage: "ليس لديك صلاحية إدارة سجل السلوك." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const points = Number.isFinite(Number(body.points)) ? Number(body.points) : 0;

  const { data, error } = await actorSupabase
    .from("behavior_logs")
    .insert({
      school_id: targetSchoolId,
      student_id: body.student_id ?? null,
      student_name: body.student_name,
      behavior_type: body.behavior_type,
      points,
      note: body.note ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Send push notification to student (fire-and-forget)
  if (body.student_id) {
    try {
      const { notifyNewBehavior } = await import("@/lib/notify-events");
      await notifyNewBehavior({
        supabase: actorSupabase,
        schoolId: targetSchoolId,
        studentId: body.student_id,
        behaviorType: body.behavior_type,
        points,
        note: body.note ?? null,
      });
    } catch {
      // notification failure must never break the main write
    }
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }

  const schoolIdParam = request.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolIdParam,
    { allowedRoles: [...MANAGE_ROLES], roleDeniedMessage: "ليس لديك صلاحية إدارة سجل السلوك." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const { error } = await actorSupabase.from("behavior_logs").delete().eq("id", id).eq("school_id", targetSchoolId);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
