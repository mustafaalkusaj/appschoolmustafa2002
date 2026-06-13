const PALETTE = {
  bg: "F4F7FC",
  bgSoft: "EEF4FB",
  surface: "FFFFFF",
  surfaceSoft: "F8FBFF",
  surfaceDark: "111827",
  darkBg: "080E1A",
  text: "0F172A",
  textMuted: "475569",
  textSoft: "94A3B8",
  border: "D9E3F0",
  borderStrong: "BFD0E8",
  primary: "4F8CFF",
  primaryStrong: "3E7DF7",
  secondary: "79D7FF",
  success: "10B981",
  warning: "F59E0B",
  danger: "EF4444",
  info: "3B82F6",
  legacyPurple: "4C2F9E",
  legacyPurpleSoft: "F0EEFF",
  inkOnBrand: "FFFFFF",
};

const SUMMARY = {
  routes: 19,
  surfaces: 45,
  components: 103,
  direction: "Arabic-first RTL with English LTR support",
};

const THEME_PRESETS = [
  { name: "blue-academic", family: "Blue", primary: "1E5AA8", secondary: "6DB4FF", accent: "F0A43B", bg: "F4F8FE" },
  { name: "blue-modern", family: "Blue", primary: "0F5B8D", secondary: "4EC4F3", accent: "7B61FF", bg: "F2F9FD" },
  { name: "blue-premium", family: "Blue", primary: "233876", secondary: "7FA7FF", accent: "D5A13E", bg: "F6F7FC" },
  { name: "green-growth", family: "Green", primary: "0F8A6A", secondary: "76D9BE", accent: "F4B740", bg: "F2FBF8" },
  { name: "green-heritage", family: "Green", primary: "2F6B57", secondary: "B9C98A", accent: "C78D4D", bg: "F7FAF5" },
  { name: "green-stem", family: "Green", primary: "157A74", secondary: "8FE3D4", accent: "6A8DFF", bg: "F1FBFA" },
  { name: "warm-leadership", family: "Warm", primary: "8D2D49", secondary: "E39DB0", accent: "F4B35D", bg: "FCF6F8" },
  { name: "warm-desert", family: "Warm", primary: "A45A2A", secondary: "F1C27A", accent: "7D4DCC", bg: "FFF8F2" },
  { name: "warm-scholars", family: "Warm", primary: "7A3E2B", secondary: "D7B08B", accent: "A74AC7", bg: "FBF6F2" },
  { name: "purple-royal", family: "Purple", primary: "6B46C1", secondary: "C084FC", accent: "FBBF24", bg: "F8F7FC" },
  { name: "purple-creative", family: "Purple", primary: "8B5CF6", secondary: "D8B4FE", accent: "F59E0B", bg: "FBFAFE" },
  { name: "purple-tech", family: "Purple", primary: "7C3AED", secondary: "A78BFA", accent: "06B6D4", bg: "F5F3FF" },
  { name: "classic-white", family: "Classic", primary: "1F2937", secondary: "6B7280", accent: "111827", bg: "FFFFFF" },
  { name: "dark-professional", family: "Dark", primary: "6366F1", secondary: "A5B4FC", accent: "FCD34D", bg: "0F172A" },
];

