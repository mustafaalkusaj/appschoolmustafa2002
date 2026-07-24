import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { sendTelegramMessage } from "@/lib/ops/telegram";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimit(req, {
      namespace: "public-account-deletion",
      windowMs: 24 * 60 * 60_000,
      maxHits: 5,
      productionFailureMode: "fail-closed",
    });
    if (limited) return limited;

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const fullName = text(body?.full_name, 120);
    const email = text(body?.email, 180).toLowerCase();
    const schoolName = text(body?.school_name, 160);
    const loginIdentifier = text(body?.login_identifier, 120);
    const reason = text(body?.reason, 1000);
    const honeypot = text(body?.website, 200);
    const confirmed = body?.confirmed === true;

    if (honeypot)
      return NextResponse.json({ ok: true, message: "تم استلام الطلب." });
    if (
      !fullName ||
      !schoolName ||
      !loginIdentifier ||
      !confirmed ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { ok: false, error: "أكمل الحقول المطلوبة وأكد ملكية الحساب." },
        { status: 400 },
      );
    }

    const service = createServiceSupabaseClient();
    const requestFingerprint = createHash("sha256")
      .update(`${email}|${schoolName}|${loginIdentifier}`)
      .digest("hex");
    const { data, error } = await service
      .from("support_tickets")
      .insert({
        school_id: null,
        user_id: null,
        page_url: "/account-deletion",
        message: `طلب حذف حساب عبر الويب\nالاسم: ${fullName}\nالبريد: ${email}\nالمدرسة: ${schoolName}\nمعرّف الدخول: ${loginIdentifier}${reason ? `\nالسبب: ${reason}` : ""}`,
        metadata: {
          kind: "account_deletion_web",
          source: "public_web",
          request_fingerprint: requestFingerprint,
          identity_verification_required: true,
        },
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "تعذر تسجيل الطلب. حاول لاحقاً." },
        { status: 500 },
      );
    }

    void sendTelegramMessage(
      [
        "🗑️ <b>طلب حذف حساب عبر الويب</b>",
        `الاسم: ${fullName}`,
        `المدرسة: ${schoolName}`,
        `البريد: ${email}`,
      ].join("\n"),
    ).catch(() => undefined);

    return NextResponse.json(
      {
        ok: true,
        message: "تم استلام طلبك. سنرسل تأكيداً بعد التحقق من الهوية.",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "خطأ داخلي في الخادم." },
      { status: 500 },
    );
  }
}
