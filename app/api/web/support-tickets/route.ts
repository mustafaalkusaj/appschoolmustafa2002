import { NextRequest, NextResponse } from "next/server";

import { sendTelegramMessage } from "@/lib/ops/telegram";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";
import {
  createRouteSupabaseClient,
  createServiceSupabaseClient,
  getRouteAuthenticatedUser,
} from "@/lib/supabase-server";

const MAX_MESSAGE_LENGTH = 1000;

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: { message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

// POST /api/web/support-tickets — create a support ticket (any authenticated user)
export async function POST(request: NextRequest) {
  const actorSupabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await getRouteAuthenticatedUser(
    actorSupabase,
    request.headers.get("authorization"),
  );

  if (authError || !user?.id) {
    return jsonError("يجب تسجيل الدخول أولاً.", 401);
  }

  // Rate limit: 3 per 10 minutes per user
  const rateLimitResult = await enforceRateLimit(request, {
    namespace: "support-tickets",
    windowMs: 10 * 60 * 1000,
    maxHits: 3,
    identifier: user.id,
  });
  if (rateLimitResult) return rateLimitResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Invalid request body.", 400);
  }

  const { message, page_url } = body as Record<string, unknown>;

  if (typeof message !== "string" || !message.trim()) {
    return jsonError("message مطلوب.", 400);
  }

  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    return jsonError(
      `الرسالة طويلة جداً. الحد الأقصى ${MAX_MESSAGE_LENGTH} حرف.`,
      400,
    );
  }

  // Try to get school_id and branch_id from user profile
  let schoolId: string | null = null;
  let branchId: string | null = null;

  try {
    const { data: profile } = await actorSupabase
      .from("user_profiles")
      .select("school_id, branch_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      schoolId =
        typeof profile.school_id === "string" ? profile.school_id : null;
      branchId =
        typeof profile.branch_id === "string" ? profile.branch_id : null;
    }
  } catch {
    // ignore — school_id and branch_id are optional
  }

  const safePageUrl =
    typeof page_url === "string"
      ? page_url.slice(0, 500)
      : null;

  const serviceSupabase = createServiceSupabaseClient();
  const { data: ticket, error: insertError } = await serviceSupabase
    .from("support_tickets")
    .insert({
      school_id: schoolId,
      branch_id: branchId,
      user_id: user.id,
      page_url: safePageUrl,
      message: message.trim().slice(0, MAX_MESSAGE_LENGTH),
      metadata: {},
    })
    .select("id")
    .single();

  if (insertError) {
    return jsonError(insertError.message, 500);
  }

  // Telegram alert — fire and forget
  const tgMsg = [
    "🎫 <b>طلب دعم جديد</b>",
    "",
    `المستخدم: [${user.id.slice(0, 8)}]`,
    schoolId ? `المدرسة: [masked]` : null,
    safePageUrl ? `الصفحة: ${safePageUrl}` : null,
    "",
    `الرسالة: ${message.trim().slice(0, 300)}`,
  ]
    .filter(Boolean)
    .join("\n");

  sendTelegramMessage(tgMsg).catch(() => { /* fire-and-forget: alert failure must not block the ticket response */ });

  return NextResponse.json(
    { ok: true, id: ticket.id },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// GET /api/web/support-tickets — list tickets (super_admin only)
export async function GET(request: NextRequest) {
  const context = await resolveSuperAdminActorContext(
    request.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "غير مصرح.",
      "status" in context ? context.status : 401,
    );
  }

  const rawLimit = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(
    100,
    Math.max(1, parseInt(rawLimit ?? "50", 10) || 50),
  );

  const serviceSupabase = createServiceSupabaseClient();
  const { data, error } = await serviceSupabase
    .from("support_tickets")
    .select("id, created_at, status, school_id, branch_id, user_id, page_url, message, metadata")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json(
    { ok: true, tickets: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
