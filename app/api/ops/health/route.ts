import { NextRequest, NextResponse } from "next/server";

import { buildOpsReport, saveOpsReport } from "@/lib/ops/health-monitor";
import { isOpsTokenAuthorized } from "@/lib/ops/security";

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

export async function GET(request: NextRequest) {
  const authorized = isOpsTokenAuthorized(request, [
    process.env.OPS_ALERT_TOKEN,
    process.env.HEALTHCHECK_TOKEN,
  ]);

  if (!authorized) {
    return notFound();
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

    return NextResponse.json(
      {
        status: report.status,
        score: report.score,
        summary: report.summary,
        checks: report.checks,
        errors: report.errors,
        persistence,
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
        status: "down",
        score: 0,
        summary: "تعذر إنشاء تقرير التشغيل.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