const PAGE_SPECS = [
  {
    name: "Cover",
    frames: [
      {
        name: "COV / Product Overview",
        width: 1440,
        height: 1024,
        kind: "cover",
        notes: [
          "School App product overview generated from local figma-handoff package.",
          "Use this file as the working Figma shell and fill each page with the documented components and screens.",
          "Canonical theme: blue/cyan shell with RTL-first behavior.",
        ],
      },
    ],
  },
  {
    name: "Foundations",
    frames: [
      {
        name: "FND / Color Moodboard",
        width: 1600,
        height: 1200,
        kind: "colors",
        notes: ["Blue/cyan production baseline", "Semantic status colors", "Legacy purple dashboard action callout"],
      },
      {
        name: "FND / Typography",
        width: 1440,
        height: 1200,
        kind: "typography",
        notes: ["Arabic-first with Cairo", "English fallback with Inter", "Mixed script and numeric samples"],
      },
      {
        name: "FND / Spacing And Radius",
        width: 1440,
        height: 960,
        kind: "spacing",
        notes: ["Spacing scale", "Radius system", "Shadow rhythm", "Shell paddings"],
      },
    ],
  },
  {
    name: "Tokens",
    frames: [
      {
        name: "TOK / Semantic Tokens / Light",
        width: 1600,
        height: 1200,
        kind: "tokens-light",
        notes: ["Light semantic token board", "Use as source for color styles and variables"],
      },
      {
        name: "TOK / Semantic Tokens / Dark",
        width: 1600,
        height: 1200,
        kind: "tokens-dark",
        notes: ["Dark semantic token board", "Maps to next-themes dark implementation"],
      },
      {
        name: "TOK / Runtime Branding Presets",
        width: 1920,
        height: 1400,
        kind: "presets",
        notes: ["Runtime branding preset catalog discovered from code", "Use as archive/preset palette source"],
      },
    ],
  },
  {
    name: "Icons and Assets",
    frames: [
      {
        name: "FND / Icons / Navigation",
        width: 1440,
        height: 900,
        kind: "asset-grid",
        notes: ["Navigation and utility icon staging board"],
      },
      {
        name: "FND / Assets / Logos",
        width: 1440,
        height: 900,
        kind: "logos",
        notes: ["App mark, school logos, avatar fallback styles"],
      },
    ],
  },
  {
    name: "Components",
    frames: [
      { name: "CMP / Nav / Sidebar", width: 1600, height: 1200, kind: "component-board", notes: ["Sidebar shell, nav groups, nav items, footer card"] },
      { name: "CMP / Nav / Topbar", width: 1600, height: 960, kind: "component-board", notes: ["Topbar shell, title block, academic year pill, action slot"] },
      { name: "CMP / Identity / Profile Menu", width: 1440, height: 960, kind: "component-board", notes: ["Profile trigger, open panel, language row, theme row, sign out row"] },
      { name: "CMP / Actions / Buttons", width: 1600, height: 1200, kind: "component-board", notes: ["Shell buttons and legacy dashboard button primitive"] },
      { name: "CMP / Forms / Inputs", width: 1600, height: 1200, kind: "component-board", notes: ["Auth glass input, select, search, inline-icon field"] },
      { name: "CMP / Data / Cards", width: 1600, height: 1200, kind: "component-board", notes: ["Card family, KPI cards, notification item, pills"] },
      { name: "CMP / Data / Tables", width: 1920, height: 1400, kind: "component-board", notes: ["Data table shell, table rows, mobile cards, pagination"] },
      { name: "CMP / Overlays", width: 1920, height: 1400, kind: "component-board", notes: ["Confirm dialogs, form modals, right drawer, mobile sheet"] },
    ],
  },
  {
    name: "Patterns",
    frames: [
      { name: "PAT / Auth / Split Layout", width: 1440, height: 1024, kind: "auth-pattern", notes: ["Hero + glass card auth pattern"] },
      { name: "PAT / Dashboard / Overview", width: 1600, height: 1400, kind: "dashboard-pattern", notes: ["Shell overview with KPI row and split content"] },
      { name: "PAT / Students / Management Workspace", width: 1600, height: 1400, kind: "table-pattern", notes: ["Tabs + stats + toolbar + table + modal rail"] },
      { name: "PAT / Payments / Collection Workspace", width: 1600, height: 1500, kind: "finance-pattern", notes: ["KPI row + search + filters + payments table + detail drawer"] },
    ],
  },
  {
    name: "Templates",
    frames: [
      { name: "TPL / App Shell / Desktop", width: 1440, height: 1024, kind: "shell-template-desktop", notes: ["280px sidebar, 80px topbar, scrollable content region"] },
      { name: "TPL / App Shell / Mobile", width: 390, height: 844, kind: "shell-template-mobile", notes: ["Drawer navigation, compressed topbar, stacked content"] },
    ],
  },
  {
    name: "Screens - Auth",
    frames: [
      { name: "SCR / Auth / Login / Desktop / AR", width: 1440, height: 1024, kind: "auth-screen", notes: ["RTL login split layout"] },
      { name: "SCR / Auth / Login / Mobile / AR", width: 390, height: 844, kind: "auth-screen-mobile", notes: ["Mobile login single-card stack"] },
      { name: "SCR / Auth / Forgot Password / Desktop / AR", width: 1280, height: 900, kind: "centered-gate", notes: ["Informational recovery surface"] },
      { name: "SCR / Gate / Access Denied / Desktop / AR", width: 1280, height: 900, kind: "centered-gate", notes: ["Authorization failure gate"] },
      { name: "SCR / Gate / Subscription Expired / Desktop / AR", width: 1280, height: 900, kind: "centered-gate", notes: ["Subscription and school-inactive gate"] },
    ],
  },
  {
    name: "Screens - Dashboard",
    frames: [
      { name: "SCR / Dashboard / Default / Desktop / AR", width: 1440, height: 1280, kind: "dashboard-screen", notes: ["Default dashboard state"] },
      { name: "SCR / Dashboard / Empty Operational Data / Desktop / AR", width: 1440, height: 1280, kind: "dashboard-screen-empty", notes: ["Empty operational block"] },
      { name: "SCR / Dashboard / Scope Blocked / Desktop / AR", width: 1440, height: 1280, kind: "dashboard-screen-blocked", notes: ["Super-admin no-school-selected state"] },
      { name: "SCR / Dashboard / Loading / Desktop / AR", width: 1440, height: 1280, kind: "dashboard-screen-loading", notes: ["Centered loading spinner state"] },
    ],
  },
  {
    name: "Screens - Academic / Core App",
    frames: [
      { name: "SCR / Students / Desktop / AR", width: 1440, height: 1280, kind: "table-screen", notes: ["Students management desktop state"] },
      { name: "SCR / Students / Mobile / AR", width: 390, height: 844, kind: "table-screen-mobile", notes: ["Students mobile card list"] },
      { name: "SCR / Teachers / Desktop / AR", width: 1440, height: 1280, kind: "table-screen", notes: ["Teachers management desktop state"] },
      { name: "SCR / Attendance / Desktop / AR", width: 1440, height: 1280, kind: "table-screen", notes: ["Attendance capture desktop state"] },
    ],
  },
  {
    name: "Screens - Finance",
    frames: [
      { name: "SCR / Payments / Desktop / AR", width: 1440, height: 1400, kind: "finance-screen", notes: ["Payments list default state"] },
      { name: "SCR / Payments / Detail Drawer Open / Desktop / AR", width: 1440, height: 1400, kind: "finance-screen-drawer", notes: ["Payments with student drawer open"] },
      { name: "SCR / Payments / Mobile / AR", width: 390, height: 844, kind: "finance-screen-mobile", notes: ["Mobile stacked finance cards"] },
      { name: "SCR / Expenses / Desktop / AR", width: 1440, height: 1280, kind: "finance-screen", notes: ["Expenses workspace"] },
      { name: "SCR / Salaries / Desktop / AR", width: 1440, height: 1280, kind: "finance-screen", notes: ["Salaries workspace"] },
    ],
  },
  {
    name: "Screens - Reports / Monitoring",
    frames: [
      { name: "SCR / Reports / Desktop / AR", width: 1440, height: 1280, kind: "report-screen", notes: ["Reports module"] },
      { name: "SCR / Monitoring / Desktop / AR", width: 1440, height: 1280, kind: "report-screen", notes: ["Monitoring module"] },
      { name: "SCR / Fee Notifications / Desktop / AR", width: 1440, height: 1280, kind: "report-screen", notes: ["Fee notifications module"] },
    ],
  },
  {
    name: "Screens - Admin",
    frames: [
      { name: "SCR / Schools / Legacy Admin / Desktop / AR", width: 1440, height: 1200, kind: "legacy-screen", notes: ["Legacy admin schools page"] },
      { name: "SCR / Subscriptions / Legacy Admin / Desktop / AR", width: 1440, height: 1200, kind: "legacy-screen", notes: ["Legacy admin subscriptions page"] },
    ],
  },
  {
    name: "Screens - Super Admin",
    frames: [
      { name: "SCR / Super Admin / Console / Desktop / AR", width: 1600, height: 1400, kind: "console-screen", notes: ["Default super-admin console"] },
      { name: "SCR / Super Admin / School Scoped / Desktop / AR", width: 1600, height: 1400, kind: "console-screen-scoped", notes: ["Super-admin scoped by selected school"] },
    ],
  },
  {
    name: "Prototypes / User Flows",
    frames: [
      { name: "PRT / Auth Flow", width: 1920, height: 1080, kind: "prototype-flow", notes: ["Login -> dashboard / denied / expired branches"] },
      { name: "PRT / Students CRUD", width: 2200, height: 1400, kind: "prototype-flow", notes: ["List -> add/edit/delete -> success"] },
      { name: "PRT / Payments Collection", width: 2400, height: 1400, kind: "prototype-flow", notes: ["Search -> filter -> drawer -> add payment -> receipt"] },
      { name: "PRT / Super Admin Scope Flow", width: 2200, height: 1400, kind: "prototype-flow", notes: ["Select school context -> scoped modules"] },
    ],
  },
  {
    name: "Archive / Ambiguous / Inferred",
    frames: [
      { name: "ARC / Legacy Purple Buttons", width: 1440, height: 900, kind: "archive", notes: ["Keep separate from the blue/cyan canonical shell action set"] },
      { name: "ARC / Legacy Admin Pages", width: 1600, height: 1200, kind: "archive", notes: ["Visually divergent older pages"] },
      { name: "ARC / Verification Gaps", width: 1440, height: 900, kind: "archive", notes: ["Runtime-dependent or screenshot-unverified surfaces"] },
    ],
  },
];

