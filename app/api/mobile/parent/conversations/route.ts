import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContextAny } from "@/lib/mobile-api-admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * POST /api/mobile/parent/conversations
 *
 * Find-or-create a direct conversation between the authenticated parent and a
 * teacher. Returns { ok, conversation_id } that resolves in the shared thread
 * screen (which reads `conversations` by id + `conversation_participants` by
 * user_id — see mobile lib/messaging.ts).
 *
 * Body: { teacher_auth_user_id: string, teacher_name?: string }
 */
export async function POST(req: NextRequest) {
  const context = await resolveMobileRouteContextAny(req);
  if (!context.ok) return context.response;

  const { serviceSupabase, schoolId, authUserId, role } = context.value;

  const body = await req.json().catch(() => null);
  const teacherAuthUserId = normalizeText(
    body && typeof body === "object"
      ? (body as Record<string, unknown>).teacher_auth_user_id
      : null,
  );
  const teacherName =
    normalizeText(
      body && typeof body === "object"
        ? (body as Record<string, unknown>).teacher_name
        : null,
    ) ?? "المعلم";

  if (!teacherAuthUserId) {
    return jsonError("معرّف المعلم مطلوب.", 422);
  }

  if (teacherAuthUserId === authUserId) {
    return jsonError("لا يمكن بدء محادثة مع نفسك.", 422);
  }

  // 1) Find an existing direct conversation containing BOTH participants,
  //    scoped to this school.
  const { data: myParticipations, error: myPartError } = await serviceSupabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", authUserId);

  if (myPartError) {
    return jsonError(
      `تعذر فتح المحادثة: ${myPartError.message}`,
      500,
    );
  }

  const myConversationIds = Array.from(
    new Set(
      (myParticipations ?? [])
        .map((row) =>
          typeof row.conversation_id === "string" ? row.conversation_id : null,
        )
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (myConversationIds.length > 0) {
    // Which of my conversations also include the teacher?
    const { data: sharedRows, error: sharedError } = await serviceSupabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", teacherAuthUserId)
      .in("conversation_id", myConversationIds);

    if (sharedError) {
      return jsonError(`تعذر فتح المحادثة: ${sharedError.message}`, 500);
    }

    const sharedIds = (sharedRows ?? [])
      .map((row) =>
        typeof row.conversation_id === "string" ? row.conversation_id : null,
      )
      .filter((id): id is string => Boolean(id));

    if (sharedIds.length > 0) {
      // Confirm the conversation is a direct thread in this school. Prefer the
      // most recently created match.
      const { data: existing } = await serviceSupabase
        .from("conversations")
        .select("id")
        .in("id", sharedIds)
        .eq("school_id", schoolId)
        .eq("type", "direct")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing && typeof existing.id === "string") {
        return NextResponse.json({ ok: true, conversation_id: existing.id });
      }
    }
  }

  // 2) Create a new direct conversation + two participants.
  const parentDisplayName = "ولي الأمر";

  const { data: created, error: createError } = await serviceSupabase
    .from("conversations")
    .insert({
      school_id: schoolId,
      type: "direct",
      title: teacherName,
      created_by: authUserId,
    })
    .select("id")
    .single();

  if (createError || !created?.id || typeof created.id !== "string") {
    return jsonError(
      `تعذر إنشاء المحادثة${createError ? `: ${createError.message}` : "."}`,
      500,
    );
  }

  const conversationId = created.id;

  const { error: participantsError } = await serviceSupabase
    .from("conversation_participants")
    .insert([
      {
        conversation_id: conversationId,
        user_id: authUserId,
        role,
        display_name: parentDisplayName,
      },
      {
        conversation_id: conversationId,
        user_id: teacherAuthUserId,
        role: "teacher",
        display_name: teacherName,
      },
    ]);

  if (participantsError) {
    // Roll back the orphaned conversation so we don't leave a half-created
    // thread the parent can't actually use.
    await serviceSupabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    return jsonError(
      `تعذر إضافة المشاركين للمحادثة: ${participantsError.message}`,
      500,
    );
  }

  return NextResponse.json({ ok: true, conversation_id: conversationId });
}
