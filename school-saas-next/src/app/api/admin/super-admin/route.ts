import { NextResponse } from "next/server";

import type { AdminMutation } from "@/lib/admin-actions";
import {
  applyRoleTemplate,
  archiveRole,
  archiveSchool,
  archiveUser,
  createRole,
  createSchool,
  createUser,
  getSuperAdminSnapshot,
  markNotificationRead,
  restoreRole,
  restoreSchool,
  restoreUser,
  toggleSchoolStatus,
  toggleUserStatus,
  updateRole,
  updateSettings,
  updateUser,
} from "@/lib/admin-repository";
import { getSessionFromRequest } from "@/lib/auth-session";

function requireSuperAdmin(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return session;
}

export async function GET(request: Request) {
  const session = requireSuperAdmin(request);
  if (session instanceof NextResponse) {
    return session;
  }

  const snapshot = await getSuperAdminSnapshot();
  return NextResponse.json({ snapshot }, { status: 200 });
}

export async function POST(request: Request) {
  const session = requireSuperAdmin(request);
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const mutation = (await request.json()) as AdminMutation;
    const actor = {
      id: session.id,
      name: session.name,
    };

    let snapshot;

    switch (mutation.action) {
      case "create-school":
        snapshot = await createSchool(actor, mutation.input);
        break;
      case "toggle-school-status":
        snapshot = await toggleSchoolStatus(actor, mutation.schoolId);
        break;
      case "archive-school":
        snapshot = await archiveSchool(actor, mutation.schoolId);
        break;
      case "restore-school":
        snapshot = await restoreSchool(actor, mutation.schoolId);
        break;
      case "create-role":
        snapshot = await createRole(actor, mutation.input);
        break;
      case "update-role":
        snapshot = await updateRole(actor, mutation.roleKey, mutation.input);
        break;
      case "archive-role":
        snapshot = await archiveRole(actor, mutation.roleKey);
        break;
      case "restore-role":
        snapshot = await restoreRole(actor, mutation.roleKey);
        break;
      case "create-user":
        snapshot = await createUser(actor, mutation.input);
        break;
      case "update-user":
        snapshot = await updateUser(actor, mutation.userId, mutation.input);
        break;
      case "archive-user":
        snapshot = await archiveUser(actor, mutation.userId);
        break;
      case "restore-user":
        snapshot = await restoreUser(actor, mutation.userId);
        break;
      case "toggle-user-status":
        snapshot = await toggleUserStatus(actor, mutation.userId);
        break;
      case "apply-role-template":
        snapshot = await applyRoleTemplate(actor, mutation.userId, mutation.roleKey);
        break;
      case "mark-notification-read":
        snapshot = await markNotificationRead(mutation.notificationId);
        break;
      case "update-settings":
        snapshot = await updateSettings(actor, mutation.patch);
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ snapshot }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Admin mutation failed" },
      { status: 500 },
    );
  }
}
