import { NextResponse } from "next/server";

import { findSessionUserById } from "@/lib/admin-repository";
import { defaultCookieOptions, serializeSession, SESSION_COOKIE } from "@/lib/auth-session";
import { isSubscriptionExpired } from "@/lib/saas";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string };
    if (!body.userId) {
      return NextResponse.json({ code: "missing_user_id" }, { status: 400 });
    }

    const sessionUser = await findSessionUserById(body.userId);
    if (!sessionUser) {
      return NextResponse.json({ code: "user_not_found" }, { status: 404 });
    }

    if (sessionUser.status === "blocked") {
      return NextResponse.json({ code: "user_blocked" }, { status: 403 });
    }

    if (
      sessionUser.role !== "super_admin" &&
      (sessionUser.schoolStatus !== "active" ||
        (sessionUser.subscriptionExpiresAt && isSubscriptionExpired(sessionUser.subscriptionExpiresAt)))
    ) {
      return NextResponse.json(
        { code: "subscription_inactive" },
        { status: 403 },
      );
    }

    const response = NextResponse.json({ user: sessionUser }, { status: 200 });
    response.cookies.set(SESSION_COOKIE, serializeSession(sessionUser), defaultCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ code: "invalid_request" }, { status: 400 });
  }
}
