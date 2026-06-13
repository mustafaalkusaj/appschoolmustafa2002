import QRCode from "qrcode";
import { SCHOOL_BRAND } from "@/lib/branding";
import type { ManagedUserAccountCard, ManagedUserRecord } from "@/lib/managed-users";
import type { RouteSupabaseClient } from "./types";
import { fetchManagedUserCredentials } from "./credentials";
import { tableHasColumn } from "./queries";

async function generateQrDataUrl(loginIdentifier: string, password: string): Promise<string | null> {
  if (!password || password === "••••••••") return null;
  try {
    const payload = `schoolapp://login?u=${encodeURIComponent(loginIdentifier)}&p=${encodeURIComponent(password)}`;
    return await QRCode.toDataURL(payload, { width: 180, margin: 1, errorCorrectionLevel: "M" });
  } catch {
    return null;
  }
}

// Resolve school logo from record
function resolveSchoolLogoFromRecord(record: Record<string, unknown> | null | undefined) {
  const candidates = [
    record?.logo_url,
    record?.logo,
    record?.school_logo_url,
    record?.brand_logo_url,
    record?.image_url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return SCHOOL_BRAND.logo;
}

// Fetch school brand
export async function fetchManagedAccountSchoolBrand(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
) {
  const [logoUrl, logo, schoolLogoUrl, brandLogoUrl, imageUrl, primaryColor, secondaryColor, themePreset] = await Promise.all([
    tableHasColumn(actorSupabase, "schools", "logo_url").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "logo").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "school_logo_url").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "brand_logo_url").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "image_url").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "primary_color").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "secondary_color").catch(() => false),
    tableHasColumn(actorSupabase, "schools", "theme_preset").catch(() => false),
  ]);

  const selectColumns = [
    "name",
    ...(logoUrl ? ["logo_url"] : []),
    ...(logo ? ["logo"] : []),
    ...(schoolLogoUrl ? ["school_logo_url"] : []),
    ...(brandLogoUrl ? ["brand_logo_url"] : []),
    ...(imageUrl ? ["image_url"] : []),
    ...(primaryColor ? ["primary_color"] : []),
    ...(secondaryColor ? ["secondary_color"] : []),
    ...(themePreset ? ["theme_preset"] : []),
  ].join(", ");

  const { data, error } = await actorSupabase
    .from("schools")
    .select(selectColumns)
    .eq("id", schoolId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const schoolRecord = (data ?? null) as unknown as Record<string, unknown> | null;
  const schoolName =
    (typeof schoolRecord?.name === "string" && schoolRecord.name.trim()) || SCHOOL_BRAND.nameAr;

  return {
    schoolName,
    schoolLogoUrl: resolveSchoolLogoFromRecord(schoolRecord),
    primaryColor: typeof schoolRecord?.primary_color === "string" ? schoolRecord.primary_color : null,
    secondaryColor: typeof schoolRecord?.secondary_color === "string" ? schoolRecord.secondary_color : null,
    themePreset: typeof schoolRecord?.theme_preset === "string" ? schoolRecord.theme_preset : null,
  };
}

// Build account card
export async function buildManagedUserAccountCard(
  actorSupabase: RouteSupabaseClient,
  user: ManagedUserRecord,
  options?: {
    /** The plaintext password to display (one-time reveal after reset). If not provided, the card will show a placeholder. */
    temporaryPassword?: string;
  },
) {
  const [credentialsByAuthId, schoolBrand] = await Promise.all([
    fetchManagedUserCredentials(actorSupabase, [user.auth_user_id]),
    fetchManagedAccountSchoolBrand(actorSupabase, user.school_id),
  ]);
  const credential = credentialsByAuthId.get(user.auth_user_id);

  if (!credential?.temporary_password_hash) {
    throw new Error("لا توجد كلمة مرور مؤقتة محفوظة لهذا الحساب. أعد تعيين كلمة المرور المؤقتة أولاً.");
  }

  const primaryTeacherAssignment =
    user.role === "teacher"
      ? user.teacher?.assignments.find((assignment) => assignment.is_active) ?? user.teacher?.assignments[0] ?? null
      : null;

  const displayPassword = options?.temporaryPassword ?? credential.temporary_password_plain ?? "••••••••";
  const qrDataUrl = await generateQrDataUrl(credential.login_identifier, displayPassword);

  return {
    auth_user_id: user.auth_user_id,
    role: user.role,
    school_name: schoolBrand.schoolName,
    school_logo_url: schoolBrand.schoolLogoUrl,
    full_name: user.full_name,
    class_name: user.student?.class_name ?? primaryTeacherAssignment?.class_name ?? null,
    section: user.student?.section ?? primaryTeacherAssignment?.section_name ?? null,
    login_identifier: credential.login_identifier,
    temporary_password: displayPassword,
    qr_data_url: qrDataUrl,
    instructions: [
      "افتح شاشة تسجيل الدخول الخاصة بالحساب.",
      "أدخل معرّف الدخول وكلمة المرور المؤقتة كما هي تماماً.",
      "إذا تعذر الدخول، اطلب من الإدارة إعادة إصدار كلمة مرور مؤقتة جديدة.",
    ],
    generated_at: new Date().toISOString(),
  } satisfies ManagedUserAccountCard;
}
