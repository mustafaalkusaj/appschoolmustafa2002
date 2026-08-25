import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";

interface AnnouncementRow {
  id: string;
  title: string;
  body: string | null;
  kind: string | null;
  link_url: string | null;
  author_name: string | null;
  created_at: string;
}

interface AppNotificationRow {
  id: string;
  type: string | null;
  title: string | null;
  message: string | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface NotificationItem {
  id: string;
  source: "announcement" | "notification";
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  author_name: string | null;
  status: string | null;
  created_at: string;
}

export async function GET(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  const { supabase, userId, schoolId } = ctx;

  const [announcementsRes, notificationsRes] = await Promise.all([
    supabase
      .from("announcements")
      .select(
        "id, title, body, kind, link_url, author_name, created_at",
      )
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("app_notifications")
      .select(
        "id, type, title, message, status, metadata, created_at",
      )
      .eq("school_id", schoolId)
      .or(`recipient_user_id.eq.${userId},recipient_role.eq.student`)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (announcementsRes.error && notificationsRes.error) {
    return NextResponse.json(
      { ok: false, error: "fetch_failed" },
      { status: 500 },
    );
  }

  const announcements = (announcementsRes.data ?? []) as AnnouncementRow[];
  const appNotifications =
    (notificationsRes.data ?? []) as AppNotificationRow[];

  const merged: NotificationItem[] = [
    ...announcements.map(
      (a): NotificationItem => ({
        id: a.id,
        source: "announcement",
        type: a.kind ?? "announcement",
        title: a.title,
        body: a.body,
        link_url: a.link_url,
        author_name: a.author_name,
        status: null,
        created_at: a.created_at,
      }),
    ),
    ...appNotifications.map(
      (n): NotificationItem => ({
        id: n.id,
        source: "notification",
        type: n.type ?? "general",
        title: n.title ?? "",
        body: n.message,
        link_url: null,
        author_name: null,
        status: n.status,
        created_at: n.created_at,
      }),
    ),
  ];

  merged.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return NextResponse.json({ ok: true, data: merged });
}
