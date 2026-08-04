import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminMobileRouteContext } from "@/lib/mobile-super-admin-server";

/**
 * GET /api/mobile/super_admin/permissions
 *
 * Returns the school's real role/permission matrix: the roles defined in
 * `school_roles`, the permission catalog grouped by page, and which permission
 * ids each role actually holds. The mobile screen previously rendered an
 * invented four-role table with eight made-up permissions, which bore no
 * relation to what the platform enforces.
 *
 * Read-only on purpose: editing role permissions goes through
 * `PUT /api/v1/roles/[roleId]/perms`, which applies the super-admin-only
 * permission ceiling. This endpoint exists so the mobile view can tell the
 * truth, not so it can mutate.
 */
export async function GET(req: NextRequest) {
  try {
    const context = await resolveSuperAdminMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const { serviceSupabase } = context.value;
    const requestedSchoolId = new URL(req.url).searchParams.get("school_id");

    // A super_admin spans every tenant, and their *own* school is often an
    // empty demo tenant, so the screen needs a picker rather than assuming the
    // session's school. Return the roster with role counts to drive it.
    const { data: schoolRows, error: schoolsError } = await serviceSupabase
      .from("schools")
      .select("id, name")
      .order("name");
    if (schoolsError) throw schoolsError;

    const { data: allRoles, error: allRolesError } = await serviceSupabase
      .from("school_roles")
      .select("school_id");
    if (allRolesError) throw allRolesError;

    const roleCountBySchool = new Map<string, number>();
    for (const row of allRoles ?? []) {
      const key = row.school_id as string;
      roleCountBySchool.set(key, (roleCountBySchool.get(key) ?? 0) + 1);
    }

    const schools = (schoolRows ?? []).map((s) => ({
      id: s.id as string,
      name: s.name as string,
      role_count: roleCountBySchool.get(s.id as string) ?? 0,
    }));

    // Honour an explicit pick; otherwise land on a school that actually has
    // roles so the screen is never pointlessly empty on first open.
    const schoolId =
      requestedSchoolId ??
      schools.find((s) => s.role_count > 0)?.id ??
      schools[0]?.id ??
      null;

    if (!schoolId) {
      return NextResponse.json({
        ok: true,
        school_id: null,
        schools,
        roles: [],
        pages: [],
        assignments: {},
      });
    }

    const [rolesResult, pagesResult, defsResult] = await Promise.all([
      serviceSupabase
        .from("school_roles")
        .select("id, key, name_ar, is_system, color")
        .eq("school_id", schoolId)
        .order("is_system", { ascending: false })
        .order("name_ar"),
      serviceSupabase
        .from("perm_pages")
        .select("id, key, name_ar, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order"),
      serviceSupabase
        .from("perm_definitions")
        .select("id, page_id, type, key, name_ar, description_ar"),
    ]);

    if (rolesResult.error) throw rolesResult.error;
    if (pagesResult.error) throw pagesResult.error;
    if (defsResult.error) throw defsResult.error;

    const roles = rolesResult.data ?? [];
    const roleIds = roles.map((r) => r.id as string);

    const assignments: Record<string, string[]> = {};
    if (roleIds.length) {
      const { data: assigned, error: assignedError } = await serviceSupabase
        .from("role_perm_assignments")
        .select("role_id, permission_id")
        .in("role_id", roleIds);
      if (assignedError) throw assignedError;
      for (const row of assigned ?? []) {
        const key = row.role_id as string;
        (assignments[key] ??= []).push(row.permission_id as string);
      }
    }

    const defsByPage = new Map<string, Record<string, unknown>[]>();
    for (const def of defsResult.data ?? []) {
      const pageId = (def.page_id as string) ?? "";
      if (!defsByPage.has(pageId)) defsByPage.set(pageId, []);
      defsByPage.get(pageId)!.push(def);
    }

    const pages = (pagesResult.data ?? [])
      .map((page) => ({
        id: page.id,
        key: page.key,
        name_ar: page.name_ar,
        permissions: defsByPage.get(page.id as string) ?? [],
      }))
      .filter((page) => page.permissions.length > 0);

    return NextResponse.json({
      ok: true,
      school_id: schoolId,
      roles: roles.map((role) => ({
        ...role,
        granted_count: assignments[role.id as string]?.length ?? 0,
      })),
      pages,
      assignments,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
