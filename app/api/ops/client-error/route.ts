import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { captureOpsError } from "@/lib/ops/error-capture";

// Hard limit on accepted payload size
const MAX_PAYLOAD_BYTES = 4096;

export async function POST(req: NextRequest) {
  // Rate limit: 10 client errors per minute per IP
  const rateLimitResponse = await enforceRateLimit(req, {
    namespace: "ops:client-error",
    windowMs: 60_000,
    maxHits: 10,
  });
  if (rateLimitResponse) return rateLimitResponse;

  // Reject oversized payloads before parsing
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: "payload_too_large" },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  let rawText: string;
  try {
    rawText = await req.text();
  } catch {
    return NextResponse.json(
      { ok: false, error: "read_error" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (rawText.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: "payload_too_large" },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const b = body as Record<string, unknown>;

  // Extract and clamp all fields — no raw stack traces accepted from client
  const page_url =
    typeof b.page_url === "string" ? b.page_url.slice(0, 500) : undefined;
  const action =
    typeof b.action === "string" ? b.action.slice(0, 200) : undefined;
  const error_message =
    typeof b.error_message === "string"
      ? b.error_message.slice(0, 500)
      : "client error";
  const user_role =
    typeof b.user_role === "string" ? b.user_role.slice(0, 50) : undefined;
  const school_id =
    typeof b.school_id === "string" ? b.school_id.slice(0, 64) : undefined;
  const branch_id =
    typeof b.branch_id === "string" ? b.branch_id.slice(0, 64) : undefined;
  const status_code =
    typeof b.status_code === "number" &&
    b.status_code >= 100 &&
    b.status_code < 600
      ? b.status_code
      : undefined;
  const user_agent =
    req.headers.get("user-agent")?.slice(0, 300) ?? undefined;

  // Capture — fire and forget; response never waits for DB
  captureOpsError({
    source: "frontend",
    page_url,
    action,
    error_message,
    user_role,
    school_id,
    branch_id,
    status_code,
    user_agent,
    // No stack — never accept stack trace from client
  }).catch(() => { /* fire-and-forget: DB capture failure must not block the 200 response */ });

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
