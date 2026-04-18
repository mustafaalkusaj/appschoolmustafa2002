export type BrandThemeFamilyId =
  | "blue"
  | "green"
  | "warm"
  | "purple"
  | "orange"
  | "teal"
  | "red"
  | "indigo"
  | "emerald"
  | "amber"
  | "classic"
  | "dark";

export type BrandThemePresetId =
  | "blue-academic"
  | "blue-modern"
  | "blue-premium"
  | "green-growth"
  | "green-heritage"
  | "green-stem"
  | "warm-leadership"
  | "warm-desert"
  | "warm-scholars"
  | "purple-royal"
  | "purple-creative"
  | "purple-tech"
  | "orange-vibrant"
  | "orange-sunset"
  | "orange-energy"
  | "teal-ocean"
  | "teal-professional"
  | "teal-fresh"
  | "red-dynamic"
  | "red-passion"
  | "red-bold"
  | "indigo-calm"
  | "indigo-knowledge"
  | "indigo-modern"
  | "emerald-nature"
  | "emerald-success"
  | "emerald-growth"
  | "amber-warmth"
  | "amber-sunrise"
  | "amber-classic"
  | "classic-white"
  | "minimal-grey"
  | "high-contrast"
  | "pastel-soft"
  | "dark-professional";

export interface BrandThemePreset {
  id: BrandThemePresetId;
  familyId: BrandThemeFamilyId;
  familyLabel: string;
  label: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  surfaceMutedColor: string;
  sidebarColor: string;
  textColor: string;
  logoIdea: string;
  schoolNameIdea: string;
}

export interface BrandThemeFamily {
  id: BrandThemeFamilyId;
  label: string;
  description: string;
  presets: BrandThemePreset[];
}

