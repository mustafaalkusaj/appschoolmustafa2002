import { NextRequest, NextResponse } from "next/server";

import { resolveWebUserProfile } from "@/lib/authorization/snapshot";
import { createRouteSupabaseClient, getRouteAuthenticatedUser } from "@/lib/supabase-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error,
  } = await getRouteAuthenticatedUser(supabase, req.headers.get("authorization"));

  if (error || !user?.id) {
    return jsonError("Unauthorized", 401);
  }

  const resolved = await resolveWebUserProfile(supabase, user.id).catch((resolveError) => {
    console.error("[auth/me] failed to resolve web user profile", {
      userId: user.id,
      error: resolveError,
    });
    return null;
  });

  if (!resolved) {
    return jsonError("Profile not found", 404);
  }

  return NextResponse.json({
    ok: true,
    user: resolved.profile,
    session: resolved.snapshot,
  });
}
