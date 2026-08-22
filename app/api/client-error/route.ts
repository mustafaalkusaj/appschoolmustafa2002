import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.error("[CLIENT_ERROR]", JSON.stringify(body, null, 2));
  } catch {
    console.error("[CLIENT_ERROR] Failed to parse body");
  }
  return NextResponse.json({ ok: true });
}
