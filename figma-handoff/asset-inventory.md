<!-- Generated: 2026-04-08 (v2) -->

# Asset Inventory

## Overview

This document catalogs all visual assets required for Figma reconstruction, including fonts, icons, logos, charts, public assets, and screenshots with their naming conventions.

---

## Fonts

### Primary Fonts

| Font | Weights | Usage | Source |
|------|---------|-------|--------|
| **Cairo** | 400, 500, 600, 700, 800 | Arabic (RTL) primary | Google Fonts |
| **Inter** | 400, 500, 600, 700, 800 | English (LTR) primary | Google Fonts |

### Locale Strategy

| Locale | Primary Font | Fallback |
|--------|--------------|----------|
| Arabic (`ar`) | Cairo | Tahoma, sans-serif |
| English (`en`) | Inter | Segoe UI, system-ui, sans-serif |

### Font Weight Mapping per Typography Level

| Level | Size | Weight (Cairo/Inter) | Line Height |
|-------|------|----------------------|-------------|
| displayXL | 48px | 900 | 1.1 |
| displayL | 36px | 900 | 1.15 |
| headingL | 30px | 800 | 1.2 |
| headingM | 24px | 800 | 1.25 |
| headingS | 20px | 700 | 1.3 |
| bodyL | 16px | 500 | 1.5 |
| bodyM | 14px | 500 | 1.6 |
| bodyS | 12px | 500 | 1.5 |
| label | 12px | 700 | 1.4 |
| caption | 11px | 500 | 1.4 |
| overline | 10px | 800 | 1.3 |

### CSS Font Variables

```css
--font-sans: 'Inter', 'Segoe UI', system-ui, sans-serif;
--font-arabic: 'Cairo', 'Tahoma', sans-serif;
--font-ui: var(--font-arabic), var(--font-sans), Arial, sans-serif;
```

---

## Icons (Lucide React)

### Source
- Library: Lucide React
- Mapping file: `lib/icons.ts`
- Export: 90+ icons from `lucide-react`

### Icon Categories

#### Navigation Icons (30 icons)

| Icon | Usage | Notes |
|------|-------|-------|
| `Home` | Sidebar: Dashboard | Primary nav |
| `House` | Sidebar: Home launcher | Alternative |
| `LayoutDashboard` | Sidebar: Dashboard | Alternative |
| `Users` | Sidebar: Students/Teachers | User management |
| `GraduationCap` | Sidebar: Academic | Education section |
| `CreditCard` | Sidebar: Payments | Finance |
| `Wallet` | Sidebar: Finance | Alternative |
| `Banknote` | Sidebar: Payments | Cash payments |
| `HandCoins` | Payments | Fee collection |
| `ReceiptText` | Payments | Receipts |
| `FileText` | Sidebar: Reports | Documents |
| `BarChart3` | Sidebar: Reports/Analytics | Charts |
| `TrendingUp` | Dashboard | Analytics |
| `Bell` | Sidebar: Notifications | Alerts |
| `CalendarDays` | Sidebar: Calendar | Scheduling |
| `CalendarRange` | Attendance | Date ranges |
| `Settings` | Sidebar: Settings | Configuration |
| `School` | Super Admin | School management |
| `Building2` | Super Admin | Institution |
| `University` | Schools | Education |
| `Landmark` | Finance | Banking |
| `Server` | Super Admin | Infrastructure |
| `Database` | Super Admin | Data |
| `Shield` | Super Admin | Security |
| `ShieldCheck` | Permissions | Access control |
| `Crown` | Subscriptions | Premium |
| `Users` (plural) | Teams | Groups |
| `User` | Profile | Individual |
| `Briefcase` | Teachers | Staff |
| `BookOpen` | Academic | Courses |

#### Action Icons (25 icons)

