import { NextRequest, NextResponse } from "next/server";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const routeSupabase = await createRouteSupabaseClient();
    const authResult = await getRouteAuthenticatedUser(
      routeSupabase,
      req.headers.get("authorization"),
    );

    if (authResult.error || !authResult.data.user?.id) {
      return NextResponse.json(
        { ok: false, error: "يجب تسجيل الدخول أولاً." },
        { status: 401 },
      );
    }

    const serviceSupabase = createServiceSupabaseClient();
    const { data: links, error: linksError } = await serviceSupabase
      .from("parent_student_links")
      .select("student_id, school_id")
      .eq("parent_user_id", authResult.data.user.id);

    if (linksError) {
      return NextResponse.json(
        { ok: false, error: "خطأ في جلب بيانات الطلاب." },
        { status: 500 },
      );
    }

    let studentIds: string[];
    let schoolId: string;

    if (links && links.length > 0) {
      studentIds = (links as Array<{ student_id: string }>).map(
        (l) => l.student_id,
      );
      schoolId = (links[0] as { school_id: string }).school_id;
    } else {
      const { data: mp } = await serviceSupabase
        .from("managed_user_profiles")
        .select("student_id, school_id")
        .eq("auth_user_id", authResult.data.user.id)
        .not("student_id", "is", null)
        .maybeSingle();
      if (!mp?.student_id || !mp?.school_id) {
        return NextResponse.json({ ok: true, exams: [] });
      }
      studentIds = [mp.student_id];
      schoolId = mp.school_id;
    }

    const { data, error } = await serviceSupabase
      .from("exam_attempts")
      .select(
        "id, student_id, score, submitted_at, status, exams!inner(id, title, subject, total_marks, starts_at)",
      )
      .in("student_id", studentIds)
      .eq("school_id", schoolId)
      .order("submitted_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "تعذر تحميل نتائج الاختبارات." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, exams: data ?? [] });
  } catch {
    return NextResponse.json(
      { ok: false, error: "خطأ داخلي في الخادم." },
      { status: 500 },
    );
  }
}
