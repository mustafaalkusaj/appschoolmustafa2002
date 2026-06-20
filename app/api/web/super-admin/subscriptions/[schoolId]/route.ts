import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const VALID_PLANS = ["basic", "premium", "enterprise"] as const;
const VALID_STATUSES = ["active", "suspended", "inactive", "expired"] as const;
type SchoolPlan = typeof VALID_PLANS[number];
type SubscriptionStatus = typeof VALID_STATUSES[number];

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
        .select("id, plan")
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

  const endDate = new Date(Date.now() + 365 * DAY_IN_MS).toISOString().split("T")[0];
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

export async function PATCH(
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("طلب غير صالح.", 400);
  }

  const parsed = body as { plan?: string; start_date?: string | null; end_date?: string | null; status?: string };
  const plan: SchoolPlan | undefined = (VALID_PLANS as readonly string[]).includes(parsed.plan ?? "") ? parsed.plan as SchoolPlan : undefined;
  const status: SubscriptionStatus | undefined = (VALID_STATUSES as readonly string[]).includes(parsed.status ?? "") ? parsed.status as SubscriptionStatus : undefined;

  if (!plan && !status && parsed.end_date === undefined && parsed.start_date === undefined) {
    return jsonError("يجب تحديد حقل واحد على الأقل للتحديث.", 400);
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (parsed.end_date !== undefined && parsed.end_date !== null && !DATE_RE.test(parsed.end_date)) {
    return jsonError("end_date يجب أن يكون بصيغة YYYY-MM-DD أو null.", 400);
  }
  if (parsed.start_date !== undefined && parsed.start_date !== null && !DATE_RE.test(parsed.start_date)) {
    return jsonError("start_date يجب أن يكون بصيغة YYYY-MM-DD أو null.", 400);
  }

  const { dataSupabase } = context.value;

  const { data: latestSub, error: lookupError } = await dataSupabase
    .from("subscriptions")
    .select("id")
    .eq("school_id", normalizedSchoolId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    return jsonError(lookupError.message || "تعذر الوصول إلى الاشتراك.", 500);
  }

  if (!latestSub?.id) {
    return jsonError("لا يوجد اشتراك لهذه المدرسة.", 404);
  }

  const updatePayload: Record<string, unknown> = {};
  if (plan) updatePayload.plan = plan;
  if (status) updatePayload.status = status;
  if (parsed.start_date !== undefined) updatePayload.start_date = parsed.start_date || null;
  if (parsed.end_date !== undefined) updatePayload.end_date = parsed.end_date || null;

  const { data, error } = await dataSupabase
    .from("subscriptions")
    .update(updatePayload)
    .eq("id", latestSub.id)
    .eq("school_id", normalizedSchoolId)
    .select("id, school_id, plan, status, start_date, end_date, created_at")
    .single();

  if (error || !data) {
    return jsonError(error?.message || "تعذر تحديث الاشتراك.", 500);
  }

  return NextResponse.json({ ok: true, subscription: data });
}
