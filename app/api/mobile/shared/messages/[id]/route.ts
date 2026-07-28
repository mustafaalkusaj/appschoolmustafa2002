import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

type Params = { params: Promise<{ id: string }> };

async function authorizeConversation(req: NextRequest, conversationId: string) {
  const context = await resolveMobileRouteContext(req);
  if (context.ok === false) return context;

  const { serviceSupabase, schoolId, authUserId } = context.value;
  const [conversation, participant] = await Promise.all([
    serviceSupabase
      .from("conversations")
      .select("id, school_id, title, subject")
      .eq("id", conversationId)
      .eq("school_id", schoolId)
      .maybeSingle(),
    serviceSupabase
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", authUserId)
      .maybeSingle(),
  ]);

  if (conversation.error || participant.error) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "تعذر التحقق من المحادثة." },
        { status: 500 },
      ),
    };
  }

  if (!conversation.data || !participant.data) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "المحادثة غير موجودة." },
        { status: 404 },
      ),
    };
  }

  return {
    ok: true as const,
    context: context.value,
    conversation: conversation.data,
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authorized = await authorizeConversation(req, id);
    if (authorized.ok === false) return authorized.response;

    const { serviceSupabase } = authorized.context;
    const [messages, participants] = await Promise.all([
      serviceSupabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at, read_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .limit(500),
      serviceSupabase
        .from("conversation_participants")
        .select("user_id, role, display_name")
        .eq("conversation_id", id),
    ]);

    if (messages.error || participants.error) {
      return NextResponse.json(
        { ok: false, error: "تعذر تحميل المحادثة." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      conversation: authorized.conversation,
      participants: participants.data ?? [],
      items: messages.data ?? [],
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const authorized = await authorizeConversation(req, id);
    if (authorized.ok === false) return authorized.response;

    const { serviceSupabase, authUserId } = authorized.context;
    const readAt = new Date().toISOString();
    const [participantUpdate, messageUpdate] = await Promise.all([
      serviceSupabase
        .from("conversation_participants")
        .update({ last_read_at: readAt })
        .eq("conversation_id", id)
        .eq("user_id", authUserId),
      serviceSupabase
        .from("messages")
        .update({ read_at: readAt })
        .eq("conversation_id", id)
        .neq("sender_id", authUserId)
        .is("read_at", null),
    ]);

    if (participantUpdate.error || messageUpdate.error) {
      return NextResponse.json(
        { ok: false, error: "تعذر تحديث حالة القراءة." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data: { read_at: readAt } });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