function rgb(hex) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((char) => char + char).join("")
    : value;
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

function solid(hex) {
  return [{ type: "SOLID", color: rgb(hex) }];
}

function rounded(frame, radius) {
  frame.cornerRadius = radius;
  return frame;
}

function setAutoLayout(frame, options) {
  frame.layoutMode = options.direction || "VERTICAL";
  frame.primaryAxisSizingMode = options.primaryAxisSizingMode || "AUTO";
  frame.counterAxisSizingMode = options.counterAxisSizingMode || "AUTO";
  frame.primaryAxisAlignItems = options.primaryAxisAlignItems || "MIN";
  frame.counterAxisAlignItems = options.counterAxisAlignItems || "MIN";
  frame.itemSpacing = options.itemSpacing || 0;
  frame.paddingLeft = options.paddingLeft || 0;
  frame.paddingRight = options.paddingRight || 0;
  frame.paddingTop = options.paddingTop || 0;
  frame.paddingBottom = options.paddingBottom || 0;
  return frame;
}

function createFrameNode(name, width, height, fills) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.resize(width, height);
  frame.fills = fills ? solid(fills) : [];
  frame.strokes = solid(PALETTE.border);
  frame.strokeWeight = 1;
  rounded(frame, 24);
  return frame;
}

function createTextNode(text, size, weight, colorHex) {
  const node = figma.createText();
  node.characters = text;
  node.fontName = { family: "Inter", style: weight };
  node.fontSize = size;
  node.fills = solid(colorHex || PALETTE.text);
  return node;
}

function addBulletList(parent, items) {
  if (!items || items.length === 0) return;
  const text = createTextNode(items.map((item) => `• ${item}`).join("\n"), 12, "Regular", PALETTE.textMuted);
  text.lineHeight = { unit: "PIXELS", value: 20 };
  parent.appendChild(text);
  text.layoutSizingHorizontal = "FILL";
}

function tag(text, fillHex, textHex) {
  const chip = createFrameNode(`tag/${text}`, 10, 10, fillHex || PALETTE.bgSoft);
  chip.resize(10, 10);
  setAutoLayout(chip, {
    direction: "HORIZONTAL",
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 6,
    paddingBottom: 6,
    itemSpacing: 6,
    counterAxisAlignItems: "CENTER",
  });
  chip.fills = solid(fillHex || PALETTE.bgSoft);
  chip.strokes = [];
  rounded(chip, 999);
  const label = createTextNode(text, 11, "Bold", textHex || PALETTE.text);
  chip.appendChild(label);
  return chip;
}

