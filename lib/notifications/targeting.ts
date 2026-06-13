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
    if (targetConfig.targetUserIds && targetConfig.targetUserIds.length > 0) {
      return Array.from(new Set(targetConfig.targetUserIds));
    }
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("school_id", schoolId)
      .eq("role", "teacher")
      .eq("is_active", true);
    if (error || !data) return [];
    return data.map((r: { id: string }) => r.id);
  }

  // بناء استعلام الطلاب
  let query = supabase
    .from("students")
    .select("auth_user_id")
    .eq("school_id", schoolId)
    .not("auth_user_id", "is", null);

  if (branchId) query = query.eq("branch_id", branchId);

  // طلاب نشطون فقط (ما عدا all الذي يشمل الجميع)
  if (targetType !== "all") {
    query = query.eq("status", "active");
  }

  if (targetType === "class" && targetClass) {
    query = query.eq("class_name", targetClass);
  }

  if (targetType === "section" && targetClass && targetSection) {
    query = query.eq("class_name", targetClass).eq("section", targetSection);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // إزالة التكرارات
  const ids = data
    .map((r: { auth_user_id: string | null }) => r.auth_user_id)
    .filter((id): id is string => Boolean(id));

  return Array.from(new Set(ids));
}
