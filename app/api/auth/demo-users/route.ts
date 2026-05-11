import { NextResponse } from "next/server";

import { getDemoUsersForLogin } from "@/lib/mock-data";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ users: [] }, { status: 200 });
  }

  try {
    const users = getDemoUsersForLogin();
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("[demo-users] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load demo users" },
      { status: 500 }
    );
  }
}