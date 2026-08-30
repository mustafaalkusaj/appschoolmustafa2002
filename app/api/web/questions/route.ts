import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "super_admin", "employee"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const schoolIdParam = request.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolIdParam,
    {
      allowedRoles: [...ALLOWED_ROLES],
      roleDeniedMessage: "ليس لديك صلاحية الوصول إلى الأسئلة.",
    },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const { searchParams } = request.nextUrl;
  const subject = searchParams.get("subject");
  const difficulty = searchParams.get("difficulty");
  const type = searchParams.get("type");
  const limit = Math.min(
    500,
    Math.max(1, Number(searchParams.get("limit") || "200")),
  );

  let query = actorSupabase
    .from("questions")
    .select("id, prompt, type, difficulty, subject, options, answer, created_at")
    .eq("school_id", targetSchoolId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (subject) query = query.eq("subject", subject);
  if (difficulty) query = query.eq("difficulty", difficulty);
  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { ok: false, error: "invalid JSON body" },
      { status: 400 },
    );
  }

  const context = await resolveSchoolScopedActorContext(
    body.schoolId ?? null,
    {
      allowedRoles: [...ALLOWED_ROLES],
      roleDeniedMessage: "ليس لديك صلاحية إضافة أسئلة.",
    },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json(
      { ok: false, error: "prompt (نص السؤال) مطلوب" },
      { status: 400 },
    );
  }

  const record = {
    school_id: targetSchoolId,
    prompt,
    type: (body.type as string) ?? "multiple_choice",
    difficulty: (body.difficulty as string) ?? "medium",
    subject: (body.subject as string) ?? null,
    options: body.options ?? null,
    answer: (body.answer as string) ?? null,
  };

  const { data, error } = await actorSupabase
    .from("questions")
    .insert(record as never)
    .select("id, prompt, type, difficulty, subject, options, answer, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const questionId = searchParams.get("id");
  const schoolIdParam = searchParams.get("schoolId");

  if (!questionId) {
    return NextResponse.json(
      { ok: false, error: "id is required" },
      { status: 400 },
    );
  }

  const context = await resolveSchoolScopedActorContext(
    schoolIdParam,
    {
      allowedRoles: [...ALLOWED_ROLES],
      roleDeniedMessage: "ليس لديك صلاحية حذف الأسئلة.",
    },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;

  const { error } = await actorSupabase
    .from("questions")
    .delete()
    .eq("id", questionId)
    .eq("school_id", targetSchoolId);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
