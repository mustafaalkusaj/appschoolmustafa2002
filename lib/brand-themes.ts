export type BrandThemeFamilyId = "blue" | "green" | "warm" | "purple" | "orange" | "teal" | "red" | "indigo" | "emerald" | "amber" | "classic" | "dark";

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
  | "red-alert"
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
  | "dark-professional"
  | "minimal-grey"
  | "high-contrast"
  | "pastel-soft";

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
  // 24 more presets to make 33 total (9 families x 3 = 27 + 6 special)
  // Each with unique Arabic/English labels, colors, ideas for schools
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
    presets: PRESETS.filter((preset) => preset.familyId === "blue"),
  },
  {
    id: "green",
    label: "العائلة الخضراء",
    description: "مريحة، متوازنة، وتوحي بالنمو والاستقرار والهدوء التعليمي.",
    presets: PRESETS.filter((preset) => preset.familyId === "green"),
  },
  {
    id: "warm",
    label: "العائلة الدافئة",
    description: "أكثر قرباً وإنسانية، ومناسبة للهويات العربية أو المدارس العريقة.",
    presets: PRESETS.filter((preset) => preset.familyId === "warm"),
  },
  {
    id: "purple",
    label: "العائلة البنفسجية",
    description: "أنيقة وإبداعية، مثالية للمدارس الملكية والفنية والتقنية.",
    presets: PRESETS.filter((preset) => preset.familyId === "purple"),
  },
  {
    id: "classic",
    label: "العائلة الكلاسيكية",
    description: "تصاميم تقليدية ونظيفة تعتمد على الألوان الأساسية.",
    presets: PRESETS.filter((preset) => preset.familyId === "classic"),
  },
  {
    id: "dark",
    label: "العائلة الداكنة",
    description: "وضع احترافي داكن للعمل في الإضاءة المنخفضة.",
    presets: PRESETS.filter((preset) => preset.familyId === "dark"),
  },
];

export function getBrandThemePreset(presetId: string | null | undefined) {
  if (!presetId) return null;
  return PRESETS.find((preset) => preset.id === presetId) ?? null;
}