function addBoardHeader(frame, spec) {
  const header = figma.createFrame();
  header.name = "Board Header";
  setAutoLayout(header, {
    direction: "VERTICAL",
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 32,
    paddingBottom: 0,
    itemSpacing: 14,
  });
  header.fills = [];
  header.strokes = [];
  frame.appendChild(header);
  header.layoutSizingHorizontal = "FILL";

  const tagsRow = figma.createFrame();
  tagsRow.name = "Tags";
  setAutoLayout(tagsRow, {
    direction: "HORIZONTAL",
    itemSpacing: 8,
    counterAxisAlignItems: "CENTER",
  });
  tagsRow.fills = [];
  tagsRow.strokes = [];
  header.appendChild(tagsRow);
  tagsRow.layoutSizingHorizontal = "FILL";

  const sizeTag = tag(`${spec.width}×${spec.height}`, PALETTE.bgSoft, PALETTE.primaryStrong);
  const kindTag = tag(spec.kind.replace(/-/g, " "), "EAF2FF", PALETTE.primaryStrong);
  tagsRow.appendChild(kindTag);
  tagsRow.appendChild(sizeTag);

  const title = createTextNode(spec.name, 24, "Bold", PALETTE.text);
  header.appendChild(title);
  title.layoutSizingHorizontal = "FILL";

  const sub = createTextNode("Generated Figma scaffold frame from audited school-app handoff.", 13, "Regular", PALETTE.textMuted);
  sub.lineHeight = { unit: "PIXELS", value: 22 };
  header.appendChild(sub);
  sub.layoutSizingHorizontal = "FILL";

  addBulletList(header, spec.notes || []);
}

function addCanvasShell(frame) {
  const shell = createFrameNode("Canvas", Math.max(320, frame.width - 64), Math.max(320, frame.height - 220), PALETTE.bg);
  shell.clipsContent = true;
  rounded(shell, 28);
  frame.appendChild(shell);
  shell.layoutSizingHorizontal = "FILL";
  return shell;
}

function addSidebar(shell, dark) {
  const sidebar = createFrameNode("Sidebar", 280, shell.height, dark ? PALETTE.darkBg : PALETTE.surface);
  sidebar.x = 0;
  sidebar.y = 0;
  sidebar.strokes = [];
  shell.appendChild(sidebar);

  const block = createFrameNode("Sidebar Brand", 232, 64, dark ? "132038" : "EEF4FB");
  block.x = 24;
  block.y = 24;
  block.strokes = [];
  rounded(block, 20);
  sidebar.appendChild(block);

  for (let index = 0; index < 6; index += 1) {
    const item = createFrameNode(`Nav Item ${index + 1}`, 232, 42, index === 0 ? PALETTE.primary : dark ? "0F172A" : "FFFFFF");
    item.x = 24;
    item.y = 116 + index * 54;
    item.strokes = index === 0 ? [] : solid(dark ? "1E293B" : "E7EEF8");
    rounded(item, 16);
    sidebar.appendChild(item);
  }
}

function addTopbar(shell, withSidebar) {
  const topbar = createFrameNode("Topbar", shell.width - (withSidebar ? 280 : 0), 80, "FFFFFF");
  topbar.x = withSidebar ? 280 : 0;
  topbar.y = 0;
  topbar.strokes = solid("E7EEF8");
  shell.appendChild(topbar);

  const title = createFrameNode("Title Block", 240, 40, "F8FBFF");
  title.x = topbar.x + 24;
  title.y = 20;
  title.strokes = [];
  rounded(title, 16);
  shell.appendChild(title);

  const profile = createFrameNode("Profile Trigger", 210, 46, "FFFFFF");
  profile.x = shell.width - 234;
  profile.y = 17;
  profile.strokes = solid("D9E3F0");
  rounded(profile, 999);
  shell.appendChild(profile);
}

function addRect(shell, name, x, y, width, height, fill, radius) {
  const node = createFrameNode(name, width, height, fill || PALETTE.surface);
  node.x = x;
  node.y = y;
  node.strokes = [];
  rounded(node, radius || 20);
  shell.appendChild(node);
  return node;
}

function addDashboardMock(shell, options) {
  addSidebar(shell, false);
  addTopbar(shell, true);
  const baseX = 312;
  const top = 112;
  for (let index = 0; index < 4; index += 1) {
    addRect(shell, `KPI ${index + 1}`, baseX + index * 206, top, 182, 132, "FFFFFF", 28);
  }
  addRect(shell, "Primary Analytics", baseX, top + 168, 660, 320, "FFFFFF", 28);
  addRect(shell, "Side Panel A", baseX + 692, top + 168, 340, 180, "FFFFFF", 28);
  addRect(shell, "Side Panel B", baseX + 692, top + 364, 340, 124, "FFFFFF", 28);
  if (options.loading) {
    addRect(shell, "Loading State", baseX + 180, top + 540, 480, 180, "EEF4FB", 32);
  } else if (options.blocked) {
    addRect(shell, "Scope Blocked", baseX, top + 520, 1032, 220, "FFFFFF", 32);
  } else if (options.empty) {
    addRect(shell, "Empty Operational State", baseX, top + 520, 1032, 220, "FFFFFF", 32);
  } else {
    addRect(shell, "Class Fees Table", baseX, top + 520, 1032, 260, "FFFFFF", 28);
    addRect(shell, "Recent Payments", baseX, top + 812, 500, 210, "FFFFFF", 28);
    addRect(shell, "Overdue Students", baseX + 532, top + 812, 500, 210, "FFFFFF", 28);
  }
}

