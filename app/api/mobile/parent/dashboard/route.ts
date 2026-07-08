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
 * GET /api/mobile/parent/dashboard
 *
 * Mobile-safe version of /api/web/parent/dashboard.
 * Authenticates via Authorization header (Bearer JWT) instead of RBAC cookies,
 * so it works with the mobile app's mobileApiRequest helper.
 *
 * Returns linked students with grades, attendance stats, payments, and behavior.
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

    const authUserId = authResult.data.user.id;
    const serviceSupabase = createServiceSupabaseClient();

    // Resolve school_id from parent_student_links — parents may not have a
    // managed_user_profiles row, so we derive the school from their links.
    const { data: links, error: linksError } = await serviceSupabase
      .from("parent_student_links")
      .select("student_id, school_id")
      .eq("parent_user_id", authUserId);

    if (linksError) {
      return jsonError("خطأ في جلب بيانات الطلاب المرتبطين.", 500);
    }

    let schoolId: string;
    let studentIds: string[];

    if (links && links.length > 0) {
      schoolId = (links[0] as { school_id: string }).school_id;
      studentIds = (links as Array<{ student_id: string }>).map((l) => l.student_id);
    } else {
      // Fallback: student viewing their own data in parent/guardian mode
      const { data: managedProfile } = await serviceSupabase
        .from("managed_user_profiles")
        .select("student_id, school_id")
        .eq("auth_user_id", authUserId)
        .not("student_id", "is", null)
        .maybeSingle();

      if (!managedProfile?.student_id || !managedProfile?.school_id) {
        return NextResponse.json({
          ok: true,
          students: [],
          grades: [],
          attendance_stats: [],
          payments: [],
          behavior: [],
          message: "لا يوجد طلاب مرتبطين بحسابك.",
        });
      }

      schoolId = managedProfile.school_id;
      studentIds = [managedProfile.student_id];
    }

    // Fetch all data in parallel.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const [
      { data: students },
      { data: grades },
      { data: attendance },
      { data: payments },
      { data: behavior },
    ] = await Promise.all([
      serviceSupabase
        .from("students")
        .select("id, full_name, class_name, section, phone, status, total_fee, paid_fee, remaining_fee, discount_value")
        .in("id", studentIds)
        .eq("school_id", schoolId),

      serviceSupabase
        .from("grade_entries")
        .select("id, student_id, subject, score, max_score, grade_type_id, created_at")
        .in("student_id", studentIds)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(20),

      serviceSupabase
        .from("attendance")
        .select("id, student_id, status, date")
        .in("student_id", studentIds)
        .eq("school_id", schoolId)
        .gte("date", thirtyDaysAgoStr),

      serviceSupabase
        .from("payments")
        .select("id, student_id, amount, payment_method, created_at, receipt_number")
        .in("student_id", studentIds)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(10),

      serviceSupabase
        .from("behavior_records")
        .select("id, student_id, type, category, description, points, created_at")
        .in("student_id", studentIds)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Build per-student attendance stats.
    const attendanceStats = studentIds.map((sid: string) => {
      const records = (attendance ?? []).filter(
        (a: { student_id: string }) => a.student_id === sid,
      );
      const total = records.length;
      const present = records.filter((a: { status: string }) => a.status === "present").length;
      const absent = records.filter((a: { status: string }) => a.status === "absent").length;
      const late = records.filter((a: { status: string }) => a.status === "late").length;
      return {
        student_id: sid,
        total,
        present,
        absent,
        late,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });

    return NextResponse.json({
      ok: true,
      students: students ?? [],
      grades: grades ?? [],
      attendance_stats: attendanceStats,
      payments: payments ?? [],
      behavior: behavior ?? [],
    });
  } catch {
    return jsonError("خطأ داخلي في الخادم.", 500);
  }
}