| Icon | Usage | Notes |
|------|-------|-------|
| `Plus` | Add buttons | Create new |
| `Pencil` | Edit buttons | Modify |
| `PencilLine` | Edit | Alternative |
| `Trash2` | Delete buttons | Destructive |
| `Download` | Export/Download | File operations |
| `Upload` | Import/Upload | File operations |
| `ExternalLink` | Open external | Navigation |
| `Copy` | Duplicate | Clipboard |
| `Save` | Save actions | Form submit |
| `RefreshCw` | Refresh | Reload |
| `RotateCcw` | Undo/Reset | Revert |
| `Search` | Search fields | Filtering |
| `Filter` | Filter buttons | Data filtering |
| `Printer` | Print | Output |
| `Play` | Start/Run | Actions |
| `Scissors` | Cut | Editing |
| `Link2` | Link | Connections |
| `ArrowUp` | Sort ascending | Tables |
| `ArrowDown` | Sort descending | Tables |
| `ArrowLeftRight` | Swap | Reorder |
| `Check` | Confirm | Validation |
| `X` | Close/Cancel | Dismiss |
| `Menu` | Hamburger | Navigation |
| `PanelRightClose` | Sidebar collapse | Shell |
| `PanelRightOpen` | Sidebar expand | Shell |

#### Status Icons (15 icons)

| Icon | Usage | Color Tone |
|------|-------|------------|
| `CheckCircle2` | Success states | Green |
| `AlertTriangle` | Warning states | Amber |
| `XCircle` | Error states | Red |
| `Loader2` | Loading states | Primary (animated) |
| `Info` | Information | Blue |
| `Ban` | Blocked/Disabled | Gray |
| `CircleOff` | Empty/Null | Gray |
| `BadgeCheck` | Verified | Green |
| `ShieldX` | Access denied | Red |
| `UserCheck` | User verified | Green |
| `UserX` | User blocked | Red |
| `History` | Audit log | Gray |
| `Clock` | Time/Pending | Gray |
| `Clock3` | Time recent | Gray |
| `Archive` | Archived | Gray |

#### UI Icons (20 icons)

| Icon | Usage | Notes |
|------|-------|-------|
| `Moon` | Dark mode | Theme toggle |
| `Sun` | Light mode | Theme toggle |
| `SunMedium` | Light mode | Alternative |
| `Sunrise` | Morning | Time-based |
| `MoonStar` | Night | Alternative |
| `Monitor` | System theme | Theme toggle |
| `Languages` | Language switch | Locale |
| `ChevronDown` | Expand/Dropdown | Navigation |
| `ChevronLeft` | Navigate back | RTL-aware |
| `ChevronRight` | Navigate forward | RTL-aware |
| `Eye` | Show/View | Visibility |
| `EyeOff` | Hide | Visibility |
| `KeyRound` | Password/API key | Security |
| `Mail` | Email | Communication |
| `MailCheck` | Email verified | Status |
| `Phone` | Phone number | Contact |
| `MapPin` | Location | Address |
| `Image` | Image/Photo | Media |
| `Tag` | Tags/Labels | Categorization |
| `Hash` | Number/ID | Identification |

#### Emoji Token Mapping

The `lib/icons.ts` file maps emoji tokens to Lucide icons:

| Emoji | Lucide Icon | Notes |
|-------|-------------|-------|
| 📊 | BarChart3 | Analytics |
| 👥 | Users | Groups |
| 💳 | CreditCard | Payments |
| 💰 | Wallet | Finance |
| 💵 | Banknote | Cash |
| 📈 | TrendingUp | Growth |
| 📚 | BookOpen | Education |
| 🗓️ | CalendarDays | Dates |
| 📅 | CalendarDays | Dates |
| 👑 | Crown | Premium |
| 🖨️ | Printer | Print |
| 📦 | ArrowLeftRight | Archive |
| ⏸️ | Power | Pause |
| ✏️ | Pencil | Edit |
| 🗑️ | Trash2 | Delete |
| ↩️ | RotateCcw | Undo |
| ✅ | CheckCircle2 | Success |
| ✓ | Check | Done |
| ❌ | XCircle | Error |
| ✕ | X | Close |
| ⚠️ | AlertTriangle | Warning |
| 💸 | HandCoins | Fees |
| 🏫 | University | School |
| 🎓 | GraduationCap | Education |
| 🧾 | ReceiptText | Receipt |
| 📌 | Pin | Pin |
| 📂 | FolderOpen | Folder |
| 📆 | CalendarRange | Calendar |
| 💼 | Briefcase | Work |
| 💲 | DollarSign | Money |
| ➕ | Plus | Add |
| 👤 | User | Person |
| 🏦 | Landmark | Bank |
| 📄 | FileText | Document |
| 🏷️ | Tag | Tag |
| 🎁 | Gift | Gift |
| 🔍 | Search | Search |
| 🔢 | Hash | Number |
| 📝 | NotebookPen | Notes |
| 📞 | Phone | Phone |
| 🚫 | Ban | Blocked |
| ⛔ | Ban | Stop |
| 🚪 | LogOut | Logout |
| 🔄 | RefreshCw | Refresh |
| ▶ | Play | Play |
| ☰ | Menu | Menu |
| 🌅 | Sunrise | Sunrise |
| 🌞 | Sun | Sun |
| 🌙 | Moon | Moon |
| ☀️ | Sun | Sun |
| 💾 | Save | Save |
| ✂️ | Scissors | Cut |
| 🔗 | Link2 | Link |
| ⬆️ | ArrowUp | Up |
| ▼ | ArrowDown | Down |
| ▲ | ArrowUp | Up |
| ℹ | Info | Info |
| 📥 | Download | Download |
| ⬇️ | Download | Download |
| 📤 | Upload | Upload |
| ⏰ | Clock3 | Time |
| 📋 | ClipboardList | List |
| 🗄️ | Archive | Archive |
| ⚙️ | Settings | Settings |
| 🏠 | Home | Home |
| 👨‍🏫 | UserRoundCog | Teacher |
| 👔 | Briefcase | Professional |
| ✗ | UserX | Remove user |
| $ | DollarSign | Dollar |
| 👁 | UserCheck | Verified |

