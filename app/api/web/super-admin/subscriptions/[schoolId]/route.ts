import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return jsonError("معرف المدرسة غير صالح.", 400);
  }

  const { dataSupabase } = context.value;
  const [{ data: school, error: schoolError }, { data: latestSubscription, error: subscriptionLookupError }] =
    await Promise.all([
      dataSupabase
        .from("schools")
        .select("id, plan")
        .eq("id", normalizedSchoolId)
        .maybeSingle(),
      dataSupabase
        .from("subscriptions")
        .select("id, plan, end_date")
        .eq("school_id", normalizedSchoolId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (schoolError || !school?.id) {
    return jsonError("المدرسة المطلوبة غير موجودة.", 404);
  }

  if (subscriptionLookupError) {
    return jsonError(subscriptionLookupError.message || "تعذر الوصول إلى الاشتراك الحالي.", 500);
  }

  // Extend from existing end_date if still in the future; otherwise extend from today.
  // This preserves unused subscription time and never deletes user data.
  const now = Date.now();
  const existingEndMs = latestSubscription?.end_date
    ? new Date(latestSubscription.end_date).getTime()
    : 0;
  const baseMs = existingEndMs > now ? existingEndMs : now;
  const endDate = new Date(baseMs + 365 * DAY_IN_MS).toISOString().split("T")[0];
  const startDate = new Date().toISOString().split("T")[0];

  const response = latestSubscription?.id
    ? await dataSupabase
        .from("subscriptions")
        .update({ status: "active", end_date: endDate })
        .eq("id", latestSubscription.id)
        .eq("school_id", normalizedSchoolId)
        .select("id, school_id, plan, status, start_date, end_date, created_at")
        .single()
    : await dataSupabase
        .from("subscriptions")
        .insert({
          school_id: normalizedSchoolId,
          plan: latestSubscription?.plan ?? school.plan ?? "basic",
          status: "active",
          start_date: startDate,
          end_date: endDate,
        })
        .select("id, school_id, plan, status, start_date, end_date, created_at")
        .single();

  if (response.error || !response.data) {
    return jsonError(response.error?.message || "تعذر تجديد الاشتراك.", 500);
  }

  return NextResponse.json({
    ok: true,
    subscription: response.data,
    created: !latestSubscription?.id,
  });
}
