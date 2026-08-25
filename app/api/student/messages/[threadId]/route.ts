import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

interface RouteParams {
  params: Promise<{ threadId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, userId } = ctx;
  const { threadId } = await params;

  // 1. Verify the student is a participant in this conversation
  const { data: membership } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", threadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  // 2. Fetch all messages in the conversation
  const { data: messages, error: msgErr } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("conversation_id", threadId)
    .order("created_at", { ascending: true });

  if (msgErr) {
    return NextResponse.json(
      { ok: false, error: "failed to load messages" },
      { status: 500 },
    );
  }

  // 3. Collect sender IDs for name lookup
  const senderIds = Array.from(new Set(
    (messages ?? []).map(
      (m: Record<string, unknown>) => m.sender_id as string,
    ),
  ));

  let senderNameMap: Record<string, string> = {};
  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .in("id", senderIds);

    senderNameMap = (profiles ?? []).reduce<Record<string, string>>(
      (acc, p: Record<string, unknown>) => {
        acc[p.id as string] = (p.full_name as string) ?? "";
        return acc;
      },
      {},
    );
  }

  // 4. Mark unread messages from others as read
  const unreadIds = (messages ?? [])
    .filter(
      (m: Record<string, unknown>) =>
        m.sender_id !== userId && m.read_at == null,
    )
    .map((m: Record<string, unknown>) => m.id as string);

  if (unreadIds.length > 0) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  // 5. Build response
  const data = (messages ?? []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    senderId: m.sender_id as string,
    senderName: senderNameMap[m.sender_id as string] ?? "",
    body: (m.body as string) ?? "",
    createdAt: (m.created_at as string) ?? "",
    isOwn: m.sender_id === userId,
  }));

  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, userId } = ctx;
  const { threadId } = await params;

  // 1. Verify the student is a participant
  const { data: membership } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", threadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  // 2. Parse and validate body
  let body: string;
  try {
    const json = await req.json();
    body = typeof json.body === "string" ? json.body.trim() : "";
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 },
    );
  }

  if (!body) {
    return NextResponse.json(
      { ok: false, error: "message body is required" },
      { status: 400 },
    );
  }

  // 3. Insert the new message
  const { data: newMsg, error: insertErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: threadId,
      sender_id: userId,
      sender_name: "",
      sender_role: "student",
      body,
    })
    .select("id, sender_id, body, created_at")
    .single();

  if (insertErr || !newMsg) {
    return NextResponse.json(
      { ok: false, error: "failed to send message" },
      { status: 500 },
    );
  }

  const msg = newMsg as Record<string, unknown>;

  return NextResponse.json({
    ok: true,
    data: {
      id: msg.id as string,
      senderId: msg.sender_id as string,
      body: msg.body as string,
      createdAt: msg.created_at as string,
      isOwn: true,
    },
  });
}
