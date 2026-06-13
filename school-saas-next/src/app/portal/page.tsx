"use client";

import { CreditCard, GraduationCap, HandCoins } from "lucide-react";

import { ProtectedRoute } from "@/components/permissions/protected-route";
import { AppHeader } from "@/components/shared/app-header";
import { useLanguage } from "@/hooks/useLanguage";
import { usePermissions } from "@/hooks/usePermissions";

function ModuleCard({
  title,
  icon,
  description,
  actions,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  actions: string[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
        <span className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">{icon}</span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <span
            key={action}
            className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            {action}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function PortalPage() {
  const { can, user } = usePermissions();
  const { t } = useLanguage();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader title={t.portal.title} subtitle={t.portal.subtitle} />

        <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-5 sm:px-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            {t.portal.loggedInAs}{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-100">{user?.name}</span>.{" "}
            {t.portal.permissionsHint}
          </div>

          <ProtectedRoute permissions={["view_students"]}>
            <ModuleCard
              title={t.portal.modules.students.title}
              icon={<GraduationCap className="h-4 w-4" />}
              description={t.portal.modules.students.description}
              actions={[
                t.common.view,
                ...(can("add_students") ? [t.common.add] : []),
                ...(can("edit_students") ? [t.common.edit] : []),
                ...(can("delete_students") ? [t.common.delete] : []),
              ]}
            />
          </ProtectedRoute>

          <ProtectedRoute permissions={["view_payments"]}>
            <ModuleCard
              title={t.portal.modules.payments.title}
              icon={<CreditCard className="h-4 w-4" />}
              description={t.portal.modules.payments.description}
              actions={[
                t.common.view,
                ...(can("add_payments") ? [t.common.add] : []),
                ...(can("delete_payments") ? [t.common.delete] : []),
              ]}
            />
          </ProtectedRoute>

          <ProtectedRoute permissions={["view_salaries"]}>
            <ModuleCard
              title={t.portal.modules.salaries.title}
              icon={<HandCoins className="h-4 w-4" />}
              description={t.portal.modules.salaries.description}
              actions={[
                t.common.view,
                ...(can("manage_salaries") ? [t.common.manage] : []),
              ]}
            />
          </ProtectedRoute>
        </main>
      </div>
    </ProtectedRoute>
  );
}