const PRESETS: BrandThemePreset[] = [
  // ── BLUE ──────────────────────────────────────────────────────────────────
  {
    id: "blue-academic",
    familyId: "blue",
    familyLabel: "العائلة الزرقاء",
    label: "Academic Classic",
    description: "طابع أكاديمي رسمي بدرجات زرقاء هادئة ومظهر مؤسساتي واضح.",
    primaryColor: "#1E5AA8",
    secondaryColor: "#6DB4FF",
    accentColor: "#F0A43B",
    backgroundColor: "#F4F8FE",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#E8F0FB",
    sidebarColor: "#E1ECFB",
    textColor: "#10233F",
    logoIdea: "درع مع كتاب أو عمودين أكاديميين",
    schoolNameIdea: "أكاديمية النخبة",
  },
  {
    id: "blue-modern",
    familyId: "blue",
    familyLabel: "العائلة الزرقاء",
    label: "Modern School",
    description: "هوية حديثة ونظيفة مناسبة للمدارس الأهلية العصرية.",
    primaryColor: "#0F5B8D",
    secondaryColor: "#4EC4F3",
    accentColor: "#7B61FF",
    backgroundColor: "#F2F9FD",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#E3F3FA",
    sidebarColor: "#D6EEF9",
    textColor: "#0F172A",
    logoIdea: "حرف أول هندسي داخل مربع دائري الزوايا",
    schoolNameIdea: "مدرسة المدار الحديثة",
  },
  {
    id: "blue-premium",
    familyId: "blue",
    familyLabel: "العائلة الزرقاء",
    label: "Premium Campus",
    description: "مظهر راقٍ يناسب المدارس الخاصة ذات الهوية الفاخرة.",
    primaryColor: "#233876",
    secondaryColor: "#7FA7FF",
    accentColor: "#D5A13E",
    backgroundColor: "#F6F7FC",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#E8ECF8",
    sidebarColor: "#E2E8F8",
    textColor: "#151E34",
    logoIdea: "ختم دائري أو crest مختصر",
    schoolNameIdea: "كلية القمة الأهلية",
  },

  // ── GREEN ─────────────────────────────────────────────────────────────────
  {
    id: "green-growth",
    familyId: "green",
    familyLabel: "العائلة الخضراء",
    label: "Growth",
    description: "ألوان مريحة توحي بالنمو والرعاية ومناسبة للمراحل المبكرة.",
    primaryColor: "#0F8A6A",
    secondaryColor: "#76D9BE",
    accentColor: "#F4B740",
    backgroundColor: "#F2FBF8",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#E0F5EF",
    sidebarColor: "#D5F0E8",
    textColor: "#10332B",
    logoIdea: "ورقة مع كتاب مفتوح",
    schoolNameIdea: "رواد الغد",
  },
  {
    id: "green-heritage",
    familyId: "green",
    familyLabel: "العائلة الخضراء",
    label: "Heritage",
    description: "هوية هادئة بطابع عربي/تراثي مع لمسة مؤسساتية دافئة.",
    primaryColor: "#2F6B57",
    secondaryColor: "#B9C98A",
    accentColor: "#C78D4D",
    backgroundColor: "#F7FAF5",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#EBF1E7",
    sidebarColor: "#E5ECDD",
    textColor: "#203227",
    logoIdea: "قوس مدرسة أو منارة مبسطة",
    schoolNameIdea: "مدارس الرسوخ",
  },
  {
    id: "green-stem",
    familyId: "green",
    familyLabel: "العائلة الخضراء",
    label: "STEM Green",
    description: "هوية علمية متوازنة للأكاديميات التقنية والبرامج المتقدمة.",
    primaryColor: "#157A74",
    secondaryColor: "#8FE3D4",
    accentColor: "#6A8DFF",
    backgroundColor: "#F1FBFA",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#DDF3F1",
    sidebarColor: "#D2EEEA",
    textColor: "#112827",
    logoIdea: "شكل hexagon مع كتاب/ذرة",
    schoolNameIdea: "أكاديمية الآفاق العلمية",
  },

  // ── WARM ──────────────────────────────────────────────────────────────────
  {
    id: "warm-leadership",
    familyId: "warm",
    familyLabel: "العائلة الدافئة",
    label: "Leadership",
    description: "هوية قوية للثانويات والمدارس القيادية بطابع جاد وواضح.",
    primaryColor: "#8D2D49",
    secondaryColor: "#E39DB0",
    accentColor: "#F4B35D",
    backgroundColor: "#FCF6F8",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#F4E6EB",
    sidebarColor: "#F0DDE5",
    textColor: "#331824",
    logoIdea: "درع قيادي أو شارة متوازنة",
    schoolNameIdea: "ثانوية الريادة",
  },
  {
    id: "warm-desert",
    familyId: "warm",
    familyLabel: "العائلة الدافئة",
    label: "Desert Gold",
    description: "ألوان عربية دافئة مع حضور بصري قوي ومناسب للهوية المحلية.",
    primaryColor: "#A45A2A",
    secondaryColor: "#F1C27A",
    accentColor: "#7D4DCC",
    backgroundColor: "#FFF8F2",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#F8EBDD",
    sidebarColor: "#F5E4D2",
    textColor: "#3A2415",
    logoIdea: "شمس/قبة/شعاع مبسط",
    schoolNameIdea: "مدارس الواحة",
  },
  {
    id: "warm-scholars",
    familyId: "warm",
    familyLabel: "العائلة الدافئة",
    label: "Scholars",
    description: "هوية أكاديمية تقليدية أكثر دفئاً وملاءمة للمدارس العريقة.",
    primaryColor: "#7A3E2B",
    secondaryColor: "#D7B08B",
    accentColor: "#A74AC7",
    backgroundColor: "#FBF6F2",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#F1E7DF",
    sidebarColor: "#ECDDCE",
    textColor: "#2F211A",
    logoIdea: "كتاب مفتوح بخط عربي أو monogram كلاسيكي",
    schoolNameIdea: "دار العلماء",
  },

  // ── PURPLE ────────────────────────────────────────────────────────────────
  {
    id: "purple-royal",
    familyId: "purple",
    familyLabel: "العائلة البنفسجية",
    label: "Royal Academy",
    description: "هوية ملكية أنيقة للمدارس ذات المستوى العالي والتقاليد.",
    primaryColor: "#6B46C1",
    secondaryColor: "#C084FC",
    accentColor: "#FBBF24",
    backgroundColor: "#F8F7FC",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#EDE9FE",
    sidebarColor: "#E8DAFD",
    textColor: "#1A0D2E",
    logoIdea: "تاج أو درع ملكي مبسط",
    schoolNameIdea: "الأكاديمية الملكية",
  },
  {
    id: "purple-creative",
    familyId: "purple",
    familyLabel: "العائلة البنفسجية",
    label: "Creative Arts",
    description: "ألوان إبداعية حيوية لمدارس الفنون والموسيقى والثقافة.",
    primaryColor: "#8B5CF6",
    secondaryColor: "#D8B4FE",
    accentColor: "#F59E0B",
    backgroundColor: "#FBFAFE",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#EDE9FE",
    sidebarColor: "#E2D8FD",
    textColor: "#1E1B4B",
    logoIdea: "ريشة قلم أو نوتة موسيقية",
    schoolNameIdea: "أكاديمية الفنون الإبداعية",
  },
  {
    id: "purple-tech",
    familyId: "purple",
    familyLabel: "العائلة البنفسجية",
    label: "Tech Innovation",
    description: "هوية تقنية متقدمة للمدارس التقنية والمختبرات.",
    primaryColor: "#7C3AED",
    secondaryColor: "#A78BFA",
    accentColor: "#06B6D4",
    backgroundColor: "#F5F3FF",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#EDE9FE",
    sidebarColor: "#DDD6FE",
    textColor: "#1E1B4B",
    logoIdea: "مدارج إلكترونية أو كبسولة فضاء",
    schoolNameIdea: "معهد التكنولوجيا المتقدم",
  },

  // ── ORANGE ────────────────────────────────────────────────────────────────
  {
    id: "orange-vibrant",
    familyId: "orange",
    familyLabel: "العائلة البرتقالية",
    label: "Vibrant Future",
    description: "برتقالي متوهج يوحي بالطاقة والتفاؤل، مثالي للمدارس الديناميكية.",
    primaryColor: "#C84B0F",
    secondaryColor: "#FDAB60",
    accentColor: "#1A56DB",
    backgroundColor: "#FFF8F3",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#FDEEDD",
    sidebarColor: "#FCE4CC",
    textColor: "#3A1A08",
    logoIdea: "شمس نصفية أو شعلة معرفة",
    schoolNameIdea: "مدارس الفجر الجديد",
  },
  {
    id: "orange-sunset",
    familyId: "orange",
    familyLabel: "العائلة البرتقالية",
    label: "Sunset Academy",
    description: "تدرج دافئ من البرتقالي الذهبي يعكس الأصالة والحيوية.",
    primaryColor: "#B45309",
    secondaryColor: "#FCA741",
    accentColor: "#6D28D9",
    backgroundColor: "#FFFAF4",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#FEF0D9",
    sidebarColor: "#FDE9C8",
    textColor: "#3B2009",
    logoIdea: "هلال أو برج ذهبي",
    schoolNameIdea: "أكاديمية الأصيل",
  },
  {
    id: "orange-energy",
    familyId: "orange",
    familyLabel: "العائلة البرتقالية",
    label: "Energy School",
    description: "ألوان صارخة بنشاط وحيوية للمدارس الرياضية والنشاطية.",
    primaryColor: "#D4500C",
    secondaryColor: "#FFB347",
    accentColor: "#0284C7",
    backgroundColor: "#FFF5EE",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#FFE8D5",
    sidebarColor: "#FFD9BC",
    textColor: "#411B04",
    logoIdea: "كرة أو نجمة بخطوط ديناميكية",
    schoolNameIdea: "مدرسة الفتوة والإبداع",
  },

  // ── TEAL ──────────────────────────────────────────────────────────────────
  {
    id: "teal-ocean",
    familyId: "teal",
    familyLabel: "العائلة الزمردية الفيروزية",
    label: "Ocean Depth",
    description: "أزرق زمردي عميق يوحي بالهدوء والثبات والاحترافية العالية.",
    primaryColor: "#0C6E72",
    secondaryColor: "#4ECDC4",
    accentColor: "#F7C059",
    backgroundColor: "#F0FBFB",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#D9F3F3",
    sidebarColor: "#C8EEEE",
    textColor: "#082B2D",
    logoIdea: "موجة أو دلفين أو سفينة معرفة",
    schoolNameIdea: "مدارس الأعماق المعرفية",
  },
  {
    id: "teal-professional",
    familyId: "teal",
    familyLabel: "العائلة الزمردية الفيروزية",
    label: "Teal Professional",
    description: "هوية احترافية هادئة تجمع بين الأزرق والأخضر بتناسق راقٍ.",
    primaryColor: "#134E5E",
    secondaryColor: "#71B4BE",
    accentColor: "#F4A260",
    backgroundColor: "#F2F9FA",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#DDF0F3",
    sidebarColor: "#CDE8EC",
    textColor: "#0D2D38",
    logoIdea: "مربع دائري مع خطوط أفقية وعمودية",
    schoolNameIdea: "كلية البيان المهنية",
  },
  {
    id: "teal-fresh",
    familyId: "teal",
    familyLabel: "العائلة الزمردية الفيروزية",
    label: "Fresh Start",
    description: "نضارة وانطلاقة جديدة، مثالي للمدارس الحديثة والبيئات المتطورة.",
    primaryColor: "#0F766E",
    secondaryColor: "#5EEAD4",
    accentColor: "#7C3AED",
    backgroundColor: "#F0FDFA",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#CCFBF1",
    sidebarColor: "#B2F5EA",
    textColor: "#0D2E2C",
    logoIdea: "برعم نبات أو زهرة جيومترية",
    schoolNameIdea: "مدارس النور والانطلاق",
  },

  // ── RED ───────────────────────────────────────────────────────────────────
  {
    id: "red-dynamic",
    familyId: "red",
    familyLabel: "العائلة الحمراء",
    label: "Dynamic Power",
    description: "قوة وحضور بصري قوي، مثالي للثانويات ذات الشخصية المتميزة.",
    primaryColor: "#B91C1C",
    secondaryColor: "#F87171",
    accentColor: "#F59E0B",
    backgroundColor: "#FFF5F5",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#FEE2E2",
    sidebarColor: "#FCD9D9",
    textColor: "#3B0F0F",
    logoIdea: "درع قوي أو شعلة حمراء",
    schoolNameIdea: "ثانوية القدرة",
  },
  {
    id: "red-passion",
    familyId: "red",
    familyLabel: "العائلة الحمراء",
    label: "Passion & Pride",
    description: "شغف وكبرياء، يناسب المدارس العريقة ذات التاريخ والموروث.",
    primaryColor: "#991B1B",
    secondaryColor: "#FCA5A5",
    accentColor: "#1D4ED8",
    backgroundColor: "#FEF7F7",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#FECACA",
    sidebarColor: "#FDD5D5",
    textColor: "#2D0E0E",
    logoIdea: "وردة أو نسر أو رمز تقليدي",
    schoolNameIdea: "دار الفخر والحضارة",
  },
  {
    id: "red-bold",
    familyId: "red",
    familyLabel: "العائلة الحمراء",
    label: "Bold Academy",
    description: "جرأة وتميز، ألوان صريحة وقوية تعبر عن ثقة بالنفس.",
    primaryColor: "#DC2626",
    secondaryColor: "#FBBFBF",
    accentColor: "#059669",
    backgroundColor: "#FFF8F8",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#FEE2E2",
    sidebarColor: "#FDD8D8",
    textColor: "#420C0C",
    logoIdea: "نجمة حمراء أو مثلث صاعد",
    schoolNameIdea: "أكاديمية الجرأة والتميز",
  },

  // ── INDIGO ────────────────────────────────────────────────────────────────
  {
    id: "indigo-calm",
    familyId: "indigo",
    familyLabel: "العائلة النيلية",
    label: "Deep Calm",
    description: "عمق وهدوء أكاديمي عالي الجودة، ألوان نيلية راقية للتفكير.",
    primaryColor: "#3730A3",
    secondaryColor: "#818CF8",
    accentColor: "#F59E0B",
    backgroundColor: "#F8F8FF",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#E0E7FF",
    sidebarColor: "#D4DAFC",
    textColor: "#1A1A4E",
    logoIdea: "كوكب أو دائرة هندسية محكمة",
    schoolNameIdea: "أكاديمية الفكر العميق",
  },
  {
    id: "indigo-knowledge",
    familyId: "indigo",
    familyLabel: "العائلة النيلية",
    label: "Knowledge Temple",
    description: "معبد المعرفة، ثقة علمية وحضارية راسخة.",
    primaryColor: "#312E81",
    secondaryColor: "#A5B4FC",
    accentColor: "#10B981",
    backgroundColor: "#F5F5FF",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#E0E7FF",
    sidebarColor: "#D5D9FC",
    textColor: "#1E1B4B",
    logoIdea: "كتب مكدسة أو قبة علمية",
    schoolNameIdea: "معبد العلم والمعرفة",
  },
  {
    id: "indigo-modern",
    familyId: "indigo",
    familyLabel: "العائلة النيلية",
    label: "Modern Indigo",
    description: "حداثة أنيقة بدرجات نيلية فاتحة، جاذبية للمدارس الراقية.",
    primaryColor: "#4338CA",
    secondaryColor: "#C7D2FE",
    accentColor: "#EC4899",
    backgroundColor: "#F5F3FF",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#E0E7FF",
    sidebarColor: "#D1D5FF",
    textColor: "#211D5C",
    logoIdea: "مكعب هندسي ثلاثي الأبعاد",
    schoolNameIdea: "مدرسة الأفق الجديد",
  },

  // ── EMERALD ───────────────────────────────────────────────────────────────
  {
    id: "emerald-nature",
    familyId: "emerald",
    familyLabel: "العائلة الزمردية",
    label: "Nature Wisdom",
    description: "الحكمة من الطبيعة، خضراء زمردية داكنة توحي بالأصالة والعطاء.",
    primaryColor: "#065F46",
    secondaryColor: "#6EE7B7",
    accentColor: "#F59E0B",
    backgroundColor: "#F0FDF4",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#DCFCE7",
    sidebarColor: "#C9F5DC",
    textColor: "#062415",
    logoIdea: "شجرة مبسطة أو أوراق دائرية",
    schoolNameIdea: "مدارس الطبيعة والمعرفة",
  },
  {
    id: "emerald-success",
    familyId: "emerald",
    familyLabel: "العائلة الزمردية",
    label: "Success Path",
    description: "طريق النجاح، زمردي متألق يبث الأمل والإنجاز.",
    primaryColor: "#047857",
    secondaryColor: "#A7F3D0",
    accentColor: "#6366F1",
    backgroundColor: "#F0FDF7",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#D1FAE5",
    sidebarColor: "#BBF7D0",
    textColor: "#052E1C",
    logoIdea: "سهم صاعد مع نجمة",
    schoolNameIdea: "أكاديمية طريق النجاح",
  },
  {
    id: "emerald-growth",
    familyId: "emerald",
    familyLabel: "العائلة الزمردية",
    label: "Ever Growth",
    description: "النمو المستمر، زمردي داكن عميق يوحي بالاستدامة والتطور.",
    primaryColor: "#064E3B",
    secondaryColor: "#34D399",
    accentColor: "#3B82F6",
    backgroundColor: "#ECFDF5",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#D1FAE5",
    sidebarColor: "#BEF7D3",
    textColor: "#04201A",
    logoIdea: "برعم صاعد من كتاب",
    schoolNameIdea: "مدارس النمو والتطور",
  },

  // ── AMBER ─────────────────────────────────────────────────────────────────
  {
    id: "amber-warmth",
    familyId: "amber",
    familyLabel: "العائلة الكهرمانية",
    label: "Golden Warmth",
    description: "دفء وأصالة كهرمانية للمدارس ذات الروح العراقية والتراثية.",
    primaryColor: "#92400E",
    secondaryColor: "#FCD34D",
    accentColor: "#7C3AED",
    backgroundColor: "#FFFBEB",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#FEF3C7",
    sidebarColor: "#FDE68A",
    textColor: "#3C1A05",
    logoIdea: "قنطرة أو باب بغدادي مبسط",
    schoolNameIdea: "مدارس الأصالة والتراث",
  },
  {
    id: "amber-sunrise",
    familyId: "amber",
    familyLabel: "العائلة الكهرمانية",
    label: "Sunrise Hope",
    description: "إشراق الصباح وتفاؤل الطلاب، أصفر ذهبي دافئ ومشرق.",
    primaryColor: "#78350F",
    secondaryColor: "#FDE68A",
    accentColor: "#0EA5E9",
    backgroundColor: "#FFFDF0",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#FEF9C3",
    sidebarColor: "#FDF5A8",
    textColor: "#3A1B06",
    logoIdea: "شروق شمس فوق أفق",
    schoolNameIdea: "مدارس الفجر والإشراق",
  },
  {
    id: "amber-classic",
    familyId: "amber",
    familyLabel: "العائلة الكهرمانية",
    label: "Amber Classic",
    description: "ذهبي كلاسيكي وقور، يجمع بين الاحترافية وحرارة الهوية العربية.",
    primaryColor: "#B45309",
    secondaryColor: "#FBBF24",
    accentColor: "#2563EB",
    backgroundColor: "#FFFCF0",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#FEF3C7",
    sidebarColor: "#FDE89A",
    textColor: "#451A03",
    logoIdea: "نجمة ذهبية أو monogram كلاسيكي",
    schoolNameIdea: "الأكاديمية الذهبية",
  },

  // ── CLASSIC ───────────────────────────────────────────────────────────────
  {
    id: "classic-white",
    familyId: "classic",
    familyLabel: "العائلة الكلاسيكية",
    label: "Classic White",
    description: "تصميم نظيف كلاسيكي يعتمد على الأبيض والرمادي للمظهر الرسمي.",
    primaryColor: "#1F2937",
    secondaryColor: "#6B7280",
    accentColor: "#111827",
    backgroundColor: "#FFFFFF",
    surfaceColor: "#F9FAFB",
    surfaceMutedColor: "#F3F4F6",
    sidebarColor: "#F9FAFB",
    textColor: "#111827",
    logoIdea: "خط كلاسيكي أو درع أسود أبيض",
    schoolNameIdea: "الكلية الكلاسيكية",
  },
  {
    id: "minimal-grey",
    familyId: "classic",
    familyLabel: "العائلة الكلاسيكية",
    label: "Minimal Grey",
    description: "رمادي فاتح نظيف ومبسط للغاية، يضع التركيز على المحتوى.",
    primaryColor: "#374151",
    secondaryColor: "#9CA3AF",
    accentColor: "#3B82F6",
    backgroundColor: "#F9FAFB",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#F3F4F6",
    sidebarColor: "#ECEEF1",
    textColor: "#111827",
    logoIdea: "نص فقط بخط هندسي بسيط",
    schoolNameIdea: "مدرسة البساطة",
  },
  {
    id: "high-contrast",
    familyId: "classic",
    familyLabel: "العائلة الكلاسيكية",
    label: "High Contrast",
    description: "تباين عالي للوضوح التام، مثالي للطباعة والتقارير الرسمية.",
    primaryColor: "#000000",
    secondaryColor: "#4B5563",
    accentColor: "#2563EB",
    backgroundColor: "#FFFFFF",
    surfaceColor: "#FAFAFA",
    surfaceMutedColor: "#F3F4F6",
    sidebarColor: "#F1F2F4",
    textColor: "#000000",
    logoIdea: "أسود وأبيض صرف بدون ظلال",
    schoolNameIdea: "المدرسة الرسمية",
  },
  {
    id: "pastel-soft",
    familyId: "classic",
    familyLabel: "العائلة الكلاسيكية",
    label: "Pastel Soft",
    description: "ألوان باستيل هادئة وناعمة، مثالية للمراحل الابتدائية والروضات.",
    primaryColor: "#6B7ABA",
    secondaryColor: "#B5C8F5",
    accentColor: "#F9A8C9",
    backgroundColor: "#FAFBFF",
    surfaceColor: "#FFFFFF",
    surfaceMutedColor: "#EEF2FF",
    sidebarColor: "#E6ECFF",
    textColor: "#252B44",
    logoIdea: "أشكال هندسية ناعمة ملونة",
    schoolNameIdea: "روضة الأحبة",
  },

  // ── DARK ──────────────────────────────────────────────────────────────────
  {
    id: "dark-professional",
    familyId: "dark",
    familyLabel: "العائلة الداكنة",
    label: "Dark Professional",
    description: "وضع داكن احترافي للعمل ليلاً أو المظهر المتطور.",
    primaryColor: "#6366F1",
    secondaryColor: "#A5B4FC",
    accentColor: "#FCD34D",
    backgroundColor: "#0F172A",
    surfaceColor: "#1E293B",
    surfaceMutedColor: "#334155",
    sidebarColor: "#1E293B",
    textColor: "#F8FAFC",
    logoIdea: "لوغو مضيء على خلفية داكنة",
    schoolNameIdea: "معهد التميز الاحترافي",
  },
];

