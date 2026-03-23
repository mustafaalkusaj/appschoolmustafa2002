import type { Permission, Role, SystemSettings } from "@/lib/types";

export interface RoleInput {
  key: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface UserInput {
  name: string;
  email: string;
  role: Role;
  schoolId: string | null;
  permissions: Permission[];
}

export interface SchoolInput {
  name: string;
  code: string;
  plan: "monthly" | "yearly";
  amount: number;
  expiresAt: string;
}

export type AdminMutation =
  | { action: "create-school"; input: SchoolInput }
  | { action: "toggle-school-status"; schoolId: string }
  | { action: "archive-school"; schoolId: string }
  | { action: "restore-school"; schoolId: string }
  | { action: "create-role"; input: RoleInput }
  | { action: "update-role"; roleKey: string; input: Omit<RoleInput, "key"> }
  | { action: "archive-role"; roleKey: string }
  | { action: "restore-role"; roleKey: string }
  | { action: "create-user"; input: UserInput }
  | { action: "update-user"; userId: string; input: UserInput & { status: "active" | "blocked" } }
  | { action: "archive-user"; userId: string }
  | { action: "restore-user"; userId: string }
  | { action: "toggle-user-status"; userId: string }
  | { action: "apply-role-template"; userId: string; roleKey: string }
  | { action: "mark-notification-read"; notificationId: string }
  | { action: "update-settings"; patch: Partial<SystemSettings> };
