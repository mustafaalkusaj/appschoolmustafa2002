import { NextRequest, NextResponse } from "next/server";

import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * GET /api/mobile/parent/teachers-list
 *
 * Returns teachers linked to the parent's children's school.
 * Used by the mobile app to let a parent start a new DM with a teacher.
 */
export async function GET(req: NextRequest) {
  try {
    const routeSupabase = await createRouteSupabaseClient();
    const authResult = await getRouteAuthenticatedUser(
      routeSupabase,
      req.headers.get("authorization"),
    );

    if (authResult.error || !authResult.data.user?.id) {
      return jsonError("يجب تسجيل الدخول أولاً.", 401);
    }

    const userId = authResult.data.user.id;
    const serviceSupabase = createServiceSupabaseClient();

    // 1. Get parent's linked students
    const { data: links, error: linksError } = await serviceSupabase
      .from("parent_student_links")
      .select("student_id, school_id")
      .eq("parent_user_id", userId);

    if (linksError) {
      return jsonError("خطأ في جلب بيانات الطلاب المرتبطين.", 500);
    }

    let schoolId: string;
    let studentIds: string[];

    if (links && links.length > 0) {
      schoolId = (links[0] as { school_id: string }).school_id;
      studentIds = (links as Array<{ student_id: string }>).map(
        (l) => l.student_id,
      );
    } else {
      const { data: mp } = await serviceSupabase
        .from("managed_user_profiles")
        .select("student_id, school_id")
        .eq("auth_user_id", authResult.data.user.id)
        .not("student_id", "is", null)
        .maybeSingle();
      if (!mp?.student_id || !mp?.school_id) {
        return NextResponse.json({ ok: true, teachers: [] });
      }
      schoolId = mp.school_id;
      studentIds = [mp.student_id];
    }

    // 2. Get class names for linked students
    const { data: students } = await serviceSupabase
      .from("students")
      .select("id, class_name")
      .in("id", studentIds)
      .eq("school_id", schoolId);

    const classNames = Array.from(
      new Set(
        (students ?? [])
          .map((s: { class_name: string | null }) => s.class_name)
          .filter(Boolean) as string[],
      ),
    );

    // 3. Get teachers for this school (filter by class if possible)
    let teachersQuery = serviceSupabase
      .from("teachers")
      .select("id, full_name, subject, auth_user_id")
      .eq("school_id", schoolId)
      .limit(50);

    if (classNames.length > 0) {
      teachersQuery = teachersQuery.in("class_name", classNames);
    }

    const { data: teachers, error: teachersError } = await teachersQuery;

    if (teachersError) {
      // Fallback: return all school teachers if class filter fails
      const { data: allTeachers } = await serviceSupabase
        .from("teachers")
        .select("id, full_name, subject, auth_user_id")
        .eq("school_id", schoolId)
        .limit(50);

      return NextResponse.json({ ok: true, teachers: allTeachers ?? [] });
    }

    return NextResponse.json({ ok: true, teachers: teachers ?? [] });
  } catch {
    return jsonError("خطأ داخلي في الخادم.", 500);
  }
}