function addTableMock(shell, mobile) {
  if (mobile) {
    addTopbar(shell, false);
    addRect(shell, "Tabs", 16, 96, shell.width - 32, 88, "FFFFFF", 24);
    addRect(shell, "Stats Grid", 16, 200, shell.width - 32, 160, "FFFFFF", 24);
    addRect(shell, "Toolbar Stack", 16, 376, shell.width - 32, 180, "FFFFFF", 24);
    addRect(shell, "Card List", 16, 572, shell.width - 32, 220, "FFFFFF", 24);
    return;
  }
  addSidebar(shell, false);
  addTopbar(shell, true);
  const baseX = 312;
  addRect(shell, "Tabs", baseX, 112, 1020, 68, "FFFFFF", 22);
  addRect(shell, "Stats", baseX, 200, 1020, 120, "FFFFFF", 22);
  addRect(shell, "Toolbar", baseX, 340, 1020, 72, "FFFFFF", 22);
  addRect(shell, "Data Table", baseX, 432, 1020, 520, "FFFFFF", 22);
}

function addFinanceMock(shell, mobile, withDrawer) {
  if (mobile) {
    addTopbar(shell, false);
    addRect(shell, "KPI Row", 16, 96, shell.width - 32, 118, "FFFFFF", 24);
    addRect(shell, "Search Toolbar", 16, 230, shell.width - 32, 64, "FFFFFF", 24);
    addRect(shell, "Filters Panel", 16, 310, shell.width - 32, 190, "FFFFFF", 24);
    addRect(shell, "Finance Cards", 16, 516, shell.width - 32, 240, "FFFFFF", 24);
    return;
  }
  addSidebar(shell, false);
  addTopbar(shell, true);
  const baseX = 312;
  addRect(shell, "KPI Row", baseX, 112, 1020, 120, "FFFFFF", 24);
  addRect(shell, "Search Toolbar", baseX, 252, 1020, 64, "FFFFFF", 24);
  addRect(shell, "Operations Panel", baseX, 336, 1020, 200, "FFFFFF", 24);
  addRect(shell, "Payments Table", baseX, 556, withDrawer ? 660 : 1020, 440, "FFFFFF", 24);
  if (withDrawer) {
    addRect(shell, "Student Detail Drawer", baseX + 692, 556, 340, 440, "FFFFFF", 24);
  }
}

function addAuthMock(shell, mobile) {
  if (mobile) {
    addRect(shell, "Auth Card", 16, 48, shell.width - 32, shell.height - 96, "FFFFFF", 32);
    return;
  }
  addRect(shell, "Hero Narrative", 48, 64, Math.floor(shell.width * 0.56), shell.height - 128, "EEF4FB", 36);
  addRect(shell, "Auth Glass Card", Math.floor(shell.width * 0.64), 120, Math.floor(shell.width * 0.28), shell.height - 240, "FFFFFF", 36);
}

function addGateMock(shell) {
  addRect(shell, "Centered Gate Card", Math.max(80, Math.floor(shell.width / 2) - 260), 140, 520, 420, "FFFFFF", 32);
}

function addConsoleMock(shell, scoped) {
  addSidebar(shell, false);
  addTopbar(shell, true);
  const baseX = 312;
  addRect(shell, "Compact Hero", baseX, 112, 1220, 140, scoped ? "EEF4FB" : "FFFFFF", 28);
  addRect(shell, "Tab Rail", baseX, 272, 1220, 68, "FFFFFF", 22);
  addRect(shell, "Console Overview", baseX, 360, 1220, 640, "FFFFFF", 28);
}

function addPrototypeFlow(frame, spec) {
  const board = addCanvasShell(frame);
  board.fills = solid("FFFFFF");
  const stepNames = spec.name.includes("Auth")
    ? ["Login", "Dashboard", "Access Denied", "Expired"]
    : spec.name.includes("Students")
      ? ["List", "Add Modal", "Edit Modal", "Delete Confirm", "Success"]
      : spec.name.includes("Payments")
        ? ["Search", "Filtered List", "Detail Drawer", "Add Payment", "Receipt"]
        : ["No Scope", "Select School", "Scoped Dashboard", "Scoped Module"];

  let x = 80;
  for (let index = 0; index < stepNames.length; index += 1) {
    const card = addRect(board, `Step ${index + 1}`, x, 160, 260, 120, index === 0 ? "EEF4FB" : "FFFFFF", 24);
    const title = createTextNode(stepNames[index], 18, "Bold", PALETTE.text);
    title.x = x + 24;
    title.y = 196;
    board.appendChild(title);
    if (index < stepNames.length - 1) {
      const arrow = addRect(board, `Arrow ${index + 1}`, x + 280, 208, 90, 20, PALETTE.primary, 999);
      arrow.strokes = [];
    }
    x += 360;
  }
}

