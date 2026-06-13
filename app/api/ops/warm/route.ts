/**
 * Warm-up endpoint — pings critical function paths to prevent cold starts.
 * Called every 5 minutes via Vercel cron.
 */
import { NextRequest, NextResponse } from "next/server";
import { isOpsTokenAuthorized } from "@/lib/ops/security";

export const dynamic = "force-dynamic";

const WARM_TARGETS = [
  "/api/ping",
  "/api/auth/me",
  "/api/web/students/list?schoolId=_warm",
  "/api/web/payments/records?schoolId=_warm",
  "/api/web/attendance?schoolId=_warm",
  "/api/web/expenses?schoolId=_warm",
  "/api/web/reports/overview?schoolId=_warm",
  "/api/web/dashboard/overview?schoolId=_warm",
  "/api/web/salaries/teachers?schoolId=_warm",
  "/api/web/super-admin/overview",
];

export async function GET(req: NextRequest) {
  const tokenAuthorized = isOpsTokenAuthorized(req, [
    process.env.CRON_SECRET,
    process.env.OPS_ALERT_TOKEN,
  ]);

  if (!tokenAuthorized) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const host = req.headers.get("host") || "school-iraq.com";
  const protocol = host.includes("localhost") ? "http" : "https";
  const base = `${protocol}://${host}`;
  const t0 = Date.now();

  const results = await Promise.allSettled(
    WARM_TARGETS.map(async (path) => {
      const start = Date.now();
      const res = await fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(5_000),
        headers: { "x-warm-ping": "1" },
      });
      return { path, status: res.status, ms: Date.now() - start };
    }),
  );

  const warmed = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { path: WARM_TARGETS[i], status: 0, ms: 0, error: String((r as PromiseRejectedResult).reason) },
  );

  return Response.json({
    ok: true,
    totalMs: Date.now() - t0,
    warmed,
  });
}
