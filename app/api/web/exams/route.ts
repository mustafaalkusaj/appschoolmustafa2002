import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { toBaghdadTimestamp } from "@/lib/tz";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "super_admin", "employee"] as const;
const MANAGE_ROLES = ["admin", "super_admin", "employee"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const schoolIdParam = request.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolIdParam,
    { allowedRoles: [...ALLOWED_ROLES], roleDeniedMessage: "ليس لديك صلاحية الوصول إلى الامتحانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const { searchParams } = request.nextUrl;
  const subject = searchParams.get("subject");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "50")));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = actorSupabase
    .from("exams")
    .select(
      "id, school_id, title, type, subject, class_name, total_marks, starts_at, ends_at, created_by, created_at",
      { count: "exact" },
    )
    .eq("school_id", targetSchoolId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (subject) query = query.eq("subject", subject);

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [], page, limit, total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });
  }

  const context = await resolveSchoolScopedActorContext(
    body.schoolId ?? null,
    { allowedRoles: [...MANAGE_ROLES], roleDeniedMessage: "ليس لديك صلاحية إدارة الامتحانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId, actorUserId } = context.value;
  const { data, error } = await actorSupabase
    .from("exams")
    .insert({
      school_id: targetSchoolId,
      title: body.title,
      type: body.type ?? null,
      subject: body.subject ?? null,
      class_name: body.class_name ?? null,
      total_marks: body.total_marks ?? null,
      starts_at: toBaghdadTimestamp(body.starts_at),
      ends_at: toBaghdadTimestamp(body.ends_at),
      created_by: actorUserId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
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
    { allowedRoles: [...MANAGE_ROLES], roleDeniedMessage: "ليس لديك صلاحية إدارة الامتحانات." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;

  // Reject deletion if the exam has any attempts/submissions to prevent data loss.
  const { count: attemptCount, error: countError } = await actorSupabase
    .from("exam_attempts")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", id);

  if (countError) {
    return NextResponse.json({ ok: false, error: countError.message }, { status: 500 });
  }

  if ((attemptCount ?? 0) > 0) {
    return NextResponse.json(
      { ok: false, error: "لا يمكن حذف الامتحان لأنه يحتوي على محاولات مسجّلة." },
      { status: 409 },
    );
  }

  const { error } = await actorSupabase.from("exams").delete().eq("id", id).eq("school_id", targetSchoolId);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
