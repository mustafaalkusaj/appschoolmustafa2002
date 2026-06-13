import { resolveWebUserProfile } from "@/lib/authorization/snapshot";
import { checkPermission } from "@/lib/perm-check";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import {
  hasPermissionInList,
  type Permission,
} from "@/types/roles";
import { cookies } from "next/headers";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

// ---------------------------------------------------------------------------
// Legacy → deep permission key mapping
// ---------------------------------------------------------------------------

const LEGACY_TO_DEEP: Partial<Record<Permission, string>> = {
  // Students
  view_students:   "students.read",
  add_students:    "students.create",
  edit_students:   "students.update",
  delete_students: "students.delete",
  // Teachers
  view_teachers:   "teachers.read",
  manage_teachers: "teachers.update",
  // Payments
  view_payments:   "payments.read",
  add_payments:    "payments.create",
  delete_payments: "payments.delete",
  // Salaries
  view_salaries:   "salaries.read",
  manage_salaries: "salaries.update",
  // Reports
  view_reports:    "reports.read",
  // Grades
  view_grades:     "grades.read",
  enter_grades:    "grades.create",
  confirm_grades:  "grades.approve",
  lock_grades:     "grades.approve",
  // Attendance
  view_attendance: "attendance.read",
  take_attendance: "attendance.create",
  edit_attendance: "attendance.update",
  // Teacher attendance
  view_teacher_attendance:   "teacher_attendance.read",
  take_teacher_attendance:   "teacher_attendance.create",
  edit_teacher_attendance:   "teacher_attendance.update",
  export_teacher_attendance: "teacher_attendance.export",
  // Teacher activities
  view_teacher_activity:     "teacher_activities.read",
  moderate_teacher_activity: "teacher_activities.moderate",
  // Schedule
  manage_schedule: "schedules.update",
  // Export specials
  export_attendance: "attendance.export",
  export_reports:    "reports.export",
  export_grades:     "grades.export",
  // Expenses
  view_expenses:   "expenses.read",
  add_expenses:    "expenses.create",
  delete_expenses: "expenses.delete",
  // Incomes
  view_incomes:   "incomes.read",
  add_incomes:    "incomes.create",
  delete_incomes: "incomes.delete",
  // Notifications
  view_notifications: "notifications.read",
  send_notifications: "notifications.create",
};

// ---------------------------------------------------------------------------
// Cookie helper — returns verified session or null
// ---------------------------------------------------------------------------

async function readRBACSession(actorUserId: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(RBAC_COOKIE_NAME)?.value;
    if (!token) return null;
    const session = await verifyRBACSession(token);
    if (session && session.userId === actorUserId) return session;
  } catch {
    // ignore — caller falls through to DB path
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function routeUserHasPermission(
  actorSupabase: RouteSupabaseClient,
  actorUserId: string,
  permission: Permission,
) {
  // Fast path: read permissions from the RBAC session cookie (no DB query)
  const session = await readRBACSession(actorUserId);
  if (session) {
    // Prefer deep permission when available for this legacy key
    const deepKey = LEGACY_TO_DEEP[permission];
    if (deepKey && session.deepPermissions) {
      return checkPermission(session.deepPermissions, deepKey);
    }
    return hasPermissionInList(session.permissions, permission);
  }

  // Slow path: RBAC cookie missing or invalid — fetch from DB
  const actorProfile = await resolveWebUserProfile(actorSupabase, actorUserId).catch(() => null);
  if (!actorProfile) {
    return false;
  }

  return hasPermissionInList(actorProfile.snapshot.permissions, permission);
}

/**
 * Check a deep permission key directly (for new routes that bypass legacy keys).
 * Returns false when the session has no deepPermissions at all.
 */
export async function routeCheckDeepPermission(
  actorUserId: string,
  deepKey: string,
): Promise<boolean> {
  const session = await readRBACSession(actorUserId);
  if (!session || !session.deepPermissions) return false;
  return checkPermission(session.deepPermissions, deepKey);
}
