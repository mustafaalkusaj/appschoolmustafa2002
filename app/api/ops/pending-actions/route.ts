import { NextRequest, NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit/audit-log";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function notFound() {
  return NextResponse.json(
    { ok: false, message: "Not found." },
    {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

async function isAuthorized(request: NextRequest): Promise<boolean> {
  if (isOpsTokenAuthorized(request, [process.env.OPS_ALERT_TOKEN])) return true;
  const authContext = await resolveSuperAdminActorContext(
    request.headers.get("authorization"),
  );
  return authContext.ok;
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) return notFound();

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("ops_pending_actions")
    .select(
      "id, created_at, expires_at, status, type, requested_by_chat_id, payload, result",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true, actions: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) return notFound();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, message: "Invalid request body." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { id, action, chat_id } = body as Record<string, unknown>;

  if (typeof id !== "string" || !id.trim()) {
    return NextResponse.json(
      { ok: false, message: "Missing required field: id" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (action !== "confirm" && action !== "cancel") {
    return NextResponse.json(
      { ok: false, message: "action must be 'confirm' or 'cancel'" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = createServiceSupabaseClient();

  const { data: pending, error: fetchError } = await supabase
    .from("ops_pending_actions")
    .select("*")
    .eq("id", id.trim())
    .eq("status", "pending")
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { ok: false, message: fetchError.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!pending) {
    return NextResponse.json(
      { ok: false, message: "Pending action not found or already processed." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (action === "cancel") {
    await supabase
      .from("ops_pending_actions")
      .update({ status: "cancelled" })
      .eq("id", id.trim());

    return NextResponse.json(
      { ok: true, message: "Action cancelled." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // action === "confirm"
  // Verify chat_id matches TELEGRAM_CHAT_ID
  const expectedChatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (expectedChatId && typeof chat_id === "string") {
    if (String(chat_id) !== String(expectedChatId)) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized chat." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  // Check not expired
  const expiresAt = new Date(pending.expires_at as string);
  if (expiresAt < new Date()) {
    await supabase
      .from("ops_pending_actions")
      .update({ status: "expired" })
      .eq("id", id.trim());

    return NextResponse.json(
      { ok: false, message: "Pending action has expired." },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Execute action based on type
  const payload = pending.payload as Record<string, unknown>;
  let result: Record<string, unknown> = {};

  try {
    if (pending.type === "add_user") {
      const email = typeof payload.email === "string" ? payload.email : null;
      const role = typeof payload.role === "string" ? payload.role : "employee";
      const fullName = typeof payload.name === "string" ? payload.name : null;
      const schoolId =
        typeof payload.school_id === "string" ? payload.school_id : null;

      if (!email) {
        return NextResponse.json(
          { ok: false, message: "Missing email in pending action payload." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }

      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role,
            school_id: schoolId,
          },
        });

      if (createError) {
        result = { error: createError.message };
      } else {
        result = { user_id: newUser?.user?.id ?? null };

        // Write audit log (fire and forget)
        writeAuditLog({
          actor_source: "api",
          action_type: "create",
          entity_type: "user",
          entity_id: newUser?.user?.id ?? undefined,
          summary: `User created via pending action confirm`,
          school_id: schoolId ?? undefined,
          metadata: { pending_action_id: id, type: "add_user" },
        }).catch(() => {});
      }
    }

    await supabase
      .from("ops_pending_actions")
      .update({ status: "confirmed", result })
      .eq("id", id.trim());

    return NextResponse.json(
      { ok: true, message: "Action confirmed.", result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message:
          err instanceof Error ? err.message : "Failed to execute pending action.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
