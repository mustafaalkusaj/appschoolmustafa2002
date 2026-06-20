import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabaseClient, getRouteAuthenticatedUser } from "@/lib/supabase-server";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";
import { enforceRateLimit } from "@/lib/rate-limit";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

/**
 * GET /api/web/parent/dashboard
 *
 * Returns a read-only summary for the authenticated parent:
 * linked student(s) with grades, attendance, payments, and behavior.
 */
export async function GET(req: NextRequest) {
  try {
    const rl = await enforceRateLimit(req, { namespace: "parent-dashboard", maxHits: 30, windowMs: 60_000 });
    if (rl) return rl;

    const supabase = await createRouteSupabaseClient();
    const { data: { user }, error: userError } = await getRouteAuthenticatedUser(supabase, req.headers.get("authorization"));
    if (userError || !user?.id) {
      return jsonError("يجب تسجيل الدخول أولاً.", 401);
    }

    const rbacToken = req.cookies.get(RBAC_COOKIE_NAME)?.value;
    const rbac = await verifyRBACSession(rbacToken);
    if (!rbac || rbac.role !== "parent") {
      return jsonError("هذه الصفحة مخصصة لولي الأمر فقط.", 403);
    }

    const schoolId = rbac.schoolId;
    if (!schoolId) {
      return jsonError("لا توجد مدرسة مرتبطة.", 400);
    }

    // Find linked students via parent_student_links
    const { data: links, error: linksError } = await supabase
      .from("parent_student_links")
      .select("student_id")
      .eq("parent_user_id", user.id)
      .eq("school_id", schoolId);

    if (linksError) {
      return jsonError("خطأ في جلب بيانات الطلاب المرتبطين.", 500);
    }

    const studentIds = (links ?? []).map((l: { student_id: string }) => l.student_id);

    if (studentIds.length === 0) {
      return NextResponse.json({
        ok: true,
        students: [],
        message: "لا يوجد طلاب مرتبطين بحسابك.",
      });
    }

    // Fetch student records
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, class_name, section, phone, status, total_fee, paid_fee, remaining_fee, discount_value")
      .in("id", studentIds)
      .eq("school_id", schoolId);

    // Fetch latest grades for linked students
    const { data: grades } = await supabase
      .from("grade_entries")
      .select("id, student_id, subject, score, max_score, grade_type_id, created_at")
      .in("student_id", studentIds)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch attendance summary (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: attendance } = await supabase
      .from("attendance")
      .select("id, student_id, status, date")
      .in("student_id", studentIds)
      .eq("school_id", schoolId)
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

    // Fetch recent payments
    const { data: payments } = await supabase
      .from("payments")
      .select("id, student_id, amount, payment_method, created_at, receipt_number")
      .in("student_id", studentIds)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch recent behavior records
    const { data: behavior } = await supabase
      .from("behavior_records")
      .select("id, student_id, type, category, description, points, created_at")
      .in("student_id", studentIds)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Build per-student attendance stats
    const attendanceStats = studentIds.map((sid: string) => {
      const records = (attendance ?? []).filter((a: { student_id: string }) => a.student_id === sid);
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
