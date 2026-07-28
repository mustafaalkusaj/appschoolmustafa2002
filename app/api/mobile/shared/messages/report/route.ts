import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { enforceRateLimit } from "@/lib/rate-limit";

// Generated database types are updated after migrations are applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reportsTable(client: unknown): any {
  return (client as { from: (table: string) => unknown }).from(
    "messaging_reports",
  );
}

function unavailableStatus(error: { code?: string } | null | undefined) {
  return error?.code === "42P01" ? 503 : 500;
}

export async function POST(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const limited = await enforceRateLimit(req, {
      namespace: "mobile-message-report",
      windowMs: 60 * 60_000,
      maxHits: 10,
      identifier: context.value.authUserId,
    });
    if (limited) return limited;

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const conversationId =
      typeof body?.conversation_id === "string"
        ? body.conversation_id.trim()
        : "";
    const messageId =
      typeof body?.message_id === "string" ? body.message_id.trim() : "";
    const reason =
      typeof body?.reason === "string" ? body.reason.trim().slice(0, 80) : "";
    const details =
      typeof body?.details === "string"
        ? body.details.trim().slice(0, 1000)
        : "";

    if (!conversationId || !reason) {
      return NextResponse.json(
        { ok: false, error: "المحادثة وسبب البلاغ مطلوبان." },
        { status: 400 },
      );
    }

    const { serviceSupabase, authUserId, schoolId } = context.value;
    const [conversation, participant, peers, message] = await Promise.all([
      serviceSupabase
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("school_id", schoolId)
        .maybeSingle(),
      serviceSupabase
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("user_id", authUserId)
        .maybeSingle(),
      serviceSupabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", authUserId),
      messageId
        ? serviceSupabase
            .from("messages")
            .select("id, sender_id, body, created_at")
            .eq("id", messageId)
            .eq("conversation_id", conversationId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (
      conversation.error ||
      participant.error ||
      peers.error ||
      message.error
    ) {
      return NextResponse.json(
        { ok: false, error: "تعذر التحقق من البلاغ." },
        { status: 500 },
      );
    }
    if (
      !conversation.data ||
      !participant.data ||
      (messageId && !message.data)
    ) {
      return NextResponse.json(
        { ok: false, error: "لا تملك صلاحية الإبلاغ عن هذا المحتوى." },
        { status: 403 },
      );
    }

    const reportedUserId =
      message.data?.sender_id ?? peers.data?.[0]?.user_id ?? null;
    if (reportedUserId === authUserId) {
      return NextResponse.json(
        { ok: false, error: "لا يمكن الإبلاغ عن رسالتك أنت." },
        { status: 400 },
      );
    }

    const { data, error } = await reportsTable(serviceSupabase)
      .insert({
        school_id: schoolId,
        reporter_user_id: authUserId,
        conversation_id: conversationId,
        message_id: messageId || null,
        reported_user_id: reportedUserId,
        message_body_snapshot:
          typeof message.data?.body === "string"
            ? message.data.body.slice(0, 5000)
            : null,
        message_created_at_snapshot: message.data?.created_at ?? null,
        reason,
        details: details || null,
      })
      .select("id, status, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "تعذر تسجيل البلاغ." },
        { status: unavailableStatus(error) },
      );
    }
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
