import { NextRequest, NextResponse } from "next/server";

import { saveOpsAlert } from "@/lib/ops/health-monitor";
import { sendOpsNotification } from "@/lib/ops/notifier";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function notFound() {
  return NextResponse.json(
    { ok: false, message: "Not found." },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const tokenAuthorized = isOpsTokenAuthorized(request, [process.env.OPS_ALERT_TOKEN]);

  if (!tokenAuthorized) {
    // Also accept super_admin session (for Ops Dashboard button)
    const authContext = await resolveSuperAdminActorContext(
      request.headers.get("authorization"),
    );
    if (!authContext.ok) {
      return notFound();
    }
  }

  const testMessage = "اختبار تنبيهات school-iraq.com — Telegram/Email/Ops Monitor";
  const testTitle = "اختبار تنبيهات school-iraq.com";

  const result = await sendOpsNotification({
    title: testTitle,
    message: testMessage,
    severity: "info",
  });

  const primaryChannel =
    result.telegram.status === "sent"
      ? "telegram"
      : result.email.status === "sent"
        ? "email"
        : result.whatsapp.status === "sent"
          ? "whatsapp"
          : "none";

  let alertPersistence: { saved: boolean; error: string | null } = {
    saved: false,
    error: null,
  };

  try {
    await saveOpsAlert({
      type: "notification_test",
      severity: "info",
      title: "Notification test",
      message: testMessage,
      sent_to: null,
      sent_via: primaryChannel,
      sent_status:
        primaryChannel !== "none" ? "sent" : "skipped",
      metadata: {
        telegram: result.telegram,
        email: result.email,
        whatsapp: result.whatsapp,
      },
    });
    alertPersistence = { saved: true, error: null };
  } catch (error) {
    alertPersistence = {
      saved: false,
      error: error instanceof Error ? error.message : "Failed to save ops alert",
    };
  }

  return NextResponse.json(
    {
      ok: true,
      sent: primaryChannel !== "none",
      primaryChannel,
      notifications: result,
      alertPersistence,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
