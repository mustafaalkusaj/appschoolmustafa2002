// ─── Dashboard Widget Definitions ─────────────────────────────────────────────
// IDs must match the sectionEnabled() keys used in DashboardExperience.tsx

export type WidgetId =
  | "stats"
  | "financial"
  | "branding"
  | "activity"
  | "notifications"
  | "fees_table"
  | "payments_list"
  | "overdue_students";

export interface DashboardWidget {
  id: WidgetId;
  nameAr: string;
  descAr: string;
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  {
    id: "stats",
    nameAr: "بطاقات الإحصائيات",
    descAr: "عرض إجمالي الطلاب، الدخل، المصاريف، والمتأخرين في الدفع",
  },
  {
    id: "financial",
    nameAr: "التحليل المالي",
    descAr: "مخطط بياني للأداء المالي خلال الفترة الزمنية المحددة",
  },
  {
    id: "branding",
    nameAr: "الهوية البصرية",
    descAr: "لوحة تخصيص شعار المدرسة والألوان (يظهر للمسؤول الأعلى فقط)",
  },
  {
    id: "activity",
    nameAr: "النشاط الأخير",
    descAr: "سجل آخر العمليات والأنشطة المسجّلة في النظام",
  },
  {
    id: "notifications",
    nameAr: "الإشعارات",
    descAr: "إشعارات النظام والتنبيهات غير المقروءة",
  },
  {
    id: "fees_table",
    nameAr: "جدول الرسوم الدراسية",
    descAr: "قائمة الفصول والرسوم المحددة لكل منها",
  },
  {
    id: "payments_list",
    nameAr: "آخر الدفعات",
    descAr: "قائمة بأحدث دفعات الطلاب المسجّلة في النظام",
  },
  {
    id: "overdue_students",
    nameAr: "الطلاب المتأخرون",
    descAr: "قائمة الطلاب الذين تأخروا في سداد رسومهم الدراسية",
  },
];

export const DEFAULT_WIDGET_ORDER: WidgetId[] = DASHBOARD_WIDGETS.map((w) => w.id);
