import { NextRequest, NextResponse } from "next/server";

import { sanitizeImageUrl } from "@/lib/brand/asset-url";
import { detectAdminInfrastructure, isInfrastructureCompatError } from "@/lib/admin-infrastructure";
import { detectAppSchemaCompatWithClient } from "@/lib/schema-compat";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

type CreateSchoolBody = {
  name?: unknown;
  address?: unknown;
  phone?: unknown;
  owner_email?: unknown;
  city?: unknown;
  logo_url?: unknown;
  primary_color?: unknown;
  secondary_color?: unknown;
  plan?: unknown;
};

type SchoolRecord = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  owner_email: string | null;
  city: string | null;
  logo_url: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  plan: "basic" | "premium" | "enterprise";
  is_active: boolean;
  created_at?: string | null;
};

type SubscriptionRecord = {
  id: string;
  school_id: string;
  plan: "basic" | "premium" | "enterprise";
  status: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
};

function buildSchoolSelect(schemaCompat: Awaited<ReturnType<typeof detectAppSchemaCompatWithClient>>) {
  return schemaCompat.schoolColors
    ? "id, name, address, phone, owner_email, city, logo_url, primary_color, secondary_color, plan, is_active, created_at"
    : "id, name, address, phone, owner_email, city, logo_url, plan, is_active, created_at";
}

function normalizeLogoUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  return sanitizeImageUrl(value) ?? null;
}

export async function GET(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const { dataSupabase } = context.value;
  const schemaCompat = await detectAppSchemaCompatWithClient(dataSupabase);
  const schoolSelect = buildSchoolSelect(schemaCompat);

  const [{ data: schoolsData, error: schoolsError }, { data: subscriptionsData, error: subscriptionsError }] =
    await Promise.all([
      dataSupabase.from("schools").select(schoolSelect).order("created_at", { ascending: false }),
      dataSupabase
        .from("subscriptions")
        .select("id, school_id, plan, status, start_date, end_date, created_at")
        .order("created_at", { ascending: false }),
    ]);

  if (schoolsError) {
    return jsonError(schoolsError.message || "تعذر تحميل المدارس.", 500);
  }

  if (subscriptionsError) {
    return jsonError(subscriptionsError.message || "تعذر تحميل الاشتراكات.", 500);
  }

  const schools = ((schoolsData ?? []) as unknown as SchoolRecord[]).map((school) => ({
    ...school,
    logo_url: normalizeLogoUrl(school.logo_url),
  }));

  const latestSubscriptionsBySchool = new Map<string, SubscriptionRecord>();
  for (const subscription of (subscriptionsData ?? []) as SubscriptionRecord[]) {
    if (!latestSubscriptionsBySchool.has(subscription.school_id)) {
      latestSubscriptionsBySchool.set(subscription.school_id, subscription);
    }
  }

  return NextResponse.json({
    ok: true,
    schools,
    subscriptions: Array.from(latestSubscriptionsBySchool.values()),
    schemaCompat,
  });
}

export async function POST(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const body = (await req.json().catch(() => null)) as CreateSchoolBody | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const plan = body?.plan === "premium" || body?.plan === "enterprise" ? body.plan : "basic";

  if (!name) {
    return jsonError("اسم المدرسة مطلوب.", 400);
  }

  const { dataSupabase } = context.value;
  const [infrastructure, schemaCompat] = await Promise.all([
    detectAdminInfrastructure(dataSupabase),
    detectAppSchemaCompatWithClient(dataSupabase),
  ]);
  const schoolSelect = buildSchoolSelect(schemaCompat);

  const schoolPayload = {
    name,
    address: typeof body?.address === "string" && body.address.trim() ? body.address.trim() : null,
    phone: typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
    owner_email: typeof body?.owner_email === "string" && body.owner_email.trim() ? body.owner_email.trim() : null,
    city: typeof body?.city === "string" && body.city.trim() ? body.city.trim() : null,
    logo_url: normalizeLogoUrl(body?.logo_url),
    ...(schemaCompat.schoolColors
      ? {
          primary_color:
            typeof body?.primary_color === "string" && body.primary_color.trim() ? body.primary_color.trim() : null,
          secondary_color:
            typeof body?.secondary_color === "string" && body.secondary_color.trim() ? body.secondary_color.trim() : null,
        }
      : {}),
    plan,
    is_active: true,
  };

  const { data: school, error: schoolError } = await dataSupabase
    .from("schools")
    .insert(schoolPayload)
    .select(schoolSelect)
    .single();

  if (schoolError || !school) {
    return jsonError(schoolError?.message || "تعذر إنشاء المدرسة.", 500);
  }
  const createdSchool = school as unknown as SchoolRecord;

  const startDate = new Date().toISOString().split("T")[0];
  const endDate = new Date(Date.now() + 365 * DAY_IN_MS).toISOString().split("T")[0];
  const { data: subscription, error: subscriptionError } = await dataSupabase
    .from("subscriptions")
    .insert({
      school_id: createdSchool.id,
      plan,
      status: "active",
      start_date: startDate,
      end_date: endDate,
    })
    .select("id, school_id, plan, status, start_date, end_date, created_at")
    .single();

  if (subscriptionError || !subscription) {
    await dataSupabase.from("schools").delete().eq("id", createdSchool.id);
    return jsonError(subscriptionError?.message || "تعذر إنشاء اشتراك المدرسة.", 500);
  }

  let branchSkipped = !infrastructure.branches;
  if (!branchSkipped) {
    const branchPayload = {
      school_id: createdSchool.id,
      name: "الفرع الرئيسي",
      ...(schemaCompat.branchesIsMain ? { is_main: true } : {}),
    };

    const { error: branchError } = await dataSupabase.from("branches").insert(branchPayload);
    if (branchError) {
      if (isInfrastructureCompatError(branchError)) {
        branchSkipped = true;
      } else {
        await dataSupabase.from("subscriptions").delete().eq("id", subscription.id);
        await dataSupabase.from("schools").delete().eq("id", createdSchool.id);
        return jsonError(branchError.message || "تعذر إنشاء الفرع الرئيسي.", 500);
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      school: createdSchool,
      subscription,
      schemaCompat,
      branchSkipped,
    },
    { status: 201 },
  );
}
