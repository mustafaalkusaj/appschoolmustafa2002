import { NextRequest, NextResponse } from "next/server";

import {
  logAdminMobileRouteError,
  resolveAdminMobileRouteContext,
} from "@/lib/mobile-admin-server";
import { sendPushNotification } from "@/lib/push-notifications";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";

type TargetScope = "school" | "branch" | "class" | "role" | "user";

interface SendBody {
  target?: { scope?: TargetScope; value?: string };
  title?: string;
  message?: string;
  type?: string;
  link?: string;
}

const VALID_SCOPES: TargetScope[] = [
  "school",
  "branch",
  "class",
  "role",
  "user",
];

function uniqueIds(values: Array<string | null>): string[] {
  return Array.from(
    new Set(
      values
        .filter((v): v is string => Boolean(v && v.trim()))
        .map((v) => v.trim()),
    ),
  );
}

async function resolveTargetUserIds(
  supabase: SupabaseClient,
  schoolId: string,
  scope: TargetScope,
  value: string | undefined,
): Promise<string[]> {
  if (scope === "user") {
    return value ? [value] : [];
  }

  if (scope === "role") {
    const role = (value ?? "").trim().toLowerCase();
    if (role === "teacher" || role === "teachers") {
      const { data } = await supabase
        .from("teachers")
        .select("auth_user_id")
        .eq("school_id", schoolId)
        .not("auth_user_id", "is", null);
      return uniqueIds(
        (data ?? []).map(
          (r) => (r as { auth_user_id: string | null }).auth_user_id,
        ),
      );
    }
    const { data } = await supabase
      .from("students")
      .select("auth_user_id")
      .eq("school_id", schoolId)
      .not("auth_user_id", "is", null);
    return uniqueIds(
      (data ?? []).map(
        (r) => (r as { auth_user_id: string | null }).auth_user_id,
      ),
    );
  }

  let query = supabase
    .from("students")
    .select("auth_user_id")
    .eq("school_id", schoolId)
    .not("auth_user_id", "is", null);

  if (scope === "branch" && value) {
    query = query.eq("branch_id", value);
  }
  if (scope === "class" && value) {
    query = query.eq("class_name", value);
  }

  const { data } = await query;
  return uniqueIds(
    (data ?? []).map(
      (r) => (r as { auth_user_id: string | null }).auth_user_id,
    ),
  );
}

export async function POST(req: NextRequest) {
  const context = await resolveAdminMobileRouteContext(req);
  if (!context.ok) return context.response;

  const { schoolId, branchId, serviceSupabase, authUserId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "notifications-send",
    windowMs: 60_000,
    maxHits: 5,
    identifier: authUserId,
  });
  if (rateLimited) return rateLimited;

  const body = (await req.json().catch(() => null)) as SendBody | null;

  const scope = body?.target?.scope;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!scope || !VALID_SCOPES.includes(scope) || !title || !message) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "target.scope (school|branch|class|role|user), title, and message are required",
      },
      { status: 400 },
    );
  }

  try {
    const userIds = await resolveTargetUserIds(
      serviceSupabase,
      schoolId,
      scope,
      body?.target?.value,
    );

    const result = await sendPushNotification(serviceSupabase, {
      schoolId,
      branchId:
        scope === "branch"
          ? (body?.target?.value ?? branchId ?? null)
          : (branchId ?? null),
      userIds,
      type:
        typeof body?.type === "string" && body.type.trim()
          ? body.type.trim()
          : "general",
      title,
      message,
      link:
        typeof body?.link === "string" && body.link.trim()
          ? body.link.trim()
          : null,
    });

    return NextResponse.json({
      ok: true,
      targeted: result.targeted,
      sent: result.sent,
      failed: result.failed,
      inAppSaved: result.inAppSaved,
      deactivatedTokens: result.deactivatedTokens,
    });
  } catch (error) {
    logAdminMobileRouteError("notifications/send", error);
    return NextResponse.json(
      { ok: false, error: "فشل إرسال الإشعارات." },
      { status: 500 },
    );
  }
}
