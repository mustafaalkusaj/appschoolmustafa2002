import { redirect } from "next/navigation";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { localizeAppPath } from "@/lib/locale-routing";

export const dynamic = "force-dynamic";

export default async function CreateBudgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
  const { year } = await searchParams;

  const context = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["admin"],
      roleDeniedMessage:
        locale === "ar"
          ? "لا يمكنك إنشاء موازنات من هذا الحساب."
          : "You cannot create budgets from this account.",
    },
  );

  if (!context.ok) {
    if (context.status === 401) {
      redirect(localizeAppPath("/login", locale));
    }
    redirect(localizeAppPath("/access-denied", locale));
  }

  if (context.value.scopeLevel !== "group_admin") {
    redirect(localizeAppPath("/access-denied", locale));
  }

  // Redirect to dashboard with the year parameter in URL
  // The actual budget creation form should be a client component
  const budgetYear = year ? parseInt(year, 10) : new Date().getFullYear();

  if (Number.isNaN(budgetYear) || budgetYear < 2020 || budgetYear > 2100) {
    redirect(localizeAppPath("/group", locale));
  }

  // For now, redirect back to group page
  // In the future, this should render a form to create the budget
  redirect(localizeAppPath("/group", locale));
}