export const BRAND_THEME_PRESETS = PRESETS;

export const BRAND_THEME_FAMILIES: BrandThemeFamily[] = [
  {
    id: "blue",
    label: "العائلة الزرقاء",
    description: "مؤسساتية، تعليمية، حديثة، ومناسبة للمدارس الرسمية والأهلية.",
    presets: PRESETS.filter((p) => p.familyId === "blue"),
  },
  {
    id: "green",
    label: "العائلة الخضراء",
    description: "مريحة، متوازنة، وتوحي بالنمو والاستقرار والهدوء التعليمي.",
    presets: PRESETS.filter((p) => p.familyId === "green"),
  },
  {
    id: "warm",
    label: "العائلة الدافئة",
    description: "أكثر قرباً وإنسانية، ومناسبة للهويات العربية أو المدارس العريقة.",
    presets: PRESETS.filter((p) => p.familyId === "warm"),
  },
  {
    id: "purple",
    label: "العائلة البنفسجية",
    description: "أنيقة وإبداعية، مثالية للمدارس الملكية والفنية والتقنية.",
    presets: PRESETS.filter((p) => p.familyId === "purple"),
  },
  {
    id: "orange",
    label: "العائلة البرتقالية",
    description: "طاقة وتفاؤل، مناسبة للمدارس الديناميكية والهويات العصرية المشرقة.",
    presets: PRESETS.filter((p) => p.familyId === "orange"),
  },
  {
    id: "teal",
    label: "العائلة الزمردية الفيروزية",
    description: "هدوء وتوازن بين الأخضر والأزرق، مثالية للبيئات التعليمية المتطورة.",
    presets: PRESETS.filter((p) => p.familyId === "teal"),
  },
  {
    id: "red",
    label: "العائلة الحمراء",
    description: "قوة وحضور واضح، للثانويات والمدارس ذات الشخصية القوية.",
    presets: PRESETS.filter((p) => p.familyId === "red"),
  },
  {
    id: "indigo",
    label: "العائلة النيلية",
    description: "عمق وهدوء فكري، للمدارس الأكاديمية والعلمية الراقية.",
    presets: PRESETS.filter((p) => p.familyId === "indigo"),
  },
  {
    id: "emerald",
    label: "العائلة الزمردية",
    description: "خضراء داكنة راسخة، تعبّر عن الأمل والنجاح والنمو.",
    presets: PRESETS.filter((p) => p.familyId === "emerald"),
  },
  {
    id: "amber",
    label: "العائلة الكهرمانية",
    description: "ذهبي دافئ يحمل روح العراق وأصالة الهوية المحلية.",
    presets: PRESETS.filter((p) => p.familyId === "amber"),
  },
  {
    id: "classic",
    label: "العائلة الكلاسيكية",
    description: "تصاميم نظيفة ومبسطة تعتمد على الألوان الأساسية والتباين الواضح.",
    presets: PRESETS.filter((p) => p.familyId === "classic"),
  },
  {
    id: "dark",
    label: "العائلة الداكنة",
    description: "وضع احترافي داكن للعمل في الإضاءة المنخفضة.",
    presets: PRESETS.filter((p) => p.familyId === "dark"),
  },
];

export function getBrandThemePreset(
  presetId: string | null | undefined,
): BrandThemePreset | null {
  if (!presetId) return null;
  return PRESETS.find((p) => p.id === presetId) ?? null;
}
