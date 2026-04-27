import { NextRequest, NextResponse } from "next/server";

import { saveOpsAlert } from "@/lib/ops/health-monitor";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
import { sendWhatsAppText } from "@/lib/ops/whatsapp";

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
  const authorized = isOpsTokenAuthorized(request, [process.env.OPS_ALERT_TOKEN]);

  if (!authorized) {
    return notFound();
  }

  const result = await sendWhatsAppText("رسالة اختبار من school-iraq.com");
  let alertPersistence: { saved: boolean; error: string | null } = {
    saved: false,
    error: null,
  };

  try {
    await saveOpsAlert({
      type: "whatsapp_test",
      severity: result.status === "failed" ? "warning" : "info",
      title: "WhatsApp test message",
      message: "رسالة اختبار من school-iraq.com",
      sent_to: result.maskedPhone,
      sent_via: "whatsapp",
      sent_status:
        result.status === "sent"
          ? "sent"
          : result.status === "failed"
            ? "failed"
            : "skipped",
      metadata: {
        reason: result.reason ?? null,
        providerMessageId: result.providerMessageId ?? null,
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
      ok: result.status === "sent",
      status: result.status,
      reason: result.reason ?? null,
      maskedPhone: result.maskedPhone,
      alertPersistence,
    },
    {
      status: result.status === "failed" ? 502 : 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
