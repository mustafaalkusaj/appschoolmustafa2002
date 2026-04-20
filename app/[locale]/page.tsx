"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppIcon } from "@/components/AppIcon";
import { UltrathinkLogo } from "@/components/brand";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRole } from "@/hooks/useRole";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import type { UserRole } from "@/types/roles";

export default function Home() {
  const { profile, role } = useRole();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations("home");
  const commonT = useTranslations("common");

  const cards = useMemo(() => {
    const allCards: Array<{ href: string; title: string; desc: string; icon: string; roles: UserRole[] }> = [
      {
        href: "/dashboard",
        title: t("cards.dashboard.title"),
        desc: t("cards.dashboard.desc"),
        icon: "📊",
        roles: ["super_admin", "admin", "employee"],
      },
      {
        href: "/schools",
        title: t("cards.schools.title"),
        desc: t("cards.schools.desc"),
        icon: "🏫",
        roles: ["super_admin"],
      },
      {
        href: "/students",
        title: t("cards.students.title"),
        desc: t("cards.students.desc"),
        icon: "👥",
        roles: ["super_admin", "admin", "employee"],
      },
      {
        href: "/teachers",
        title: t("cards.teachers.title"),
        desc: t("cards.teachers.desc"),
        icon: "🪪",
        roles: ["super_admin", "admin"],
      },
      {
        href: "/payments",
        title: t("cards.payments.title"),
        desc: t("cards.payments.desc"),
        icon: "💳",
        roles: ["super_admin", "admin", "employee"],
      },
      {
        href: "/expenses",
        title: t("cards.expenses.title"),
        desc: t("cards.expenses.desc"),
        icon: "💰",
        roles: ["super_admin", "admin"],
      },
      {
        href: "/attendance",
        title: t("cards.attendance.title"),
        desc: t("cards.attendance.desc"),
        icon: "🗓️",
        roles: ["super_admin", "admin", "employee"],
      },
      {
        href: "/reports",
        title: t("cards.reports.title"),
        desc: t("cards.reports.desc"),
        icon: "📈",
        roles: ["super_admin", "admin"],
      },
      {
        href: "/subscriptions",
        title: t("cards.subscriptions.title"),
        desc: t("cards.subscriptions.desc"),
        icon: "💳",
        roles: ["super_admin"],
      },
      {
        href: "/super-admin",
        title: t("cards.superAdmin.title"),
        desc: t("cards.superAdmin.desc"),
        icon: "👑",
        roles: ["super_admin"],
      },
    ];
    if (!role) return [];
    const allowedPages = profile?.allowed_pages ?? [];
    return allCards.filter((card) => {
      if (!card.roles.includes(role)) return false;
      if (allowedPages.length === 0) return true;
      return allowedPages.includes(card.href.replace(/^\//, ""));
    });
  }, [profile?.allowed_pages, role, t]);

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="min-h-screen bg-[var(--background)]">
        <header className="bg-[var(--surface-strong)] shadow-sm border-b border-[var(--border)]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <UltrathinkLogo size={40} title={commonT("brand")} subtitle={commonT("subtitle")} />
            <div className="text-right">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("welcomeBack")}</p>
              <p className="font-semibold text-slate-900 dark:text-white">{profile?.email}</p>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <Link key={card.href} href={localizeAppPath(card.href, locale)} className="group">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl transition-all p-7 cursor-pointer transform hover:-translate-y-1">
                  <div className="text-4xl mb-4">
                    <AppIcon token={card.icon} size={36} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {card.title}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">{card.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
