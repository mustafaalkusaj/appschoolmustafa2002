import { NextRequest, NextResponse } from "next/server";

import { buildManagedAppAccountContext } from "@/lib/managed-user-app-context";
import { createRouteSupabaseClient, getRouteAuthenticatedUser } from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function readUnknownErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

export async function GET(req: NextRequest) {
  try {
    const routeSupabase = await createRouteSupabaseClient();
    const authResult = await getRouteAuthenticatedUser(routeSupabase, req.headers.get("authorization"));

    if (authResult.error || !authResult.data.user?.id) {
      return jsonError("يجب تسجيل الدخول أولاً.", 401);
    }

    const account = await buildManagedAppAccountContext(authResult.data.user.id);
    if (!account.identity.role || !account.access.allowed) {
      return NextResponse.json(
        {
          ok: false,
          account,
          error: {
            message: account.access.message,
            reason: account.access.reason,
          },
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      ok: true,
      account,
    });
  } catch (error) {
    return jsonError(readUnknownErrorMessage(error, "تعذر تحميل سياق الحساب الحالي."), 500);
  }
}
