import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, userId } = ctx;

  // 1. Get all conversation IDs the student participates in
  const { data: participantRows, error: partErr } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (partErr) {
    return NextResponse.json(
      { ok: false, error: "failed to load conversations" },
      { status: 500 },
    );
  }

  const conversationIds = (participantRows ?? []).map(
    (r: Record<string, unknown>) => r.conversation_id as string,
  );

  if (conversationIds.length === 0) {
    return NextResponse.json({ ok: true, data: [] });
  }

  // 2. Batch-fetch conversations
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, title")
    .in("id", conversationIds);

  // 3. Batch-fetch all participants for these conversations (to find "other" names)
  const { data: allParticipants } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", conversationIds);

  // Collect other-user IDs
  const otherUserIds = Array.from(new Set(
    (allParticipants ?? [])
      .filter((p: Record<string, unknown>) => p.user_id !== userId)
      .map((p: Record<string, unknown>) => p.user_id as string),
  ));

  // 4. Fetch names for other participants from user_profiles
  let profileMap: Record<string, string> = {};
  if (otherUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, full_name")
      .in("id", otherUserIds);

    profileMap = (profiles ?? []).reduce<Record<string, string>>(
      (acc, p: Record<string, unknown>) => {
        acc[p.id as string] = (p.full_name as string) ?? "";
        return acc;
      },
      {},
    );
  }

  // 5. Batch-fetch the latest message per conversation using a single query
  //    ordered by created_at desc, then pick the first per conversation in JS
  const { data: recentMessages } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at, read_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  // Build per-conversation: last message + unread count
  const lastMessageMap: Record<
    string,
    { body: string; created_at: string }
  > = {};
  const unreadCountMap: Record<string, number> = {};

  for (const msg of (recentMessages ?? []) as Record<string, unknown>[]) {
    const cid = msg.conversation_id as string;

    // Track last message (first occurrence per conversation since sorted desc)
    if (!lastMessageMap[cid]) {
      lastMessageMap[cid] = {
        body: (msg.body as string) ?? "",
        created_at: (msg.created_at as string) ?? "",
      };
    }

    // Count unread: messages from others that haven't been read
    if (msg.sender_id !== userId && msg.read_at == null) {
      unreadCountMap[cid] = (unreadCountMap[cid] ?? 0) + 1;
    }
  }

  // 6. Build the threads response
  const convMap = (conversations ?? []).reduce<
    Record<string, string>
  >((acc, c: Record<string, unknown>) => {
    acc[c.id as string] = (c.title as string) ?? "";
    return acc;
  }, {});

  // Map conversation_id -> other participant names
  const otherNamesMap: Record<string, string[]> = {};
  for (const p of (allParticipants ?? []) as Record<string, unknown>[]) {
    if (p.user_id === userId) continue;
    const cid = p.conversation_id as string;
    const name = profileMap[p.user_id as string] ?? "";
    if (!otherNamesMap[cid]) otherNamesMap[cid] = [];
    if (name) otherNamesMap[cid].push(name);
  }

  const threads = conversationIds.map((cid) => ({
    id: cid,
    title: convMap[cid] ?? "",
    lastMessage: lastMessageMap[cid]?.body ?? "",
    lastMessageAt: lastMessageMap[cid]?.created_at ?? "",
    otherParticipantName: (otherNamesMap[cid] ?? []).join(", ") || "",
    unreadCount: unreadCountMap[cid] ?? 0,
  }));

  // Sort by most recent message first
  threads.sort((a, b) => {
    if (!a.lastMessageAt && !b.lastMessageAt) return 0;
    if (!a.lastMessageAt) return 1;
    if (!b.lastMessageAt) return -1;
    return b.lastMessageAt.localeCompare(a.lastMessageAt);
  });

  return NextResponse.json({ ok: true, data: threads });
}
