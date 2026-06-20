import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح.", "status" in context ? context.status : 500);
  }

  try {
    const schoolId = req.nextUrl.searchParams.get("school_id");

    let query = context.value.dataSupabase
      .from("school_app_versions")
      .select("*, schools(name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") return NextResponse.json({ ok: true, versions: [], tableMissing: true });
      throw error;
    }

    return NextResponse.json({ ok: true, versions: data ?? [] });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "تعذر تحميل الإصدارات.", 500);
  }
}

export async function POST(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح.", "status" in context ? context.status : 500);
  }

  try {
    const body = await req.json();
    const { school_id, version, platform, changelog, build_number, is_mandatory } = body as Record<string, unknown>;

    const VALID_PLATFORMS = ["ios", "android"] as const;
    const SEMVER_RE = /^\d+\.\d+\.\d+([.\-][a-zA-Z0-9]+)*$/;

    if (!school_id || typeof school_id !== "string") return jsonError("school_id مطلوب.", 400);
    if (!version || typeof version !== "string") return jsonError("version مطلوب.", 400);
    if (!SEMVER_RE.test(String(version))) return jsonError("version يجب أن يكون بصيغة semver مثل 1.0.0", 400);
    if (!platform || typeof platform !== "string") return jsonError("platform مطلوب.", 400);
    if (!(VALID_PLATFORMS as readonly string[]).includes(platform as string)) {
      return jsonError("platform يجب أن يكون ios أو android.", 400);
    }

    const { data, error } = await context.value.dataSupabase
      .from("school_app_versions")
      .insert({
        school_id,
        version: String(version).trim(),
        platform,
        changelog: changelog ? String(changelog).trim() : null,
        build_number: build_number ? String(build_number).trim() : null,
        is_mandatory: is_mandatory === true,
        published_at: new Date().toISOString(),
        published_by: context.value.actorUserId,
      })
      .select("*")
      .single();

    if (error) throw error;

    await context.value.dataSupabase
      .from("school_apps")
      .update({ current_version: String(version).trim(), updated_at: new Date().toISOString() })
      .eq("school_id", school_id);

    return NextResponse.json({ ok: true, version: data });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "تعذر حفظ الإصدار.", 500);
  }
}
