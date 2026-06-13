import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth-session";

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
