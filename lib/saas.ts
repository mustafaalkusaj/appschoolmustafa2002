import type {
  GlobalStats,
  Language,
  MonthlyMetric,
  School,
  SmartInsight,
  SystemNotification,
  TopSchoolMetric,
} from "@/lib/types";
import { buildRecentMonths, daysUntil, getRenderReferenceDate } from "@/lib/date";
import { DEFAULT_LANGUAGE, formatCurrency, getTranslations } from "@/lib/i18n";

export { daysUntil } from "@/lib/date";

export function isSubscriptionExpired(expiresAt: string): boolean {
  return daysUntil(expiresAt) < 0;
}

export function enforceSubscriptionStatus(schools: School[]): School[] {
  return schools.map((school) => {
    if (isSubscriptionExpired(school.subscription.expiresAt)) {
      return { ...school, status: "suspended" };
    }

    return school;
  });
}

export function calculateGlobalStats(schools: School[], totalUsers: number): GlobalStats {
  const totalRevenue = schools.reduce((total, school) => total + school.monthlyRevenue, 0);
  const expiredSubscriptions = schools.filter((school) =>
    isSubscriptionExpired(school.subscription.expiresAt),
  ).length;

  return {
    totalSchools: schools.length,
    totalUsers,
    totalRevenue,
    expiredSubscriptions,
  };
}

export function buildTopSchoolsData(schools: School[]): TopSchoolMetric[] {
  return [...schools]
    .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
    .slice(0, 5)
    .map((school) => ({ school: school.name, revenue: school.monthlyRevenue }));
}

export function buildMonthlyGrowth(
  schools: School[],
  language: Language = DEFAULT_LANGUAGE,
): MonthlyMetric[] {
  const months = buildRecentMonths(6, language);

  return months.map((month) => {
    const schoolsCount = schools.filter((school) => {
      const created = new Date(school.createdAt);
      return `${created.getUTCFullYear()}-${String(created.getUTCMonth() + 1).padStart(2, "0")}` === month.key;
    }).length;

    const revenue = schools
      .filter((school) => {
        const created = new Date(school.createdAt);
        const monthDate = new Date(`${month.key}-01T00:00:00.000Z`);
        return created <= monthDate;
      })
      .reduce((sum, school) => sum + school.monthlyRevenue, 0);

    return {
      month: month.label,
      schools: schoolsCount,
      revenue,
    };
  });
}

export function buildSmartInsights(
  schools: School[],
  monthlyMetrics: MonthlyMetric[],
  language: Language = DEFAULT_LANGUAGE,
): SmartInsight[] {
  const dictionary = getTranslations(language);
  const expiringSoon = schools.filter((school) => {
    const remaining = daysUntil(school.subscription.expiresAt);
    return remaining >= 0 && remaining <= 7;
  });

  const [previous, current] = monthlyMetrics.slice(-2);
  const growthPercent =
    previous && previous.revenue > 0
      ? Math.round(((current.revenue - previous.revenue) / previous.revenue) * 100)
      : 0;

  return [
    {
      id: "expiring-subscriptions",
      title: dictionary.insights.expiringTitle.replace(
        "{count}",
        new Intl.NumberFormat(language === "ar" ? "ar-IQ-u-nu-latn" : "en-US").format(expiringSoon.length),
      ),
      detail:
        expiringSoon.length === 0
          ? dictionary.insights.noRenewalRisk
          : dictionary.insights.followUp.replace(
              "{schools}",
              expiringSoon.map((school) => school.name).join(language === "ar" ? "، " : ", "),
            ),
      trend: expiringSoon.length > 0 ? "down" : "up",
    },
    {
      id: "monthly-growth",
      title:
        growthPercent >= 0
          ? dictionary.insights.revenueUp.replace("{percent}", String(Math.abs(growthPercent)))
          : dictionary.insights.revenueDown.replace("{percent}", String(Math.abs(growthPercent))),
      detail: dictionary.insights.currentRevenue.replace(
        "{revenue}",
        formatCurrency(current?.revenue ?? 0, language),
      ),
      trend: growthPercent >= 0 ? "up" : "down",
    },
  ];
}

export function buildSubscriptionNotifications(schools: School[]): SystemNotification[] {
  const createdAt = getRenderReferenceDate().toISOString();

  return schools
    .flatMap((school) => {
      const remaining = daysUntil(school.subscription.expiresAt);

      if (remaining < 0) {
        return {
          id: `notification-expired-${school.id}`,
          type: "subscription" as const,
          code: "subscription_expired" as const,
          data: {
            schoolName: school.name,
          },
          schoolId: school.id,
          createdAt,
          read: false,
          deletedAt: null,
        };
      }

      if (remaining <= 7) {
        return {
          id: `notification-expiring-${school.id}`,
          type: "subscription" as const,
          code: "subscription_ending_soon" as const,
          data: {
            schoolName: school.name,
            days: remaining,
          },
          schoolId: school.id,
          createdAt,
          read: false,
          deletedAt: null,
        };
      }

      return [];
    })
    .filter(Boolean) as SystemNotification[];
}

export function currency(value: number, language: Language = DEFAULT_LANGUAGE, currencyCode = "USD"): string {
  return formatCurrency(value, language, currencyCode);
}