---

## Logos

### UltrathinkLogo (BrandLockup)

| Property | Value |
|----------|-------|
| Source | `components/brand/BrandLockup.tsx` |
| Exported as | UltrathinkLogo |
| Default size | 36px |
| Configurable size | Yes (size prop) |
| Text visibility | Optional (showText prop) |

#### Props

```typescript
interface BrandLockupProps {
  size?: number;          // Default: 36
  showText?: boolean;     // Default: true
  titleClassName?: string;
  subtitleClassName?: string;
  title?: string;         // Override school name
  subtitle?: string;      // Override school subtitle
  className?: string;
  logoSrc?: string | null; // Override logo URL
}
```

#### Anatomy

```
.brand-lockup (flex container)
├── .brand-lockup__badge (logo container)
│   └── SchoolLogo component
└── .brand-lockup__copy (optional)
    ├── Title (school name)
    └── Subtitle
```

### SchoolLogo

| Property | Value |
|----------|-------|
| Source | `components/brand/SchoolLogo.tsx` |
| Purpose | School logo image with fallback initials |
| Default size | 44px |
| Runtime URLs | Supported from DB |

#### Props

```typescript
interface SchoolLogoProps {
  src?: string | null;      // Logo image URL
  alt: string;              // Alt text
  label?: string | null;    // Label for initials fallback
  size?: number;            // Default: 44
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}
```

#### Fallback Behavior

1. Attempt to load image from `src`
2. On load failure, display initials from `label`
3. Initials derived from first letters of each word

### Logo Sizing Rules

| Context | Size | Notes |
|---------|------|-------|
| Sidebar header | 36px | Compact |
| Sidebar footer | 32px | With text |
| Topbar | 32px | Without subtitle |
| Login hero | 48px | Prominent |
| Error pages | 40px | Centered |

### Logo Spacing

| Context | Margin | Clear Space |
|---------|--------|-------------|
| With text | 8px gap | 16px surrounding |
| Standalone | None | 12px surrounding |

---

## Charts

### Recharts Usage

| Chart Type | Location | Purpose |
|------------|----------|---------|
| Bar Chart | Dashboard, Super Admin | Financial comparison |
| Line Chart | Dashboard | Trend analysis |
| Pie/Donut Chart | Dashboard | Distribution |
| Area Chart | Reports | Volume over time |

### Chart Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | #4f8cff | Primary series |
| Secondary Cyan | #79d7ff | Secondary series |
| Success Green | #10b981 | Positive/growth |
| Warning Amber | #f59e0b | Caution/attention |
| Danger Red | #ef4444 | Negative/alert |

### Chart Sizing Rules

| Viewport | Chart Height | Chart Width |
|----------|--------------|-------------|
| Desktop | 300px | Auto-fill container |
| Tablet | 250px | Auto-fill container |
| Mobile | 200px | Full width |

### DashboardFinanceCharts Component

Located at: `components/DashboardFinanceCharts.tsx`

**Props**:
```typescript
interface DashboardFinanceChartsProps {
  barData: BarDatum[];
  pieData: PieDatum[];
  paidPct: number;
}
```

