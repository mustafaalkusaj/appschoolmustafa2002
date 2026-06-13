import { NextRequest, NextResponse } from "next/server";
import { isOpsTokenAuthorized } from "@/lib/ops/security";
import { getOpsErrorById } from "@/lib/ops/error-capture";

function notFound() {
  return NextResponse.json(
    { ok: false, message: "Not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

type RouteContext = { params: Promise<{ errorId: string }> };

export async function GET(request: NextRequest, ctx: RouteContext) {
  const authorized = isOpsTokenAuthorized(request, [
    process.env.OPS_ALERT_TOKEN,
  ]);
  if (!authorized) return notFound();

  const { errorId } = await ctx.params;
  if (!errorId || typeof errorId !== "string") return notFound();

  try {
    const record = await getOpsErrorById(errorId);
    if (!record) return notFound();

    const prompt = record.fix_prompt ?? "(لا يوجد Fix Prompt لهذا الخطأ)";

    return new NextResponse(prompt, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        // Suggest a filename when downloading
        "Content-Disposition": `inline; filename="fix-prompt-${errorId.slice(0, 8)}.txt"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
