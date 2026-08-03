/**
 * Cron worker for the account-deletion queue.
 *
 * Picks up every request whose 72h cancellation window has closed and runs the
 * erasure executor over it. Registered in `vercel.json` under `crons`; Vercel
 * sends `Authorization: Bearer $CRON_SECRET` automatically. `OPS_ALERT_TOKEN`
 * is also accepted so the job can be triggered by hand during an incident —
 * exactly the guard used by `/api/ops/warm` and `/api/ops/daily-report`.
 */
import { NextRequest, NextResponse } from "next/server";

import { executeAccountDeletion } from "@/lib/account-deletion/executor";
import { loadDueDeletionRequests, selectOverdue } from "@/lib/account-deletion/queue";
import { createSupabaseAccountDeletionGateway } from "@/lib/account-deletion/supabase-gateway";
import type { AccountDeletionResult } from "@/lib/account-deletion/types";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
import { sendTelegramMessage } from "@/lib/ops/telegram";
import { logRouteError } from "@/lib/route-utils";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const MAX_PER_RUN = 25;

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

async function handle(req: NextRequest) {
  if (
    !isOpsTokenAuthorized(req, [
      process.env.CRON_SECRET,
      process.env.OPS_ALERT_TOKEN,
    ])
  ) {
    return unauthorized();
  }

  const client = createServiceSupabaseClient();

  let due;
  try {
    due = await loadDueDeletionRequests(client, MAX_PER_RUN);
  } catch (error) {
    logRouteError("cron/account-deletion:load", error);
    return NextResponse.json(
      { ok: false, error: "تعذر تحميل طلبات الحذف المستحقة." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const gateway = createSupabaseAccountDeletionGateway(client);
  const results: AccountDeletionResult[] = [];

  for (const request of due) {
    results.push(
      await executeAccountDeletion(gateway, request, { trigger: "cron" }),
    );
  }

  const failed = results.filter((result) => result.status === "failed");
  const overdue = selectOverdue(due);

  if (failed.length > 0 || overdue.length > 0) {
    void sendTelegramMessage(
      [
        "⚠️ <b>خط أنابيب حذف الحسابات</b>",
        `فشل: ${failed.length}`,
        `متأخر عن المهلة: ${overdue.length}`,
      ].join("\n"),
    ).catch(() => undefined);
  }

  return NextResponse.json(
    {
      ok: true,
      picked: due.length,
      completed: results.filter((result) => result.status === "completed")
        .length,
      failed: failed.length,
      skipped: results.filter((result) => result.status === "skipped").length,
      overdue: overdue.length,
      results,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
