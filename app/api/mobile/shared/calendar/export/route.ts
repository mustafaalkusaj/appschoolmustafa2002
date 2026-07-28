import { NextRequest, NextResponse } from "next/server";
import { resolveMobileRouteContext } from "@/lib/mobile-api-server";

export const dynamic = "force-dynamic";

function escapeIcs(text: string): string {
  return text.replace(/[\\;,\n]/g, (ch) => {
    if (ch === "\n") return "\\n";
    return `\\${ch}`;
  });
}

function toIcsDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

export async function GET(req: NextRequest) {
  try {
    // Require the Authorization header. A query-param token would leak into
    // browser history, server logs and referrers, so it is not accepted.
    if (!req.headers.get("authorization")) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) {
      return context.response;
    }

    const { serviceSupabase, schoolId } = context.value;

    const { data: events, error } = await serviceSupabase
      .from("calendar_events")
      .select("id, title, date, end_date, type, description, hijri_date")
      .or(`school_id.eq.${schoolId},is_global.eq.true`)
      .order("date", { ascending: true })
      .limit(500);

    if (error || !events) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "failed" },
        { status: 500 },
      );
    }

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SchoolApp//Calendar//AR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:تقويم المدرسة",
    ];

    for (const evt of events) {
      if (!evt.date) continue;
      const uid = `${evt.id}@schoolapp.local`;
      const dtStart = toIcsDate(evt.date);
      const endDateStr = evt.end_date ?? evt.date;
      const endParts = endDateStr.split("-").map(Number);
      const endD = new Date(endParts[0], endParts[1] - 1, endParts[2] + 1);
      const dtEnd = `${endD.getFullYear()}${String(endD.getMonth() + 1).padStart(2, "0")}${String(endD.getDate()).padStart(2, "0")}`;

      const summary = escapeIcs(evt.title ?? "حدث");
      const desc = evt.description ? escapeIcs(evt.description) : "";
      const hijriNote = evt.hijri_date ? ` (${evt.hijri_date})` : "";

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:${summary}${hijriNote}`);
      if (desc) lines.push(`DESCRIPTION:${desc}`);
      lines.push(`CATEGORIES:${evt.type ?? "event"}`);
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    const icsContent = lines.join("\r\n");

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="school-calendar.ics"',
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
