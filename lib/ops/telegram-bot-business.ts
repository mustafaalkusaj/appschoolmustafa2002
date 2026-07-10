import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { InlineKeyboard } from "@/lib/ops/telegram-bot-api";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export async function getCrmOverview(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("crm_leads")
      .select("id, school_name, contact_name, phone, status, last_contact_at")
      .order("last_contact_at", { ascending: false });

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const leads = (data ?? []) as Array<{
      id: string;
      school_name: string;
      contact_name: string | null;
      phone: string | null;
      status: string;
      last_contact_at: string | null;
    }>;

    // Group by status
    const groups: Record<string, number> = {};
    for (const l of leads) {
      groups[l.status] = (groups[l.status] ?? 0) + 1;
    }

    const hotWarm = leads.filter((l) => l.status === "hot" || l.status === "warm").slice(0, 5);

    const lines = [
      `📋 <b>CRM — نظرة عامة</b>`,
      `الإجمالي: <b>${leads.length}</b>`,
      "",
      "<b>حسب الحالة:</b>",
      ...Object.entries(groups).map(([s, n]) => {
        const icon =
          s === "hot" ? "🔥" : s === "warm" ? "🟡" : s === "cold" ? "🔵" : s === "converted" ? "✅" : "❌";
        return `${icon} ${escHtml(s)}: <b>${n}</b>`;
      }),
    ];

    if (hotWarm.length > 0) {
      lines.push("", "<b>الساخنون والدافئون:</b>");
      for (const l of hotWarm) {
        const lastContact = l.last_contact_at
          ? new Date(l.last_contact_at).toLocaleDateString("ar-IQ")
          : "—";
        lines.push(
          `• ${escHtml(l.school_name)} — ${escHtml(l.contact_name ?? "—")} (${lastContact})`,
        );
      }
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

export async function addCrmLead(
  schoolName: string,
  contact: string,
  phone: string,
  notes: string,
): Promise<string> {
  if (!schoolName) return "⚠️ اسم المدرسة مطلوب.";

  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("crm_leads")
      .insert({
        school_name: schoolName,
        contact_name: contact || null,
        phone: phone || null,
        notes: notes || null,
        status: "warm",
        last_contact_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const id = (data as Record<string, unknown>).id as string;
    return [
      `✅ <b>تم إضافة العميل</b>`,
      `ID: <code>${escHtml(id.slice(0, 8))}</code>`,
      `المدرسة: ${escHtml(schoolName)}`,
      `الحالة: warm 🟡`,
    ].join("\n");
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

export async function getCrmLeadDetail(nameOrId: string): Promise<string> {
  if (!nameOrId) return "⚠️ مطلوب: اسم أو ID";

  try {
    const supabase = createServiceSupabaseClient();

    // Try by name first (ILIKE)
    const { data, error } = await supabase
      .from("crm_leads")
      .select("id, school_name, contact_name, phone, status, last_contact_at, notes")
      .ilike("school_name", `%${nameOrId}%`)
      .limit(1)
      .single();

    if (error || !data) {
      // Try by ID prefix
      const { data: byId } = await supabase
        .from("crm_leads")
        .select("id, school_name, contact_name, phone, status, last_contact_at, notes")
        .gte("id" as never, nameOrId)
        .limit(1)
        .single();

      if (!byId) return `❌ لم يُعثر على عميل: ${escHtml(nameOrId)}`;

      const lead = byId as Record<string, unknown>;
      return formatLeadDetail(lead);
    }

    return formatLeadDetail(data as Record<string, unknown>);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

function formatLeadDetail(lead: Record<string, unknown>): string {
  return [
    `📋 <b>تفاصيل العميل</b>`,
    `ID: <code>${escHtml(String(lead.id ?? "").slice(0, 8))}</code>`,
    `المدرسة: <b>${escHtml(String(lead.school_name ?? "—"))}</b>`,
    `التواصل: ${escHtml(String(lead.contact_name ?? "—"))}`,
    `الهاتف: ${escHtml(String(lead.phone ?? "—"))}`,
    `الحالة: ${escHtml(String(lead.status ?? "—"))}`,
    `آخر تواصل: ${lead.last_contact_at ? new Date(String(lead.last_contact_at)).toLocaleDateString("ar-IQ") : "—"}`,
    `ملاحظات: ${escHtml(String(lead.notes ?? "—").slice(0, 200))}`,
  ].join("\n");
}

export async function getFollowups(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("crm_leads")
      .select("id, school_name, contact_name, phone, status, last_contact_at")
      .in("status", ["hot", "warm"])
      .or(`last_contact_at.lt.${threeDaysAgo},last_contact_at.is.null`);

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const leads = (data ?? []) as Array<{
      id: string;
      school_name: string;
      contact_name: string | null;
      phone: string | null;
      status: string;
      last_contact_at: string | null;
    }>;

    if (leads.length === 0) {
      return "✅ لا توجد متابعات معلقة.";
    }

    const lines = [
      `⏰ <b>متابعات مطلوبة (${leads.length})</b>`,
      "(لم يتم التواصل منذ 3 أيام أو أكثر)",
      "",
    ];

    for (const l of leads) {
      const icon = l.status === "hot" ? "🔥" : "🟡";
      const lastContact = l.last_contact_at
        ? new Date(l.last_contact_at).toLocaleDateString("ar-IQ")
        : "لم يُتصل به"
      ;
      lines.push(
        `${icon} <b>${escHtml(l.school_name)}</b>`,
        `   ${escHtml(l.contact_name ?? "—")} — ${escHtml(l.phone ?? "—")}`,
        `   آخر تواصل: ${escHtml(lastContact)}`,
        "",
      );
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── INVOICES ─────────────────────────────────────────────────────────────────

export async function getInvoicesOverview(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, school_name, amount, status, due_date, paid_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const invoices = (data ?? []) as Array<{
      id: string;
      invoice_number: string;
      school_name: string;
      amount: number;
      status: string;
      due_date: string | null;
      paid_at: string | null;
    }>;

    // Group by status
    const groups: Record<string, { count: number; total: number }> = {};
    for (const inv of invoices) {
      const s = inv.status ?? "unknown";
      if (!groups[s]) groups[s] = { count: 0, total: 0 };
      groups[s].count++;
      groups[s].total += Number(inv.amount ?? 0);
    }

    const lines = [
      `💼 <b>الفواتير</b>`,
      "",
      "<b>حسب الحالة:</b>",
      ...Object.entries(groups).map(([s, v]) => {
        const icon =
          s === "paid" ? "✅" : s === "pending" ? "⏳" : s === "overdue" ? "🔴" : "❌";
        return `${icon} ${escHtml(s)}: ${v.count} — ${v.total.toLocaleString("ar-IQ")} $`;
      }),
      "",
      "<b>آخر الفواتير:</b>",
    ];

    for (const inv of invoices.slice(0, 5)) {
      const icon =
        inv.status === "paid" ? "✅" : inv.status === "overdue" ? "🔴" : "⏳";
      lines.push(
        `${icon} <code>${escHtml(inv.invoice_number)}</code> — ${escHtml(inv.school_name)} — ${Number(inv.amount).toLocaleString("ar-IQ")} $`,
      );
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

export async function createInvoice(
  schoolName: string,
  amount: number,
  dueDate: string,
): Promise<string> {
  if (!schoolName || !amount) return "⚠️ مطلوب: schoolName و amount";

  try {
    const supabase = createServiceSupabaseClient();

    // Generate invoice number: INV-YYYYMM-seq
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { count } = await supabase
      .from("invoices")
      .select("id", { head: true, count: "exact" });

    const seq = String((count ?? 0) + 1).padStart(4, "0");
    const invoiceNumber = `INV-${yyyymm}-${seq}`;

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        school_name: schoolName,
        amount,
        status: "pending",
        due_date: dueDate || null,
        notes: null,
      })
      .select("id")
      .single();

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const id = (data as Record<string, unknown>).id as string;
    return [
      `✅ <b>تم إنشاء الفاتورة</b>`,
      `رقم الفاتورة: <code>${escHtml(invoiceNumber)}</code>`,
      `المدرسة: ${escHtml(schoolName)}`,
      `المبلغ: ${amount.toLocaleString("ar-IQ")} $`,
      `تاريخ الاستحقاق: ${dueDate ? escHtml(dueDate) : "—"}`,
      `ID: <code>${escHtml(id.slice(0, 8))}</code>`,
    ].join("\n");
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

export async function markInvoicePaid(invoiceNumber: string): Promise<string> {
  if (!invoiceNumber) return "⚠️ مطلوب: رقم الفاتورة";

  try {
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("invoice_number", invoiceNumber);

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    return `✅ تم تسجيل دفع الفاتورة <code>${escHtml(invoiceNumber)}</code>`;
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── BUSINESS REPORTS ─────────────────────────────────────────────────────────

export async function getPnlReport(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Revenue from payments this month
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("amount")
      .gte("created_at", monthStart.toISOString());

    const paymentsRevenue = ((paymentsData ?? []) as Array<{ amount: number }>).reduce(
      (sum, p) => sum + Number(p.amount ?? 0),
      0,
    );

    // Revenue from paid invoices this month
    const { data: invoicesData } = await supabase
      .from("invoices")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", monthStart.toISOString());

    const invoicesRevenue = ((invoicesData ?? []) as Array<{ amount: number }>).reduce(
      (sum, i) => sum + Number(i.amount ?? 0),
      0,
    );

    const totalRevenue = paymentsRevenue + invoicesRevenue;

    // Fixed costs (USD/month defaults)
    const costs = {
      "Supabase": 25,
      "Vercel": 20,
      "R2 Storage": 4,
      "Domain": 1,
      "Anthropic AI": 5,
      "Apple Dev": 7, // $99/year ÷ 12
    };

    const totalCosts = Object.values(costs).reduce((a, b) => a + b, 0);
    const netProfit = totalRevenue - totalCosts;
    const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "—";

    const lines = [
      `💹 <b>تقرير الأرباح والخسائر</b>`,
      `(${monthStart.toLocaleDateString("ar-IQ")} — اليوم)`,
      "",
      `<b>الإيرادات:</b>`,
      `  دفعات المدارس: ${paymentsRevenue.toLocaleString("ar-IQ")} د.ع`,
      `  فواتير مدفوعة: $${invoicesRevenue.toLocaleString()}`,
      `  الإجمالي: <b>$${totalRevenue.toLocaleString()}</b>`,
      "",
      `<b>التكاليف:</b>`,
      ...Object.entries(costs).map(([k, v]) => `  ${escHtml(k)}: $${v}`),
      `  الإجمالي: <b>$${totalCosts}</b>`,
      "",
      `<b>صافي الربح: $${netProfit.toLocaleString()}</b>`,
      `هامش الربح: <b>${margin}%</b>`,
    ];

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

export async function getRoiReport(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    const { data: schools } = await supabase
      .from("schools")
      .select("id, name")
      .limit(10);

    if (!schools || schools.length === 0) {
      return "📊 لا توجد بيانات مدارس.";
    }

    const lines = [
      `📊 <b>تقرير العائد على الاستثمار (ROI)</b>`,
      `(آخر 12 شهراً)`,
      "",
    ];

    const costPerSchool = 62 / Math.max(schools.length, 1); // total monthly cost / schools

    for (const school of (schools as Array<{ id: string; name: string }>).slice(0, 8)) {
      const { data: pData } = await supabase
        .from("payments")
        .select("amount")
        .eq("school_id" as never, school.id)
        .gte("created_at", yearAgo);

      const revenue = ((pData ?? []) as Array<{ amount: number }>).reduce(
        (sum, p) => sum + Number(p.amount ?? 0),
        0,
      );

      const yearlyCost = costPerSchool * 12;
      const roi = yearlyCost > 0 ? (((revenue - yearlyCost) / yearlyCost) * 100).toFixed(0) : "—";

      lines.push(
        `• ${escHtml(school.name.slice(0, 25))}: ${revenue.toLocaleString()} — ROI ${roi}%`,
      );
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

export async function getRevenueForecast(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();

    // Get last 3 months revenue
    const months: Array<{ month: string; revenue: number }> = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setMonth(end.getMonth() + 1);

      const { data } = await supabase
        .from("payments")
        .select("amount")
        .gte("created_at", d.toISOString())
        .lt("created_at", end.toISOString());

      const rev = ((data ?? []) as Array<{ amount: number }>).reduce(
        (sum, p) => sum + Number(p.amount ?? 0),
        0,
      );
      months.push({
        month: d.toLocaleDateString("ar-IQ", { month: "long", year: "numeric" }),
        revenue: rev,
      });
    }

    const client = new Anthropic();

    const context = months
      .map((m) => `${m.month}: ${m.revenue.toLocaleString()} (الإيرادات)`)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system:
        "أنت محلل مالي خبير. بناءً على بيانات الإيرادات، قدم توقعات الإيرادات لـ 3 أشهر القادمة بـ 3 سيناريوهات: متفائل، متوسط، متشائم. أجب باللغة العربية بشكل مختصر.",
      messages: [
        {
          role: "user",
          content: `بيانات الإيرادات الشهرية:\n${context}\n\nقدم توقعات للأشهر الثلاثة القادمة.`,
        },
      ],
    });

    const aiText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    const lines = [
      `📈 <b>توقعات الإيرادات</b>`,
      "",
      "<b>البيانات الحالية:</b>",
      ...months.map((m) => `• ${escHtml(m.month)}: ${m.revenue.toLocaleString()} د.ع`),
      "",
      "🤖 <b>تحليل AI:</b>",
      escHtml(aiText).slice(0, 1000),
    ];

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

export async function getSubscriptionsDetail(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("schools")
      .select("id, name, subscription_status, subscription_expires_at, subscription_plan")
      .order("subscription_expires_at", { ascending: true })
      .limit(20);

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const schools = (data ?? []) as unknown as Array<{
      id: string;
      name: string;
      subscription_status: string | null;
      subscription_expires_at: string | null;
      subscription_plan: string | null;
    }>;

    if (schools.length === 0) {
      return "📊 لا توجد بيانات اشتراكات.";
    }

    const lines = [`📊 <b>الاشتراكات التفصيلية</b>`, ""];

    for (const s of schools) {
      const status = s.subscription_status ?? "—";
      const icon = status === "active" ? "✅" : status === "expired" ? "🔴" : "⚠️";
      const expiry = s.subscription_expires_at
        ? new Date(s.subscription_expires_at).toLocaleDateString("ar-IQ")
        : "—";
      const plan = s.subscription_plan ?? "—";
      lines.push(
        `${icon} <b>${escHtml(s.name.slice(0, 25))}</b> — ${escHtml(plan)} — ${escHtml(expiry)}`,
      );
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── CHANGELOG ────────────────────────────────────────────────────────────────

export async function getChangelog(): Promise<string> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("changelog_entries")
      .select("id, version, description, notification_sent, released_at")
      .order("released_at", { ascending: false })
      .limit(10);

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const entries = (data ?? []) as Array<{
      id: string;
      version: string;
      description: string;
      notification_sent: boolean | null;
      released_at: string;
    }>;

    if (entries.length === 0) {
      return "📝 لا توجد إدخالات في Changelog.";
    }

    const lines = [`📝 <b>Changelog</b>`, ""];

    for (const e of entries) {
      const date = new Date(e.released_at).toLocaleDateString("ar-IQ");
      const notified = e.notification_sent ? "✅" : "—";
      lines.push(
        `<b>v${escHtml(e.version)}</b> — ${date} ${notified}`,
        `${escHtml(e.description.slice(0, 100))}`,
        "",
      );
    }

    return lines.join("\n").slice(0, 4000);
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

export async function addChangelog(version: string, description: string): Promise<string> {
  if (!version || !description) return "⚠️ مطلوب: version و description";

  try {
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.from("changelog_entries").insert({
      version,
      description,
      notification_sent: false,
      released_at: new Date().toISOString(),
    });

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    return [
      `✅ <b>تم إضافة Changelog</b>`,
      `الإصدار: <b>v${escHtml(version)}</b>`,
      `الوصف: ${escHtml(description.slice(0, 200))}`,
    ].join("\n");
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── TRIAL ────────────────────────────────────────────────────────────────────

export async function activateTrial(schoolName: string, days: number): Promise<string> {
  if (!schoolName || !days || days < 1) return "⚠️ مطلوب: اسم المدرسة وعدد الأيام";

  try {
    const supabase = createServiceSupabaseClient();

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("trial_activations")
      .insert({
        school_name: schoolName,
        days,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_active: true,
        notes: null,
      })
      .select("id")
      .single();

    if (error) return `❌ خطأ: ${escHtml(error.message.slice(0, 100))}`;

    const id = (data as Record<string, unknown>).id as string;
    return [
      `✅ <b>تم تفعيل التجربة</b>`,
      `ID: <code>${escHtml(id.slice(0, 8))}</code>`,
      `المدرسة: ${escHtml(schoolName)}`,
      `المدة: <b>${days} أيام</b>`,
      `تبدأ: ${startsAt.toLocaleDateString("ar-IQ")}`,
      `تنتهي: ${endsAt.toLocaleDateString("ar-IQ")}`,
    ].join("\n");
  } catch (err) {
    return `❌ خطأ: ${escHtml(String(err instanceof Error ? err.message : err ?? ""))}`;
  }
}

// ─── Keyboards ────────────────────────────────────────────────────────────────

export function businessMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "📋 CRM", callback_data: "menu_crm" },
      { text: "💼 الفواتير", callback_data: "menu_invoices" },
    ],
    [
      { text: "💹 P&L", callback_data: "cmd_pnl" },
      { text: "📈 التوقعات", callback_data: "cmd_forecast" },
    ],
    [
      { text: "📝 Changelog", callback_data: "cmd_changelog" },
      { text: "🔙 الرئيسية", callback_data: "menu_main" },
    ],
  ];
}

export function crmMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "📋 نظرة عامة", callback_data: "cmd_crm" },
      { text: "⏰ متابعات", callback_data: "cmd_followup" },
    ],
    [{ text: "🔙 الرئيسية", callback_data: "menu_main" }],
  ];
}

export function invoicesMenuKeyboard(): InlineKeyboard {
  return [
    [
      { text: "💼 الفواتير", callback_data: "cmd_invoices" },
      { text: "🔙 الرئيسية", callback_data: "menu_main" },
    ],
  ];
}
