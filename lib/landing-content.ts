import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Banknote,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  GitBranch,
  GraduationCap,
  HandCoins,
  History,
  Languages,
  LayoutDashboard,
  Lock,
  MapPin,
  MessageSquare,
  Monitor,
  NotebookPen,
  Phone,
  Play,
  Printer,
  ReceiptText,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  UserCheck,
  UserRoundPlus,
  Users,
  Wallet,
} from "@/lib/icons";

export type AppLocale = "ar" | "en";
export type MockupVariant = "students" | "finance" | "reports";

export interface NavLinkContent { id: string; label: string }
export interface IconItemContent { icon: LucideIcon; title: string; desc: string }
export interface StatContent { to: number; decimals?: number; prefix?: string; suffix?: string; label: string }
export interface FloatingChipContent { icon: LucideIcon; title: string; value: string }
export interface ActivityEventContent { icon: LucideIcon; text: string; value: string }
export interface ShowcaseContent { id: string; eyebrow: string; title: string; description: string; bullets: IconItemContent[]; variant: MockupVariant }
export interface TestimonialContent { text: string; author: string; role: string }
export interface SocialLinkContent { label: string; handle: string; href: string; icon: LucideIcon }
export interface ComparisonRow { label: string; us: boolean; them: boolean }
export interface FaqItem { q: string; a: string }
export interface NewsItem { tag: string; date: string; title: string; excerpt: string }
export interface GalleryItem { variant: MockupVariant; label: string }
export interface TimelineEvent { time: string; title: string; desc: string; icon: LucideIcon }
export interface RoleTab { key: string; label: string; icon: LucideIcon; description: string; features: IconItemContent[] }
export interface TemplateItem { title: string; type: string; icon: LucideIcon }
export interface VideoItem { title: string; duration: string }
export interface DownloadItem { name: string; size: string; format: string }
export interface WallItem { handle: string; source: string; text: string }
export interface MapCity { name: string; x: number; y: number }
export interface ApiFeature { icon: LucideIcon; title: string; desc: string }

export interface LandingContent {
  nav: { links: NavLinkContent[]; login: string };
  hero: {
    badge: string; title: string; titleAccent: string; description: string;
    ctaPrimary: string; ctaSecondary: string; proof: string;
    stats: StatContent[]; chips: FloatingChipContent[];
    activity: { label: string; events: ActivityEventContent[] };
    typographicWords: string[];
  };
  marquee: { label: string; items: string[] };
  schoolsStrip: { label: string; items: string[] };
  liveSystem: { eyebrow: string; title: string; description: string; label: string; counts: StatContent[] };
  platform: { eyebrow: string; title: string; description: string; cards: IconItemContent[] };
  showcases: ShowcaseContent[];
  features: { eyebrow: string; title: string; description: string; cards: IconItemContent[] };
  gallery: { eyebrow: string; title: string; description: string; items: GalleryItem[] };
  iraqMap: { eyebrow: string; title: string; description: string; cities: MapCity[] };
  savingsCalc: {
    eyebrow: string; title: string; description: string;
    studentsLabel: string; hoursPerYearLabel: string; daysPerYearLabel: string; moneyPerYearLabel: string;
    moneySuffix: string; note: string;
  };
  timeline: { eyebrow: string; title: string; description: string; events: TimelineEvent[] };
  roles: { eyebrow: string; title: string; description: string; tabs: RoleTab[] };
  templates: { eyebrow: string; title: string; description: string; preview: string; items: TemplateItem[] };
  receiptDemo: {
    eyebrow: string; title: string; description: string;
    studentLabel: string; studentPlaceholder: string;
    amountLabel: string; amountPlaceholder: string;
    feeLabel: string; feePlaceholder: string;
    generate: string;
    receiptTitle: string; receiptNumberLabel: string; receiptDateLabel: string;
    receiptFromLabel: string; receiptForLabel: string; receiptAmountLabel: string;
    receiptIssuer: string; receiptCurrency: string;
  };
  integrations: { eyebrow: string; title: string; description: string; items: IconItemContent[] };
  api: { eyebrow: string; title: string; description: string; badges: string[]; features: ApiFeature[] };
  comparison: { eyebrow: string; title: string; description: string; usLabel: string; themLabel: string; rows: ComparisonRow[] };
  plansCompare: {
    eyebrow: string; title: string; description: string;
    lite: { label: string; features: string[] };
    full: { label: string; features: string[] };
  };
  testimonials: { eyebrow: string; title: string; items: TestimonialContent[] };
  parentsTestimonials: { eyebrow: string; title: string; items: TestimonialContent[] };
  wall: { eyebrow: string; title: string; items: WallItem[] };
  beforeAfter: {
    eyebrow: string; title: string; description: string;
    beforeLabel: string; afterLabel: string; beforeItems: string[]; afterItems: string[];
  };
  trust: { eyebrow: string; title: string; items: IconItemContent[] };
  securityBadge: { badge: string; title: string; location: string; points: string[] };
  steps: { eyebrow: string; title: string; description: string; items: IconItemContent[] };
  learning: { eyebrow: string; title: string; description: string; play: string; items: VideoItem[] };
  templateLibrary: { eyebrow: string; title: string; description: string; download: string; items: DownloadItem[] };
  news: { eyebrow: string; title: string; description: string; readMore: string; items: NewsItem[] };
  countdown: { eyebrow: string; title: string; description: string; cta: string; days: string };
  lastSignup: { template: string; relative: string };
  faq: { eyebrow: string; title: string; items: FaqItem[] };
  demo: {
    eyebrow: string; title: string; description: string;
    nameLabel: string; namePlaceholder: string; phoneLabel: string; phonePlaceholder: string;
    submit: string; success: string; mailSubject: string;
  };
  chat: { greeting: string; placeholder: string; send: string; openLabel: string; suggestions: string[] };
  floatingCta: { text: string; button: string };
  apiStatus: { label: string; operational: string };
  contact: { eyebrow: string; title: string; description: string; cta: string; email: string; socials: SocialLinkContent[] };
  footer: { tagline: string; rights: string };
}

