"use client";

import { useCallback, useState } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { cn } from "@/lib/brand/brand-utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import {
  Plus, Pencil, Trash2, KeyRound, Phone, CheckCircle2, Loader2, UserRoundPlus, RefreshCw, Eye, Printer,
} from "@/lib/icons";
import { ConfirmDialog, CredentialsDialog } from "./dialogs";
import { DriverDetail } from "./driver-detail";
import type { DriverRow, Credentials } from "./types";

type DriverForm = {
  full_name: string;
  phone: string;
  national_id: string;
  address: string;
  date_of_birth: string;
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  license_number: string;
  license_expiry: string;
  license_type: string;
  vehicle_plate: string;
  vehicle_model: string;
  vehicle_color: string;
  vehicle_year: string;
  insurance_expiry: string;
  inspection_expiry: string;
  notes: string;
};

const EMPTY_FORM: DriverForm = {
  full_name: "", phone: "", national_id: "", address: "",
  date_of_birth: "", blood_type: "", emergency_contact_name: "",
  emergency_contact_phone: "", license_number: "", license_expiry: "",
  license_type: "", vehicle_plate: "", vehicle_model: "", vehicle_color: "",
  vehicle_year: "", insurance_expiry: "", inspection_expiry: "", notes: "",
};

function StatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", active ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]" : "bg-[var(--surface-soft)] text-[var(--text-muted)]")}>
      {status === "active" ? "نشط" : status === "suspended" ? "موقف" : status === "on_leave" ? "اجازة" : "متوقف"}
    </span>
  );
}

function DriverFormDialog({
  open, onClose, driver, onSaved, onAccountCreated,
}: {
  open: boolean;
  onClose: () => void;
  driver: DriverRow | null;
  onSaved: () => void;
  onAccountCreated?: (creds: Credentials) => void;
}) {
  const isEdit = Boolean(driver);
  const [form, setForm] = useState<DriverForm>(
    driver
      ? {
          full_name: driver.full_name, phone: driver.phone || "",
          national_id: driver.national_id || "", address: driver.address || "",
          date_of_birth: driver.date_of_birth || "", blood_type: driver.blood_type || "",
          emergency_contact_name: driver.emergency_contact_name || "",
          emergency_contact_phone: driver.emergency_contact_phone || "",
          license_number: driver.license_number || "", license_expiry: driver.license_expiry || "",
          license_type: driver.license_type || "", vehicle_plate: driver.vehicle_plate || "",
          vehicle_model: driver.vehicle_model || "", vehicle_color: driver.vehicle_color || "",
          vehicle_year: driver.vehicle_year || "", insurance_expiry: driver.insurance_expiry || "",
          inspection_expiry: driver.inspection_expiry || "", notes: driver.notes || "",
        }
      : { ...EMPTY_FORM },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { setError("اسم السائق مطلوب"); return; }
    setSaving(true);
    setError(null);
    const url = isEdit ? `/api/web/transport/drivers/${driver!.id}` : "/api/web/transport/drivers";
    const method = isEdit ? "PATCH" : "POST";
    const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; id?: string; error?: { message?: string } }>(url, { method, body: JSON.stringify(form) });
    if (!response.ok || !payload?.ok) { setSaving(false); setError(payload?.error?.message || "فشل الحفظ"); return; }
    if (!isEdit && payload.id && onAccountCreated) {
      const { payload: accPayload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; credentials?: Credentials }>(
        `/api/web/transport/drivers/${payload.id}/account`, { method: "POST", body: "{}" },
      );
      if (accPayload?.credentials) onAccountCreated(accPayload.credentials);
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  const fields: { key: keyof DriverForm; label: string; type?: string; required?: boolean; section?: string }[] = [
    { key: "full_name", label: "الاسم الكامل", required: true, section: "المعلومات الشخصية" },
    { key: "phone", label: "رقم الهاتف", section: "المعلومات الشخصية" },
    { key: "national_id", label: "رقم الهوية", section: "المعلومات الشخصية" },
    { key: "date_of_birth", label: "تاريخ الميلاد", type: "date", section: "المعلومات الشخصية" },
    { key: "blood_type", label: "فصيلة الدم", section: "المعلومات الشخصية" },
    { key: "address", label: "العنوان", section: "المعلومات الشخصية" },
    { key: "emergency_contact_name", label: "اسم جهة الطوارئ", section: "الطوارئ" },
    { key: "emergency_contact_phone", label: "هاتف الطوارئ", section: "الطوارئ" },
    { key: "license_number", label: "رقم الرخصة", section: "الرخصة" },
    { key: "license_type", label: "نوع الرخصة", section: "الرخصة" },
    { key: "license_expiry", label: "انتهاء الرخصة", type: "date", section: "الرخصة" },
    { key: "vehicle_plate", label: "لوحة المركبة", section: "المركبة" },
    { key: "vehicle_model", label: "نوع المركبة", section: "المركبة" },
    { key: "vehicle_color", label: "لون المركبة", section: "المركبة" },
    { key: "vehicle_year", label: "سنة الصنع", section: "المركبة" },
    { key: "insurance_expiry", label: "انتهاء التأمين", type: "date", section: "المركبة" },
    { key: "inspection_expiry", label: "انتهاء الفحص", type: "date", section: "المركبة" },
    { key: "notes", label: "ملاحظات" },
  ];

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={isEdit ? "تعديل سائق" : "اضافة سائق"} />
      <ModalBody>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pe-1">
          {renderFormSections(fields, form, setForm)}
        </div>
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} disabled={saving} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors">
          الغاء
        </button>
        <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[var(--success)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-colors">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "حفظ" : "اضافة"}
        </button>
      </ModalFooter>
    </Modal>
  );
}