---

## Public Assets

### Directory Contents

| File | Path | Purpose |
|------|------|---------|
| globe.svg | `/public/globe.svg` | Default placeholder |
| next.svg | `/public/next.svg` | Next.js logo |
| vercel.svg | `/public/vercel.svg` | Vercel logo |
| window.svg | `/public/window.svg` | Window icon |

### Asset Usage Notes

- These are default Next.js assets
- Not used in primary application UI
- May be removed in production build

---

## Screenshots

### Captured Screenshots

#### Login Screens (12 files)

| Filename | Viewport | Direction | State | Size |
|----------|----------|-----------|-------|------|
| login--desktop--ltr--dark.png | Desktop | LTR | Dark | 1207.1KB |
| login--desktop--ltr--default.png | Desktop | LTR | Default | 1055.4KB |
| login--desktop--ltr--error.png | Desktop | LTR | Error | 1055.4KB |
| login--desktop--rtl--dark.png | Desktop | RTL | Dark | 1178.6KB |
| login--desktop--rtl--default-clean.png | Desktop | RTL | Default (clean) | 1015.8KB |
| login--desktop--rtl--default.png | Desktop | RTL | Default | 1015.8KB |
| login--mobile--ltr--scaled-sim.png | Mobile | LTR | Default | 1062.8KB |
| login--mobile--rtl--scaled-sim.png | Mobile | RTL | Default | 129.0KB |
| login--tablet--ltr--scaled-sim.png | Tablet | LTR | Default | 1105.9KB |
| login--tablet--rtl--scaled-sim.png | Tablet | RTL | Default | 845.8KB |
| login-desktop.png | Desktop | RTL | Default | 242.5KB |
| login-mobile.png | Mobile | RTL | Default | 480.0KB |

### Additional Local References

| File | Purpose | Status |
|------|---------|--------|
| output/playwright/manual-check/dashboard.png | Dashboard reference | ✅ Valid |
| output/playwright/manual-check/attendance.png | Attendance reference | ✅ Valid |

### Missing Screenshots

The following screens require screenshot capture:

| Screen | Priority | Notes |
|--------|----------|-------|
| Dashboard | HIGH | Partial manual reference exists |
| Students | HIGH | No visual reference |
| Teachers | HIGH | No visual reference |
| Payments | CRITICAL | Local reference blank |
| Salaries | HIGH | No visual reference |
| Expenses | MEDIUM | No visual reference |
| Reports | MEDIUM | No visual reference |
| Monitoring | HIGH | No visual reference |
| Fee Notifications | CRITICAL | Local reference blank |
| Super Admin | HIGH | No visual reference |

### Screenshot Naming Convention

```
{screen}--{viewport}--{direction}--{state}.png
```

**Components**:
- **screen**: lowercase kebab-case (e.g., `login`, `dashboard`, `super-admin`)
- **viewport**: `desktop` (1440), `tablet` (768), `mobile` (390)
- **direction**: `ltr`, `rtl`
- **state**: `default`, `loading`, `empty`, `error`, `modal-open`, `filtered`, `dark`

**Examples**:
```
login--desktop--rtl--default.png
dashboard--desktop--rtl--dark.png
students--mobile--rtl--empty.png
payments--tablet--ltr--default.png
super-admin--desktop--rtl--modal-open.png
```

---

## Summary

### Asset Counts

| Category | Count |
|----------|-------|
| Fonts | 2 families (Cairo, Inter) |
| Font weights | 5 each (400-800) |
| Typography levels | 11 |
| Lucide icons mapped | 90+ |
| Logo components | 3 (UltrathinkLogo, SchoolLogo, BrandLockup) |
| Chart types | 4 (Bar, Line, Pie, Area) |
| Chart colors | 5 |
| Public assets | 4 SVGs |
| Screenshots captured | 12 |
| Additional references | 2 |
| Screenshots needed | 10+ |

### Import Statements

```typescript
// Icons
import {
  Home, Users, GraduationCap, CreditCard, Wallet,
  // ... other icons
} from 'lucide-react';

// Or via lib/icons.ts
import { Home, Users, /* ... */ } from '@/lib/icons';

// Brand components
import { SchoolLogo, UltrathinkLogo } from '@/components/brand';

// Chart components
import {
  BarChart, LineChart, PieChart, AreaChart,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend
} from 'recharts';
```
