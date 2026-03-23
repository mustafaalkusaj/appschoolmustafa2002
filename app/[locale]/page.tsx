"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRole } from "@/hooks/useRole";
import { UltrathinkLogo } from "@/components/UltrathinkLogo";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import type { UserRole } from "@/types/roles";

export default function Home() {
  const { profile, role } = useRole();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);

  const cards = useMemo(() => {
    const allCards: Array<{ href: string; title: string; desc: string; icon: string; roles: UserRole[] }> = [
      {
        href: "/dashboard",
        title: "لوحة التحكم",
        desc: "تابع المؤشرات والتحليلات وأهم تفاصيل التشغيل اليومية",
        icon: "📊",
        roles: ["super_admin", "admin", "employee"],
      },
      {
        href: "/schools",
        title: "المدارس",
        desc: "إدارة المدارس وربطها بالاشتراكات والخطط",
        icon: "🏫",
        roles: ["super_admin"],
      },
      {
        href: "/students",
        title: "الطلاب",
        desc: "إدارة بيانات الطلاب والصفوف والشعب الدراسية",
        icon: "👥",
        roles: ["super_admin", "admin", "employee"],
      },
      {
        href: "/teachers",
        title: "إدارة الأساتذة",
        desc: "إنشاء وتعديل حسابات الأساتذة وربطهم بالمواد والصفوف",
        icon: "🪪",
        roles: ["super_admin", "admin"],
      },
      {
        href: "/payments",
        title: "الحسابات",
        desc: "متابعة التحصيلات والأرصدة المتبقية على الطلاب",
        icon: "💳",
        roles: ["super_admin", "admin", "employee"],
      },
      {
        href: "/expenses",
        title: "المصروفات",
        desc: "تسجيل المصروفات التشغيلية ومتابعة أنواعها",
        icon: "💰",
        roles: ["super_admin", "admin"],
      },
      {
        href: "/attendance",
        title: "الحضور",
        desc: "تسجيل حضور الطلاب اليومي ومتابعة حالاتهم",
        icon: "🗓️",
        roles: ["super_admin", "admin", "employee"],
      },
      {
        href: "/reports",
        title: "التقارير",
        desc: "إنشاء تقارير تشغيلية ومالية مفصلة",
        icon: "📈",
        roles: ["super_admin", "admin"],
      },
      {
        href: "/subscriptions",
        title: "الاشتراكات",
        desc: "إدارة خطط الاشتراك وحالة التفعيل لكل مدرسة",
        icon: "💳",
        roles: ["super_admin"],
      },
      {
        href: "/super-admin",
        title: "لوحة المدير العام",
        desc: "إدارة المدارس والمستخدمين والاشتراكات وتشغيل المنصة",
        icon: "👑",
        roles: ["super_admin"],
      },
    ];
    if (!role) return [];
    return allCards.filter((card) => card.roles.includes(role));
  }, [role]);

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <header className="bg-white/90 dark:bg-slate-900/90 shadow-sm backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <UltrathinkLogo size={40} title="منصة إدارة المدرسة" subtitle="نظام التشغيل المدرسي" />
            <div className="text-right">
              <p className="text-sm text-slate-500 dark:text-slate-400">مرحباً بعودتك</p>
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
