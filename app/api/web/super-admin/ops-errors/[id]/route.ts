import { NextRequest, NextResponse } from "next/server";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";
import { getOpsErrorById } from "@/lib/ops/error-capture";

function notFound() {
  return NextResponse.json(
    { ok: false, message: "Not found." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const context = await resolveSuperAdminActorContext(
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return NextResponse.json(
      { ok: false, message: "غير مصرح." },
      { status: "status" in context ? context.status : 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { id } = await ctx.params;
  if (!id || typeof id !== "string") return notFound();

  try {
    const record = await getOpsErrorById(id);
    if (!record) return notFound();

    return NextResponse.json(
      { ok: true, error: record },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
