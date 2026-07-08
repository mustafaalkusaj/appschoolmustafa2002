import { redirect } from "next/navigation";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { localizeAppPath } from "@/lib/locale-routing";
import { GroupDashboardClient } from "./_components/GroupDashboardClient";

export const dynamic = "force-dynamic";

export default async function GroupDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";

  const context = await resolveSchoolScopedActorContext(null, {
    allowedRoles: ["admin"],
    roleDeniedMessage:
      locale === "ar"
        ? "هذه الصفحة مخصصة لمدير المدرسة على مستوى المدرسة فقط."
        : "This page is reserved for school-level managers only.",
  });

  if (!context.ok) {
    if (context.status === 401) redirect(localizeAppPath("/login", locale));
    redirect(localizeAppPath("/access-denied", locale));
  }

  if (context.value.scopeLevel !== "group_admin") {
    redirect(localizeAppPath("/access-denied", locale));
  }

  return <GroupDashboardClient schoolId={context.value.targetSchoolId} />;
}
