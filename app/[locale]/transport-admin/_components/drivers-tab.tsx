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
  license_number: string;
  license_expiry: string;
  vehicle_plate: string;
  vehicle_model: string;
  notes: string;
};

const EMPTY_FORM: DriverForm = {
  full_name: "", phone: "", national_id: "", license_number: "",
  license_expiry: "", vehicle_plate: "", vehicle_model: "", notes: "",
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
  open, onClose, driver, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  driver: DriverRow | null;
  onSaved: () => void;
}) {
  const isEdit = Boolean(driver);
  const [form, setForm] = useState<DriverForm>(
    driver
      ? { full_name: driver.full_name, phone: driver.phone || "", national_id: driver.national_id || "", license_number: driver.license_number || "", license_expiry: driver.license_expiry || "", vehicle_plate: driver.vehicle_plate || "", vehicle_model: driver.vehicle_model || "", notes: driver.notes || "" }
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
    const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; error?: { message?: string } }>(url, { method, body: JSON.stringify(form) });
    setSaving(false);
    if (!response.ok || !payload?.ok) { setError(payload?.error?.message || "فشل الحفظ"); return; }
    onSaved();
    onClose();
  };

  const fields: { key: keyof DriverForm; label: string; type?: string; required?: boolean }[] = [
    { key: "full_name", label: "الاسم الكامل", required: true },
    { key: "phone", label: "رقم الهاتف" },
    { key: "national_id", label: "رقم الهوية" },
    { key: "license_number", label: "رقم الرخصة" },
    { key: "license_expiry", label: "انتهاء الرخصة", type: "date" },
    { key: "vehicle_plate", label: "لوحة المركبة" },
    { key: "vehicle_model", label: "نوع المركبة" },
    { key: "notes", label: "ملاحظات" },
  ];

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={isEdit ? "تعديل سائق" : "اضافة سائق"} />
      <ModalBody>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.key === "notes" ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                {f.label} {f.required && <span className="text-[var(--danger)]">*</span>}
              </label>
              {f.key === "notes" ? (
                <textarea
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--success)]/30 resize-none"
                />
              ) : (
                <input
                  type={f.type || "text"}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--success)]/30"
                  dir={f.key === "phone" || f.key === "license_number" || f.key === "national_id" || f.key === "vehicle_plate" ? "ltr" : undefined}
                />
              )}
            </div>
          ))}
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

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetchJsonWithAuthorizedSession(`/api/web/transport/drivers/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    onRefresh();
  }, [deleteTarget, onRefresh]);

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
                    <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{d.full_name}</td>
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
