// ============================================================
// تحديد المستلمين — Targeting Module
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationTargetConfig } from "./types";

/**
 * يُعيد قائمة user IDs بناءً على إعدادات الاستهداف.
 * جميع الاستعلامات مُقيَّدة بـ school_id لضمان العزل.
 */
export async function getTargetUsers(
  supabase: SupabaseClient,
  schoolId: string,
  targetConfig: NotificationTargetConfig,
): Promise<string[]> {
  const { targetType, targetClass, targetSection, targetUserId, branchId } =
    targetConfig;

  // شخص واحد محدد
  if (targetType === "person") {
    if (!targetUserId) return [];
    return [targetUserId];
  }

  const baseFilter = { school_id: schoolId } as Record<string, string>;
  if (branchId) baseFilter.branch_id = branchId;

  // الأساتذة — محددون أو جميع الأساتذة
  if (targetType === "teachers") {
    // قائمة محددة من العميل — يجب التحقق أنها تنتمي لنفس المدرسة لمنع
    // الحقن عبر المدارس (cross-tenant). نتقاطع المعرّفات المُرسَلة مع
    // أساتذة المدرسة النشطين فقط ونُسقط أي معرّف غير مطابق.
    if (targetConfig.targetUserIds && targetConfig.targetUserIds.length > 0) {
      const requested = Array.from(new Set(targetConfig.targetUserIds));
      const { data, error } = await supabase
        .from("managed_user_profiles")
        .select("auth_user_id")
        .eq("school_id", schoolId)
        .eq("role", "teacher")
        .eq("is_active", true)
        .in("auth_user_id", requested)
        .not("auth_user_id", "is", null);
      if (error || !data) return [];
      const allowed = new Set(
        data
          .map((r: { auth_user_id: string | null }) => r.auth_user_id)
          .filter((id): id is string => Boolean(id)),
      );
      return requested.filter((id) => allowed.has(id));
    }
    const { data, error } = await supabase
      .from("managed_user_profiles")
      .select("auth_user_id")
      .eq("school_id", schoolId)
      .eq("role", "teacher")
      .eq("is_active", true)
      .not("auth_user_id", "is", null);
    if (error || !data) return [];
    const ids = data
      .map((r: { auth_user_id: string | null }) => r.auth_user_id)
      .filter((id): id is string => Boolean(id));
    return Array.from(new Set(ids));
  }

  // "all" = جميع مستخدمي المدرسة (طلاب + أساتذة + إدارة)
  if (targetType === "all") {
    const allIds = new Set<string>();

    const { data: students } = await excludeDeletedStudents(
      supabase.from("students").select("auth_user_id"),
    )
      .eq("school_id", schoolId)
      .not("auth_user_id", "is", null);
    if (students) {
      for (const r of students) {
        if (r.auth_user_id) allIds.add(r.auth_user_id);
      }
    }

    const { data: staff } = await supabase
      .from("managed_user_profiles")
      .select("auth_user_id")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .not("auth_user_id", "is", null);
    if (staff) {
      for (const r of staff) {
        if (r.auth_user_id) allIds.add(r.auth_user_id);
      }
    }

    return Array.from(allIds);
  }

  // بناء استعلام الطلاب
  let query = supabase
    .from("students")
    .select("auth_user_id")
    .eq("school_id", schoolId)
    .not("auth_user_id", "is", null);

  if (branchId) query = query.eq("branch_id", branchId);

  query = query.eq("status", "active");

  if (targetType === "class" && targetClass) {
    query = query.eq("class_name", targetClass);
  }

  if (targetType === "section" && targetClass && targetSection) {
    query = query.eq("class_name", targetClass).eq("section", targetSection);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const ids = data
    .map((r: { auth_user_id: string | null }) => r.auth_user_id)
    .filter((id): id is string => Boolean(id));

  return Array.from(new Set(ids));
}
