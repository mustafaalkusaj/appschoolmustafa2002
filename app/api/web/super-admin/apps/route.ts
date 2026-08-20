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
    const { data, error } = await context.value.dataSupabase
      .from("school_apps")
      .select("*, schools(name)")
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42P01") return NextResponse.json({ ok: true, apps: [], tableMissing: true });
      throw error;
    }

    return NextResponse.json({ ok: true, apps: data ?? [] });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "تعذر تحميل التطبيقات.", 500);
  }
}

export async function POST(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح.", "status" in context ? context.status : 500);
  }

  try {
    const body = await req.json();
    const {
      school_id, app_name, bundle_id_ios, package_name_android,
      ios_status, android_status, app_store_url, play_store_url,
      current_version, min_version, force_update,
      app_icon_url, splash_image_url, login_style,
    } = body as Record<string, unknown>;

    if (!school_id || typeof school_id !== "string") return jsonError("school_id مطلوب.", 400);
    if (!app_name || typeof app_name !== "string") return jsonError("app_name مطلوب.", 400);

    const { data, error } = await context.value.dataSupabase
      .from("school_apps")
      .upsert({
        school_id,
        app_name: String(app_name).trim(),
        bundle_id_ios: bundle_id_ios ? String(bundle_id_ios).trim() : null,
        package_name_android: package_name_android ? String(package_name_android).trim() : null,
        ios_status: typeof ios_status === "string" ? ios_status : "draft",
        android_status: typeof android_status === "string" ? android_status : "draft",
        app_store_url: app_store_url ? String(app_store_url).trim() : null,
        play_store_url: play_store_url ? String(play_store_url).trim() : null,
        current_version: current_version ? String(current_version) : "1.0.0",
        min_version: min_version ? String(min_version) : "1.0.0",
        force_update: force_update === true,
        app_icon_url: app_icon_url ? String(app_icon_url) : null,
        splash_image_url: splash_image_url ? String(splash_image_url) : null,
        login_style: typeof login_style === "string" ? login_style : "default",
        updated_at: new Date().toISOString(),
      }, { onConflict: "school_id" })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, app: data });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "تعذر حفظ التطبيق.", 500);
  }
}
