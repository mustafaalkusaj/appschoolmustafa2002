import { NextRequest, NextResponse } from "next/server";

import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

interface CreateConversationBody {
  teacher_auth_user_id: string;
  teacher_name: string;
}

/**
 * POST /api/mobile/parent/conversations
 *
 * Creates (or returns existing) a direct-message conversation between
 * the authenticated parent and a specific teacher.
 *
 * Body: { teacher_auth_user_id: string, teacher_name: string }
 * Returns: { ok: true, conversation_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const routeSupabase = await createRouteSupabaseClient();
    const authResult = await getRouteAuthenticatedUser(
      routeSupabase,
      req.headers.get("authorization"),
    );

    if (authResult.error || !authResult.data.user?.id) {
      return jsonError("يجب تسجيل الدخول أولاً.", 401);
    }

    const parentUserId = authResult.data.user.id;

    let body: CreateConversationBody;
    try {
      body = (await req.json()) as CreateConversationBody;
    } catch {
      return jsonError("البيانات المرسلة غير صحيحة.", 400);
    }

    const { teacher_auth_user_id, teacher_name } = body;

    if (!teacher_auth_user_id || typeof teacher_auth_user_id !== "string") {
      return jsonError("teacher_auth_user_id مطلوب.", 400);
    }

    const serviceSupabase = createServiceSupabaseClient();

    // 1. Resolve school from parent_student_links or managed_user_profiles
    const { data: links } = await serviceSupabase
      .from("parent_student_links")
      .select("school_id")
      .eq("parent_user_id", parentUserId)
      .limit(1)
      .maybeSingle();

    let schoolId: string;

    if (links) {
      schoolId = (links as { school_id: string }).school_id;
    } else {
      const { data: mp } = await serviceSupabase
        .from("managed_user_profiles")
        .select("school_id")
        .eq("auth_user_id", parentUserId)
        .not("school_id", "is", null)
        .maybeSingle();
      if (!mp?.school_id) {
        return jsonError("لا يوجد ربط بمدرسة لحساب ولي الأمر.", 403);
      }
      schoolId = mp.school_id;
    }

    const { data: teacher } = await serviceSupabase
      .from("teachers")
      .select("id, auth_user_id")
      .eq("auth_user_id", teacher_auth_user_id)
      .eq("school_id", schoolId)
      .limit(1)
      .single();

    if (!teacher) {
      return jsonError("المعلم غير موجود في هذه المدرسة.", 404);
    }

    // 2. Check if a conversation already exists between these two users
    //    Find conversations where parent is a participant
    const { data: parentParticipations } = await serviceSupabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", parentUserId)
      .eq("school_id", schoolId);

    if (parentParticipations && parentParticipations.length > 0) {
      const parentConvIds = (parentParticipations as Array<{ conversation_id: string }>)
        .map((p) => p.conversation_id);

      // Find if teacher is also in any of those conversations
      const { data: overlap } = await serviceSupabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", teacher_auth_user_id)
        .in("conversation_id", parentConvIds)
        .limit(1)
        .single();

      if (overlap) {
        return NextResponse.json({
          ok: true,
          conversation_id: (overlap as { conversation_id: string }).conversation_id,
          created: false,
        });
      }
    }

    // 3. Create new conversation + add both participants
    const { data: newConversation, error: convError } = await serviceSupabase
      .from("conversations")
      .insert({
        school_id: schoolId,
        title: teacher_name ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select("id")
      .single();

    if (convError || !newConversation) {
      return jsonError("فشل إنشاء المحادثة.", 500);
    }

    const conversationId = (newConversation as { id: string }).id;

    const { error: participantsError } = await serviceSupabase
      .from("conversation_participants")
      .insert([
        {
          conversation_id: conversationId,
          user_id: parentUserId,
          school_id: schoolId,
          role: "parent",
        },
        {
          conversation_id: conversationId,
          user_id: teacher_auth_user_id,
          school_id: schoolId,
          role: "teacher",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any);

    if (participantsError) {
      // Clean up the orphaned conversation
      await serviceSupabase.from("conversations").delete().eq("id", conversationId);
      return jsonError("فشل إضافة المشاركين للمحادثة.", 500);
    }

    return NextResponse.json({
      ok: true,
      conversation_id: conversationId,
      created: true,
    });
  } catch {
    return jsonError("خطأ داخلي في الخادم.", 500);
  }
}
