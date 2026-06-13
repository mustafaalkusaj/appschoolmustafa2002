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
  | "dark"
  | "navy"
  | "rose"
  | "slate"
  | "sky"
  | "earth"
  | "gold"
  | "pink"
  | "mint"
  | "violet"
  | "copper"
  | "forest"
  | "ocean"
  | "plum"
  | "lemon";

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
  | "dark-professional"
  | "navy-deep"
  | "navy-royal"
  | "navy-classic"
  | "rose-elegant"
  | "rose-soft"
  | "rose-bloom"
  | "slate-corporate"
  | "slate-modern"
  | "slate-business"
  | "sky-fresh"
  | "sky-light"
  | "sky-academic"
  | "earth-warm"
  | "earth-classic"
  | "earth-academic"
  | "gold-regal"
  | "gold-executive"
  | "gold-ceremony"
  | "dark-midnight"
  | "dark-carbon"
  | "blue-deep" | "blue-sky" | "blue-crystal"
  | "green-forest" | "green-mint" | "green-jade"
  | "warm-terracotta" | "warm-sand" | "warm-brick"
  | "purple-violet" | "purple-grape" | "purple-lavender"
  | "orange-amber" | "orange-flame" | "orange-coral"
  | "teal-aqua" | "teal-cyan" | "teal-seafoam"
  | "red-crimson" | "red-rose" | "red-garnet"
  | "indigo-midnight" | "indigo-denim" | "indigo-sapphire"
  | "emerald-deep" | "emerald-jungle" | "emerald-pine"
  | "amber-gold" | "amber-honey" | "amber-saffron"
  | "classic-pure" | "classic-mono" | "classic-paper"
  | "dark-obsidian" | "dark-charcoal" | "dark-void"
  | "navy-deep" | "navy-storm" | "navy-ink"
  | "rose-blush" | "rose-petal" | "rose-ruby"
  | "slate-ash" | "slate-zinc" | "slate-iron"
  | "sky-azure" | "sky-cerulean" | "sky-periwinkle"
  | "earth-clay" | "earth-olive" | "earth-sienna"
  | "gold-brass" | "gold-ochre" | "gold-harvest"
  // ── PINK ──
  | "pink-vivid" | "pink-fuchsia" | "pink-hot"
  // ── MINT ──
  | "mint-fresh" | "mint-cool" | "mint-pearl"
  // ── VIOLET ──
  | "violet-electric" | "violet-neon" | "violet-deep"
  // ── COPPER ──
  | "copper-warm" | "copper-rich" | "copper-antique"
  // ── FOREST ──
  | "forest-pine" | "forest-jungle" | "forest-moss"
  // ── OCEAN ──
  | "ocean-deep" | "ocean-tropic" | "ocean-arctic"
  // ── PLUM ──
  | "plum-dark" | "plum-bloom" | "plum-velvet"
  // ── LEMON ──
  | "lemon-bright" | "lemon-lime" | "lemon-citrus";

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

  // ── NAVY ──────────────────────────────────────────────────────────────────
  {
    id: "navy-deep",
    familyId: "navy",
    familyLabel: "العائلة البحرية",
    label: "Deep Navy",
    description: "أزرق بحري داكن راسخ ذو هيبة وجدية، يناسب الكليات والمعاهد.",
    primaryColor: "#1a3a5c",
    secondaryColor: "#4a90e2",
    accentColor: "#f0b429",
    backgroundColor: "#f0f5fb",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#dde8f5",
    sidebarColor: "#ccdaf0",
    textColor: "#0b1e31",
    logoIdea: "مرساة أو سفينة أو نجمة بحرية",
    schoolNameIdea: "معهد الشواطئ المعرفية",
  },
  {
    id: "navy-royal",
    familyId: "navy",
    familyLabel: "العائلة البحرية",
    label: "Royal Navy",
    description: "بحري ملكي داكن بتفاصيل ذهبية راقية، لمدارس ذات هيبة وتاريخ.",
    primaryColor: "#0f2d5a",
    secondaryColor: "#3a7bd5",
    accentColor: "#f4c542",
    backgroundColor: "#f2f6fc",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#dce7f6",
    sidebarColor: "#cad9f1",
    textColor: "#090e1c",
    logoIdea: "شعار ملكي أو تاج بحري",
    schoolNameIdea: "الأكاديمية الملكية البحرية",
  },
  {
    id: "navy-classic",
    familyId: "navy",
    familyLabel: "العائلة البحرية",
    label: "Navy Classic",
    description: "بحري كلاسيكي أنيق بلمسات فاتحة، يعكس الجدية والالتزام الأكاديمي.",
    primaryColor: "#1e3a6e",
    secondaryColor: "#60a5fa",
    accentColor: "#fbbf24",
    backgroundColor: "#f4f8fe",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#e1ecfb",
    sidebarColor: "#d3e4f9",
    textColor: "#0c1c35",
    logoIdea: "درع نجمي أو حرف N هندسي",
    schoolNameIdea: "مدرسة الأفق الأزرق",
  },

  // ── ROSE ──────────────────────────────────────────────────────────────────
  {
    id: "rose-elegant",
    familyId: "rose",
    familyLabel: "العائلة الوردية",
    label: "Rose Elegant",
    description: "وردي أنيق هادئ يناسب مدارس البنات والمؤسسات التعليمية النسائية.",
    primaryColor: "#9d174d",
    secondaryColor: "#f9a8d4",
    accentColor: "#fbbf24",
    backgroundColor: "#fff7fa",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#fce7f3",
    sidebarColor: "#fbdaee",
    textColor: "#3d071e",
    logoIdea: "وردة أو فراشة أو شكل دائري أنثوي",
    schoolNameIdea: "مدرسة الوردة البيضاء",
  },
  {
    id: "rose-soft",
    familyId: "rose",
    familyLabel: "العائلة الوردية",
    label: "Soft Blossom",
    description: "ألوان ناعمة مزهرة مناسبة للروضات ومدارس المرحلة الابتدائية.",
    primaryColor: "#be185d",
    secondaryColor: "#fecdd3",
    accentColor: "#818cf8",
    backgroundColor: "#fff5f8",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#fce7f0",
    sidebarColor: "#fbd5e8",
    textColor: "#4a0725",
    logoIdea: "بتلات زهرة أو قلب مع كتاب",
    schoolNameIdea: "روضة زهرة الربيع",
  },
  {
    id: "rose-bloom",
    familyId: "rose",
    familyLabel: "العائلة الوردية",
    label: "Deep Rose",
    description: "وردي عميق ومشرق يعكس الحيوية والطاقة لمدارس البنات الثانوية.",
    primaryColor: "#881337",
    secondaryColor: "#fb7185",
    accentColor: "#6ee7b7",
    backgroundColor: "#fff1f4",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#ffe4e8",
    sidebarColor: "#ffd5dc",
    textColor: "#340717",
    logoIdea: "نجمة خماسية وردية أو تاج بسيط",
    schoolNameIdea: "ثانوية الياسمين",
  },

  // ── SLATE ─────────────────────────────────────────────────────────────────
  {
    id: "slate-corporate",
    familyId: "slate",
    familyLabel: "العائلة الرمادية الراقية",
    label: "Corporate Slate",
    description: "رمادي مؤسسي راقٍ يعكس الجدية والمهنية العالية للمدارس التجارية.",
    primaryColor: "#334155",
    secondaryColor: "#94a3b8",
    accentColor: "#3b82f6",
    backgroundColor: "#f8fafc",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#f1f5f9",
    sidebarColor: "#e8edf4",
    textColor: "#0f172a",
    logoIdea: "مكعب أو مستطيل هندسي بلا حواف",
    schoolNameIdea: "الأكاديمية التجارية",
  },
  {
    id: "slate-modern",
    familyId: "slate",
    familyLabel: "العائلة الرمادية الراقية",
    label: "Modern Slate",
    description: "رمادي داكن حديث مع تفاصيل فيروزية، لمدارس التقنية والإعلام.",
    primaryColor: "#1e293b",
    secondaryColor: "#64748b",
    accentColor: "#22d3ee",
    backgroundColor: "#f7f9fb",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#eef2f7",
    sidebarColor: "#e2e8f0",
    textColor: "#0a0f1a",
    logoIdea: "خطوط هندسية متوازية أو مسار رقمي",
    schoolNameIdea: "مدرسة الإعلام والتقنية",
  },
  {
    id: "slate-business",
    familyId: "slate",
    familyLabel: "العائلة الرمادية الراقية",
    label: "Business Pro",
    description: "رمادي أعمال احترافي بلمسات ذهبية للتميز في بيئة تعليمية مهنية.",
    primaryColor: "#475569",
    secondaryColor: "#cbd5e1",
    accentColor: "#f59e0b",
    backgroundColor: "#f8fafc",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#f1f5f9",
    sidebarColor: "#e8edf3",
    textColor: "#1e293b",
    logoIdea: "حقيبة أعمال أو مبنى زجاجي مبسط",
    schoolNameIdea: "كلية الأعمال والإدارة",
  },

  // ── SKY ───────────────────────────────────────────────────────────────────
  {
    id: "sky-fresh",
    familyId: "sky",
    familyLabel: "العائلة السماوية",
    label: "Sky Fresh",
    description: "سماوي منعش ونظيف يوحي بالانفتاح والتجديد، للمدارس الحديثة.",
    primaryColor: "#0369a1",
    secondaryColor: "#7dd3fc",
    accentColor: "#f97316",
    backgroundColor: "#f0f9ff",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#e0f2fe",
    sidebarColor: "#cce8fb",
    textColor: "#0c2d40",
    logoIdea: "سحابة مع كتاب أو طائرة ورقية",
    schoolNameIdea: "مدارس السماء المفتوحة",
  },
  {
    id: "sky-light",
    familyId: "sky",
    familyLabel: "العائلة السماوية",
    label: "Light Horizon",
    description: "أفق فاتح وواسع، أزرق سماوي ناعم مناسب للمدارس الصغيرة والودية.",
    primaryColor: "#0284c7",
    secondaryColor: "#bae6fd",
    accentColor: "#a21caf",
    backgroundColor: "#f5fbff",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#dff0fd",
    sidebarColor: "#cce6fb",
    textColor: "#0a2233",
    logoIdea: "شروق شمس فوق خط الأفق",
    schoolNameIdea: "مدرسة الأفق المضيء",
  },
  {
    id: "sky-academic",
    familyId: "sky",
    familyLabel: "العائلة السماوية",
    label: "Sky Academic",
    description: "سماوي أكاديمي رصين بدرجة وسطية لمدارس التعليم العام الحديث.",
    primaryColor: "#0891b2",
    secondaryColor: "#a5f3fc",
    accentColor: "#f59e0b",
    backgroundColor: "#f0fdfe",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#cdfafd",
    sidebarColor: "#bbf0f8",
    textColor: "#083242",
    logoIdea: "كوكب أو نظام شمسي مبسط",
    schoolNameIdea: "أكاديمية الفضاء المعرفي",
  },

  // ── EARTH ─────────────────────────────────────────────────────────────────
  {
    id: "earth-warm",
    familyId: "earth",
    familyLabel: "العائلة الترابية",
    label: "Warm Earth",
    description: "ترابي دافئ أصيل يعكس الانتماء للأرض والجذور الثقافية العميقة.",
    primaryColor: "#7c2d12",
    secondaryColor: "#d97706",
    accentColor: "#065f46",
    backgroundColor: "#fdf8f3",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#f5e9dc",
    sidebarColor: "#eddccc",
    textColor: "#2c1008",
    logoIdea: "شجرة نخيل أو قلعة تاريخية",
    schoolNameIdea: "مدارس الجذور والأصالة",
  },
  {
    id: "earth-classic",
    familyId: "earth",
    familyLabel: "العائلة الترابية",
    label: "Earth Classic",
    description: "بني كلاسيكي راسخ يناسب مدارس التراث والتاريخ والهوية المحلية.",
    primaryColor: "#6b3a1f",
    secondaryColor: "#b45309",
    accentColor: "#1d4ed8",
    backgroundColor: "#fdf5ee",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#f3e5d8",
    sidebarColor: "#eed9c9",
    textColor: "#271508",
    logoIdea: "آثار أو أعمدة تراثية مبسطة",
    schoolNameIdea: "دار التراث والمعرفة",
  },
  {
    id: "earth-academic",
    familyId: "earth",
    familyLabel: "العائلة الترابية",
    label: "Earth Academic",
    description: "ترابي مؤسسي يجمع بين الأصالة والمهنية للمدارس الرسمية العريقة.",
    primaryColor: "#713f12",
    secondaryColor: "#ca8a04",
    accentColor: "#4338ca",
    backgroundColor: "#fefce8",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#fef9c3",
    sidebarColor: "#fde68a",
    textColor: "#291a04",
    logoIdea: "كتاب مع إطار ذهبي أو شعلة برونزية",
    schoolNameIdea: "مدرسة الأصالة الأكاديمية",
  },

  // ── GOLD ──────────────────────────────────────────────────────────────────
  {
    id: "gold-regal",
    familyId: "gold",
    familyLabel: "العائلة الذهبية الراقية",
    label: "Regal Gold",
    description: "ذهبي فاخر بتدرجات ملكية راقية لمؤسسات التعليم الراقية والنخبوية.",
    primaryColor: "#7c5a08",
    secondaryColor: "#fbbf24",
    accentColor: "#312e81",
    backgroundColor: "#fffdf0",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#fef9c3",
    sidebarColor: "#fde68a",
    textColor: "#2d1c04",
    logoIdea: "تاج ذهبي أو شعلة معرفة ذهبية",
    schoolNameIdea: "مدرسة الذهب الأكاديمي",
  },
  {
    id: "gold-executive",
    familyId: "gold",
    familyLabel: "العائلة الذهبية الراقية",
    label: "Executive Gold",
    description: "ذهبي تنفيذي فاخر يجمع بين القيادة والتميز للإدارات الأكاديمية.",
    primaryColor: "#92540c",
    secondaryColor: "#fde68a",
    accentColor: "#1e40af",
    backgroundColor: "#fffcf0",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#fef3c7",
    sidebarColor: "#fde89a",
    textColor: "#352006",
    logoIdea: "قلم حبر ذهبي أو Crest مذهب",
    schoolNameIdea: "الأكاديمية التنفيذية",
  },
  {
    id: "gold-ceremony",
    familyId: "gold",
    familyLabel: "العائلة الذهبية الراقية",
    label: "Ceremony Gold",
    description: "ذهبي احتفالي يُبرز المناسبات والتخرج، مناسب للمدارس ذات الطابع الرسمي.",
    primaryColor: "#854d0e",
    secondaryColor: "#fcd34d",
    accentColor: "#6d28d9",
    backgroundColor: "#fff8e8",
    surfaceColor: "#ffffff",
    surfaceMutedColor: "#fef3c7",
    sidebarColor: "#fde89e",
    textColor: "#301b05",
    logoIdea: "وسام أو ميدالية ذهبية مبسطة",
    schoolNameIdea: "مدرسة الشرف والتميز",
  },

  // ── DARK (additional) ─────────────────────────────────────────────────────
  {
    id: "dark-midnight",
    familyId: "dark",
    familyLabel: "العائلة الداكنة",
    label: "Midnight Tech",
    description: "أسود منتصف الليل بنبضات أرجوانية تقنية، للمعاهد الرقمية المتقدمة.",
    primaryColor: "#7c3aed",
    secondaryColor: "#c4b5fd",
    accentColor: "#34d399",
    backgroundColor: "#0d0d1a",
    surfaceColor: "#1a1a2e",
    surfaceMutedColor: "#2d2d4e",
    sidebarColor: "#1e1e3a",
    textColor: "#f0eeff",
    logoIdea: "circuit board أو شبكة نقاط مضيئة",
    schoolNameIdea: "أكاديمية الفضاء الرقمي",
  },
  {
    id: "dark-carbon",
    familyId: "dark",
    familyLabel: "العائلة الداكنة",
    label: "Carbon Dark",
    description: "كربون داكن حديث بلمسات فيروزية، للمدارس التقنية والهندسية المتقدمة.",
    primaryColor: "#0e7490",
    secondaryColor: "#22d3ee",
    accentColor: "#f97316",
    backgroundColor: "#0a0f14",
    surfaceColor: "#111827",
    surfaceMutedColor: "#1f2937",
    sidebarColor: "#161e27",
    textColor: "#f8fafc",
    logoIdea: "gear مبسط أو بنية هندسية داكنة",
    schoolNameIdea: "معهد الهندسة والتقنية",
  },
  // ── BLUE (extra) ──────────────────────────────────────────────────────────
  { id:"blue-deep", familyId:"blue", familyLabel:"العائلة الزرقاء", label:"Deep Ocean", description:"أزرق غامق عميق يوحي بالثقة والعمق الأكاديمي.", primaryColor:"#0C2D6B", secondaryColor:"#4A90D9", accentColor:"#F4A228", backgroundColor:"#F0F5FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DAE4F5", sidebarColor:"#C8D9F0", textColor:"#071430", logoIdea:"تاج مع نجمة", schoolNameIdea:"مدرسة الرواد" },
  { id:"blue-sky",  familyId:"blue", familyLabel:"العائلة الزرقاء", label:"Sky Horizon", description:"أزرق فاتح صافٍ يبعث على الانفتاح والتفاؤل.", primaryColor:"#2563EB", secondaryColor:"#93C5FD", accentColor:"#F59E0B", backgroundColor:"#EFF6FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DBEAFE", sidebarColor:"#BFDBFE", textColor:"#1E3A5F", logoIdea:"شعاع شمس وكتاب", schoolNameIdea:"الآفاق الواعدة" },
  { id:"blue-crystal", familyId:"blue", familyLabel:"العائلة الزرقاء", label:"Crystal Blue", description:"زرقاء بلورية شفافة بتفاصيل راقية.", primaryColor:"#0284C7", secondaryColor:"#38BDF8", accentColor:"#E879F9", backgroundColor:"#F0F9FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#E0F2FE", sidebarColor:"#BAE6FD", textColor:"#0C2637", logoIdea:"بلورة هندسية", schoolNameIdea:"معهد البلور" },

  // ── GREEN (extra) ──────────────────────────────────────────────────────────
  { id:"green-forest", familyId:"green", familyLabel:"العائلة الخضراء", label:"Forest Deep", description:"أخضر الغابة الداكن يبعث على الهدوء والتركيز.", primaryColor:"#166534", secondaryColor:"#4ADE80", accentColor:"#FBBF24", backgroundColor:"#F0FDF4", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DCFCE7", sidebarColor:"#BBF7D0", textColor:"#052E16", logoIdea:"شجرة مبسطة", schoolNameIdea:"مدرسة الغابة الخضراء" },
  { id:"green-mint",   familyId:"green", familyLabel:"العائلة الخضراء", label:"Fresh Mint", description:"أخضر نعناعي منعش مناسب للمراحل الابتدائية.", primaryColor:"#059669", secondaryColor:"#6EE7B7", accentColor:"#F97316", backgroundColor:"#ECFDF5", surfaceColor:"#FFFFFF", surfaceMutedColor:"#D1FAE5", sidebarColor:"#A7F3D0", textColor:"#064E3B", logoIdea:"ورقة نعناع", schoolNameIdea:"روضة النعناع" },
  { id:"green-jade",   familyId:"green", familyLabel:"العائلة الخضراء", label:"Jade Stone", description:"أخضر يشمي راقٍ يليق بالمؤسسات التعليمية الراسخة.", primaryColor:"#1A7A4A", secondaryColor:"#52D68A", accentColor:"#D4A017", backgroundColor:"#F2FBF6", surfaceColor:"#FFFFFF", surfaceMutedColor:"#D6F0E4", sidebarColor:"#B8E8CC", textColor:"#0B2E1F", logoIdea:"حجر يشم مصقول", schoolNameIdea:"أكاديمية اليشم" },

  // ── WARM (extra) ───────────────────────────────────────────────────────────
  { id:"warm-terracotta", familyId:"warm", familyLabel:"العائلة الدافئة", label:"Terracotta", description:"طيني دافئ يستحضر أصالة الطين والموروث العراقي.", primaryColor:"#C2400A", secondaryColor:"#FB923C", accentColor:"#4F7942", backgroundColor:"#FFF7F3", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FDE8DC", sidebarColor:"#FCD5C0", textColor:"#3D1A0A", logoIdea:"قوس طيني", schoolNameIdea:"مدرسة التراث" },
  { id:"warm-sand",       familyId:"warm", familyLabel:"العائلة الدافئة", label:"Desert Sand", description:"رملي ذهبي هادئ يذكر بسهول العراق الشاسعة.", primaryColor:"#B45309", secondaryColor:"#FCD34D", accentColor:"#065F46", backgroundColor:"#FFFBEB", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF3C7", sidebarColor:"#FDE68A", textColor:"#451A03", logoIdea:"نخلة بسيطة", schoolNameIdea:"مدرسة الرمال الذهبية" },
  { id:"warm-brick",      familyId:"warm", familyLabel:"العائلة الدافئة", label:"Brick Red", description:"أحمر طوبي دافئ متجذر وقوي.", primaryColor:"#9B2C2C", secondaryColor:"#FC8181", accentColor:"#276749", backgroundColor:"#FFF5F5", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FED7D7", sidebarColor:"#FEB2B2", textColor:"#2D0A0A", logoIdea:"جدار طوب", schoolNameIdea:"مدرسة الطوب الأحمر" },

  // ── PURPLE (extra) ─────────────────────────────────────────────────────────
  { id:"purple-violet",   familyId:"purple", familyLabel:"العائلة البنفسجية", label:"Deep Violet", description:"بنفسجي عميق ملكي يناسب المدارس الراقية.", primaryColor:"#5B21B6", secondaryColor:"#A78BFA", accentColor:"#EC4899", backgroundColor:"#F5F3FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#EDE9FE", sidebarColor:"#DDD6FE", textColor:"#1E0E4A", logoIdea:"تاج ملكي بنفسجي", schoolNameIdea:"مدرسة الأرجوان" },
  { id:"purple-grape",    familyId:"purple", familyLabel:"العائلة البنفسجية", label:"Grape", description:"بنفسجي عنبي غامق حيوي وإبداعي.", primaryColor:"#7C3AED", secondaryColor:"#C4B5FD", accentColor:"#F59E0B", backgroundColor:"#FAF5FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#EDE9FE", sidebarColor:"#D8B4FE", textColor:"#2E1065", logoIdea:"عنقود عنب هندسي", schoolNameIdea:"نادي الإبداع" },
  { id:"purple-lavender", familyId:"purple", familyLabel:"العائلة البنفسجية", label:"Lavender", description:"خزامى ناعم هادئ مناسب للمدارس الأنيقة.", primaryColor:"#9333EA", secondaryColor:"#D8B4FE", accentColor:"#10B981", backgroundColor:"#FDF4FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#F3E8FF", sidebarColor:"#E9D5FF", textColor:"#3B0764", logoIdea:"وردة خزامى", schoolNameIdea:"مدرسة الخزامى" },

  // ── ORANGE (extra) ─────────────────────────────────────────────────────────
  { id:"orange-amber",  familyId:"orange", familyLabel:"العائلة البرتقالية", label:"Amber Glow", description:"برتقالي كهرماني دافئ يشع حيوية وطاقة.", primaryColor:"#D97706", secondaryColor:"#FCD34D", accentColor:"#1D4ED8", backgroundColor:"#FFFBEB", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF3C7", sidebarColor:"#FDE68A", textColor:"#451A03", logoIdea:"شعلة كهرمانية", schoolNameIdea:"مدرسة الكهرمان" },
  { id:"orange-flame",  familyId:"orange", familyLabel:"العائلة البرتقالية", label:"Flame", description:"لهب برتقالي ناري يعبر عن الشغف والطموح.", primaryColor:"#EA580C", secondaryColor:"#FDBA74", accentColor:"#1E40AF", backgroundColor:"#FFF7ED", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FFEDD5", sidebarColor:"#FED7AA", textColor:"#431407", logoIdea:"شعلة مبسطة", schoolNameIdea:"أكاديمية اللهب" },
  { id:"orange-coral",  familyId:"orange", familyLabel:"العائلة البرتقالية", label:"Coral", description:"مرجاني دافئ يجمع بين البرتقالي والوردي بشكل عصري.", primaryColor:"#F97316", secondaryColor:"#FCA5A1", accentColor:"#0EA5E9", backgroundColor:"#FFF8F6", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FFE8E4", sidebarColor:"#FFD5CF", textColor:"#3B1208", logoIdea:"مرجانة بحرية", schoolNameIdea:"مدرسة المرجان" },

  // ── TEAL (extra) ───────────────────────────────────────────────────────────
  { id:"teal-aqua",     familyId:"teal", familyLabel:"العائلة الزمردية الفيروزية", label:"Aqua", description:"أكوا حيوي نابض يجمع الأخضر والأزرق.", primaryColor:"#0891B2", secondaryColor:"#67E8F9", accentColor:"#F59E0B", backgroundColor:"#F0FDFF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#CFFAFE", sidebarColor:"#A5F3FC", textColor:"#0C2230", logoIdea:"موجة بحرية", schoolNameIdea:"مدرسة الأكوا" },
  { id:"teal-cyan",     familyId:"teal", familyLabel:"العائلة الزمردية الفيروزية", label:"Cyan", description:"سماوي زاهٍ يبعث على النظافة والوضوح.", primaryColor:"#06B6D4", secondaryColor:"#7DD3FC", accentColor:"#F97316", backgroundColor:"#ECFEFF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#CFFAFE", sidebarColor:"#BAE6FD", textColor:"#082F49", logoIdea:"دائرة شبكية", schoolNameIdea:"مدرسة الأفق الأزرق" },
  { id:"teal-seafoam",  familyId:"teal", familyLabel:"العائلة الزمردية الفيروزية", label:"Seafoam", description:"رغوة البحر اللطيفة المناسبة للبيئات التعليمية المحفزة.", primaryColor:"#14B8A6", secondaryColor:"#5EEAD4", accentColor:"#FB923C", backgroundColor:"#F0FDFA", surfaceColor:"#FFFFFF", surfaceMutedColor:"#CCFBF1", sidebarColor:"#99F6E4", textColor:"#042F2E", logoIdea:"سمكة هندسية", schoolNameIdea:"مدرسة رغوة البحر" },

  // ── RED (extra) ────────────────────────────────────────────────────────────
  { id:"red-crimson",  familyId:"red", familyLabel:"العائلة الحمراء", label:"Crimson", description:"قرمزي داكن يوحي بالقوة والرسوخ.", primaryColor:"#991B1B", secondaryColor:"#FCA5A5", accentColor:"#D97706", backgroundColor:"#FFF5F5", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEE2E2", sidebarColor:"#FECACA", textColor:"#1A0505", logoIdea:"درع قرمزي", schoolNameIdea:"مدرسة القرمزي" },
  { id:"red-rose",     familyId:"red", familyLabel:"العائلة الحمراء", label:"Rose Red", description:"أحمر وردي ناعم مناسب للمؤسسات التعليمية الأنيقة.", primaryColor:"#E11D48", secondaryColor:"#FDA4AF", accentColor:"#059669", backgroundColor:"#FFF1F2", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FFE4E6", sidebarColor:"#FECDD3", textColor:"#3B0010", logoIdea:"وردة هندسية", schoolNameIdea:"أكاديمية الوردة" },
  { id:"red-garnet",   familyId:"red", familyLabel:"العائلة الحمراء", label:"Garnet", description:"أحمر ياقوتي راقٍ يليق بالمؤسسات الكلاسيكية.", primaryColor:"#9F1239", secondaryColor:"#F43F5E", accentColor:"#B45309", backgroundColor:"#FFF0F3", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FFE4EA", sidebarColor:"#FECDD9", textColor:"#200008", logoIdea:"ياقوتة هندسية", schoolNameIdea:"مدرسة الياقوت" },

  // ── INDIGO (extra) ─────────────────────────────────────────────────────────
  { id:"indigo-midnight", familyId:"indigo", familyLabel:"العائلة النيلية", label:"Midnight", description:"نيلي منتصف الليل عميق وهادئ للمؤسسات الأكاديمية الكبرى.", primaryColor:"#312E81", secondaryColor:"#818CF8", accentColor:"#F59E0B", backgroundColor:"#EEF2FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#E0E7FF", sidebarColor:"#C7D2FE", textColor:"#0F0A2E", logoIdea:"نجوم ليل هندسية", schoolNameIdea:"جامعة المساء" },
  { id:"indigo-denim",    familyId:"indigo", familyLabel:"العائلة النيلية", label:"Denim Blue", description:"دينم ثابت مألوف يناسب بيئات التعليم المتوسط.", primaryColor:"#3730A3", secondaryColor:"#A5B4FC", accentColor:"#10B981", backgroundColor:"#F0F1FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DDE1FF", sidebarColor:"#C0C8FF", textColor:"#12104A", logoIdea:"كتاب مفتوح نيلي", schoolNameIdea:"مدرسة التعليم الأساسي" },
  { id:"indigo-sapphire", familyId:"indigo", familyLabel:"العائلة النيلية", label:"Sapphire", description:"ياقوت أزرق فاخر للمدارس ذات الطابع الراقي.", primaryColor:"#1E3A8A", secondaryColor:"#60A5FA", accentColor:"#D97706", backgroundColor:"#EFF6FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DBEAFE", sidebarColor:"#BFDBFE", textColor:"#07133A", logoIdea:"حجر ياقوت أزرق", schoolNameIdea:"مدرسة الياقوت الأزرق" },

  // ── EMERALD (extra) ────────────────────────────────────────────────────────
  { id:"emerald-deep",   familyId:"emerald", familyLabel:"العائلة الزمردية", label:"Deep Emerald", description:"زمردي داكن يبعث على الثقة والنجاح.", primaryColor:"#065F46", secondaryColor:"#34D399", accentColor:"#F59E0B", backgroundColor:"#ECFDF5", surfaceColor:"#FFFFFF", surfaceMutedColor:"#D1FAE5", sidebarColor:"#A7F3D0", textColor:"#012718", logoIdea:"مربع زمردي", schoolNameIdea:"مؤسسة الزمرد" },
  { id:"emerald-jungle", familyId:"emerald", familyLabel:"العائلة الزمردية", label:"Jungle", description:"أخضر الغابة الاستوائية الكثيف والحيوي.", primaryColor:"#15803D", secondaryColor:"#86EFAC", accentColor:"#F97316", backgroundColor:"#F0FDF4", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DCFCE7", sidebarColor:"#BBF7D0", textColor:"#052E16", logoIdea:"مسارات غابة", schoolNameIdea:"أكاديمية الغابة" },
  { id:"emerald-pine",   familyId:"emerald", familyLabel:"العائلة الزمردية", label:"Pine", description:"أخضر الصنوبر الهادئ للبيئات التعليمية الطبيعية.", primaryColor:"#166534", secondaryColor:"#4ADE80", accentColor:"#CA8A04", backgroundColor:"#F0FDF4", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DCFCE7", sidebarColor:"#BBF7D0", textColor:"#05200F", logoIdea:"شجرة صنوبر مبسطة", schoolNameIdea:"مدرسة الصنوبر" },

  // ── AMBER (extra) ──────────────────────────────────────────────────────────
  { id:"amber-gold",    familyId:"amber", familyLabel:"العائلة الكهرمانية", label:"Pure Gold", description:"ذهبي نقي يعكس الفخر والتميز.", primaryColor:"#B45309", secondaryColor:"#FDE68A", accentColor:"#1D4ED8", backgroundColor:"#FFFBEB", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF3C7", sidebarColor:"#FDE68A", textColor:"#451A03", logoIdea:"كوب قهوة عراقي", schoolNameIdea:"مدرسة الذهب" },
  { id:"amber-honey",   familyId:"amber", familyLabel:"العائلة الكهرمانية", label:"Honey", description:"عسلي دافئ شهي يذكر بالدفء والأصالة.", primaryColor:"#D97706", secondaryColor:"#FCD34D", accentColor:"#7C3AED", backgroundColor:"#FFFBEB", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF9C3", sidebarColor:"#FEF08A", textColor:"#431407", logoIdea:"قرص عسل", schoolNameIdea:"مدرسة العسل" },
  { id:"amber-saffron", familyId:"amber", familyLabel:"العائلة الكهرمانية", label:"Saffron", description:"زعفراني أصيل يحمل عبق التاريخ العراقي.", primaryColor:"#C2410C", secondaryColor:"#FCA5A5", accentColor:"#15803D", backgroundColor:"#FFF7ED", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FFEDD5", sidebarColor:"#FED7AA", textColor:"#3D1500", logoIdea:"نبتة زعفران", schoolNameIdea:"مدرسة الزعفران" },

  // ── CLASSIC (extra) ────────────────────────────────────────────────────────
  { id:"classic-pure",  familyId:"classic", familyLabel:"العائلة الكلاسيكية", label:"Pure White", description:"أبيض ناصع نظيف لأقصى درجات البساطة.", primaryColor:"#1F2937", secondaryColor:"#6B7280", accentColor:"#3B82F6", backgroundColor:"#FFFFFF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#F9FAFB", sidebarColor:"#F3F4F6", textColor:"#111827", logoIdea:"نقطة سوداء على أبيض", schoolNameIdea:"مدرسة البياض" },
  { id:"classic-mono",  familyId:"classic", familyLabel:"العائلة الكلاسيكية", label:"Monochrome", description:"أحادي اللون بتدرجات رمادية دقيقة.", primaryColor:"#374151", secondaryColor:"#9CA3AF", accentColor:"#2563EB", backgroundColor:"#F9FAFB", surfaceColor:"#FFFFFF", surfaceMutedColor:"#F3F4F6", sidebarColor:"#E5E7EB", textColor:"#111827", logoIdea:"خطوط هندسية رمادية", schoolNameIdea:"أكاديمية الرمادي" },
  { id:"classic-paper", familyId:"classic", familyLabel:"العائلة الكلاسيكية", label:"Paper", description:"لون الورق الكريمي الكلاسيكي الدافئ.", primaryColor:"#78716C", secondaryColor:"#D6D3D1", accentColor:"#854D0E", backgroundColor:"#FAFAF9", surfaceColor:"#FFFFFF", surfaceMutedColor:"#F5F5F4", sidebarColor:"#E7E5E4", textColor:"#1C1917", logoIdea:"ورقة بردي", schoolNameIdea:"مدرسة الورق" },

  // ── DARK (extra) ───────────────────────────────────────────────────────────
  { id:"dark-obsidian", familyId:"dark", familyLabel:"العائلة الداكنة", label:"Obsidian", description:"أسود أوبسيديان معدني عصري للمدارس التقنية.", primaryColor:"#6366F1", secondaryColor:"#A5B4FC", accentColor:"#EC4899", backgroundColor:"#0F0F10", surfaceColor:"#18181B", surfaceMutedColor:"#27272A", sidebarColor:"#1A1A1F", textColor:"#FAFAFA", logoIdea:"معدن مصقول", schoolNameIdea:"معهد التقنية الداكنة" },
  { id:"dark-charcoal", familyId:"dark", familyLabel:"العائلة الداكنة", label:"Charcoal", description:"فحمي دافئ بنبضات برتقالية للمدارس الفنية.", primaryColor:"#EA580C", secondaryColor:"#FB923C", accentColor:"#FBBF24", backgroundColor:"#0C0A09", surfaceColor:"#1C1917", surfaceMutedColor:"#292524", sidebarColor:"#1A1816", textColor:"#FAF5FF", logoIdea:"لهب رمادي", schoolNameIdea:"مدرسة الفن الفحمي" },
  { id:"dark-void",     familyId:"dark", familyLabel:"العائلة الداكنة", label:"Void", description:"فراغ كوني داكن بنقاط إضاءة خضراء.", primaryColor:"#10B981", secondaryColor:"#34D399", accentColor:"#F59E0B", backgroundColor:"#050505", surfaceColor:"#0F0F0F", surfaceMutedColor:"#1A1A1A", sidebarColor:"#111111", textColor:"#ECFDF5", logoIdea:"دائرة إضاءة خضراء", schoolNameIdea:"مدرسة الكون" },

  // ── NAVY (extra) ───────────────────────────────────────────────────────────
  { id:"navy-deep",  familyId:"navy", familyLabel:"العائلة البحرية الداكنة", label:"Deep Navy", description:"كحلي عميق يوحي بالبحر الهادئ والهيبة.", primaryColor:"#0A1628", secondaryColor:"#4A9BCC", accentColor:"#F4A228", backgroundColor:"#EFF4F9", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DCE8F2", sidebarColor:"#C3D8EC", textColor:"#060D18", logoIdea:"مرساة بحرية", schoolNameIdea:"مدرسة البحر العميق" },
  { id:"navy-storm", familyId:"navy", familyLabel:"العائلة البحرية الداكنة", label:"Storm", description:"عاصفة كحلية قوية تعبر عن العزيمة والإصرار.", primaryColor:"#1E3A5F", secondaryColor:"#5B9BD5", accentColor:"#E67E22", backgroundColor:"#F2F6FB", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DDE8F4", sidebarColor:"#C5D8EC", textColor:"#0B1D35", logoIdea:"موجة عاصفة", schoolNameIdea:"مدرسة العاصفة" },
  { id:"navy-ink",   familyId:"navy", familyLabel:"العائلة البحرية الداكنة", label:"Ink", description:"حبر كحلي داكن يناسب المؤسسات الأكاديمية العريقة.", primaryColor:"#1B2A4A", secondaryColor:"#6C90C4", accentColor:"#D4AC0D", backgroundColor:"#F1F4FA", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DBE3F3", sidebarColor:"#C0CFE9", textColor:"#0A1528", logoIdea:"قلم حبر", schoolNameIdea:"معهد الحبر" },

  // ── ROSE (extra) ───────────────────────────────────────────────────────────
  { id:"rose-blush", familyId:"rose", familyLabel:"العائلة الوردية", label:"Blush", description:"خدود ناعمة هادئة للروضات والمراحل المبكرة.", primaryColor:"#FB7185", secondaryColor:"#FDA4AF", accentColor:"#7C3AED", backgroundColor:"#FFF1F2", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FFE4E6", sidebarColor:"#FECDD3", textColor:"#3B0018", logoIdea:"وردة ناعمة", schoolNameIdea:"روضة الخدود" },
  { id:"rose-petal", familyId:"rose", familyLabel:"العائلة الوردية", label:"Petal", description:"بتلات ورد رقيقة تناسب مدارس البنات والبيئات الأنثوية.", primaryColor:"#E11D48", secondaryColor:"#FDA4AF", accentColor:"#0EA5E9", backgroundColor:"#FFF1F4", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FFE0E6", sidebarColor:"#FECDD5", textColor:"#3B000C", logoIdea:"بتلة وردة", schoolNameIdea:"مدرسة البتلة" },
  { id:"rose-ruby",  familyId:"rose", familyLabel:"العائلة الوردية", label:"Ruby Rose", description:"ياقوت وردي فاخر للمدارس الراقية.", primaryColor:"#BE185D", secondaryColor:"#F472B6", accentColor:"#059669", backgroundColor:"#FDF2F8", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FCE7F3", sidebarColor:"#FBCFE8", textColor:"#500724", logoIdea:"ياقوت وردي", schoolNameIdea:"مدرسة الياقوت الوردي" },

  // ── SLATE (extra) ──────────────────────────────────────────────────────────
  { id:"slate-ash",  familyId:"slate", familyLabel:"العائلة الرصاصية", label:"Ash", description:"رمادي رمادي ناعم خالٍ من التشتيت.", primaryColor:"#475569", secondaryColor:"#94A3B8", accentColor:"#3B82F6", backgroundColor:"#F8FAFC", surfaceColor:"#FFFFFF", surfaceMutedColor:"#F1F5F9", sidebarColor:"#E2E8F0", textColor:"#0F172A", logoIdea:"مثلث رمادي", schoolNameIdea:"مدرسة الرماد" },
  { id:"slate-zinc", familyId:"slate", familyLabel:"العائلة الرصاصية", label:"Zinc", description:"زنكي هادئ للبيئات المهنية والتقنية.", primaryColor:"#52525B", secondaryColor:"#A1A1AA", accentColor:"#10B981", backgroundColor:"#FAFAFA", surfaceColor:"#FFFFFF", surfaceMutedColor:"#F4F4F5", sidebarColor:"#E4E4E7", textColor:"#18181B", logoIdea:"صفيحة زنك", schoolNameIdea:"معهد الزنك" },
  { id:"slate-iron", familyId:"slate", familyLabel:"العائلة الرصاصية", label:"Iron", description:"حديدي متين يعبر عن الصلابة والجدية.", primaryColor:"#3F3F46", secondaryColor:"#71717A", accentColor:"#F59E0B", backgroundColor:"#F9F9F9", surfaceColor:"#FFFFFF", surfaceMutedColor:"#F4F4F5", sidebarColor:"#E4E4E7", textColor:"#09090B", logoIdea:"عارضة حديدية", schoolNameIdea:"مدرسة الحديد" },

  // ── SKY (extra) ────────────────────────────────────────────────────────────
  { id:"sky-azure",      familyId:"sky", familyLabel:"العائلة السماوية", label:"Azure", description:"سماوي أزور زاهٍ منعش يبعث على التفاؤل.", primaryColor:"#0369A1", secondaryColor:"#7DD3FC", accentColor:"#F97316", backgroundColor:"#F0F9FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#E0F2FE", sidebarColor:"#BAE6FD", textColor:"#012B4A", logoIdea:"سحابة أزور", schoolNameIdea:"مدرسة السماء الأزور" },
  { id:"sky-cerulean",   familyId:"sky", familyLabel:"العائلة السماوية", label:"Cerulean", description:"سرولياني فاتح هادئ يناسب البيئات التعليمية المفتوحة.", primaryColor:"#0284C7", secondaryColor:"#93C5FD", accentColor:"#10B981", backgroundColor:"#EFF9FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DBEAFE", sidebarColor:"#BAE6FD", textColor:"#0A2640", logoIdea:"طير طائر", schoolNameIdea:"مدرسة السرولي" },
  { id:"sky-periwinkle", familyId:"sky", familyLabel:"العائلة السماوية", label:"Periwinkle", description:"بنفسجي مائل للأزرق فاتح وعصري.", primaryColor:"#6366F1", secondaryColor:"#A5B4FC", accentColor:"#F59E0B", backgroundColor:"#EEF2FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#E0E7FF", sidebarColor:"#C7D2FE", textColor:"#1E1B4B", logoIdea:"زهرة بريووينكل", schoolNameIdea:"أكاديمية البنفسجي الفاتح" },

  // ── EARTH (extra) ──────────────────────────────────────────────────────────
  { id:"earth-clay",    familyId:"earth", familyLabel:"العائلة الترابية", label:"Clay", description:"طيني بني دافئ يستحضر الأرض والتراب.", primaryColor:"#92400E", secondaryColor:"#D97706", accentColor:"#166534", backgroundColor:"#FEFCE8", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF9C3", sidebarColor:"#FEF08A", textColor:"#310F02", logoIdea:"إناء فخار", schoolNameIdea:"مدرسة الطين" },
  { id:"earth-olive",   familyId:"earth", familyLabel:"العائلة الترابية", label:"Olive", description:"زيتوني ترابي هادئ يعبر عن الأصالة والسلام.", primaryColor:"#65A30D", secondaryColor:"#BEF264", accentColor:"#D97706", backgroundColor:"#FAFDF3", surfaceColor:"#FFFFFF", surfaceMutedColor:"#ECFCCB", sidebarColor:"#D9F99D", textColor:"#1A2E05", logoIdea:"غصن زيتون", schoolNameIdea:"مدرسة الزيتون" },
  { id:"earth-sienna",  familyId:"earth", familyLabel:"العائلة الترابية", label:"Sienna", description:"سيينا أحمر ترابي دافئ يستحضر التراث.", primaryColor:"#A16207", secondaryColor:"#FDE68A", accentColor:"#1D4ED8", backgroundColor:"#FFFBEB", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF3C7", sidebarColor:"#FDE68A", textColor:"#1C0A00", logoIdea:"خزفة سيينا", schoolNameIdea:"مدرسة السيينا" },

  // ── GOLD (extra) ───────────────────────────────────────────────────────────
  { id:"gold-brass",    familyId:"gold", familyLabel:"العائلة الذهبية", label:"Brass", description:"نحاس أصفر فاخر يعبر عن القوة والتراث.", primaryColor:"#B7791F", secondaryColor:"#F6D860", accentColor:"#1E3A8A", backgroundColor:"#FFFDF0", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF9C3", sidebarColor:"#FEF08A", textColor:"#3B1A00", logoIdea:"آلة نحاسية", schoolNameIdea:"مدرسة النحاس" },
  { id:"gold-ochre",    familyId:"gold", familyLabel:"العائلة الذهبية", label:"Ochre", description:"أوكر ذهبي طيني يستحضر جماليات الصحراء.", primaryColor:"#CA8A04", secondaryColor:"#FDE047", accentColor:"#7C3AED", backgroundColor:"#FEFCE8", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF9C3", sidebarColor:"#FEF08A", textColor:"#422006", logoIdea:"لوح أوكر أثري", schoolNameIdea:"مدرسة الأوكر" },
  { id:"gold-harvest",  familyId:"gold", familyLabel:"العائلة الذهبية", label:"Harvest", description:"موسم الحصاد الذهبي يعبر عن الوفرة والنجاح.", primaryColor:"#D97706", secondaryColor:"#FCD34D", accentColor:"#047857", backgroundColor:"#FFFBEB", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF3C7", sidebarColor:"#FDE68A", textColor:"#451A03", logoIdea:"سنبلة ذهبية", schoolNameIdea:"مدرسة الحصاد" },

  // ── PINK ──────────────────────────────────────────────────────────────────
  { id:"pink-vivid",   familyId:"pink", familyLabel:"العائلة الوردية الحيوية", label:"Vivid Pink", description:"وردي زاهٍ وحيوي يمنح الطاقة والتميز.", primaryColor:"#DB2777", secondaryColor:"#F472B6", accentColor:"#7C3AED", backgroundColor:"#FFF0F6", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FCE7F3", sidebarColor:"#1F0A16", textColor:"#1A0010", logoIdea:"نجمة وردية", schoolNameIdea:"أكاديمية النجمة" },
  { id:"pink-fuchsia", familyId:"pink", familyLabel:"العائلة الوردية الحيوية", label:"Fuchsia Spark", description:"فوشيا مشعّ يعبر عن الشخصية القوية والإبداع.", primaryColor:"#C026D3", secondaryColor:"#E879F9", accentColor:"#0EA5E9", backgroundColor:"#FDF4FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FAE8FF", sidebarColor:"#1A0520", textColor:"#170018", logoIdea:"شرارة فوشيا", schoolNameIdea:"مدرسة الفوشيا" },
  { id:"pink-hot",     familyId:"pink", familyLabel:"العائلة الوردية الحيوية", label:"Hot Pink", description:"وردي ساخن جريء لمدارس البنات والروضات العصرية.", primaryColor:"#EC4899", secondaryColor:"#F9A8D4", accentColor:"#10B981", backgroundColor:"#FFF1F8", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FCE7F3", sidebarColor:"#1E0714", textColor:"#1A000E", logoIdea:"قلب وردي", schoolNameIdea:"روضة القلب الوردي" },

  // ── MINT ──────────────────────────────────────────────────────────────────
  { id:"mint-fresh",  familyId:"mint", familyLabel:"العائلة النعناعية", label:"Mint Fresh", description:"أخضر نعناعي منعش يبعث على النشاط والوضوح الذهني.", primaryColor:"#10B981", secondaryColor:"#6EE7B7", accentColor:"#3B82F6", backgroundColor:"#F0FDF4", surfaceColor:"#FFFFFF", surfaceMutedColor:"#D1FAE5", sidebarColor:"#022C22", textColor:"#022C22", logoIdea:"ورقة نعناع", schoolNameIdea:"مدرسة النعناع" },
  { id:"mint-cool",   familyId:"mint", familyLabel:"العائلة النعناعية", label:"Cool Spearmint", description:"نعناعي بارد هادئ مناسب للبيئات العلمية والطبية.", primaryColor:"#059669", secondaryColor:"#34D399", accentColor:"#0EA5E9", backgroundColor:"#ECFDF5", surfaceColor:"#FFFFFF", surfaceMutedColor:"#D1FAE5", sidebarColor:"#022C22", textColor:"#052E16", logoIdea:"قطرة زرقاء على ورقة", schoolNameIdea:"معهد الأخضر البارد" },
  { id:"mint-pearl",  familyId:"mint", familyLabel:"العائلة النعناعية", label:"Pearl Mint", description:"نعناعي لؤلؤي فاتح يناسب المدارس الفاخرة والعصرية.", primaryColor:"#14B8A6", secondaryColor:"#99F6E4", accentColor:"#6366F1", backgroundColor:"#F0FDFA", surfaceColor:"#FFFFFF", surfaceMutedColor:"#CCFBF1", sidebarColor:"#042F2E", textColor:"#042F2E", logoIdea:"لؤلؤة خضراء", schoolNameIdea:"أكاديمية اللؤلؤة" },

  // ── VIOLET ────────────────────────────────────────────────────────────────
  { id:"violet-electric", familyId:"violet", familyLabel:"العائلة البنفسجية الكهربائية", label:"Electric Violet", description:"بنفسجي كهربائي يعبر عن الابتكار والتكنولوجيا.", primaryColor:"#7C3AED", secondaryColor:"#C4B5FD", accentColor:"#F59E0B", backgroundColor:"#F5F3FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#EDE9FE", sidebarColor:"#1E0A40", textColor:"#1E1B4B", logoIdea:"صاعقة بنفسجية", schoolNameIdea:"مدرسة الابتكار" },
  { id:"violet-neon",     familyId:"violet", familyLabel:"العائلة البنفسجية الكهربائية", label:"Neon Violet", description:"نيون بنفسجي حيوي لمدارس التقنية والبرمجة.", primaryColor:"#8B5CF6", secondaryColor:"#DDD6FE", accentColor:"#EC4899", backgroundColor:"#F8F5FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#EDE9FE", sidebarColor:"#200A48", textColor:"#1E1B4B", logoIdea:"دائرة نيون", schoolNameIdea:"أكاديمية الكود" },
  { id:"violet-deep",     familyId:"violet", familyLabel:"العائلة البنفسجية الكهربائية", label:"Deep Violet", description:"بنفسجي عميق فاخر للمعاهد الملكية والنخبوية.", primaryColor:"#6D28D9", secondaryColor:"#A78BFA", accentColor:"#D97706", backgroundColor:"#F3EEFF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#EDE9FE", sidebarColor:"#180840", textColor:"#1E1B4B", logoIdea:"تاج بنفسجي", schoolNameIdea:"معهد النخبة البنفسجي" },

  // ── COPPER ────────────────────────────────────────────────────────────────
  { id:"copper-warm",    familyId:"copper", familyLabel:"العائلة النحاسية", label:"Warm Copper", description:"نحاسي دافئ يستحضر الحرارة والأصالة والتراث.", primaryColor:"#C2410C", secondaryColor:"#FB923C", accentColor:"#1D4ED8", backgroundColor:"#FFF7ED", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FFEDD5", sidebarColor:"#2D0F06", textColor:"#1C0A00", logoIdea:"إناء نحاسي", schoolNameIdea:"مدرسة النحاس الدافئ" },
  { id:"copper-rich",    familyId:"copper", familyLabel:"العائلة النحاسية", label:"Rich Bronze", description:"برونزي غني يعبر عن العراقة والرسوخ التاريخي.", primaryColor:"#B45309", secondaryColor:"#F59E0B", accentColor:"#047857", backgroundColor:"#FFFBEB", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF3C7", sidebarColor:"#271100", textColor:"#1C0A00", logoIdea:"عملة برونزية", schoolNameIdea:"أكاديمية البرونز" },
  { id:"copper-antique", familyId:"copper", familyLabel:"العائلة النحاسية", label:"Antique Copper", description:"نحاس عتيق بلمسة تراثية أنيقة وتاريخية.", primaryColor:"#92400E", secondaryColor:"#D97706", accentColor:"#4F46E5", backgroundColor:"#FEFCE8", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF9C3", sidebarColor:"#1C0B00", textColor:"#1A0800", logoIdea:"مزهرية نحاسية قديمة", schoolNameIdea:"مدرسة التراث النحاسي" },

  // ── FOREST ────────────────────────────────────────────────────────────────
  { id:"forest-pine",   familyId:"forest", familyLabel:"العائلة الغابوية", label:"Pine Forest", description:"أخضر صنوبر داكن يوحي بالهدوء والعمق والطبيعة.", primaryColor:"#166534", secondaryColor:"#4ADE80", accentColor:"#D97706", backgroundColor:"#F0FDF4", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DCFCE7", sidebarColor:"#052E16", textColor:"#052E16", logoIdea:"شجرة صنوبر", schoolNameIdea:"مدرسة الصنوبر" },
  { id:"forest-jungle", familyId:"forest", familyLabel:"العائلة الغابوية", label:"Jungle Green", description:"أخضر غابة استوائية كثيف يملأ الحيوية والقوة.", primaryColor:"#15803D", secondaryColor:"#86EFAC", accentColor:"#F59E0B", backgroundColor:"#F0FDF4", surfaceColor:"#FFFFFF", surfaceMutedColor:"#DCFCE7", sidebarColor:"#052E16", textColor:"#052E16", logoIdea:"أوراق غابة", schoolNameIdea:"أكاديمية الغابة" },
  { id:"forest-moss",   familyId:"forest", familyLabel:"العائلة الغابوية", label:"Deep Moss", description:"أخضر طحلبي عميق بطابع أرضي ترابي هادئ.", primaryColor:"#365314", secondaryColor:"#84CC16", accentColor:"#C2410C", backgroundColor:"#F7FEE7", surfaceColor:"#FFFFFF", surfaceMutedColor:"#ECFCCB", sidebarColor:"#1A2E05", textColor:"#1A2E05", logoIdea:"طحلب أخضر", schoolNameIdea:"مدرسة الطحلب" },

  // ── OCEAN ─────────────────────────────────────────────────────────────────
  { id:"ocean-deep",   familyId:"ocean", familyLabel:"العائلة المحيطية", label:"Deep Ocean", description:"أزرق محيطي عميق يعبر عن اللامحدودية والمعرفة.", primaryColor:"#0C4A6E", secondaryColor:"#38BDF8", accentColor:"#10B981", backgroundColor:"#F0F9FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#E0F2FE", sidebarColor:"#082F49", textColor:"#082F49", logoIdea:"أمواج محيطية", schoolNameIdea:"معهد المحيط" },
  { id:"ocean-tropic", familyId:"ocean", familyLabel:"العائلة المحيطية", label:"Tropical Ocean", description:"أزرق استوائي فيروزي يبعث الانفتاح والحيوية.", primaryColor:"#0891B2", secondaryColor:"#67E8F9", accentColor:"#F97316", backgroundColor:"#ECFEFF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#CFFAFE", sidebarColor:"#083344", textColor:"#083344", logoIdea:"مرجان استوائي", schoolNameIdea:"مدرسة الاستوائي" },
  { id:"ocean-arctic", familyId:"ocean", familyLabel:"العائلة المحيطية", label:"Arctic Blue", description:"أزرق قطبي بارد نقي يعبر عن الصفاء والهدوء التام.", primaryColor:"#0369A1", secondaryColor:"#BAE6FD", accentColor:"#7C3AED", backgroundColor:"#F0F9FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#E0F2FE", sidebarColor:"#082F49", textColor:"#082F49", logoIdea:"جبل جليدي", schoolNameIdea:"أكاديمية الشمال" },

  // ── PLUM ──────────────────────────────────────────────────────────────────
  { id:"plum-dark",   familyId:"plum", familyLabel:"العائلة البرقوقية", label:"Dark Plum", description:"برقوقي داكن غامق يوحي بالفخامة والعمق والهيبة.", primaryColor:"#7E1D6A", secondaryColor:"#D19ECC", accentColor:"#D97706", backgroundColor:"#FDF4FB", surfaceColor:"#FFFFFF", surfaceMutedColor:"#F9E8F5", sidebarColor:"#1F0518", textColor:"#1A0015", logoIdea:"برقوقة فاخرة", schoolNameIdea:"مدرسة البرقوق الداكن" },
  { id:"plum-bloom",  familyId:"plum", familyLabel:"العائلة البرقوقية", label:"Plum Bloom", description:"برقوقي مزهر ناعم يناسب البيئات الأنيقة والراقية.", primaryColor:"#9D174D", secondaryColor:"#F9A8D4", accentColor:"#059669", backgroundColor:"#FFF1F6", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FCE7F3", sidebarColor:"#240512", textColor:"#1A000C", logoIdea:"زهرة برقوق", schoolNameIdea:"أكاديمية الزهور" },
  { id:"plum-velvet", familyId:"plum", familyLabel:"العائلة البرقوقية", label:"Velvet Plum", description:"مخملي برقوقي فاخر للمعاهد الملكية والراقية.", primaryColor:"#6B21A8", secondaryColor:"#C084FC", accentColor:"#F59E0B", backgroundColor:"#FDF8FF", surfaceColor:"#FFFFFF", surfaceMutedColor:"#F3E8FF", sidebarColor:"#1A0530", textColor:"#1E1B4B", logoIdea:"قطعة مخمل", schoolNameIdea:"معهد المخمل" },

  // ── LEMON ─────────────────────────────────────────────────────────────────
  { id:"lemon-bright",  familyId:"lemon", familyLabel:"العائلة الليمونية", label:"Bright Lemon", description:"أصفر ليموني مشرق يبعث التفاؤل والطاقة والحيوية.", primaryColor:"#CA8A04", secondaryColor:"#FDE047", accentColor:"#0EA5E9", backgroundColor:"#FEFCE8", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF9C3", sidebarColor:"#1A1000", textColor:"#422006", logoIdea:"ليمونة مشرقة", schoolNameIdea:"مدرسة الليمون" },
  { id:"lemon-lime",    familyId:"lemon", familyLabel:"العائلة الليمونية", label:"Lemon Lime", description:"ليموني مع لمسة خضراء عصرية ومنعشة.", primaryColor:"#84CC16", secondaryColor:"#D9F99D", accentColor:"#7C3AED", backgroundColor:"#F7FEE7", surfaceColor:"#FFFFFF", surfaceMutedColor:"#ECFCCB", sidebarColor:"#1A2E05", textColor:"#1A2E05", logoIdea:"شريحة ليمون أخضر", schoolNameIdea:"أكاديمية الليمون الأخضر" },
  { id:"lemon-citrus",  familyId:"lemon", familyLabel:"العائلة الليمونية", label:"Citrus Burst", description:"حمضيات منفجرة بألوان جريئة ومبهجة للمراحل المبكرة.", primaryColor:"#EAB308", secondaryColor:"#FEF08A", accentColor:"#DC2626", backgroundColor:"#FEFCE8", surfaceColor:"#FFFFFF", surfaceMutedColor:"#FEF9C3", sidebarColor:"#1C1400", textColor:"#422006", logoIdea:"برتقالة وليمونة", schoolNameIdea:"روضة الحمضيات" },
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
  {
    id: "navy",
    label: "العائلة البحرية",
    description: "أزرق بحري داكن يعكس الهيبة والرسوخ والجدية الأكاديمية.",
    presets: PRESETS.filter((p) => p.familyId === "navy"),
  },
  {
    id: "rose",
    label: "العائلة الوردية",
    description: "ألوان وردية أنيقة وناعمة، مناسبة لمدارس البنات والروضات.",
    presets: PRESETS.filter((p) => p.familyId === "rose"),
  },
  {
    id: "slate",
    label: "العائلة الرمادية الراقية",
    description: "رمادي احترافي بلمسات ملونة، للمدارس التجارية والمهنية.",
    presets: PRESETS.filter((p) => p.familyId === "slate"),
  },
  {
    id: "sky",
    label: "العائلة السماوية",
    description: "سماوي منعش وفاتح يوحي بالانفتاح والتجديد للمدارس الحديثة.",
    presets: PRESETS.filter((p) => p.familyId === "sky"),
  },
  {
    id: "earth",
    label: "العائلة الترابية",
    description: "ترابي دافئ أصيل يعبر عن الجذور والتراث والانتماء.",
    presets: PRESETS.filter((p) => p.familyId === "earth"),
  },
  {
    id: "gold",
    label: "العائلة الذهبية الراقية",
    description: "ذهبي فاخر راقٍ للمؤسسات التعليمية النخبوية والاحتفالية.",
    presets: PRESETS.filter((p) => p.familyId === "gold"),
  },
  {
    id: "pink",
    label: "العائلة الوردية الحيوية",
    description: "وردي جريء وحيوي للمدارس العصرية وروضات البنات.",
    presets: PRESETS.filter((p) => p.familyId === "pink"),
  },
  {
    id: "mint",
    label: "العائلة النعناعية",
    description: "أخضر نعناعي منعش يبعث النشاط والوضوح الذهني.",
    presets: PRESETS.filter((p) => p.familyId === "mint"),
  },
  {
    id: "violet",
    label: "العائلة البنفسجية الكهربائية",
    description: "بنفسجي كهربائي حيوي لمدارس التقنية والابتكار.",
    presets: PRESETS.filter((p) => p.familyId === "violet"),
  },
  {
    id: "copper",
    label: "العائلة النحاسية",
    description: "نحاسي وبرونزي يستحضر الأصالة والتراث والعراقة.",
    presets: PRESETS.filter((p) => p.familyId === "copper"),
  },
  {
    id: "forest",
    label: "العائلة الغابوية",
    description: "أخضر غابة داكن عميق يوحي بالهدوء والطبيعة.",
    presets: PRESETS.filter((p) => p.familyId === "forest"),
  },
  {
    id: "ocean",
    label: "العائلة المحيطية",
    description: "أزرق محيطي عميق يعبر عن اللامحدودية والمعرفة.",
    presets: PRESETS.filter((p) => p.familyId === "ocean"),
  },
  {
    id: "plum",
    label: "العائلة البرقوقية",
    description: "برقوقي فاخر بين البنفسجي والأحمر للمعاهد الراقية.",
    presets: PRESETS.filter((p) => p.familyId === "plum"),
  },
  {
    id: "lemon",
    label: "العائلة الليمونية",
    description: "أصفر ليموني مشرق يبعث التفاؤل والحيوية للمراحل المبكرة.",
    presets: PRESETS.filter((p) => p.familyId === "lemon"),
  },
];

export function getBrandThemePreset(
  presetId: string | null | undefined,
): BrandThemePreset | null {
  if (!presetId) return null;
  return PRESETS.find((p) => p.id === presetId) ?? null;
}