const ar: LandingContent = {
  nav: {
    links: [
      { id: "features", label: "الميزات" },
      { id: "finance", label: "المالية" },
      { id: "roles", label: "لكل دور" },
      { id: "testimonials", label: "آراء" },
      { id: "faq", label: "الأسئلة" },
      { id: "contact", label: "تواصل" },
    ],
    login: "تسجيل الدخول",
  },
  hero: {
    badge: "منصة إدارة المدارس الأولى عربياً",
    title: "أدِر مدرستك",
    titleAccent: "باحتراف.",
    description: "منصة واحدة لإدارة الطلاب والأقساط والحضور والتقارير — بواجهة عربية أنيقة وحسابات دقيقة، وكل شيء في مكان واحد.",
    ctaPrimary: "ابدأ الآن",
    ctaSecondary: "استكشف الميزات",
    proof: "موثوقة من مدارس تدير آلاف الطلاب كل يوم",
    stats: [
      { to: 12, suffix: "k+", label: "طالب مُدار" },
      { to: 99.9, decimals: 1, suffix: "%", label: "وقت تشغيل" },
      { to: 24, suffix: "/7", label: "دعم فني" },
    ],
    chips: [
      { icon: CheckCircle2, title: "تم استلام قسط", value: "٢٥٠٬٠٠٠ د.ع" },
      { icon: CalendarDays, title: "حضور اليوم", value: "%96" },
      { icon: UserRoundPlus, title: "طلاب جدد", value: "+18" },
    ],
    activity: {
      label: "نشاط مباشر",
      events: [
        { icon: HandCoins, text: "تم استلام قسط جديد", value: "+٢٥٠٬٠٠٠ د.ع" },
        { icon: UserRoundPlus, text: "تسجيل طالب جديد", value: "الصف الرابع" },
        { icon: CalendarDays, text: "تحديث الحضور اليومي", value: "%96" },
        { icon: ReceiptText, text: "صرف راتب موظف", value: "تم" },
      ],
    },
    typographicWords: ["طلاب", "حضور", "أقساط", "تقارير", "صفوف", "رواتب"],
  },
  marquee: { label: "تثق بنا", items: ["مدارس أهلية", "رياض أطفال", "مجمعات تربوية", "معاهد", "مدارس دولية", "ثانويات"] },
  schoolsStrip: {
    label: "مدارس تستخدم النظام",
    items: ["مدرسة المستقبل", "أكاديمية النخبة", "روضة الزهور", "مجمع الأمل", "ثانوية الرواد", "أكاديمية الأجيال"],
  },
  liveSystem: {
    eyebrow: "هذا الشهر",
    title: "النظام يعمل على مدار الساعة",
    description: "أرقام مباشرة من تشغيل المدارس على المنصة.",
    label: "آخر تحديث: قبل دقائق",
    counts: [
      { to: 184, suffix: "k", label: "قسط معالَج" },
      { to: 92, suffix: "k", label: "حضور مُسجَّل" },
      { to: 12, suffix: "k", label: "تقرير مُولَّد" },
      { to: 7, suffix: "k", label: "سند مطبوع" },
    ],
  },
  platform: {
    eyebrow: "في كل مكان",
    title: "اعمل من أي مكان، وابقَ متزامناً",
    description: "ادخل من المتصفح على المكتب أو من الهاتف — بياناتك محدّثة لحظياً عبر كل الأجهزة دون أي خطوة إضافية.",
    cards: [
      { icon: Monitor, title: "تطبيق الويب", desc: "لوحة تحكم كاملة من أي متصفح" },
      { icon: Phone, title: "متجاوب مع الهاتف", desc: "تجربة سلسة على الشاشات الصغيرة" },
      { icon: RefreshCw, title: "تزامن لحظي", desc: "تحديث فوري عبر كل الأجهزة" },
    ],
  },
  showcases: [
    {
      id: "students", eyebrow: "إدارة الطلاب", title: "خطّط، سجّل، وتابع طلابك",
      description: "سجلات شاملة لكل طالب، توزيع على الصفوف والمجموعات، ومتابعة يومية للحضور — كل شيء منظم وواضح.",
      variant: "students",
      bullets: [
        { icon: Users, title: "سجلات شاملة", desc: "بيانات كل طالب في بطاقة واحدة" },
        { icon: CalendarDays, title: "حضور يومي", desc: "تسجيل سريع ومتابعة دقيقة" },
        { icon: BarChart3, title: "تقارير أداء", desc: "نظرة لحظية على الصفوف" },
      ],
    },
    {
      id: "finance", eyebrow: "الإدارة المالية", title: "أنشئ سندات، سجّل المصاريف، وراقب أرباحك",
      description: "تحصيل الأقساط، تسجيل المصاريف والرواتب، ومتابعة الإيرادات والمتبقي — حسابات دقيقة بلا أوراق متناثرة.",
      variant: "finance",
      bullets: [
        { icon: HandCoins, title: "تحصيل الأقساط", desc: "سندات وإيصالات منظمة" },
        { icon: ReceiptText, title: "المصاريف والرواتب", desc: "تسجيل وتتبع كل بند" },
        { icon: TrendingUp, title: "متابعة الأرباح", desc: "إيرادات ومتبقي بلمحة" },
      ],
    },
  ],
  features: {
    eyebrow: "كل ما تحتاجه", title: "ميزات مصمّمة للمدارس الحقيقية",
    description: "أدوات دقيقة تغطي يومك الإداري من أوله لآخره.",
    cards: [
      { icon: Building2, title: "تعدد الفروع", desc: "أدر كل فروع مدرستك من حساب واحد بصلاحيات منفصلة لكل فرع." },
      { icon: BarChart3, title: "تقارير لحظية", desc: "لوحات ورسوم بيانية تتحدث عن أرقامك فوراً." },
      { icon: ShieldCheck, title: "أدوار وصلاحيات", desc: "تحكّم دقيق بمن يرى ويعدّل كل صفحة." },
      { icon: Languages, title: "عربي وإنكليزي", desc: "دعم كامل لليمين واليسار وتبديل فوري للغة." },
    ],
  },
  gallery: {
    eyebrow: "من داخل النظام", title: "واجهة واضحة تخدم عملك",
    description: "لوحات منظمة لكل قسم — طلاب، مالية، وتقارير.",
    items: [
      { variant: "students", label: "لوحة الطلاب" },
      { variant: "finance", label: "اللوحة المالية" },
      { variant: "reports", label: "لوحة التقارير" },
    ],
  },
  iraqMap: {
    eyebrow: "حضور وطني", title: "مدارس تستخدمنا في كل العراق",
    description: "نقاط ضوئية تمثل فروع مدارس تعمل على المنصة.",
    cities: [
      { name: "بغداد", x: 50, y: 50 }, { name: "البصرة", x: 64, y: 80 }, { name: "الموصل", x: 44, y: 18 },
      { name: "أربيل", x: 56, y: 22 }, { name: "السليمانية", x: 64, y: 28 }, { name: "كركوك", x: 54, y: 30 },
      { name: "النجف", x: 42, y: 62 }, { name: "كربلاء", x: 44, y: 56 }, { name: "الناصرية", x: 56, y: 72 },
      { name: "ديالى", x: 60, y: 42 },
    ],
  },
  savingsCalc: {
    eyebrow: "احسب توفيرك", title: "كم يوفّر النظام لمدرستك؟",
    description: "حرّك العدد لترى الوقت والمال اللي يوفّرها سكول عراق.",
    studentsLabel: "عدد الطلاب", hoursPerYearLabel: "ساعة عمل يدوي توفّر بالسنة",
    daysPerYearLabel: "يوم عمل توفّر بالسنة", moneyPerYearLabel: "كلفة موفّرة بالسنة",
    moneySuffix: "د.ع",
    note: "افتراض: ٤ دقائق عمل يدوي لكل طالب يومياً، أجر ساعة ٥٬٠٠٠ د.ع، ٢٠٠ يوم دراسي.",
  },
  timeline: {
    eyebrow: "يومك مع سكول عراق", title: "من ٨ صباحاً إلى ٢ ظهراً",
    description: "هذا ما يحدث في النظام خلال يوم مدرسي عادي.",
    events: [
      { time: "٠٨:٠٠", title: "تسجيل الحضور", desc: "كل الصفوف مسجلة قبل بدء الحصة الأولى.", icon: Sun },
      { time: "٠٩:٣٠", title: "استلام أقساط", desc: "سندات تُطبع وإشعار يصل الأهالي.", icon: HandCoins },
      { time: "١١:٠٠", title: "تحديث الكادر", desc: "صرف راتب، تعيين معلم، تحديث بيانات.", icon: UserCheck },
      { time: "١٢:٣٠", title: "تقرير اليوم", desc: "ملخص الحضور والمالية بضغطة زر.", icon: BarChart3 },
      { time: "٠٢:٠٠", title: "إغلاق اليوم", desc: "نسخة احتياطية تلقائية وتنبيه نهاية الدوام.", icon: Clock },
    ],
  },
  roles: {
    eyebrow: "لكل دور", title: "النظام يتكيّف مع وظيفتك",
    description: "اختر دورك لتشاهد الميزات اللي تهمّك.",
    tabs: [
      {
        key: "principal", label: "مدير", icon: Briefcase,
        description: "نظرة شاملة على المدرسة، بقرارات أسرع.",
        features: [
          { icon: BarChart3, title: "لوحة قيادة", desc: "أرقام المدرسة كلها بصفحة واحدة." },
          { icon: ShieldCheck, title: "صلاحيات", desc: "تحكّم بمن يرى ويعدّل." },
          { icon: Building2, title: "تعدد فروع", desc: "كل الفروع من حساب واحد." },
        ],
      },
      {
        key: "accountant", label: "محاسب", icon: Wallet,
        description: "أرقامك دقيقة وأوراقك منظمة.",
        features: [
          { icon: HandCoins, title: "تحصيل أقساط", desc: "سندات تُطبع تلقائياً." },
          { icon: ReceiptText, title: "مصاريف ورواتب", desc: "كل بند مُسجّل." },
          { icon: TrendingUp, title: "إيرادات", desc: "ميزانية شهرية بلمحة." },
        ],
      },
      {
        key: "teacher", label: "معلم", icon: GraduationCap,
        description: "تركيز على الصف، بأقل أوراق.",
        features: [
          { icon: CalendarDays, title: "حضور سريع", desc: "تسجيل الصف بثوان." },
          { icon: NotebookPen, title: "ملاحظات الطلاب", desc: "تدوين فوري." },
          { icon: BarChart3, title: "أداء الصف", desc: "نظرة لحظية." },
        ],
      },
      {
        key: "parent", label: "ولي أمر", icon: Users,
        description: "متابعة مستمرة لابنك.",
        features: [
          { icon: Bell, title: "إشعارات", desc: "حضور وأقساط فوراً." },
          { icon: BarChart3, title: "تقارير الأداء", desc: "صورة واضحة." },
          { icon: MessageSquare, title: "تواصل مباشر", desc: "مع كادر المدرسة." },
        ],
      },
    ],
  },
  templates: {
    eyebrow: "بنك القوالب", title: "قوالب جاهزة تطبع فوراً",
    description: "اختر قالباً مناسباً وعدّله بمعلومات مدرستك.",
    preview: "معاينة",
    items: [
      { title: "سند قبض أقساط", type: "مالي", icon: ReceiptText },
      { title: "شهادة تخرج", type: "أكاديمي", icon: GraduationCap },
      { title: "تقرير حضور شهري", type: "تقرير", icon: CalendarDays },
      { title: "كشف رواتب", type: "مالي", icon: HandCoins },
      { title: "بطاقة طالب", type: "هوية", icon: UserCheck },
      { title: "تقرير مالي", type: "تقرير", icon: BarChart3 },
    ],
  },
  receiptDemo: {
    eyebrow: "مولّد تجريبي", title: "أنشئ سند قبض تجريبي بثوان",
    description: "أدخل البيانات وشاهد كيف يطلع السند من النظام.",
    studentLabel: "اسم الطالب", studentPlaceholder: "مثال: محمد أحمد",
    amountLabel: "المبلغ", amountPlaceholder: "٢٥٠٬٠٠٠",
    feeLabel: "بدل", feePlaceholder: "قسط فصلي",
    generate: "أنشئ السند",
    receiptTitle: "سند قبض", receiptNumberLabel: "رقم السند", receiptDateLabel: "التاريخ",
    receiptFromLabel: "استلمنا من", receiptForLabel: "وذلك بدل", receiptAmountLabel: "المبلغ",
    receiptIssuer: "أمانة الصندوق — سكول عراق", receiptCurrency: "د.ع",
  },
  integrations: {
    eyebrow: "تكاملات", title: "متصل بأدواتك اليومية",
    description: "إشعارات، تصدير، وطباعة — كل شيء جاهز.",
    items: [
      { icon: MessageSquare, title: "واتساب", desc: "إشعارات للأهالي" },
      { icon: Phone, title: "رسائل SMS", desc: "تنبيهات فورية" },
      { icon: FileSpreadsheet, title: "تصدير Excel", desc: "بياناتك بضغطة" },
      { icon: Printer, title: "طباعة سندات", desc: "إيصالات احترافية" },
      { icon: FileText, title: "تقارير PDF", desc: "جاهزة للأرشفة" },
    ],
  },
  api: {
    eyebrow: "للمطورين", title: "نظام مرن قابل للتوسعة",
    description: "اربط بياناتك بأنظمتك الأخرى من خلال واجهات حديثة وآمنة.",
    badges: ["REST", "Webhooks", "OAuth 2.0", "JSON"],
    features: [
      { icon: GitBranch, title: "واجهات REST", desc: "نقاط نهاية واضحة لكل البيانات." },
      { icon: Bell, title: "Webhooks", desc: "اشترك بالأحداث وقت حدوثها." },
      { icon: Database, title: "تصدير برمجي", desc: "احصل على بياناتك بـJSON." },
      { icon: ShieldCheck, title: "مصادقة OAuth", desc: "تكامل آمن مع أدواتك." },
    ],
  },
  comparison: {
    eyebrow: "ليش سكول عراق", title: "النظام مقابل الطريقة اليدوية",
    description: "وفّر وقتك وقلّل الأخطاء.",
    usLabel: "سكول عراق", themLabel: "الدفاتر والأوراق",
    rows: [
      { label: "حسابات دقيقة فورية", us: true, them: false },
      { label: "متابعة الأقساط والمتبقي", us: true, them: false },
      { label: "تقارير بضغطة زر", us: true, them: false },
      { label: "وصول من أي مكان", us: true, them: false },
      { label: "نسخ احتياطي آمن", us: true, them: false },
      { label: "عرضة للضياع والخطأ", us: false, them: true },
    ],
  },
  plansCompare: {
    eyebrow: "اختر الخطة المناسبة", title: "خطة مخفّفة أم كاملة؟",
    description: "نفس الجودة — ميزات متدرّجة حسب حاجة مدرستك.",
    lite: {
      label: "المخفّفة",
      features: ["إدارة الطلاب الأساسية", "تحصيل الأقساط", "حضور يومي", "تقارير أساسية", "حتى ٣ مستخدمين"],
    },
    full: {
      label: "الكاملة",
      features: [
        "كل ما في المخفّفة", "تعدد الفروع", "صلاحيات متقدمة", "تقارير متقدمة + تصدير",
        "تكاملات (واتساب/SMS)", "مستخدمون بلا حد", "دعم ذو أولوية",
      ],
    },
  },
  testimonials: {
    eyebrow: "آراء المدارس", title: "كوادر إدارية تثق بنا",
    items: [
      { text: "النظام سهّل علينا إدارة الطلاب والحسابات بشكل كامل، ووفّر وقتاً كبيراً على الكادر الإداري.", author: "مدير مدرسة", role: "مدرسة أهلية" },
      { text: "أفضل منصة تعليمية استخدمناها — سهلة ومتكاملة وتدعم كل احتياجاتنا اليومية.", author: "مديرة مدرسة", role: "مجمع تربوي" },
      { text: "التقارير المالية صارت تجهز بضغطة زر بدل ساعات من العمل اليدوي.", author: "محاسب", role: "إدارة مالية" },
    ],
  },
  parentsTestimonials: {
    eyebrow: "بعيون الأهالي", title: "آراء أولياء الأمور",
    items: [
      { text: "صرت أشوف حضور ابني وأقساطه من تلفوني مباشرة، وهذا براحني كثيراً.", author: "أب", role: "ولي أمر" },
      { text: "الإشعارات اللحظية أفضل شيء — أعرف كل تفصيلة لحظة وقوعها.", author: "أم", role: "ولي أمر" },
    ],
  },
  wall: {
    eyebrow: "حائط المحبة", title: "ما يقوله الناس عنّا",
    items: [
      { handle: "@ahmad_admin", source: "X", text: "أخيراً نظام عربي محترم لإدارة المدرسة!" },
      { handle: "@sara_acc", source: "X", text: "التقارير اللحظية وفّرت علي ساعات كل أسبوع." },
      { handle: "ولي أمر", source: "واتساب", text: "أعرف حضور ابني لحظة بلحظة، شيء رائع." },
      { handle: "مدير مدرسة", source: "مكالمة", text: "خدمة عملاء سريعة، ودعم فني محترم." },
      { handle: "@school_mgr", source: "X", text: "نقلنا كل الحسابات من الورق للنظام بأسبوع." },
      { handle: "محاسب", source: "بريد", text: "السندات تطلع تلقائياً، خلصنا من الطباعة اليدوية." },
    ],
  },
  beforeAfter: {
    eyebrow: "قبل وبعد", title: "من الورق إلى النظام",
    description: "اسحب المقبض لترى الفرق.",
    beforeLabel: "قبل", afterLabel: "بعد",
    beforeItems: ["دفاتر متناثرة", "حسابات بطيئة", "أخطاء متكررة", "صعوبة الوصول"],
    afterItems: ["كل شيء بمكان واحد", "حسابات لحظية", "دقة تامة", "وصول من أي مكان"],
  },
  trust: {
    eyebrow: "أمان وثقة", title: "بياناتك محمية ومصونة",
    items: [
      { icon: Shield, title: "تشفير كامل", desc: "حماية للبيانات أثناء النقل والتخزين." },
      { icon: Lock, title: "صلاحيات دقيقة", desc: "كل مستخدم يرى ما يخصّه فقط." },
      { icon: Database, title: "نسخ احتياطي", desc: "نسخ دورية تلقائية." },
      { icon: BadgeCheck, title: "موثوقية عالية", desc: "وقت تشغيل ٩٩٫٩٪." },
    ],
  },
  securityBadge: {
    badge: "بياناتك على سيرفر بالعراق", title: "حماية تليق ببياناتك", location: "بغداد، العراق",
    points: ["تشفير TLS أثناء النقل", "تشفير AES-256 أثناء التخزين", "نسخ احتياطية يومية مشفرة", "سجلات وصول مفصّلة"],
  },
  steps: {
    eyebrow: "البداية سهلة", title: "ابدأ بثلاث خطوات",
    description: "من التسجيل إلى أول تقرير خلال دقائق.",
    items: [
      { icon: GraduationCap, title: "سجّل مدرستك", desc: "أنشئ حساب مدرستك وأضف فروعها." },
      { icon: Users, title: "أضف الطلاب والكادر", desc: "استورد أو أدخل البيانات بسهولة." },
      { icon: LayoutDashboard, title: "ابدأ المتابعة", desc: "تحصيل، حضور، وتقارير فوراً." },
    ],
  },
  learning: {
    eyebrow: "مركز التعلّم", title: "دروس قصيرة لتبدأ بسرعة",
    description: "فيديوهات تشرح كل ميزة بأقل من ٣ دقائق.",
    play: "تشغيل",
    items: [
      { title: "إعداد المدرسة والفروع", duration: "٢:٤٠" },
      { title: "إضافة الطلاب والصفوف", duration: "٢:١٠" },
      { title: "تحصيل الأقساط وطباعة السندات", duration: "٢:٥٥" },
      { title: "إنشاء تقرير مالي شهري", duration: "١:٥٠" },
    ],
  },
  templateLibrary: {
    eyebrow: "مكتبة القوالب", title: "ملفات جاهزة للتنزيل",
    description: "قوالب PDF/Excel تساعدك تبدأ بسرعة.",
    download: "تنزيل",
    items: [
      { name: "قالب سند قبض", size: "١٢٠KB", format: "PDF" },
      { name: "قالب كشف رواتب", size: "٤٨KB", format: "Excel" },
      { name: "قالب بطاقة طالب", size: "٢٠٠KB", format: "PDF" },
      { name: "قالب تقرير حضور", size: "٦٤KB", format: "Excel" },
    ],
  },
  news: {
    eyebrow: "أخبار ومقالات", title: "جديدنا ونصائح للمدارس",
    description: "تابع آخر التحديثات وأفضل الممارسات الإدارية.",
    readMore: "اقرأ المزيد",
    items: [
      { tag: "تحديث", date: "٢٨ أيار ٢٠٢٦", title: "تقارير مالية أسرع وأوضح", excerpt: "لوحات جديدة تعرض الإيرادات والمتبقي بلمحة واحدة." },
      { tag: "دليل", date: "١٥ أيار ٢٠٢٦", title: "كيف تنظّم تحصيل الأقساط", excerpt: "خطوات عملية لتقليل المتأخرات ومتابعة الدفعات." },
      { tag: "نصيحة", date: "٢ أيار ٢٠٢٦", title: "إدارة الحضور بكفاءة", excerpt: "أفكار لتسريع التسجيل اليومي وتحسين الدقة." },
    ],
  },
  countdown: {
    eyebrow: "عرض محدود", title: "٣٠ يوم تجربة مجانية",
    description: "كل الميزات بلا قيود. سجّل الآن وابدأ.",
    cta: "احصل على التجربة", days: "يوم",
  },
  lastSignup: { template: "آخر مدرسة انضمت قبل {ago}", relative: "٣ ساعات" },
  faq: {
    eyebrow: "أسئلة شائعة", title: "كل ما تريد معرفته",
    items: [
      { q: "هل النظام يدعم العربية بالكامل؟", a: "نعم، واجهة عربية أولاً مع دعم كامل لليمين واليسار وتبديل فوري للإنكليزية." },
      { q: "هل يمكن إدارة أكثر من فرع؟", a: "نعم، تدير كل الفروع من حساب واحد بصلاحيات منفصلة لكل فرع." },
      { q: "كيف تُحفظ بياناتي؟", a: "بتشفير كامل ونسخ احتياطي دوري تلقائي، مع صلاحيات دقيقة للوصول." },
      { q: "هل أحتاج تركيب برامج؟", a: "لا، النظام يعمل من المتصفح على المكتب والهاتف دون أي تركيب." },
      { q: "هل أقدر أصدّر التقارير؟", a: "نعم، تصدير Excel وطباعة سندات وتقارير PDF جاهزة للأرشفة." },
      { q: "هل أقدر أربطه بأنظمة أخرى؟", a: "نعم، نوفّر واجهات REST وWebhooks مع مصادقة OAuth 2.0." },
    ],
  },
  demo: {
    eyebrow: "اطلب عرضاً", title: "نوريك النظام على مدرستك",
    description: "اترك اسمك ورقمك ونتواصل معك لترتيب عرض توضيحي.",
    nameLabel: "الاسم", namePlaceholder: "اسمك الكامل",
    phoneLabel: "رقم الهاتف", phonePlaceholder: "07XX XXX XXXX",
    submit: "اطلب العرض",
    success: "تم تجهيز رسالتك — أكمل الإرسال من تطبيق البريد.",
    mailSubject: "طلب عرض توضيحي - سكول عراق",
  },
  chat: {
    greeting: "شلون نساعدك اليوم؟", placeholder: "اكتب سؤالك…", send: "إرسال",
    openLabel: "افتح الدردشة",
    suggestions: ["كيف أبدأ؟", "ما الميزات؟", "هل النظام آمن؟", "أريد عرضاً"],
  },
  floatingCta: { text: "جاهز تبدأ؟", button: "ابدأ الآن" },
  apiStatus: { label: "حالة النظام", operational: "كل الأنظمة تعمل" },
  contact: {
    eyebrow: "جاهز تبدأ؟", title: "أدِر مدرستك باحتراف، من اليوم",
    description: "سجّل الدخول وابدأ، أو تواصل معنا ونساعدك خطوة بخطوة.",
    cta: "ابدأ الآن", email: "info@schooliraq.app",
    socials: [
      { label: "البريد", handle: "info@schooliraq.app", href: "mailto:info@schooliraq.app", icon: ReceiptText },
      { label: "الهاتف", handle: "تواصل مباشر", href: "#contact", icon: Phone },
    ],
  },
  footer: { tagline: "إدارة مدرسية أسهل، وحسابات أدق، بوقت أقل.", rights: "جميع الحقوق محفوظة" },
};

