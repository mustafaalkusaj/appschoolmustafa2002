"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Banknote,
  BarChart2,
  BarChart3,
  Ban,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  Crown,
  DollarSign,
  Download,
  FileText,
  FolderOpen,
  Gift,
  GraduationCap,
  Hash,
  HandCoins,
  Home,
  Info,
  LayoutDashboard,
  Link2,
  LogOut,
  Landmark,
  Menu,
  Moon,
  NotebookPen,
  Pencil,
  Pin,
  Play,
  Plus,
  Power,
  Printer,
  Receipt,
  RefreshCw,
  ReceiptText,
  RotateCcw,
  Save,
  Scissors,
  Search,
  Settings,
  Shield,
  Sun,
  Sunrise,
  Tag,
  Trash2,
  TrendingUp,
  University,
  Upload,
  User,
  UserCheck,
  UserRoundCog,
  UserX,
  Users,
  Wallet,
  X,
  XCircle,
  Phone,
} from "lucide-react";

// Lucide key names (used in SIDEBAR_ITEMS iconToken)
const LUCIDE_KEY_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  students: Users,
  payments: CreditCard,
  teachers: GraduationCap,
  salaries: Briefcase,
  expenses: Receipt,
  attendance: ClipboardList,
  reports: BarChart2,
  "super-admin": Shield,
  "fee-notifications": Bell,
  schools: Building2,
  subscriptions: CreditCard,
  monitoring: Activity,
  users: Users,
};

const iconMap: Record<string, LucideIcon> = {
  "📊": BarChart3,
  "👥": Users,
  "💳": CreditCard,
  "💰": Wallet,
  "💵": Banknote,
  "📈": TrendingUp,
  "📚": BookOpen,
  "🗓️": CalendarDays,
  "📅": CalendarDays,
  "👑": Crown,
  "🖨️": Printer,
  "📦": ArrowLeftRight,
  "⏸️": Power,
  "✏️": Pencil,
  "🗑️": Trash2,
  "↩️": RotateCcw,
  "✅": CheckCircle2,
  "✓": Check,
  "❌": XCircle,
  "✕": X,
  "⚠️": AlertTriangle,
  "⚠": AlertTriangle,
  "💸": HandCoins,
  "🏫": University,
  "🎓": GraduationCap,
  "🧾": ReceiptText,
  "📌": Pin,
  "📂": FolderOpen,
  "📆": CalendarRange,
  "💼": Briefcase,
  "💲": DollarSign,
  "➕": Plus,
  "👤": User,
  "🏦": Landmark,
  "📄": FileText,
  "🏷️": Tag,
  "🎁": Gift,
  "🔍": Search,
  "🔢": Hash,
  "📝": NotebookPen,
  "📞": Phone,
  "🚫": Ban,
  "⛔": Ban,
  "🚪": LogOut,
  "🔄": RefreshCw,
  "▶": Play,
  "☰": Menu,
  "🌅": Sunrise,
  "🌞": Sun,
  "🌙": Moon,
  "☀️": Sun,
  "💾": Save,
  "✂️": Scissors,
  "🔗": Link2,
  "⬆️": ArrowUp,
  "▼": ArrowDown,
  "▲": ArrowUp,
  "ℹ": Info,
  "📥": Download,
  "⬇️": Download,
  "📤": Upload,
  "⏰": Clock3,
  "📋": ClipboardList,
  "🗄️": Archive,
  "⚙️": Settings,
  "🏠": Home,
  "👨‍🏫": UserRoundCog,
  "👔": Briefcase,
  "✗": UserX,
  "$": DollarSign,
  "👁": UserCheck,
};

export function AppIcon({
  token,
  size = 16,
  strokeWidth = 2,
  className,
}: {
  token: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  // First try Lucide key names, then emoji map, then fallback
  const Icon = LUCIDE_KEY_MAP[token] ?? iconMap[token];
  if (Icon) {
    return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
  }
  // Fallback: render as emoji/text
  return (
    <span style={{ fontSize: size * 0.85, lineHeight: 1 }} aria-hidden="true">
      {token}
    </span>
  );
}

function CircleFallback({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return <div className={className} style={{ width: size, height: size, borderRadius: "999px", background: "currentColor", opacity: 0.25 }} />;
}
