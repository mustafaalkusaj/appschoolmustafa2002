import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { enforceRateLimit } from "@/lib/rate-limit";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

// GET /api/web/admin/parent-links?schoolId=xxx
// Returns all parent_student_links for the school with student name + parent email
export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "ربط أولياء الأمور متاح للمشرفين فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "parent-links-get",
    windowMs: 60_000,
    maxHits: 60,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  try {
    const adminSb = createServiceSupabaseClient();

    const { data: links, error } = await adminSb
      .from("parent_student_links")
      .select(
        `
        id,
        parent_user_id,
        student_id,
        students ( id, first_name, last_name )
      `,
      )
      .eq("school_id", targetSchoolId)
      .order("id", { ascending: false });

    if (error) throw error;

    // Fetch parent emails from auth.users via admin API
    const { data: usersData } = await adminSb.auth.admin.listUsers({ perPage: 1000 });
    const usersById = Object.fromEntries((usersData?.users ?? []).map((u) => [u.id, u.email]));

    const result = (links ?? []).map((link) => {
      const student = link.students as { id: string; first_name: string; last_name: string } | null;
      return {
        id: link.id,
        parent_user_id: link.parent_user_id,
        parent_email: usersById[link.parent_user_id] ?? "—",
        student_id: link.student_id,
        student_name: student ? `${student.first_name} ${student.last_name}` : "—",
      };
    });

    return NextResponse.json({ ok: true, links: result });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "تعذر تحميل الروابط.", 500);
  }
}

// POST /api/web/admin/parent-links
// Body: { parent_email: string, student_id: string, schoolId: string }
export async function POST(req: NextRequest) {
  let body: { parent_email?: string; student_id?: string; schoolId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("طلب غير صالح.", 400);
  }

  const { parent_email, student_id, schoolId } = body;
  if (!parent_email || !student_id || !schoolId) {
    return jsonError("يجب توفير بريد ولي الأمر ومعرف الطالب.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "ربط أولياء الأمور متاح للمشرفين فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "parent-links-post",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  try {
    const adminSb = createServiceSupabaseClient();

    // Find user by email
    const { data: usersData } = await adminSb.auth.admin.listUsers({ perPage: 1000 });
    const user = (usersData?.users ?? []).find(
      (u) => u.email?.toLowerCase() === parent_email.toLowerCase(),
    );

    if (!user) {
      return jsonError("لم يتم العثور على مستخدم بهذا البريد الإلكتروني.", 404);
    }

    // Verify student belongs to this school
    const { data: student, error: studentError } = await adminSb
      .from("students")
      .select("id")
      .eq("id", student_id)
      .eq("school_id", targetSchoolId)
      .single();

    if (studentError || !student) {
      return jsonError("الطالب غير موجود أو لا ينتمي إلى هذه المدرسة.", 404);
    }

    // Check for duplicate
    const { data: existing } = await adminSb
      .from("parent_student_links")
      .select("id")
      .eq("parent_user_id", user.id)
      .eq("student_id", student_id)
      .eq("school_id", targetSchoolId)
      .maybeSingle();

    if (existing) {
      return jsonError("الرابط موجود مسبقاً.", 409);
    }

    const { data: inserted, error: insertError } = await adminSb
      .from("parent_student_links")
      .insert({ parent_user_id: user.id, student_id, school_id: targetSchoolId })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ ok: true, id: inserted.id });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "فشل إنشاء الرابط.", 500);
  }
}

// DELETE /api/web/admin/parent-links
// Body: { link_id: string, schoolId: string }
export async function DELETE(req: NextRequest) {
  let body: { link_id?: string; schoolId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("طلب غير صالح.", 400);
  }

  const { link_id, schoolId } = body;
  if (!link_id || !schoolId) {
    return jsonError("يجب توفير معرف الرابط.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "ربط أولياء الأمور متاح للمشرفين فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorUserId, targetSchoolId } = context.value;
  const rateLimited = await enforceRateLimit(req, {
    namespace: "parent-links-delete",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  try {
    const adminSb = createServiceSupabaseClient();

    const { error } = await adminSb
      .from("parent_student_links")
      .delete()
      .eq("id", link_id)
      .eq("school_id", targetSchoolId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "فشل حذف الرابط.", 500);
  }
}
