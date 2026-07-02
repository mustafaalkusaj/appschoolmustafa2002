export type DeepPermission = string;
export type DeepPermissionGroup = { id: string; label: string; permissions: DeepPermission[] };
export const DEEP_PERMISSION_GROUPS: DeepPermissionGroup[] = [];
