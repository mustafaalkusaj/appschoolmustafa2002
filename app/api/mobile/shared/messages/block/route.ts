import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { enforceRateLimit } from "@/lib/rate-limit";

// Generated database types are updated after migrations are applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blocksTable(client: unknown): any {
  return (client as { from: (table: string) => unknown }).from(
    "messaging_blocks",
  );
}

function unavailableStatus(error: { code?: string } | null | undefined) {
  return error?.code === "42P01" ? 503 : 500;
}

async function readAndValidate(req: NextRequest) {
  const context = await resolveMobileRouteContext(req);
  if (context.ok === false) return context;

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const conversationId =
    typeof body?.conversation_id === "string"
      ? body.conversation_id.trim()
      : "";
  const blockedUserId =
    typeof body?.blocked_user_id === "string"
      ? body.blocked_user_id.trim()
      : "";
  const reason =
    typeof body?.reason === "string" ? body.reason.trim().slice(0, 250) : "";

  if (
    !conversationId ||
    !blockedUserId ||
    blockedUserId === context.value.authUserId
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "بيانات الحظر غير صالحة." },
        { status: 400 },
      ),
    };
  }

  const { serviceSupabase, schoolId, authUserId } = context.value;
  const [conversation, caller, target] = await Promise.all([
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
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", blockedUserId)
      .maybeSingle(),
  ]);

  if (conversation.error || caller.error || target.error) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "تعذر التحقق من الحظر." },
        {
          status: unavailableStatus(
            conversation.error ?? caller.error ?? target.error,
          ),
        },
      ),
    };
  }
  if (!conversation.data || !caller.data || !target.data) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "لا تملك صلاحية تنفيذ الحظر." },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const, context: context.value, blockedUserId, reason };
}

export async function POST(req: NextRequest) {
  try {
    const validated = await readAndValidate(req);
    if (validated.ok === false) return validated.response;

    const limited = await enforceRateLimit(req, {
      namespace: "mobile-message-block",
      windowMs: 60 * 60_000,
      maxHits: 20,
      identifier: validated.context.authUserId,
    });
    if (limited) return limited;

    const { data, error } = await blocksTable(validated.context.serviceSupabase)
      .upsert(
        {
          school_id: validated.context.schoolId,
          blocker_user_id: validated.context.authUserId,
          blocked_user_id: validated.blockedUserId,
          reason: validated.reason || null,
        },
        { onConflict: "school_id,blocker_user_id,blocked_user_id" },
      )
      .select("id, created_at")
      .single();

    if (error)
      return NextResponse.json(
        { ok: false, error: "تعذر تنفيذ الحظر." },
        { status: unavailableStatus(error) },
      );
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const validated = await readAndValidate(req);
    if (validated.ok === false) return validated.response;

    const { error } = await blocksTable(validated.context.serviceSupabase)
      .delete()
      .eq("school_id", validated.context.schoolId)
      .eq("blocker_user_id", validated.context.authUserId)
      .eq("blocked_user_id", validated.blockedUserId);

    if (error)
      return NextResponse.json(
        { ok: false, error: "تعذر إلغاء الحظر." },
        { status: 500 },
      );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
