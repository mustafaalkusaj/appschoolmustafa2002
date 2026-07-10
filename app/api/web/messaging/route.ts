import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "super_admin", "employee"] as const;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

// conversation_participants.role and messages.sender_role are CHECK-constrained
// to admin|teacher|parent. Map every app role onto that set (staff → admin,
// guardians → parent) so inserts never violate the constraint.
function mapMessagingRole(role: string | null | undefined): "admin" | "teacher" | "parent" {
  const normalized = (role ?? "").trim().toLowerCase();
  if (normalized === "teacher") return "teacher";
  if (normalized === "parent" || normalized === "guardian" || normalized === "student") return "parent";
  return "admin";
}

async function fetchMessagingProfiles(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, { name: string; role: "admin" | "teacher" | "parent" }>> {
  const map = new Map<string, { name: string; role: "admin" | "teacher" | "parent" }>();
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("managed_user_profiles")
    .select("auth_user_id, full_name, role")
    .in("auth_user_id", ids);
  for (const p of data ?? []) {
    const row = p as { auth_user_id?: string | null; full_name?: string | null; role?: string | null };
    if (row.auth_user_id) {
      map.set(row.auth_user_id, {
        name: (row.full_name ?? "").trim() || "—",
        role: mapMessagingRole(row.role),
      });
    }
  }
  return map;
}

async function isParticipant(supabase: SupabaseClient, conversationId: string, userId: string) {
  const { data } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

// GET ?threadId=... -> messages of a thread (caller must be a participant)
// GET (no threadId)  -> inbox: conversations the caller participates in
export async function GET(request: NextRequest) {
  const schoolIdParam = request.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolIdParam,
    { allowedRoles: [...ALLOWED_ROLES], roleDeniedMessage: "ليس لديك صلاحية الوصول إلى الرسائل." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  const threadId = request.nextUrl.searchParams.get("threadId");

  if (threadId) {
    if (!(await isParticipant(actorSupabase, threadId, actorUserId))) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { data: conversation } = await actorSupabase
      .from("conversations")
      .select("id, school_id, title, created_at")
      .eq("id", threadId)
      .single();

    const { data: messages, error } = await actorSupabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at, read_at")
      .eq("conversation_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, conversation, items: messages ?? [] });
  }

  // Inbox
  const { data: parts, error: partsError } = await actorSupabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", actorUserId);

  if (partsError) {
    return NextResponse.json({ ok: false, error: partsError.message }, { status: 500 });
  }

  const ids = (parts ?? []).map((p) => p.conversation_id);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const { data: conversations, error } = await actorSupabase
    .from("conversations")
    .select("id, school_id, title, created_at")
    .in("id", ids)
    .eq("school_id", targetSchoolId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const [lastMessagesResult, participantsResult] = await Promise.all([
    actorSupabase
      .from("messages")
      .select("conversation_id, body, created_at, sender_id")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false }),
    actorSupabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", ids)
      .neq("user_id", actorUserId),
  ]);

  const lastByConv = new Map<string, { body: string; created_at: string; sender_id: string | null }>();
  for (const m of lastMessagesResult.data ?? []) {
    if (!lastByConv.has(m.conversation_id)) {
      lastByConv.set(m.conversation_id, { body: m.body, created_at: m.created_at, sender_id: m.sender_id });
    }
  }

  // Build a map of conversationId -> first other participant userId
  const otherParticipantByConv = new Map<string, string>();
  for (const p of participantsResult.data ?? []) {
    if (!otherParticipantByConv.has(p.conversation_id)) {
      otherParticipantByConv.set(p.conversation_id, p.user_id);
    }
  }

  // Resolve participant names in batch
  const otherUserIds = Array.from(new Set(otherParticipantByConv.values()));
  const nameByUserId = new Map<string, string>();
  if (otherUserIds.length > 0) {
    const { data: profiles } = await actorSupabase
      .from("managed_user_profiles")
      .select("auth_user_id, full_name")
      .in("auth_user_id", otherUserIds);
    for (const p of profiles ?? []) {
      if (p.auth_user_id && p.full_name) nameByUserId.set(p.auth_user_id, p.full_name);
    }
  }

  const items = (conversations ?? []).map((c) => {
    const otherUserId = otherParticipantByConv.get(c.id);
    const participantName = otherUserId ? (nameByUserId.get(otherUserId) ?? null) : null;
    return {
      ...c,
      display_name: participantName ?? c.title ?? "محادثة",
      last_message: lastByConv.get(c.id) ?? null,
    };
  });

  return NextResponse.json({ ok: true, items });
}

// POST with { body, threadId }                 -> send a message into an existing thread
// POST with { body, participantIds[], title? } -> create a conversation then send first message
export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, {
    namespace: "messaging:send",
    maxHits: 30,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

  const reqBody = await request.json().catch(() => null);
  if (!reqBody?.body || typeof reqBody.body !== "string" || !reqBody.body.trim()) {
    return NextResponse.json({ ok: false, error: "body is required" }, { status: 400 });
  }
  if (reqBody.body.length > 5000) {
    return NextResponse.json({ ok: false, error: "body too long (max 5000)" }, { status: 400 });
  }

  const context = await resolveSchoolScopedActorContext(
    reqBody.schoolId ?? null,
    { allowedRoles: [...ALLOWED_ROLES], roleDeniedMessage: "ليس لديك صلاحية إرسال الرسائل." },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { actorUserId, targetSchoolId } = context.value;
  const serviceSupabase = createServiceSupabaseClient();
  let conversationId: string | null = reqBody.threadId ?? null;

  // Resolve the sender's display name + role (messages.sender_name/sender_role
  // are NOT NULL; sender_role is CHECK-constrained to admin|teacher|parent).
  const actorProfileMap = await fetchMessagingProfiles(serviceSupabase, [actorUserId]);
  const actorProfile = actorProfileMap.get(actorUserId) ?? { name: "—", role: "admin" as const };

  if (conversationId) {
    if (!(await isParticipant(serviceSupabase, conversationId, actorUserId))) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const { data: thread } = await serviceSupabase
      .from("conversations")
      .select("id, school_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!thread || (thread as { school_id?: string }).school_id !== targetSchoolId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  } else {
    const participantIds: string[] = Array.isArray(reqBody.participantIds) ? reqBody.participantIds : [];
    const uniqueParticipants = Array.from(new Set([actorUserId, ...participantIds].filter(Boolean)));
    if (uniqueParticipants.length < 2) {
      return NextResponse.json(
        { ok: false, error: "participantIds must include at least one other user" },
        { status: 400 },
      );
    }

    const otherIds = uniqueParticipants.filter((id) => id !== actorUserId);
    if (otherIds.length > 0) {
      const { data: verified } = await serviceSupabase
        .from("managed_user_profiles")
        .select("auth_user_id")
        .in("auth_user_id", otherIds)
        .eq("school_id", targetSchoolId);
      const verifiedSet = new Set((verified ?? []).map((r: { auth_user_id: string }) => r.auth_user_id));
      const invalid = otherIds.filter((id) => !verifiedSet.has(id));
      if (invalid.length > 0) {
        return NextResponse.json(
          { ok: false, error: "بعض المشاركين لا ينتمون لهذه المدرسة." },
          { status: 403 },
        );
      }
    }

    const { data: conv, error: convError } = await serviceSupabase
      .from("conversations")
      .insert({
        school_id: targetSchoolId,
        type: "direct",
        subject: typeof reqBody.title === "string" && reqBody.title.trim() ? reqBody.title.trim() : null,
        created_by: actorUserId,
      })
      .select("id")
      .single();

    if (convError || !conv) {
      return NextResponse.json({ ok: false, error: convError?.message ?? "failed to create" }, { status: 500 });
    }
    conversationId = conv.id;

    const participantProfiles = await fetchMessagingProfiles(serviceSupabase, uniqueParticipants);
    const { error: partError } = await serviceSupabase
      .from("conversation_participants")
      .insert(
        uniqueParticipants.map((uid) => {
          const profile = uid === actorUserId ? actorProfile : participantProfiles.get(uid);
          return {
            conversation_id: conv.id,
            user_id: uid,
            role: profile?.role ?? "admin",
            display_name: profile?.name ?? "—",
          };
        }),
      );
    if (partError) {
      return NextResponse.json({ ok: false, error: partError.message }, { status: 500 });
    }
  }

  const { data: message, error } = await serviceSupabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: actorUserId,
      sender_name: actorProfile.name,
      sender_role: actorProfile.role,
      body: reqBody.body.trim(),
    })
    .select("id, conversation_id, sender_id, body, created_at, read_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, threadId: conversationId, item: message }, { status: 201 });
}
