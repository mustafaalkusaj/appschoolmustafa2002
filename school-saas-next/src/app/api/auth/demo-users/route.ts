import { NextResponse } from "next/server";

import { getDemoLoginUsers } from "@/lib/admin-repository";

export async function GET() {
  const users = await getDemoLoginUsers();
  return NextResponse.json({ users }, { status: 200 });
}