const LTR_KEYS = new Set(["phone", "national_id", "license_number", "vehicle_plate", "vehicle_year", "emergency_contact_phone"]);
const INPUT_CLS = "w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--success)]/30";

type FormField = { key: keyof DriverForm; label: string; type?: string; required?: boolean; section?: string };

function renderFormSections(
  fields: FormField[],
  form: DriverForm,
  setForm: (f: DriverForm) => void,
) {
  const sections: { title: string | null; items: FormField[] }[] = [];
  for (const f of fields) {
    const title = f.section ?? null;
    const last = sections[sections.length - 1];
    if (last && last.title === title) { last.items.push(f); }
    else { sections.push({ title, items: [f] }); }
  }
  return sections.map((sec, i) => (
    <div key={i}>
      {sec.title && (
        <p className="text-xs font-bold text-[var(--success)] mb-2 border-b border-[var(--border)] pb-1">
          {sec.title}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {sec.items.map((f) => (
          <div key={f.key} className={f.key === "notes" ? "sm:col-span-2" : ""}>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              {f.label} {f.required && <span className="text-[var(--danger)]">*</span>}
            </label>
            {f.key === "notes" ? (
              <textarea value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} rows={2} className={cn(INPUT_CLS, "resize-none")} />
            ) : (
              <input type={f.type || "text"} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className={INPUT_CLS} dir={LTR_KEYS.has(f.key) ? "ltr" : undefined} />
            )}
          </div>
        ))}
      </div>
    </div>
  ));
}

export function DriversTab({ drivers, onRefresh }: { drivers: DriverRow[]; onRefresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<DriverRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriverRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [credOpen, setCredOpen] = useState(false);
  const [accountLoading, setAccountLoading] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverRow | null>(null);
  const [printLoading, setPrintLoading] = useState<string | null>(null);
  const [printAllLoading, setPrintAllLoading] = useState(false);

  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const fetchPrintData = async (driverId: string) => {
    const { payload } = await fetchJsonWithAuthorizedSession<{
      ok?: boolean;
      students?: { id: string; route_id: string; student_id: string; subscription_status: string; students: { full_name: string; class_name: string; phone: string; guardian_name: string; guardian_phone: string; gender: string; section: string; address: string; registration_number: string | null } | null }[];
      routes?: { id: string; name: string }[];
    }>(`/api/web/transport/drivers/${driverId}/students`);
    return { members: payload?.students ?? [], routes: payload?.routes ?? [] };
  };

  const buildDriverSection = (
    d: DriverRow,
    members: { route_id: string; subscription_status: string; students: { full_name: string; class_name: string; phone: string; guardian_name: string; guardian_phone: string; gender: string; section: string; address: string; registration_number: string | null } | null }[],
    routes: { id: string; name: string }[],
  ) => {
    const routeMap = new Map(routes.map((r) => [r.id, r.name]));
    const grouped = new Map<string, typeof members>();
    for (const m of members) {
      if (!m.students) continue;
      const arr = grouped.get(m.route_id) ?? [];
      arr.push(m);
      grouped.set(m.route_id, arr);
    }
    const totalStudents = members.filter((m) => m.students).length;
    const dName = esc(d.full_name);
    const dPhone = esc(d.phone || "—");
    const vehicle = esc([d.vehicle_model, d.vehicle_color, d.vehicle_plate].filter(Boolean).join(" · ") || "—");
    const license = esc(d.license_number || "—");
    const dateStr = new Date().toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const subLabel: Record<string, string> = { paid: "مدفوع", due: "مستحق", overdue: "متأخر" };
    const subCls: Record<string, string> = { paid: "st-paid", due: "st-due", overdue: "st-overdue" };

    const buildTable = (list: typeof members) => {
      let html = `<table><thead><tr><th class="c" style="width:24px">#</th><th>رقم التسجيل</th><th>اسم الطالب</th><th>الصف</th><th>الشعبة</th><th class="c">الجنس</th><th class="c">الاشتراك</th><th>ولي الأمر</th><th>هاتف ولي الأمر</th><th>العنوان</th></tr></thead><tbody>`;
      list.forEach((m, i) => {
        const s = m.students!;
        const g = s.gender === "male" ? "ذكر" : s.gender === "female" ? "أنثى" : "—";
        const ss = m.subscription_status || "due";
        html += `<tr><td class="c">${i + 1}</td><td>${esc(s.registration_number || "—")}</td><td class="nm">${esc(s.full_name)}</td><td>${esc(s.class_name || "—")}</td><td>${esc(s.section || "—")}</td><td class="c">${g}</td><td class="c"><span class="st ${subCls[ss] || "st-due"}">${subLabel[ss] || ss}</span></td><td>${esc(s.guardian_name || "—")}</td><td>${esc(s.guardian_phone || "—")}</td><td>${esc(s.address || "—")}</td></tr>`;
      });
      return html + `</tbody></table>`;
    };

    let tables = "";
    if (routes.length > 0) {
      for (const route of routes) {
        const rMembers = grouped.get(route.id);
        if (!rMembers?.length) continue;
        tables += `<div class="rsec"><div class="rh"><span class="rn">${esc(route.name)}</span><span class="rc">${rMembers.length} طالب</span></div>${buildTable(rMembers)}</div>`;
      }
      const unassigned = members.filter((m) => m.students && !routeMap.has(m.route_id));
      if (unassigned.length) {
        tables += `<div class="rsec"><div class="rh"><span class="rn">بدون خط</span><span class="rc">${unassigned.length} طالب</span></div>${buildTable(unassigned)}</div>`;
      }
    } else if (totalStudents > 0) {
      tables = buildTable(members.filter((m) => m.students));
    }

    if (!tables) tables = `<p class="empty">لا يوجد طلاب مسجلين لهذا السائق</p>`;

    const classCounts = new Map<string, number>();
    for (const m of members) {
      if (!m.students) continue;
      const cls = m.students.class_name || "غير محدد";
      classCounts.set(cls, (classCounts.get(cls) || 0) + 1);
    }
    const classBreakdown = classCounts.size > 0
      ? `<div class="summary"><span class="sl">توزيع حسب الصف:</span>${Array.from(classCounts.entries()).sort((a, b) => b[1] - a[1]).map(([cls, count]) => `<span class="cb">${esc(cls)}: ${count}</span>`).join("")}</div>`
      : "";

    return `<div class="page">
<div class="hdr"><h1>كشف طلاب النقل المدرسي</h1><p class="dt">${dateStr}</p></div>
<div class="dinfo">
<div class="row"><div class="it"><div class="lb">السائق</div><div class="vl">${dName}</div></div><div class="it"><div class="lb">الهاتف</div><div class="vl">${dPhone}</div></div><div class="it"><div class="lb">رقم الرخصة</div><div class="vl">${license}</div></div></div>
<div class="row"><div class="it"><div class="lb">المركبة</div><div class="vl">${vehicle}</div></div><div class="it"><div class="lb">عدد الخطوط</div><div class="vl">${routes.length}</div></div><div class="it"><div class="lb">اجمالي الطلاب</div><div class="vl hi">${totalStudents}</div></div></div>
</div>
${tables}
${classBreakdown}
<div class="ft"><span>تم الطباعة: ${new Date().toLocaleString("ar-IQ")}</span><span>كشف السائق ${dName}</span></div>
</div>`;
  };

  const printDoc = (body: string, title: string) => {
    const css = `@page{size:landscape}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1a1a1a;padding:20px}.page{page-break-after:always}.page:last-child{page-break-after:avoid}.hdr{text-align:center;border-bottom:3px double #333;padding-bottom:10px;margin-bottom:14px}.hdr h1{font-size:20px;font-weight:700;margin-bottom:3px}.hdr .dt{font-size:12px;color:#666}.dinfo{border:1px solid #ddd;border-radius:8px;padding:10px 12px;margin-bottom:14px;background:#fafafa}.dinfo .row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:4px}.dinfo .row:last-child{margin-bottom:0}.dinfo .it{flex:1;min-width:100px}.dinfo .lb{font-size:10px;color:#888;margin-bottom:1px}.dinfo .vl{font-size:13px;font-weight:600}.dinfo .hi{color:#1d4ed8;font-size:15px}.rsec{margin-bottom:12px}.rh{display:flex;justify-content:space-between;align-items:center;border-right:4px solid #1d4ed8;padding:5px 12px;margin-bottom:5px;background:#eff3ff;border-radius:0 6px 6px 0}.rh .rn{font-size:13px;font-weight:700}.rh .rc{font-size:11px;color:#555;background:#fff;padding:2px 8px;border-radius:10px;border:1px solid #e0e0e0}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #ddd;padding:3px 5px;text-align:right}th{background:#f3f4f6;font-weight:600;font-size:9px;color:#444}.c{text-align:center}.nm{font-weight:500}tr:nth-child(even) td{background:#fafafa}.st{font-size:8px;font-weight:600;padding:1px 5px;border-radius:8px;white-space:nowrap}.st-paid{background:#dcfce7;color:#166534}.st-due{background:#fef9c3;color:#854d0e}.st-overdue{background:#fee2e2;color:#991b1b}.summary{margin-top:10px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.sl{font-weight:600;color:#475569;margin-inline-end:4px}.cb{background:#fff;border:1px solid #e2e8f0;border-radius:4px;padding:2px 8px}.ft{display:flex;justify-content:space-between;margin-top:14px;padding-top:8px;border-top:1px solid #ccc;font-size:10px;color:#888}.empty{text-align:center;padding:24px;color:#999;font-size:13px}@media print{body{padding:8px}.dinfo{background:none!important;border-color:#aaa}.rh{background:none!important;border-right-color:#333}th{background:#eee!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.st-paid,.st-due,.st-overdue{-webkit-print-color-adjust:exact;print-color-adjust:exact}.summary{background:none!important;border-color:#ccc}}`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const handlePrint = async (d: DriverRow) => {
    setPrintLoading(d.id);
    const { members, routes } = await fetchPrintData(d.id);
    setPrintLoading(null);
    printDoc(buildDriverSection(d, members, routes), `كشف طلاب السائق - ${d.full_name}`);
  };

  const handlePrintAll = async () => {
    setPrintAllLoading(true);
    const results = await Promise.all(
      drivers.map(async (d) => ({ driver: d, ...(await fetchPrintData(d.id)) })),
    );
    setPrintAllLoading(false);
    const body = results.map((r) => buildDriverSection(r.driver, r.members, r.routes)).join("");
    printDoc(body, "كشف طلاب جميع السواق");
  };

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetchJsonWithAuthorizedSession(`/api/web/transport/drivers/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    onRefresh();
  }, [deleteTarget, onRefresh]);

  if (selectedDriver) {
    return (
      <DriverDetail
        driver={selectedDriver}
        onBack={() => setSelectedDriver(null)}
        onRefresh={onRefresh}
      />
    );
  }

  const openAdd = () => { setEditDriver(null); setFormOpen(true); };
  const openEdit = (d: DriverRow) => { setEditDriver(d); setFormOpen(true); };

  const handleAccount = async (d: DriverRow, action: "create" | "reset") => {
    setAccountLoading(d.id);
    const url = `/api/web/transport/drivers/${d.id}/account`;
    const method = action === "create" ? "POST" : "PATCH";
    const { payload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; credentials?: Credentials; error?: { message?: string } }>(url, { method, body: "{}" });
    setAccountLoading(null);
    if (payload?.credentials) {
      setCredentials(payload.credentials);
      setCredOpen(true);
      if (action === "create") onRefresh();
    }
  };

  const toggleStatus = async (d: DriverRow) => {
    const next = d.status === "active" ? "suspended" : "active";
    setStatusLoading(d.id);
    await fetchJsonWithAuthorizedSession(`/api/web/transport/drivers/${d.id}`, {
      method: "PATCH", body: JSON.stringify({ status: next }),
    });
    setStatusLoading(null);
    onRefresh();
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[var(--border)] flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold">قائمة السواق</CardTitle>
          <div className="flex items-center gap-2">
            <button onClick={handlePrintAll} disabled={printAllLoading || drivers.length === 0} className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50">
              {printAllLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} طباعة الكل
            </button>
            <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl bg-[var(--success)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-colors">
              <Plus className="h-3.5 w-3.5" /> اضافة سائق
            </button>
          </div>
        </CardHeader>
        {drivers.length === 0 ? (
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-14">
              <p className="text-sm text-[var(--text-muted)]">لا يوجد سواق بعد</p>
              <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-[var(--success)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-colors">
                <UserRoundPlus className="h-4 w-4" /> اضف اول سائق
              </button>
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                  {["الاسم", "الهاتف", "رقم الرخصة", "لوحة المركبة"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-start text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                  ))}
                  {["الحالة", "الحساب", "اجراءات"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-center text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-soft)] transition-colors">
                    <td className="px-4 py-2.5">
                          <button onClick={() => setSelectedDriver(d)} className="font-medium text-[var(--primary)] hover:underline">
                            {d.full_name}
                          </button>
                        </td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                      {d.phone ? <span className="flex items-center gap-1 text-[var(--success)]"><Phone className="h-3 w-3" /> {d.phone}</span> : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">{d.license_number || "—"}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">{d.vehicle_plate || "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => toggleStatus(d)} disabled={statusLoading === d.id} className="inline-block">
                        {statusLoading === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto text-[var(--text-muted)]" /> : <StatusBadge status={d.status} />}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {d.user_profile_id ? (
                        <button
                          onClick={() => handleAccount(d, "reset")}
                          disabled={accountLoading === d.id}
                          className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--success)] hover:opacity-80"
                          title="اعادة تعيين كلمة المرور"
                        >
                          {accountLoading === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RefreshCw className="h-3 w-3" /> مفعل</>}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAccount(d, "create")}
                          disabled={accountLoading === d.id}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] hover:text-[var(--primary)]"
                          title="انشاء حساب دخول"
                        >
                          {accountLoading === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><KeyRound className="h-3 w-3" /> انشاء حساب</>}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setSelectedDriver(d)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)] hover:text-[var(--success)] transition-colors" title="تفاصيل">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handlePrint(d)} disabled={printLoading === d.id} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--info,#3b82f6)_10%,transparent)] hover:text-[var(--info,#3b82f6)] transition-colors" title="طباعة كشف الطلاب">
                          {printLoading === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => openEdit(d)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-[var(--primary)] transition-colors" title="تعديل">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(d)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] hover:text-[var(--danger)] transition-colors" title="حذف">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {formOpen && (
        <DriverFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditDriver(null); }}
          driver={editDriver}
          onSaved={onRefresh}
          onAccountCreated={(creds) => { setCredentials(creds); setCredOpen(true); }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف السائق"
        message={`هل تريد حذف السائق "${deleteTarget?.full_name}"؟ سيتم ايقاف حسابه وازالته من جميع الخطوط.`}
        loading={deleting}
      />

      <CredentialsDialog open={credOpen} onClose={() => setCredOpen(false)} credentials={credentials} />
    </>
  );
}
