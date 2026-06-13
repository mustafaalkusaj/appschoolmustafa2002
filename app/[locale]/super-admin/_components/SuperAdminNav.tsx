"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import {
  School,
  Users,
  CreditCard,
  Activity,
  History,
  GitBranch,
  Trash2,
  LayoutDashboard,
  RefreshCw,
  Smartphone,
  Phone,
  Palette,
  Check,
  Settings,
  Tag,
} from "@/lib/icons";
import { cn } from "@/lib/brand/brand-utils";
import { useSuperAdminData } from "../_hooks/useSuperAdminData";

const NAV_ITEMS: readonly { href: string; label: string; icon: React.ElementType; exact?: boolean }[] = [
  { href: "/super-admin", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { href: "/super-admin/schools", label: "المدارس", icon: School },
  { href: "/super-admin/users", label: "المستخدمون", icon: Users },
  { href: "/super-admin/subscriptions", label: "الاشتراكات", icon: CreditCard },
  { href: "/super-admin/monitoring", label: "المراقبة", icon: Activity },
  { href: "/super-admin/audit", label: "السجل", icon: History },
  { href: "/super-admin/branches", label: "الفروع", icon: GitBranch },
  { href: "/super-admin/mobile-app", label: "تفاصيل التطبيق", icon: Smartphone },
  { href: "/super-admin/trash", label: "المحذوفات", icon: Trash2 },
  { href: "/super-admin/apps", label: "التطبيقات", icon: Phone },
  { href: "/super-admin/themes", label: "الثيمات", icon: Palette },
  { href: "/super-admin/features", label: "الميزات", icon: Check },
  { href: "/super-admin/global-settings", label: "إعدادات عامة", icon: Settings },
  { href: "/super-admin/app-versions", label: "الإصدارات", icon: Tag },
];

export function SuperAdminNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const { refreshing, lastRefreshed, refresh } = useSuperAdminData();

  return (
    <div className="sticky top-0 z-20 bg-[var(--card-bg)] border-b border-[var(--border)]">
      <div className="flex items-center gap-2 px-4 py-2">
        <nav className="flex items-center gap-0.5 bg-[var(--surface-soft)] rounded-lg p-0.5 border border-[var(--border)] overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const fullHref = `/${locale}${item.href}`;
            const isActive = item.exact
              ? pathname === fullHref
              : pathname.startsWith(fullHref);

            return (
              <Link
                key={item.href}
                href={fullHref}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                )}
              >
                <item.icon size={13} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-1.5 shrink-0">
          {lastRefreshed && (
            <span className="text-[10px] text-[var(--text-muted)]">
              {lastRefreshed.toLocaleTimeString("ar-IQ-u-nu-latn", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={() => void refresh()}
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="تحديث"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}
