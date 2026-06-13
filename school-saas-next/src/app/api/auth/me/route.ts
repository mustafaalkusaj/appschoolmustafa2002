import { NextResponse } from "next/server";

import { findSessionUserById } from "@/lib/admin-repository";
import { getSessionFromRequest } from "@/lib/auth-session";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const freshUser = await findSessionUserById(session.id);
  return NextResponse.json({ user: freshUser }, { status: 200 });
}
