import { NextRequest, NextResponse } from "next/server";

import {
  resolveMobileRouteContext,
  startTeacherConversation,
} from "@/lib/mobile-api-server";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Open a direct thread between the teacher and a student's guardian (or the
 * student). Returns the conversation id to navigate to, reusing an existing
 * thread when one is already open with that peer.
 *
 * The peer is resolved server-side from the teacher's roster, so the client
 * never gets to name an arbitrary user id.
 */
export async function POST(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req, "teacher");
    if (context.ok === false) {
      return context.response;
    }

    const limited = await enforceRateLimit(req, {
      namespace: "mobile-teacher-conversation-create",
      windowMs: 60_000,
      maxHits: 20,
      identifier: context.value.authUserId,
    });
    if (limited) return limited;

    const payload = (await req.json().catch(() => null)) ?? {};
    const result = await startTeacherConversation(
      context.value,
      payload as Record<string, unknown>,
    );

    return NextResponse.json(
      {
        ok: result.ok,
        gate: result.gate,
        message: result.message,
        data: result.data ?? null,
      },
      { status: result.ok ? 200 : 400 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, gate: { available: false }, message: "حدث خطأ" },
      { status: 500 },
    );
  }
}
