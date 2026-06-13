import { describe, expect, it } from "vitest";

import { getAccessDecision, getDefaultRouteForProfile, type UserProfile } from "@/lib/auth";

function buildProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "user-1",
    full_name: "School Manager",
    email: "manager@schoolapp.com",
    role: "admin",
    permissions: [],
    school_id: "school-1",
    is_active: true,
    school: {
      id: "school-1",
      name: "Alpha School",
      is_active: true,
    },
    subscription: {
      id: "sub-1",
      school_id: "school-1",
      status: "active",
      end_date: null,
    },
    ...overrides,
  };
}

describe("school-level manager access", () => {
  it("redirects school-level managers to /group by default", () => {
    const profile = buildProfile({
      scope_level: "group_admin",
      default_path: "/dashboard",
    });

    expect(getDefaultRouteForProfile(profile)).toBe("/group");
  });

  it("allows the group page and blocks other pages for school-level managers", () => {
    const profile = buildProfile({
      scope_level: "group_admin",
    });

    expect(getAccessDecision(profile, "/ar/group")).toEqual({
      allowed: true,
      readOnly: false,
    });
    expect(getAccessDecision(profile, "/ar/dashboard")).toEqual({
      allowed: false,
      reason: "forbidden",
      readOnly: false,
    });
  });

  it("redirects branch-scoped admins to /branch-overview, ignoring default_path", () => {
    const profile = buildProfile({
      scope_level: "branch_user",
      default_path: "/dashboard",
    });

    expect(getDefaultRouteForProfile(profile)).toBe("/branch-overview");
  });

  it("blocks branch-scoped admins from /dashboard and allows /branch-overview", () => {
    const profile = buildProfile({ scope_level: "branch_user" });

    expect(getAccessDecision(profile, "/ar/dashboard")).toEqual({
      allowed: false,
      reason: "forbidden",
      readOnly: false,
    });
    expect(getAccessDecision(profile, "/ar/branch-overview")).toEqual({
      allowed: true,
      readOnly: false,
    });
  });

  it("uses the first assigned page for school-scoped staff with limited pages", () => {
    const profile = buildProfile({
      role: "employee",
      permissions: ["view_payments"],
      scope_level: "group_admin",
      allowed_pages: ["payments", "attendance"],
      default_path: "/payments",
    });

    expect(getDefaultRouteForProfile(profile)).toBe("/payments");
    expect(getAccessDecision(profile, "/ar/payments")).toEqual({
      allowed: true,
      readOnly: false,
    });
    expect(getAccessDecision(profile, "/ar/students")).toEqual({
      allowed: false,
      reason: "forbidden",
      readOnly: false,
    });
  });
});
