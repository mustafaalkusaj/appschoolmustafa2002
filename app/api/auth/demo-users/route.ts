import { NextResponse } from "next/server";

import { getDemoUsersForLogin } from "@/lib/mock-data";

export async function GET() {
  console.log("[demo-users] GET called");

  // Only return demo users in development
  if (process.env.NODE_ENV !== "development") {
    console.log("[demo-users] Production detected, returning empty users list");
    return NextResponse.json({ users: [] }, { status: 200 });
  }

  try {
    const users = getDemoUsersForLogin();
    console.log("[demo-users] Users loaded:", users.length);
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("[demo-users] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load demo users" },
      { status: 500 }
    );
  }
}