function addColorBoard(frame, darkMode) {
  const colors = darkMode
    ? [
        ["background", PALETTE.darkBg],
        ["surface", PALETTE.surfaceDark],
        ["primary", "76A9FF"],
        ["secondary", "8AE7FF"],
        ["text", "F1F5F9"],
        ["muted", "94A3B8"],
        ["success", "34D399"],
        ["warning", "FBBF24"],
        ["danger", "F87171"],
      ]
    : [
        ["background", PALETTE.bg],
        ["surface", PALETTE.surface],
        ["primary", PALETTE.primary],
        ["secondary", PALETTE.secondary],
        ["text", PALETTE.text],
        ["muted", PALETTE.textMuted],
        ["success", PALETTE.success],
        ["warning", PALETTE.warning],
        ["danger", PALETTE.danger],
      ];

  const wrap = figma.createFrame();
  wrap.name = "Swatches";
  setAutoLayout(wrap, {
    direction: "HORIZONTAL",
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 20,
    paddingBottom: 32,
    itemSpacing: 16,
    counterAxisAlignItems: "MIN",
  });
  wrap.layoutWrap = "WRAP";
  wrap.fills = [];
  wrap.strokes = [];
  frame.appendChild(wrap);
  wrap.layoutSizingHorizontal = "FILL";

  colors.forEach(([name, hex]) => {
    const card = createFrameNode(`Swatch/${name}`, 150, 120, "FFFFFF");
    setAutoLayout(card, {
      direction: "VERTICAL",
      paddingLeft: 14,
      paddingRight: 14,
      paddingTop: 14,
      paddingBottom: 14,
      itemSpacing: 10,
    });
    card.strokes = solid(PALETTE.border);
    rounded(card, 20);
    const chip = createFrameNode(`${name} fill`, 120, 54, hex);
    chip.strokes = [];
    rounded(chip, 14);
    card.appendChild(chip);
    const nameText = createTextNode(name, 12, "Bold", PALETTE.text);
    card.appendChild(nameText);
    const valueText = createTextNode(`#${hex}`, 11, "Regular", PALETTE.textMuted);
    card.appendChild(valueText);
    wrap.appendChild(card);
  });
}

function addPresetCatalog(frame) {
  const wrap = figma.createFrame();
  wrap.name = "Preset Catalog";
  setAutoLayout(wrap, {
    direction: "HORIZONTAL",
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 20,
    paddingBottom: 32,
    itemSpacing: 16,
  });
  wrap.layoutWrap = "WRAP";
  wrap.fills = [];
  wrap.strokes = [];
  frame.appendChild(wrap);
  wrap.layoutSizingHorizontal = "FILL";

  THEME_PRESETS.forEach((preset) => {
    const card = createFrameNode(`Preset/${preset.name}`, 260, 190, "FFFFFF");
    setAutoLayout(card, {
      direction: "VERTICAL",
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
      paddingBottom: 16,
      itemSpacing: 12,
    });
    rounded(card, 24);
    const header = createFrameNode("Preview", 228, 80, preset.bg);
    header.strokes = [];
    rounded(header, 18);
    const primary = addRect(header, "Primary", 16, 18, 64, 44, preset.primary, 14);
    const secondary = addRect(header, "Secondary", 88, 18, 44, 44, preset.secondary, 14);
    addRect(header, "Accent", 140, 18, 72, 44, preset.accent, 14);
    primary.strokes = [];
    card.appendChild(header);
    card.appendChild(createTextNode(preset.name, 13, "Bold", PALETTE.text));
    card.appendChild(createTextNode(preset.family, 11, "Regular", PALETTE.textMuted));
    wrap.appendChild(card);
  });
}

function addTypographyBoard(frame) {
  const wrap = figma.createFrame();
  wrap.name = "Typography Samples";
  setAutoLayout(wrap, {
    direction: "VERTICAL",
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 20,
    paddingBottom: 32,
    itemSpacing: 18,
  });
  wrap.fills = [];
  wrap.strokes = [];
  frame.appendChild(wrap);
  wrap.layoutSizingHorizontal = "FILL";

  const display = createTextNode("منصة المدرسة الذكية", 44, "Bold", PALETTE.text);
  const bodyAr = createTextNode("واجهة عربية أولاً لإدارة المدرسة، مع وضوح أعلى في التسلسل وتناسق بصري عبر جميع الشاشات.", 20, "Regular", PALETTE.textMuted);
  bodyAr.lineHeight = { unit: "PIXELS", value: 34 };
  const displayEn = createTextNode("School App Figma Reconstruction", 36, "Bold", PALETTE.text);
  const bodyEn = createTextNode("Arabic-first school administration system with shell-based dashboards, data-heavy modules, and runtime branding.", 18, "Regular", PALETTE.textMuted);
  bodyEn.lineHeight = { unit: "PIXELS", value: 30 };

  wrap.appendChild(display);
  wrap.appendChild(bodyAr);
  wrap.appendChild(displayEn);
  wrap.appendChild(bodyEn);
}

function addSpacingBoard(frame) {
  const wrap = figma.createFrame();
  wrap.name = "Spacing Samples";
  setAutoLayout(wrap, {
    direction: "VERTICAL",
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 20,
    paddingBottom: 32,
    itemSpacing: 20,
  });
  wrap.fills = [];
  wrap.strokes = [];
  frame.appendChild(wrap);
  wrap.layoutSizingHorizontal = "FILL";

  const row = figma.createFrame();
  row.name = "Spacing Row";
  setAutoLayout(row, { direction: "HORIZONTAL", itemSpacing: 16, counterAxisAlignItems: "CENTER" });
  row.fills = [];
  row.strokes = [];
  wrap.appendChild(row);
  row.layoutSizingHorizontal = "FILL";

  [4, 8, 12, 16, 24, 32, 48, 64].forEach((size) => {
    const sample = createFrameNode(`Space ${size}`, 90, 120, "FFFFFF");
    setAutoLayout(sample, {
      direction: "VERTICAL",
      paddingLeft: 12,
      paddingRight: 12,
      paddingTop: 12,
      paddingBottom: 12,
      itemSpacing: 10,
    });
    rounded(sample, 20);
    const spacer = addRect(sample, "Spacer", 0, 0, 42, size, PALETTE.primary, 12);
    spacer.layoutAlign = "CENTER";
    const label = createTextNode(`${size}px`, 11, "Bold", PALETTE.text);
    sample.appendChild(label);
    row.appendChild(sample);
  });

  const radiusRow = figma.createFrame();
  radiusRow.name = "Radius Row";
  setAutoLayout(radiusRow, { direction: "HORIZONTAL", itemSpacing: 16, counterAxisAlignItems: "CENTER" });
  radiusRow.fills = [];
  radiusRow.strokes = [];
  wrap.appendChild(radiusRow);
  radiusRow.layoutSizingHorizontal = "FILL";

  [6, 10, 14, 18, 24, 32].forEach((radius) => {
    const shape = createFrameNode(`Radius ${radius}`, 96, 84, "EAF2FF");
    rounded(shape, radius);
    radiusRow.appendChild(shape);
  });
}

