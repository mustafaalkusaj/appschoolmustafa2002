import { NextRequest, NextResponse } from "next/server";

import { resolveAdminMobileRouteContext } from "@/lib/mobile-admin-server";

// Generated database types are updated after migrations are applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reportsTable(client: unknown): any {
  return (client as { from: (table: string) => unknown }).from(
    "messaging_reports",
  );
}

export async function GET(req: NextRequest) {
  try {
    const context = await resolveAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const status = req.nextUrl.searchParams.get("status")?.trim() || "open";
    const allowedStatuses = new Set([
      "open",
      "reviewing",
      "resolved",
      "dismissed",
      "all",
    ]);
    if (!allowedStatuses.has(status)) {
      return NextResponse.json(
        { ok: false, error: "حالة البلاغ غير صالحة." },
        { status: 400 },
      );
    }

    let query = reportsTable(context.value.serviceSupabase)
      .select(
        "id, conversation_id, message_id, reporter_user_id, reported_user_id, reason, details, status, reviewed_at, resolution_note, created_at",
      )
      .eq("school_id", context.value.schoolId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { ok: false, error: "تعذر تحميل بلاغات المحتوى." },
        { status: 500 },
      );
    }

    const reports = (data ?? []) as Record<string, unknown>[];
    const messageIds = reports
      .map((report) => report.message_id)
      .filter((id): id is string => typeof id === "string");
    const messages = messageIds.length
      ? await context.value.serviceSupabase
          .from("messages")
          .select("id, body, sender_name, sender_role, created_at")
          .in("id", messageIds)
      : { data: [], error: null };
    const messageById = new Map(
      (messages.data ?? []).map((message) => [message.id, message]),
    );

    return NextResponse.json({
      ok: true,
      items: reports.map((report) => ({
        ...report,
        message:
          typeof report.message_id === "string"
            ? (messageById.get(report.message_id) ?? null)
            : null,
      })),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
