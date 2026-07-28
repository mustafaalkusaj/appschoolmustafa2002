import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { sendTelegramMessage } from "@/lib/ops/telegram";
import { enforceRateLimit } from "@/lib/rate-limit";

// Generated database types are updated after migrations are applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deletionRequestsTable(client: unknown): any {
  return (client as { from: (table: string) => unknown }).from(
    "account_deletion_requests",
  );
}

function unavailableStatus(error: { code?: string } | null | undefined) {
  return error?.code === "42P01" ? 503 : 500;
}

/**
 * Mobile account-deletion request. Any authenticated role (teacher, student,
 * parent) can file one. Writes into the same `support_tickets` table + admin
 * Telegram alert pipeline already used by the web dashboard's support-ticket
 * flow, so requests land in a real, reviewed inbox instead of a bare audit-log
 * row nobody reads. Deletion is manual/reviewed on purpose — a self-serve
 * hard-delete from an unauthenticated-adjacent mobile endpoint is not safe for
 * a multi-tenant school system with linked financial/academic records.
 */
export async function POST(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { serviceSupabase, schoolId, authUserId, account } = context.value;

    const limited = await enforceRateLimit(req, {
      namespace: "mobile-account-deletion",
      windowMs: 24 * 60 * 60_000,
      maxHits: 3,
      identifier: authUserId,
    });
    if (limited) return limited;

    const body = (await req.json().catch(() => null)) as {
      reason?: string;
    } | null;
    const reason =
      typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";

    const requesterName = account.profile.full_name ?? "مستخدم";
    const requesterRole = account.identity.role ?? "unknown";

    const existing = await deletionRequestsTable(serviceSupabase)
      .select("id, status, requested_at")
      .eq("auth_user_id", authUserId)
      .in("status", ["pending", "in_review", "verified"])
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json(
        { ok: false, error: "تعذر التحقق من طلب الحذف." },
        { status: unavailableStatus(existing.error) },
      );
    }
    if (existing.data) {
      return NextResponse.json({
        ok: true,
        data: existing.data,
        message: "لديك طلب حذف قيد المراجعة بالفعل.",
      });
    }

    const { data: deletionRequest, error: requestError } =
      await deletionRequestsTable(serviceSupabase)
        .insert({
          auth_user_id: authUserId,
          school_id: schoolId,
          reason: reason || null,
          metadata: { requester_role: requesterRole, source: "mobile" },
        })
        .select("id, status, requested_at")
        .single();

    if (requestError || !deletionRequest) {
      return NextResponse.json(
        { ok: false, error: "تعذر إرسال طلب الحذف." },
        { status: unavailableStatus(requestError) },
      );
    }

    const { error: ticketError } = await serviceSupabase
      .from("support_tickets")
      .insert({
        school_id: schoolId,
        user_id: authUserId,
        message: reason ? `طلب حذف حساب — السبب: ${reason}` : "طلب حذف حساب",
        metadata: {
          kind: "account_deletion",
          deletion_request_id: deletionRequest.id,
          requester_role: requesterRole,
          source: "mobile",
        },
      });

    if (ticketError) {
      await deletionRequestsTable(serviceSupabase)
        .delete()
        .eq("id", deletionRequest.id);
      return NextResponse.json(
        { ok: false, error: "تعذر إنشاء تذكرة متابعة لطلب الحذف." },
        { status: unavailableStatus(ticketError) },
      );
    }

    await serviceSupabase
      .from("user_push_subscriptions")
      .update({ is_active: false })
      .eq("user_id", authUserId)
      .eq("school_id", schoolId);

    const tgMsg = [
      "🗑️ <b>طلب حذف حساب</b>",
      "",
      `الدور: ${requesterRole}`,
      `الاسم: ${requesterName}`,
      reason ? `السبب: ${reason}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    sendTelegramMessage(tgMsg).catch(() => {
      /* fire-and-forget: alert failure must not block the request */
    });

    return NextResponse.json(
      { ok: true, data: deletionRequest },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "خطأ داخلي في الخادم." },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { data, error } = await deletionRequestsTable(
      context.value.serviceSupabase,
    )
      .select(
        "id, status, requested_at, verified_at, completed_at, cancelled_at, retention_deadline",
      )
      .eq("auth_user_id", context.value.authUserId)
      .eq("school_id", context.value.schoolId)
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "تعذر تحميل حالة طلب الحذف." },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, data: data ?? null });
  } catch {
    return NextResponse.json(
      { ok: false, error: "خطأ داخلي في الخادم." },
      { status: 500 },
    );
  }
}