function addComponentBoard(frame) {
  const wrap = figma.createFrame();
  wrap.name = "Component Placeholder Grid";
  setAutoLayout(wrap, {
    direction: "HORIZONTAL",
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 20,
    paddingBottom: 32,
    itemSpacing: 18,
  });
  wrap.layoutWrap = "WRAP";
  wrap.fills = [];
  wrap.strokes = [];
  frame.appendChild(wrap);
  wrap.layoutSizingHorizontal = "FILL";

  for (let index = 0; index < 6; index += 1) {
    const card = createFrameNode(`Component Sample ${index + 1}`, 240, 160, "FFFFFF");
    setAutoLayout(card, {
      direction: "VERTICAL",
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: 16,
      paddingBottom: 16,
      itemSpacing: 12,
    });
    rounded(card, 24);
    const mock = createFrameNode("Visual", 208, 80, index === 0 ? "EEF4FB" : "F8FBFF");
    mock.strokes = [];
    rounded(mock, 18);
    card.appendChild(mock);
    card.appendChild(createTextNode(`Variant ${index + 1}`, 12, "Bold", PALETTE.text));
    card.appendChild(createTextNode("Use component-spec-sheets.md to replace this placeholder with the real component set.", 11, "Regular", PALETTE.textMuted));
    wrap.appendChild(card);
  }
}

function populateFrame(frame, spec) {
  addBoardHeader(frame, spec);

  if (spec.kind === "cover") {
    const body = figma.createFrame();
    body.name = "Cover Body";
    setAutoLayout(body, {
      direction: "VERTICAL",
      paddingLeft: 32,
      paddingRight: 32,
      paddingTop: 20,
      paddingBottom: 32,
      itemSpacing: 24,
    });
    body.fills = [];
    body.strokes = [];
    frame.appendChild(body);
    body.layoutSizingHorizontal = "FILL";

    const hero = createFrameNode("Hero", spec.width - 64, 320, PALETTE.bgSoft);
    hero.strokes = [];
    rounded(hero, 32);
    body.appendChild(hero);
    const hTitle = createTextNode("School App Figma Reconstruction Package", 36, "Bold", PALETTE.text);
    hTitle.x = 40;
    hTitle.y = 56;
    hero.appendChild(hTitle);
    const hSub = createTextNode(SUMMARY.direction, 18, "Regular", PALETTE.textMuted);
    hSub.x = 40;
    hSub.y = 112;
    hero.appendChild(hSub);

    const metricRow = figma.createFrame();
    setAutoLayout(metricRow, { direction: "HORIZONTAL", itemSpacing: 18, counterAxisAlignItems: "CENTER" });
    metricRow.fills = [];
    metricRow.strokes = [];
    body.appendChild(metricRow);
    metricRow.layoutSizingHorizontal = "FILL";

    [
      ["Routes", String(SUMMARY.routes), PALETTE.primary],
      ["Surfaces", String(SUMMARY.surfaces), PALETTE.secondary],
      ["Components", String(SUMMARY.components), PALETTE.success],
    ].forEach(([label, value, color]) => {
      const card = createFrameNode(label, 260, 150, "FFFFFF");
      setAutoLayout(card, {
        direction: "VERTICAL",
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 20,
        paddingBottom: 20,
        itemSpacing: 10,
      });
      rounded(card, 28);
      const badge = createFrameNode(`${label} badge`, 70, 36, color);
      badge.strokes = [];
      rounded(badge, 999);
      card.appendChild(badge);
      card.appendChild(createTextNode(value, 34, "Bold", PALETTE.text));
      card.appendChild(createTextNode(label, 13, "Regular", PALETTE.textMuted));
      metricRow.appendChild(card);
    });

    addBulletList(body, [
      "Cover page summarizes the real project structure and the local handoff package.",
      "Use the generated pages as the working skeleton for actual production reconstruction inside Figma.",
    ]);
    return;
  }

  if (spec.kind === "colors") {
    addColorBoard(frame, false);
    return;
  }

  if (spec.kind === "tokens-light") {
    addColorBoard(frame, false);
    return;
  }

  if (spec.kind === "tokens-dark") {
    addColorBoard(frame, true);
    return;
  }

  if (spec.kind === "presets") {
    addPresetCatalog(frame);
    return;
  }

  if (spec.kind === "typography") {
    addTypographyBoard(frame);
    return;
  }

  if (spec.kind === "spacing") {
    addSpacingBoard(frame);
    return;
  }

  if (spec.kind === "component-board" || spec.kind === "asset-grid" || spec.kind === "logos" || spec.kind === "archive") {
    addComponentBoard(frame);
    return;
  }

  if (spec.kind === "prototype-flow") {
    addPrototypeFlow(frame, spec);
    return;
  }

  const shell = addCanvasShell(frame);
  if (spec.kind === "auth-pattern" || spec.kind === "auth-screen") {
    addAuthMock(shell, false);
    return;
  }
  if (spec.kind === "auth-screen-mobile") {
    addAuthMock(shell, true);
    return;
  }
  if (spec.kind === "centered-gate") {
    addGateMock(shell);
    return;
  }
  if (spec.kind === "dashboard-pattern" || spec.kind === "dashboard-screen") {
    addDashboardMock(shell, {});
    return;
  }
  if (spec.kind === "dashboard-screen-empty") {
    addDashboardMock(shell, { empty: true });
    return;
  }
  if (spec.kind === "dashboard-screen-blocked") {
    addDashboardMock(shell, { blocked: true });
    return;
  }
  if (spec.kind === "dashboard-screen-loading") {
    addDashboardMock(shell, { loading: true });
    return;
  }
  if (spec.kind === "table-pattern" || spec.kind === "table-screen") {
    addTableMock(shell, false);
    return;
  }
  if (spec.kind === "table-screen-mobile") {
    addTableMock(shell, true);
    return;
  }
  if (spec.kind === "finance-pattern" || spec.kind === "finance-screen") {
    addFinanceMock(shell, false, false);
    return;
  }
  if (spec.kind === "finance-screen-drawer") {
    addFinanceMock(shell, false, true);
    return;
  }
  if (spec.kind === "finance-screen-mobile") {
    addFinanceMock(shell, true, false);
    return;
  }
  if (spec.kind === "report-screen" || spec.kind === "legacy-screen") {
    addTableMock(shell, false);
    return;
  }
  if (spec.kind === "console-screen") {
    addConsoleMock(shell, false);
    return;
  }
  if (spec.kind === "console-screen-scoped") {
    addConsoleMock(shell, true);
    return;
  }
  if (spec.kind === "shell-template-desktop") {
    addTableMock(shell, false);
    return;
  }
  if (spec.kind === "shell-template-mobile") {
    addTableMock(shell, true);
  }
}