const en: LandingContent = {
  nav: {
    links: [
      { id: "features", label: "Features" }, { id: "finance", label: "Finance" },
      { id: "roles", label: "For each role" }, { id: "testimonials", label: "Reviews" },
      { id: "faq", label: "FAQ" }, { id: "contact", label: "Contact" },
    ],
    login: "Log in",
  },
  hero: {
    badge: "The leading Arabic-first school platform",
    title: "Run your school", titleAccent: "like a pro.",
    description: "One platform for students, fees, attendance, and reports — with a polished bilingual interface and accurate accounting.",
    ctaPrimary: "Get started", ctaSecondary: "Explore features",
    proof: "Trusted by schools managing thousands of students every day",
    stats: [
      { to: 12, suffix: "k+", label: "students managed" },
      { to: 99.9, decimals: 1, suffix: "%", label: "uptime" },
      { to: 24, suffix: "/7", label: "support" },
    ],
    chips: [
      { icon: CheckCircle2, title: "Fee received", value: "250,000 IQD" },
      { icon: CalendarDays, title: "Attendance today", value: "96%" },
      { icon: UserRoundPlus, title: "New students", value: "+18" },
    ],
    activity: {
      label: "Live activity",
      events: [
        { icon: HandCoins, text: "New fee received", value: "+250,000 IQD" },
        { icon: UserRoundPlus, text: "New student enrolled", value: "Grade 4" },
        { icon: CalendarDays, text: "Daily attendance updated", value: "96%" },
        { icon: ReceiptText, text: "Staff salary paid", value: "Done" },
      ],
    },
    typographicWords: ["Students", "Attendance", "Fees", "Reports", "Classes", "Salaries"],
  },
  marquee: { label: "Trusted by", items: ["Private schools", "Kindergartens", "Education complexes", "Institutes", "International schools", "High schools"] },
  schoolsStrip: { label: "Schools using the system", items: ["Future School", "Elite Academy", "Flowers KG", "Hope Complex", "Pioneers High", "Generations Academy"] },
  liveSystem: {
    eyebrow: "This month", title: "The system runs around the clock",
    description: "Live numbers from schools operating on the platform.",
    label: "Last update: minutes ago",
    counts: [
      { to: 184, suffix: "k", label: "fees processed" },
      { to: 92, suffix: "k", label: "attendance logged" },
      { to: 12, suffix: "k", label: "reports generated" },
      { to: 7, suffix: "k", label: "receipts printed" },
    ],
  },
  platform: {
    eyebrow: "Anywhere", title: "Work from anywhere, stay in sync",
    description: "Open it from your desktop browser or your phone — your data stays up to date across every device.",
    cards: [
      { icon: Monitor, title: "Web app", desc: "Full dashboard in any browser" },
      { icon: Phone, title: "Mobile ready", desc: "Smooth on small screens" },
      { icon: RefreshCw, title: "Live sync", desc: "Instant updates everywhere" },
    ],
  },
  showcases: [
    {
      id: "students", eyebrow: "Student management", title: "Plan, enroll, and track your students",
      description: "Complete records for every student, classes and groups, and daily attendance.",
      variant: "students",
      bullets: [
        { icon: Users, title: "Full records", desc: "Each student on one card" },
        { icon: CalendarDays, title: "Daily attendance", desc: "Fast logging, precise tracking" },
        { icon: BarChart3, title: "Performance reports", desc: "Live view of every class" },
      ],
    },
    {
      id: "finance", eyebrow: "Financial management", title: "Create receipts, log expenses, track earnings",
      description: "Collect fees, record expenses and salaries, and monitor revenue.",
      variant: "finance",
      bullets: [
        { icon: HandCoins, title: "Fee collection", desc: "Organized receipts" },
        { icon: ReceiptText, title: "Expenses & salaries", desc: "Track every line item" },
        { icon: TrendingUp, title: "Earnings tracking", desc: "Revenue and balance at a glance" },
      ],
    },
  ],
  features: {
    eyebrow: "Everything you need", title: "Built for real schools",
    description: "Precise tools that cover your admin day from start to finish.",
    cards: [
      { icon: Building2, title: "Multi-branch", desc: "Run every branch from one account with separate access per branch." },
      { icon: BarChart3, title: "Live reports", desc: "Dashboards and charts that speak your numbers instantly." },
      { icon: ShieldCheck, title: "Roles & permissions", desc: "Fine control over who sees and edits each page." },
      { icon: Languages, title: "Arabic & English", desc: "Full RTL/LTR support with instant language switch." },
    ],
  },
  gallery: {
    eyebrow: "Inside the system", title: "A clear interface that works for you",
    description: "Organized dashboards for every area.",
    items: [
      { variant: "students", label: "Students dashboard" },
      { variant: "finance", label: "Finance dashboard" },
      { variant: "reports", label: "Reports dashboard" },
    ],
  },
  iraqMap: {
    eyebrow: "Nationwide presence", title: "Schools using us across Iraq",
    description: "Glowing dots show school branches on the platform.",
    cities: [
      { name: "Baghdad", x: 50, y: 50 }, { name: "Basra", x: 64, y: 80 }, { name: "Mosul", x: 44, y: 18 },
      { name: "Erbil", x: 56, y: 22 }, { name: "Sulaymaniyah", x: 64, y: 28 }, { name: "Kirkuk", x: 54, y: 30 },
      { name: "Najaf", x: 42, y: 62 }, { name: "Karbala", x: 44, y: 56 }, { name: "Nasiriyah", x: 56, y: 72 },
      { name: "Diyala", x: 60, y: 42 },
    ],
  },
  savingsCalc: {
    eyebrow: "Calculate your savings", title: "How much does the system save your school?",
    description: "Move the slider to see hours and money saved per year.",
    studentsLabel: "Number of students", hoursPerYearLabel: "Manual hours saved per year",
    daysPerYearLabel: "Workdays saved per year", moneyPerYearLabel: "Cost saved per year",
    moneySuffix: "IQD",
    note: "Assumption: 4 minutes manual work per student per day, wage 5,000 IQD/hour, 200 school days.",
  },
  timeline: {
    eyebrow: "Your day with School Iraq", title: "From 8 AM to 2 PM",
    description: "What happens in the system during a typical school day.",
    events: [
      { time: "08:00", title: "Attendance logged", desc: "All classes registered before the first period.", icon: Sun },
      { time: "09:30", title: "Fees received", desc: "Receipts print and parents are notified.", icon: HandCoins },
      { time: "11:00", title: "Staff updates", desc: "Salary, teacher assignment, data updates.", icon: UserCheck },
      { time: "12:30", title: "Daily report", desc: "Attendance and finance summary in one click.", icon: BarChart3 },
      { time: "02:00", title: "End of day", desc: "Automatic backup and end-of-shift alert.", icon: Clock },
    ],
  },
  roles: {
    eyebrow: "For each role", title: "The system adapts to your job",
    description: "Pick your role to see relevant features.",
    tabs: [
      {
        key: "principal", label: "Principal", icon: Briefcase,
        description: "A full view of the school, faster decisions.",
        features: [
          { icon: BarChart3, title: "Command dashboard", desc: "Whole school in one page." },
          { icon: ShieldCheck, title: "Permissions", desc: "Control who sees and edits." },
          { icon: Building2, title: "Multi-branch", desc: "All branches from one account." },
        ],
      },
      {
        key: "accountant", label: "Accountant", icon: Wallet,
        description: "Accurate numbers, organized books.",
        features: [
          { icon: HandCoins, title: "Fee collection", desc: "Receipts print automatically." },
          { icon: ReceiptText, title: "Expenses & salaries", desc: "Every line item logged." },
          { icon: TrendingUp, title: "Revenue", desc: "Monthly budget at a glance." },
        ],
      },
      {
        key: "teacher", label: "Teacher", icon: GraduationCap,
        description: "Focus on the class, with less paper.",
        features: [
          { icon: CalendarDays, title: "Quick attendance", desc: "Log a class in seconds." },
          { icon: NotebookPen, title: "Student notes", desc: "Instant note taking." },
          { icon: BarChart3, title: "Class performance", desc: "Live view." },
        ],
      },
      {
        key: "parent", label: "Parent", icon: Users,
        description: "Continuous follow-up on your child.",
        features: [
          { icon: Bell, title: "Notifications", desc: "Attendance and fees instantly." },
          { icon: BarChart3, title: "Performance reports", desc: "A clear picture." },
          { icon: MessageSquare, title: "Direct contact", desc: "With school staff." },
        ],
      },
    ],
  },
  templates: {
    eyebrow: "Template bank", title: "Ready-to-print templates",
    description: "Pick a template and edit it with your school's info.",
    preview: "Preview",
    items: [
      { title: "Fee receipt", type: "Finance", icon: ReceiptText },
      { title: "Graduation certificate", type: "Academic", icon: GraduationCap },
      { title: "Monthly attendance report", type: "Report", icon: CalendarDays },
      { title: "Payroll sheet", type: "Finance", icon: HandCoins },
      { title: "Student ID card", type: "Identity", icon: UserCheck },
      { title: "Financial report", type: "Report", icon: BarChart3 },
    ],
  },
  receiptDemo: {
    eyebrow: "Demo generator", title: "Create a sample receipt in seconds",
    description: "Enter details and see how the receipt looks.",
    studentLabel: "Student name", studentPlaceholder: "Example: Mohammed Ahmed",
    amountLabel: "Amount", amountPlaceholder: "250,000",
    feeLabel: "For", feePlaceholder: "Term fee",
    generate: "Generate",
    receiptTitle: "Payment Receipt", receiptNumberLabel: "Receipt #", receiptDateLabel: "Date",
    receiptFromLabel: "Received from", receiptForLabel: "For", receiptAmountLabel: "Amount",
    receiptIssuer: "Cashier — School Iraq", receiptCurrency: "IQD",
  },
  integrations: {
    eyebrow: "Integrations", title: "Connected to your daily tools",
    description: "Notifications, export, and print — all ready.",
    items: [
      { icon: MessageSquare, title: "WhatsApp", desc: "Parent notifications" },
      { icon: Phone, title: "SMS", desc: "Instant alerts" },
      { icon: FileSpreadsheet, title: "Excel export", desc: "Your data in a click" },
      { icon: Printer, title: "Print receipts", desc: "Professional vouchers" },
      { icon: FileText, title: "PDF reports", desc: "Ready to archive" },
    ],
  },
  api: {
    eyebrow: "For developers", title: "A flexible, extensible system",
    description: "Connect your data to other systems via modern, secure APIs.",
    badges: ["REST", "Webhooks", "OAuth 2.0", "JSON"],
    features: [
      { icon: GitBranch, title: "REST APIs", desc: "Clear endpoints for all data." },
      { icon: Bell, title: "Webhooks", desc: "Subscribe to events as they happen." },
      { icon: Database, title: "Programmatic export", desc: "Your data as JSON." },
      { icon: ShieldCheck, title: "OAuth auth", desc: "Secure integration." },
    ],
  },
  comparison: {
    eyebrow: "Why School Iraq", title: "The system vs. the manual way",
    description: "Save time and cut errors.",
    usLabel: "School Iraq", themLabel: "Paper & ledgers",
    rows: [
      { label: "Accurate, instant accounting", us: true, them: false },
      { label: "Track fees and balances", us: true, them: false },
      { label: "Reports in one click", us: true, them: false },
      { label: "Access from anywhere", us: true, them: false },
      { label: "Secure backups", us: true, them: false },
      { label: "Prone to loss and error", us: false, them: true },
    ],
  },
  plansCompare: {
    eyebrow: "Pick the right plan", title: "Lite or Full?",
    description: "Same quality — features scaled to your school.",
    lite: { label: "Lite", features: ["Core student management", "Fee collection", "Daily attendance", "Basic reports", "Up to 3 users"] },
    full: {
      label: "Full",
      features: [
        "Everything in Lite", "Multi-branch", "Advanced permissions", "Advanced reports + export",
        "Integrations (WhatsApp/SMS)", "Unlimited users", "Priority support",
      ],
    },
  },
  testimonials: {
    eyebrow: "What schools say", title: "Admin teams that trust us",
    items: [
      { text: "The system made managing students and finances effortless.", author: "School Principal", role: "Private school" },
      { text: "The best educational platform we've used — intuitive and comprehensive.", author: "School Director", role: "Education complex" },
      { text: "Financial reports are now ready at the click of a button.", author: "Accountant", role: "Finance office" },
    ],
  },
  parentsTestimonials: {
    eyebrow: "From parents", title: "What parents say",
    items: [
      { text: "I see my son's attendance and fees right from my phone — peace of mind.", author: "Father", role: "Parent" },
      { text: "Instant notifications are the best part.", author: "Mother", role: "Parent" },
    ],
  },
  wall: {
    eyebrow: "Wall of love", title: "What people say about us",
    items: [
      { handle: "@ahmad_admin", source: "X", text: "Finally a proper Arabic system for school management!" },
      { handle: "@sara_acc", source: "X", text: "Live reports save me hours every week." },
      { handle: "Parent", source: "WhatsApp", text: "I know my child's attendance moment by moment." },
      { handle: "Principal", source: "Call", text: "Fast customer service, solid technical support." },
      { handle: "@school_mgr", source: "X", text: "Migrated all our books in one week." },
      { handle: "Accountant", source: "Email", text: "Receipts print automatically — no more manual work." },
    ],
  },
  beforeAfter: {
    eyebrow: "Before and after", title: "From paper to platform",
    description: "Drag the handle to see the difference.",
    beforeLabel: "Before", afterLabel: "After",
    beforeItems: ["Scattered ledgers", "Slow accounting", "Frequent errors", "Hard to access"],
    afterItems: ["Everything in one place", "Instant accounting", "Total accuracy", "Access from anywhere"],
  },
  trust: {
    eyebrow: "Security & trust", title: "Your data is protected",
    items: [
      { icon: Shield, title: "Full encryption", desc: "Protected in transit and at rest." },
      { icon: Lock, title: "Granular access", desc: "Each user sees only their scope." },
      { icon: Database, title: "Backups", desc: "Automatic periodic backups." },
      { icon: BadgeCheck, title: "High reliability", desc: "99.9% uptime." },
    ],
  },
  securityBadge: {
    badge: "Your data on a server in Iraq", title: "Protection your data deserves", location: "Baghdad, Iraq",
    points: ["TLS encryption in transit", "AES-256 encryption at rest", "Encrypted daily backups", "Detailed access logs"],
  },
  steps: {
    eyebrow: "Easy start", title: "Get going in three steps",
    description: "From sign-up to your first report in minutes.",
    items: [
      { icon: GraduationCap, title: "Register your school", desc: "Create your account and add branches." },
      { icon: Users, title: "Add students & staff", desc: "Import or enter data with ease." },
      { icon: LayoutDashboard, title: "Start tracking", desc: "Collect, attend, and report instantly." },
    ],
  },
  learning: {
    eyebrow: "Learning center", title: "Short lessons to get you started fast",
    description: "Videos that explain each feature in under 3 minutes.",
    play: "Play",
    items: [
      { title: "Set up school and branches", duration: "2:40" },
      { title: "Add students and classes", duration: "2:10" },
      { title: "Collect fees and print receipts", duration: "2:55" },
      { title: "Generate a monthly financial report", duration: "1:50" },
    ],
  },
  templateLibrary: {
    eyebrow: "Template library", title: "Ready files to download",
    description: "PDF/Excel templates to help you start quickly.",
    download: "Download",
    items: [
      { name: "Fee receipt template", size: "120KB", format: "PDF" },
      { name: "Payroll sheet template", size: "48KB", format: "Excel" },
      { name: "Student ID template", size: "200KB", format: "PDF" },
      { name: "Attendance report template", size: "64KB", format: "Excel" },
    ],
  },
  news: {
    eyebrow: "News & articles", title: "Updates and tips for schools",
    description: "Follow the latest updates and admin best practices.",
    readMore: "Read more",
    items: [
      { tag: "Update", date: "May 28, 2026", title: "Faster, clearer financial reports", excerpt: "New dashboards show revenue and balances at a glance." },
      { tag: "Guide", date: "May 15, 2026", title: "How to organize fee collection", excerpt: "Practical steps to reduce arrears." },
      { tag: "Tip", date: "May 2, 2026", title: "Manage attendance efficiently", excerpt: "Ideas to speed up daily logging." },
    ],
  },
  countdown: {
    eyebrow: "Limited offer", title: "30-day free trial",
    description: "All features, no limits. Sign up and start.",
    cta: "Claim your trial", days: "days",
  },
  lastSignup: { template: "Last school joined {ago} ago", relative: "3 hours" },
  faq: {
    eyebrow: "FAQ", title: "Everything you want to know",
    items: [
      { q: "Does it fully support Arabic?", a: "Yes, an Arabic-first interface with full RTL/LTR support." },
      { q: "Can I manage multiple branches?", a: "Yes, all branches from one account with separate access." },
      { q: "How is my data stored?", a: "With full encryption and automatic periodic backups." },
      { q: "Do I need to install software?", a: "No, runs in the browser on desktop and mobile." },
      { q: "Can I export reports?", a: "Yes — Excel export, printed vouchers, and PDF reports." },
      { q: "Can I integrate with other systems?", a: "Yes, we provide REST APIs and Webhooks with OAuth 2.0." },
    ],
  },
  demo: {
    eyebrow: "Request a demo", title: "See the system on your school",
    description: "Leave your name and number and we'll arrange a walkthrough.",
    nameLabel: "Name", namePlaceholder: "Your full name",
    phoneLabel: "Phone", phonePlaceholder: "07XX XXX XXXX",
    submit: "Request demo",
    success: "Your message is ready — finish sending from your mail app.",
    mailSubject: "Demo request - School Iraq",
  },
  chat: {
    greeting: "How can we help today?", placeholder: "Type your question…", send: "Send",
    openLabel: "Open chat",
    suggestions: ["How do I start?", "What are the features?", "Is it secure?", "I want a demo"],
  },
  floatingCta: { text: "Ready to start?", button: "Get started" },
  apiStatus: { label: "System status", operational: "All systems operational" },
  contact: {
    eyebrow: "Ready to start?", title: "Run your school like a pro, from today",
    description: "Log in and get going, or reach out and we'll guide you step by step.",
    cta: "Get started", email: "info@schooliraq.app",
    socials: [
      { label: "Email", handle: "info@schooliraq.app", href: "mailto:info@schooliraq.app", icon: ReceiptText },
      { label: "Phone", handle: "Direct line", href: "#contact", icon: Phone },
    ],
  },
  footer: { tagline: "Easier school management, sharper accounting, in less time.", rights: "All rights reserved" },
};

const CONTENT: Record<AppLocale, LandingContent> = { ar, en };

export function getLandingContent(locale: string): LandingContent {
  return locale === "en" ? CONTENT.en : CONTENT.ar;
}

export const FEATURE_CHECK_ICON = CheckCircle2;
export const MONEY_ICON = Banknote;
export const LOCATION_ICON = MapPin;
export const SERVER_ICON = Server;
export const ACTIVITY_ICON = Activity;
export const PLAY_ICON = Play;
export const DOWNLOAD_ICON = Download;
export const FILE_DOWN_ICON = FileDown;
export const BOOK_OPEN_ICON = BookOpen;
export const HISTORY_ICON = History;
export const SPARKLES_ICON = Sparkles;
export const CHECK_ICON = Check;
export const CREDIT_CARD_ICON = CreditCard;
