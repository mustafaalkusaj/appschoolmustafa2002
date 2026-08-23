"use client";

import { useCallback, useState } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { cn } from "@/lib/brand/brand-utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import {
  Plus, Pencil, Trash2, KeyRound, Phone, CheckCircle2, Loader2, UserRoundPlus, RefreshCw, Eye,
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
          <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl bg-[var(--success)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-colors">
            <Plus className="h-3.5 w-3.5" /> اضافة سائق
          </button>
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
