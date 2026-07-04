import { NextRequest, NextResponse } from "next/server";

import { createServiceSupabaseClient } from "@/lib/supabase-server";

interface CalendarEventRow {
  id: string;
  title: string | null;
  title_en: string | null;
  date: string | null;
  end_date: string | null;
  description: string | null;
  type: string | null;
}

function escapeIcsText(value: string): string {
  // RFC 5545 TEXT escaping: backslash, semicolon, comma, and newlines.
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Convert a YYYY-MM-DD date string to an ICS DATE value (YYYYMMDD). */
function toIcsDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return `${match[1]}${match[2]}${match[3]}`;
}

/** All-day VEVENT DTEND is exclusive, so it must be the day AFTER the last day. */
function nextDayIcsDate(icsDate: string): string {
  const year = Number(icsDate.slice(0, 4));
  const month = Number(icsDate.slice(4, 6));
  const day = Number(icsDate.slice(6, 8));
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const y = dt.getUTCFullYear().toString().padStart(4, "0");
  const m = (dt.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = dt.getUTCDate().toString().padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatIcsTimestamp(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  const hh = date.getUTCHours().toString().padStart(2, "0");
  const mm = date.getUTCMinutes().toString().padStart(2, "0");
  const ss = date.getUTCSeconds().toString().padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

/**
 * GET /api/mobile/shared/calendar/export?access_token=...
 *
 * Reads the session token from the QUERY STRING (the export link opens in the
 * system browser, which can't set an Authorization header), authenticates it,
 * and streams an .ics document of the school's calendar_events.
 */
export async function GET(req: NextRequest) {
  const accessToken = req.nextUrl.searchParams.get("access_token")?.trim();

  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: { message: "رمز الدخول مفقود." } },
      { status: 401 },
    );
  }

  const serviceSupabase = createServiceSupabaseClient();

  const { data: userData, error: userError } =
    await serviceSupabase.auth.getUser(accessToken);

  if (userError || !userData.user?.id) {
    return NextResponse.json(
      { ok: false, error: { message: "انتهت صلاحية الجلسة أو الرمز غير صالح." } },
      { status: 401 },
    );
  }

  const authUserId = userData.user.id;

  // Resolve the caller's school (managed profile first, legacy fallback),
  // mirroring resolveMobileRouteContextAny.
  let schoolId: string | null = null;

  const { data: profile } = await serviceSupabase
    .from("managed_user_profiles")
    .select("school_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (profile && typeof profile.school_id === "string" && profile.school_id.trim()) {
    schoolId = profile.school_id.trim();
  }

  if (!schoolId) {
    const { data: legacy } = await serviceSupabase
      .from("user_profiles")
      .select("school_id")
      .eq("id", authUserId)
      .maybeSingle();
    if (legacy && typeof legacy.school_id === "string" && legacy.school_id.trim()) {
      schoolId = legacy.school_id.trim();
    }
  }

  if (!schoolId) {
    return NextResponse.json(
      { ok: false, error: { message: "لا يوجد حساب مُدار صالح." } },
      { status: 403 },
    );
  }

  const { data, error } = await serviceSupabase
    .from("calendar_events")
    .select("id, title, title_en, date, end_date, description, type")
    .eq("school_id", schoolId)
    .order("date", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: { message: `تعذر تحميل الأحداث: ${error.message}` } },
      { status: 500 },
    );
  }

  const events = (data ?? []) as CalendarEventRow[];
  const dtstamp = formatIcsTimestamp(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//School App//Calendar Export//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
    if (!event.date) continue;
    const startDate = toIcsDate(event.date);
    if (!startDate) continue;

    const lastDay =
      event.end_date && toIcsDate(event.end_date)
        ? (toIcsDate(event.end_date) as string)
        : startDate;
    const dtEnd = nextDayIcsDate(lastDay);

    const summary = escapeIcsText(
      (event.title && event.title.trim()) ||
        (event.title_en && event.title_en.trim()) ||
        "حدث",
    );

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.id}@school-app`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${startDate}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${summary}`);
    if (event.description && event.description.trim()) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description.trim())}`);
    }
    if (event.type && event.type.trim()) {
      lines.push(`CATEGORIES:${escapeIcsText(event.type.trim())}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // RFC 5545 requires CRLF line breaks.
  const icsBody = lines.join("\r\n") + "\r\n";

  return new NextResponse(icsBody, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="school-calendar.ics"',
      "Cache-Control": "no-store",
    },
  });
}
