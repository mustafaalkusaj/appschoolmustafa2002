// =============================================================================
// Deep Permissions Types
// 5-level permission system: page visibility, CRUD actions, field visibility,
// data scope, and special actions.
// =============================================================================

/**
 * Per-page permission map returned from the auth system.
 *
 * Example:
 * {
 *   students: {
 *     actions: { create: true, read: true, update: true, delete: false },
 *     fields:  { view_phone: true, view_national_id: false },
 *     special: { export: true, print_card: false },
 *     data_scope: "own_class"
 *   }
 * }
 */
export type PagePermissions = {
  actions: Record<string, boolean>;
  fields: Record<string, boolean>;
  special: Record<string, boolean>;
  /** null = no scope restriction; "own_class" | "own_grade" | "all" */
  data_scope: string | null;
};

export type DeepPermissionMap = Record<string, PagePermissions>;

// -----------------------------------------------------------------------------
// Sidebar types
// -----------------------------------------------------------------------------

export type SidebarPageNode = {
  key: string;
  name_ar: string;
  route: string;
  icon: string | null;
};

export type SidebarModuleNode = {
  module: string;
  module_name_ar: string;
  icon: string | null;
  pages: SidebarPageNode[];
};

// -----------------------------------------------------------------------------
// Permission tree types (used by the roles management UI)
// -----------------------------------------------------------------------------

export type PermDefinition = {
  id: string;
  key: string;
  type: "action" | "field" | "special" | "data_scope";
  name_ar: string;
  description_ar: string | null;
};

export type PermPage = {
  id: string;
  key: string;
  name_ar: string;
  route: string;
  icon: string | null;
  sort_order: number;
  permissions: PermDefinition[];
};

export type PermModule = {
  id: string;
  key: string;
  name_ar: string;
  icon: string | null;
  sort_order: number;
  pages: PermPage[];
};

// -----------------------------------------------------------------------------
// User permission override (for the overrides tab in user edit)
// -----------------------------------------------------------------------------

export type UserPermOverride = {
  permission_id: string;
  permission_key: string;
  is_granted: boolean;
  reason: string | null;
  granted_by: string | null;
  created_at: string;
};

export type OverrideState = "inherit" | "grant" | "revoke";
