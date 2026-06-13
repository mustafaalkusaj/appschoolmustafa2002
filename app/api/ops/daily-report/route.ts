import { NextRequest, NextResponse } from "next/server";

import { buildOpsReport, saveOpsAlert, saveOpsReport } from "@/lib/ops/health-monitor";
import {
  buildOpsNotificationMessage,
  buildOpsTelegramHtml,
  classifyNotificationSeverity,
  sendOpsNotification,
} from "@/lib/ops/notifier";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function handle(request: NextRequest) {
  // Accept: cron secret, Vercel CRON_SECRET (auto-sent by Vercel cron), OPS_ALERT_TOKEN (for manual trigger), or super_admin session
  const tokenAuthorized = isOpsTokenAuthorized(request, [
    process.env.OPS_REPORT_CRON_SECRET,
    process.env.CRON_SECRET,
    process.env.OPS_ALERT_TOKEN,
  ]);

  if (!tokenAuthorized) {
    const authContext = await resolveSuperAdminActorContext(
      request.headers.get("authorization"),
    );
    if (!authContext.ok) {
      return unauthorized();
    }
  }

  try {
    const report = await buildOpsReport();
    let persistence: { saved: boolean; createdAt: string | null; error: string | null } = {
      saved: false,
      createdAt: null,
      error: null,
    };

    try {
      const saved = await saveOpsReport(report);
      persistence = {
        saved: true,
        createdAt: saved.createdAt,
        error: null,
      };
    } catch (error) {
      persistence = {
        saved: false,
        createdAt: null,
        error: error instanceof Error ? error.message : "Failed to save ops report",
      };
    }

    const dailyEnabled = (process.env.OPS_DAILY_REPORT_ENABLED?.trim() || "true").toLowerCase() !== "false";
    const severity = classifyNotificationSeverity(report);
    const message = buildOpsNotificationMessage(report, severity);
    const telegramHtml = buildOpsTelegramHtml(report, severity);

    const notifyResult = dailyEnabled
      ? await sendOpsNotification({ title: "تقرير تشغيل school-iraq.com", message, telegramHtml, severity }).catch(() => ({
          telegram: { status: "failed" as const, reason: "request_failed" },
          email: { status: "failed" as const, reason: "request_failed" },
          whatsapp: { status: "skipped" as const, reason: "disabled" },
        }))
      : {
          telegram: { status: "skipped" as const, reason: "disabled" },
          email: { status: "skipped" as const, reason: "disabled" },
          whatsapp: { status: "skipped" as const, reason: "disabled" },
        };

    const primaryChannel =
      notifyResult.telegram.status === "sent"
        ? "telegram"
        : notifyResult.email.status === "sent"
          ? "email"
          : notifyResult.whatsapp.status === "sent"
            ? "whatsapp"
            : "none";

    let alertPersistence: { saved: boolean; error: string | null } = {
      saved: false,
      error: null,
    };

    try {
      await saveOpsAlert({
        type: "daily_report",
        severity,
        title: "Ops daily report",
        message: report.summary,
        sent_to: null,
        sent_via: primaryChannel,
        sent_status:
          primaryChannel !== "none"
            ? "sent"
            : dailyEnabled
              ? "failed"
              : "skipped",
        metadata: {
          reportStatus: report.status,
          reportScore: report.score,
          notifySeverity: severity,
          telegram: notifyResult.telegram,
          email: notifyResult.email,
          whatsapp: notifyResult.whatsapp,
          throttled: "throttled" in notifyResult ? notifyResult.throttled : false,
          reportSavedAt: persistence.createdAt,
        },
      });
      alertPersistence = { saved: true, error: null };
    } catch (error) {
      alertPersistence = {
        saved: false,
        error: error instanceof Error ? error.message : "Failed to save ops alert",
      };
    }

    if (!persistence.saved) {
      console.error("ops daily report persistence failed", persistence.error);
    }

    if (!alertPersistence.saved) {
      console.error("ops daily alert persistence failed", alertPersistence.error);
    }

    return NextResponse.json(
      {
        ok: true,
        status: report.status,
        score: report.score,
      },
      {
        status: report.status === "down" ? 503 : 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to build ops report",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
