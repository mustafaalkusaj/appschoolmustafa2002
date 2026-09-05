import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { sendPushNotification } from "@/lib/push-notifications";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const context = await resolveSchoolScopedActorContext(
    searchParams.get("schoolId"),
    {
      allowedRoles: ["admin", "super_admin"],
      roleDeniedMessage: "ليس لديك صلاحية عرض الواجبات.",
    },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { targetSchoolId } = context.value;
  const svc = createServiceSupabaseClient();

  const { data, error } = await svc
    .from("assignments")
    .select("id, title, description, class_name, subject, due_at, content_kind, created_at")
    .eq("school_id", targetSchoolId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.class_name || !body?.subject) {
    return NextResponse.json(
      { ok: false, error: "title, class_name, and subject are required" },
      { status: 400 },
    );
  }

  const context = await resolveSchoolScopedActorContext(
    body.schoolId ?? null,
    {
      allowedRoles: ["admin", "super_admin"],
      roleDeniedMessage: "ليس لديك صلاحية إضافة الواجبات.",
    },
    request.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { targetSchoolId, actorBranchId } = context.value;
  const svc = createServiceSupabaseClient();

  const { data, error } = await svc
    .from("assignments")
    .insert({
      title: body.title,
      description: body.description ?? null,
      class_name: body.class_name,
      subject: body.subject,
      due_at: body.due_at ?? null,
      content_kind: body.content_kind ?? "homework",
      school_id: targetSchoolId,
      branch_id: actorBranchId ?? null,
    })
    .select("id, title, class_name, subject, due_at, created_at")
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  try {
    const { data: students } = await svc
      .from("managed_user_profiles")
      .select("auth_user_id")
      .eq("school_id", targetSchoolId)
      .eq("role", "student")
      .eq("class_name", body.class_name)
      .eq("is_active", true);

    const studentIds = (students ?? [])
      .map((s) => s.auth_user_id as string)
      .filter(Boolean);

    if (studentIds.length > 0) {
      await sendPushNotification(svc, {
        schoolId: targetSchoolId,
        branchId: actorBranchId ?? null,
        userIds: studentIds,
        type: "assignment",
        title: "📝 واجب جديد",
        message: `${body.title} — ${body.subject}`,
        link: "/student/assignments",
        metadata: { assignmentId: data.id },
        recipientRole: "student",
      });
    }
  } catch {
    // notification failure should not block assignment creation
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
