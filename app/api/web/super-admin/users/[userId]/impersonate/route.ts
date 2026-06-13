import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { enforceRateLimit, getRateLimitClientIp } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit/audit-log";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const rateLimited = await enforceRateLimit(req, {
    namespace: "super-admin-impersonate",
    windowMs: 60 * 60_000,
    maxHits: 5,
    identifier: getRateLimitClientIp(req),
  });
  if (rateLimited) {
    return rateLimited;
  }

  const { userId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return jsonError("معرف المستخدم غير صالح.", 400);
  }

  const { dataSupabase } = context.value;

  const { data: userProfile, error: profileError } = await dataSupabase
    .from("user_profiles")
    .select("email")
    .eq("id", normalizedUserId)
    .maybeSingle();

  if (profileError || !userProfile?.email) {
    return jsonError("تعذر العثور على بريد المستخدم الإلكتروني.", 404);
  }

  try {
    const serviceSupabase = createServiceSupabaseClient();
    const { data, error } = await serviceSupabase.auth.admin.generateLink({
      type: "magiclink",
      email: userProfile.email,
    });

    if (error) {
      return jsonError(error.message || "تعذر توليد رابط تسجيل الدخول.", 500);
    }

    const link = data?.properties?.action_link;
    if (!link) {
      return jsonError("تعذر استرداد رابط تسجيل الدخول.", 500);
    }

    // Audit log: record impersonation action
    await writeAuditLog({
      actor_user_id: context.value.actorUserId,
      actor_role: "super_admin",
      actor_source: "app",
      action_type: "impersonate",
      entity_type: "user",
      entity_id: normalizedUserId,
      summary: `Super admin impersonated user ${userProfile.email}`,
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    });

    const res = NextResponse.json({ ok: true, link, email: userProfile.email });
    res.headers.set("Cache-Control", "no-store, no-cache");
    return res;
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "تعذر توليد رابط التسجيل.",
      500,
    );
  }
}
