import { NextRequest, NextResponse } from "next/server";

import { sanitizeImageUrl } from "@/lib/brand/asset-url";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { detectAppSchemaCompatWithClient } from "@/lib/schema-compat";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function normalizeLogoUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  return sanitizeImageUrl(value) ?? null;
}

function normalizeColor(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim();
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إعدادات الهوية البصرية متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "dashboard-branding-read",
    windowMs: 60_000,
    maxHits: 60,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const schemaCompat = await detectAppSchemaCompatWithClient(context.value.actorSupabase);
  const branchId = context.value.actorBranchId;

  // Always load school for the name field
  const schoolQuery = schemaCompat.schoolColors
    ? context.value.actorSupabase
        .from("schools")
        .select(`id, name, logo_url, primary_color, secondary_color${schemaCompat.schoolThemePreset ? ", theme_preset" : ""}`)
    : context.value.actorSupabase
        .from("schools")
        .select(`id, name, logo_url${schemaCompat.schoolThemePreset ? ", theme_preset" : ""}`);

  const { data: school, error: schoolError } = await schoolQuery
    .eq("id", context.value.targetSchoolId)
    .maybeSingle();

  if (schoolError || !school) {
    return jsonError("تعذر تحميل بيانات الهوية البصرية.", 500);
  }

  // If user has a branch → load branch-level colors (branch isolation)
  if (branchId) {
    const branchCols = ["id", "name"];
    if (schemaCompat.branchColors) branchCols.push("primary_color", "secondary_color");
    if (schemaCompat.branchUiColors) branchCols.push("sidebar_color");
    if (schemaCompat.branchLogo) branchCols.push("logo_url");
    if (schemaCompat.schoolThemePreset) branchCols.push("theme_preset");
    branchCols.push("currency");

    const { data: branchRaw } = await context.value.actorSupabase
      .from("branches")
      .select(branchCols.join(", "))
      .eq("id", branchId)
      .maybeSingle();

    const branch = branchRaw as {
      name?: string | null;
      primary_color?: string | null;
      secondary_color?: string | null;
      sidebar_color?: string | null;
      logo_url?: string | null;
      theme_preset?: string | null;
      currency?: string | null;
    } | null;

    // Fetch school currency for fallback
    const { data: schoolWithCurrency } = await context.value.actorSupabase
      .from("schools")
      .select("currency")
      .eq("id", context.value.targetSchoolId)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      schemaCompat,
      school,
      source: "branch" as const,
      branch_id: branchId,
      branch_name: branch?.name ?? null,
      branch_primary_color: schemaCompat.branchColors ? (branch?.primary_color ?? null) : null,
      branch_secondary_color: schemaCompat.branchColors ? (branch?.secondary_color ?? null) : null,
      branch_sidebar_color: schemaCompat.branchUiColors ? (branch?.sidebar_color ?? null) : null,
      branch_logo_url: schemaCompat.branchLogo ? (branch?.logo_url ?? null) : null,
      branch_theme_preset: schemaCompat.schoolThemePreset ? (branch?.theme_preset ?? null) : null,
      branch_currency: branch?.currency ?? null,
      school_currency: (schoolWithCurrency as { currency?: string | null } | null)?.currency ?? "IQD",
    });
  }

  // No branch → school-level settings
  const { data: schoolWithCurrency } = await context.value.actorSupabase
    .from("schools")
    .select("currency")
    .eq("id", context.value.targetSchoolId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    schemaCompat,
    school,
    source: "school" as const,
    branch_id: null,
    branch_name: null,
    school_currency: (schoolWithCurrency as { currency?: string | null } | null)?.currency ?? "IQD",
  });
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!schoolId) return jsonError("معرف المدرسة مطلوب.", 400);
  if (!name) return jsonError("اسم المدرسة مطلوب.", 400);

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "تعديل الهوية البصرية متاح للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "dashboard-branding-write",
    windowMs: 60_000,
    maxHits: 20,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  const schemaCompat = await detectAppSchemaCompatWithClient(context.value.actorSupabase);
  const branchId = context.value.actorBranchId;

  const primaryColor = normalizeColor(body?.primary_color);
  const secondaryColor = normalizeColor(body?.secondary_color);
  const themePreset = normalizeColor(body?.theme_preset);
  const logoUrl = normalizeLogoUrl(body?.logo_url);
  const currency = typeof body?.currency === "string" && body.currency.trim() ? body.currency.trim() : null;

  // ── Branch-scoped save ───────────────────────────────────────────────────
  if (branchId) {
    // Always save school name (shared across branches)
    const { data: school, error: schoolError } = await context.value.actorSupabase
      .from("schools")
      .update({ name })
      .eq("id", context.value.targetSchoolId)
      .select(`id, name, logo_url${schemaCompat.schoolColors ? ", primary_color, secondary_color" : ""}${schemaCompat.schoolThemePreset ? ", theme_preset" : ""}`)
      .maybeSingle();

    if (schoolError || !school) {
      return jsonError("تعذر حفظ اسم المدرسة.", 500);
    }

    // Save colors + logo + name to branch (isolated per branch)
    const branchPayload: Record<string, unknown> = {};
    const newBranchName = typeof body?.branch_name === "string" ? body.branch_name.trim() : null;
    if (newBranchName) branchPayload.name = newBranchName;
    if (schemaCompat.branchColors) {
      branchPayload.primary_color = primaryColor;
      branchPayload.secondary_color = secondaryColor;
    }
    if (schemaCompat.branchUiColors && typeof body?.branch_sidebar_color === "string") {
      branchPayload.sidebar_color = normalizeColor(body.branch_sidebar_color);
    }
    if (schemaCompat.branchLogo) {
      branchPayload.logo_url = logoUrl;
    }
    if (schemaCompat.schoolThemePreset) {
      branchPayload.theme_preset = themePreset;
    }
    if (currency !== null) {
      branchPayload.currency = currency;
    }

    let savedBranch: Record<string, unknown> | null = null;
    if (Object.keys(branchPayload).length > 0) {
      const { data: updatedBranch } = await context.value.actorSupabase
        .from("branches")
        .update(branchPayload)
        .eq("id", branchId)
        .select("id, name, primary_color, secondary_color, logo_url, theme_preset")
        .maybeSingle();
      savedBranch = updatedBranch as Record<string, unknown> | null;
    } else {
      const { data: existingBranch } = await context.value.actorSupabase
        .from("branches")
        .select("id, name")
        .eq("id", branchId)
        .maybeSingle();
      savedBranch = existingBranch as Record<string, unknown> | null;
    }

    return NextResponse.json({
      ok: true,
      schemaCompat,
      school,
      source: "branch" as const,
      branch_id: branchId,
      branch_name: typeof savedBranch?.name === "string" ? savedBranch.name : newBranchName,
      branch_primary_color: schemaCompat.branchColors ? (primaryColor ?? null) : null,
      branch_secondary_color: schemaCompat.branchColors ? (secondaryColor ?? null) : null,
      branch_logo_url: schemaCompat.branchLogo ? (logoUrl ?? null) : null,
      branch_theme_preset: schemaCompat.schoolThemePreset ? (themePreset ?? null) : null,
      branch_currency: currency,
    });
  }

  // ── School-scoped save (no branch) ───────────────────────────────────────
  const schoolPayload: Record<string, unknown> = {
    name,
    logo_url: logoUrl,
    ...(schemaCompat.schoolColors
      ? {
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          ...(schemaCompat.schoolThemePreset ? { theme_preset: themePreset } : {}),
        }
      : {}),
  };
  if (currency !== null) {
    schoolPayload.currency = currency;
  }

  const schoolQuery = schemaCompat.schoolColors
    ? context.value.actorSupabase
        .from("schools")
        .update(schoolPayload)
        .eq("id", context.value.targetSchoolId)
        .select(`id, name, logo_url, primary_color, secondary_color${schemaCompat.schoolThemePreset ? ", theme_preset" : ""}`)
    : context.value.actorSupabase
        .from("schools")
        .update(schoolPayload)
        .eq("id", context.value.targetSchoolId)
        .select(`id, name, logo_url${schemaCompat.schoolThemePreset ? ", theme_preset" : ""}`);

  const { data: school, error } = await schoolQuery.maybeSingle();
  if (error || !school) {
    return jsonError("تعذر حفظ الهوية البصرية.", 500);
  }

  return NextResponse.json({
    ok: true,
    schemaCompat,
    school,
    source: "school" as const,
    branch_id: null,
    branch_name: null,
    school_currency: currency ?? "IQD",
  });
}