function getOrCreatePage(pageName) {
  const existing = figma.root.children.find((node) => node.type === "PAGE" && node.name === pageName);
  if (existing) return existing;
  const page = figma.createPage();
  page.name = pageName;
  return page;
}

function frameExists(page, frameName) {
  return page.children.some((child) => child.name === frameName);
}

function nextStartX(page) {
  if (page.children.length === 0) return 0;
  return Math.max(...page.children.map((child) => child.x + child.width)) + 200;
}

function pageHeader(page) {
  const headerName = `Header / ${page.name}`;
  const existing = page.children.find((child) => child.name === headerName);
  if (existing) return;
  const frame = createFrameNode(headerName, 680, 110, "FFFFFF");
  setAutoLayout(frame, {
    direction: "VERTICAL",
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 18,
    paddingBottom: 18,
    itemSpacing: 8,
  });
  frame.strokes = solid(PALETTE.border);
  frame.x = 0;
  frame.y = 0;
  const title = createTextNode(page.name, 22, "Bold", PALETTE.text);
  const body = createTextNode("Generated project page scaffold. Populate using the local figma-handoff package and component spec sheets.", 12, "Regular", PALETTE.textMuted);
  body.lineHeight = { unit: "PIXELS", value: 20 };
  frame.appendChild(title);
  frame.appendChild(body);
  page.appendChild(frame);
}

async function main() {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  let createdPages = 0;
  let createdFrames = 0;

  for (const pageSpec of PAGE_SPECS) {
    const page = getOrCreatePage(pageSpec.name);
    if (page.parent !== figma.root) {
      figma.root.appendChild(page);
      createdPages += 1;
    } else if (!figma.root.children.some((child) => child === page)) {
      figma.root.appendChild(page);
      createdPages += 1;
    }
    await figma.setCurrentPageAsync(page);
    pageHeader(page);
    const startX = nextStartX(page);
    let x = startX;
    let y = 160;
    let rowHeight = 0;
    let column = 0;
    const columns = pageSpec.name.includes("Prototypes") ? 1 : 2;

    for (const frameSpec of pageSpec.frames) {
      if (frameExists(page, frameSpec.name)) continue;

      const frame = createFrameNode(frameSpec.name, frameSpec.width, frameSpec.height, "FCFDFF");
      setAutoLayout(frame, {
        direction: "VERTICAL",
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
        paddingBottom: 0,
        itemSpacing: 0,
      });
      frame.x = x;
      frame.y = y;
      populateFrame(frame, frameSpec);
      page.appendChild(frame);
      createdFrames += 1;

      rowHeight = Math.max(rowHeight, frame.height);
      column += 1;
      if (column >= columns) {
        column = 0;
        x = startX;
        y += rowHeight + 120;
        rowHeight = 0;
      } else {
        x += frame.width + 120;
      }
    }
  }

  await figma.setCurrentPageAsync(figma.root.children[0]);
  figma.viewport.scrollAndZoomIntoView(figma.currentPage.children.slice(0, 3));
  figma.closePlugin(`Seed complete: ${createdFrames} frames added across ${PAGE_SPECS.length} pages.`);
}

main().catch((error) => {
  figma.closePlugin(`Seeder failed: ${error && error.message ? error.message : String(error)}`);
});
