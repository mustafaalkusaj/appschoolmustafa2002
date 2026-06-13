import "server-only";

import type { InlineKeyboard } from "@/lib/ops/telegram-bot-api";

// ─── Main Menu ────────────────────────────────────────────────────────────────

export function mainMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "📊 حالة النظام", callback_data: "menu_status" },
      { text: "🏫 المدارس", callback_data: "menu_schools" },
    ],
    [
      { text: "👥 المستخدمين", callback_data: "menu_users" },
      { text: "⚠️ الأخطاء", callback_data: "menu_errors" },
    ],
    [
      { text: "📝 الدرجات", callback_data: "menu_grades" },
      { text: "📋 الحضور", callback_data: "menu_attendance" },
    ],
    [
      { text: "💰 المالية", callback_data: "menu_finance" },
      { text: "🔔 الإشعارات", callback_data: "menu_notifications" },
    ],
    [
      { text: "🗄️ قاعدة البيانات", callback_data: "menu_db" },
      { text: "💾 التخزين", callback_data: "menu_storage" },
    ],
    [
      { text: "📅 التقويم", callback_data: "menu_calendar" },
      { text: "📈 التحليلات", callback_data: "menu_analytics" },
    ],
    [
      { text: "🔧 أدوات التحكم", callback_data: "menu_control" },
      { text: "⚙️ الإعدادات", callback_data: "menu_settings" },
    ],
    [
      { text: "👤 Auth Users", callback_data: "menu_supabase_auth" },
      { text: "💾 Storage", callback_data: "menu_storage_detail" },
    ],
    [
      { text: "🚀 Vercel", callback_data: "menu_vercel" },
      { text: "☁️ R2", callback_data: "menu_r2" },
    ],
    [
      { text: "📋 CRM", callback_data: "menu_crm" },
      { text: "💼 Business", callback_data: "menu_business" },
    ],
  ];
}

// ─── Back to main button ──────────────────────────────────────────────────────

export function backToMainButton(): InlineKeyboard {
  return [[{ text: "🔙 الرئيسية", callback_data: "menu_main" }]];
}

// ─── Confirm keyboard ─────────────────────────────────────────────────────────

export function confirmKeyboard(yesData: string, noData?: string): InlineKeyboard {
  return [
    [
      { text: "✅ تأكيد", callback_data: yesData },
      { text: "❌ إلغاء", callback_data: noData ?? "menu_main" },
    ],
  ];
}

// ─── Status Menu ──────────────────────────────────────────────────────────────

export function statusMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "🔄 تحديث", callback_data: "cmd_status" },
      { text: "📈 Uptime", callback_data: "cmd_uptime" },
    ],
    [
      { text: "⚡ السرعة", callback_data: "cmd_speed" },
      { text: "🔙 الرئيسية", callback_data: "menu_main" },
    ],
  ];
}

// ─── Schools Menu ─────────────────────────────────────────────────────────────

export function schoolsMenuKeyboard(
  schoolIds?: Array<{ id: string; name: string }>,
): InlineKeyboard {
  const rows: InlineKeyboard = [];

  if (schoolIds && schoolIds.length > 0) {
    // Two schools per row
    for (let i = 0; i < schoolIds.length && i < 10; i += 2) {
      const row = [
        {
          text: `🏫 ${schoolIds[i].name.slice(0, 20)}`,
          callback_data: `school_${schoolIds[i].id.slice(0, 36)}`,
        },
      ];
      if (schoolIds[i + 1]) {
        row.push({
          text: `🏫 ${schoolIds[i + 1].name.slice(0, 20)}`,
          callback_data: `school_${schoolIds[i + 1].id.slice(0, 36)}`,
        });
      }
      rows.push(row);
    }
  }

  rows.push([{ text: "🔙 الرئيسية", callback_data: "menu_main" }]);
  return rows;
}

// ─── Users Menu ───────────────────────────────────────────────────────────────

export function usersMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "📊 نظرة عامة", callback_data: "cmd_users" },
      { text: "🆕 جدد اليوم", callback_data: "cmd_newusers" },
    ],
    [
      { text: "💤 غير نشطين", callback_data: "cmd_inactive" },
      { text: "🔙 الرئيسية", callback_data: "menu_main" },
    ],
  ];
}

// ─── Errors Menu ──────────────────────────────────────────────────────────────

export function errorsMenuKeyboard(errorIds?: string[]): InlineKeyboard {
  const rows: InlineKeyboard = [];

  rows.push([
    { text: "🔄 تحديث", callback_data: "cmd_errors" },
    { text: "🔙 الرئيسية", callback_data: "menu_main" },
  ]);

  if (errorIds && errorIds.length > 0) {
    for (const id of errorIds.slice(0, 5)) {
      const short = id.slice(0, 8);
      rows.push([
        { text: `🔍 ${short}`, callback_data: `error_${short}` },
        { text: `🤖 AI تحليل`, callback_data: `ai_error_${short}` },
      ]);
    }
  }

  return rows;
}

// ─── Finance Menu ─────────────────────────────────────────────────────────────

export function financeMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "💰 الإيرادات", callback_data: "cmd_revenue" },
      { text: "💳 المديونيات", callback_data: "cmd_unpaid" },
    ],
    [
      { text: "📅 اليوم", callback_data: "cmd_finance_today" },
      { text: "📆 الأسبوع", callback_data: "cmd_revenue_week" },
    ],
    [
      { text: "🔙 الرئيسية", callback_data: "menu_main" },
    ],
  ];
}

// ─── Control Menu ─────────────────────────────────────────────────────────────

export function controlMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "🔧 الصيانة", callback_data: "cmd_maintenance" },
      { text: "🌍 متغيرات البيئة", callback_data: "cmd_env" },
    ],
    [
      { text: "🤖 AI تقرير", callback_data: "cmd_ai_report" },
      { text: "💡 اقتراحات", callback_data: "cmd_ai_suggest" },
    ],
    [
      { text: "🔙 الرئيسية", callback_data: "menu_main" },
    ],
  ];
}

// ─── buildSchoolsButtons ──────────────────────────────────────────────────────

export function buildSchoolsButtons(
  schools: Array<{ id: string; name: string }>,
): InlineKeyboard {
  const rows: InlineKeyboard = [];
  for (const school of schools.slice(0, 10)) {
    rows.push([
      {
        text: `🏫 ${school.name.slice(0, 30)}`,
        callback_data: `school_${school.id.slice(0, 36)}`,
      },
    ]);
  }
  return rows;
}
