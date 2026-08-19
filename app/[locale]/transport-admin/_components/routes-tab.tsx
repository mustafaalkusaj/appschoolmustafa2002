"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { formatNumber } from "@/lib/formatting";
import { cn } from "@/lib/brand/brand-utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import {
  Plus, Pencil, Trash2, Users, Loader2, Search, X, GitBranch,
  CheckCircle2, AlertTriangle,
} from "@/lib/icons";
import { ConfirmDialog } from "./dialogs";
import type { DriverRow, RouteRow, RouteMember, StudentCandidate } from "./types";

type RouteForm = { name: string; monthly_fee: string; driver_id: string };
const EMPTY_FORM: RouteForm = { name: "", monthly_fee: "0", driver_id: "" };

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", active ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]" : "bg-[var(--surface-soft)] text-[var(--text-muted)]")}>
      {active ? "نشط" : "متوقف"}
    </span>
  );
}

function SubBadge({ status }: { status: string | null }) {
  const s = status || "due";
  const colors: Record<string, string> = {
    paid: "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
    due: "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]",
    overdue: "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
  };
  const labels: Record<string, string> = { paid: "مدفوع", due: "مستحق", overdue: "متأخر" };
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", colors[s] || colors.due)}>{labels[s] || s}</span>;
}

function RouteFormDialog({
  open, onClose, route, drivers, onSaved,
}: {
  open: boolean; onClose: () => void; route: RouteRow | null; drivers: DriverRow[]; onSaved: () => void;
}) {
  const isEdit = Boolean(route);
  const [form, setForm] = useState<RouteForm>(
    route ? { name: route.name, monthly_fee: String(route.monthly_fee), driver_id: route.driver_id || "" } : { ...EMPTY_FORM },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("اسم الخط مطلوب"); return; }
    setSaving(true); setError(null);
    const url = isEdit ? `/api/web/transport/routes/${route!.id}` : "/api/web/transport/routes";
    const body = { name: form.name, monthly_fee: Number(form.monthly_fee) || 0, driver_id: form.driver_id || null };
    const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; error?: { message?: string } }>(url, { method: isEdit ? "PATCH" : "POST", body: JSON.stringify(body) });
    setSaving(false);
    if (!response.ok || !payload?.ok) { setError(payload?.error?.message || "فشل الحفظ"); return; }
    onSaved(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader title={isEdit ? "تعديل خط" : "اضافة خط"} />
      <ModalBody>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">اسم الخط <span className="text-[var(--danger)]">*</span></label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--success)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">الرسوم الشهرية (IQD)</label>
            <input type="number" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })} min="0" dir="ltr" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--success)]/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">السائق</label>
            <select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--success)]/30">
              <option value="">بدون سائق</option>
              {drivers.filter((d) => d.status === "active").map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} disabled={saving} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors">الغاء</button>
        <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 rounded-xl bg-[var(--success)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-colors">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "حفظ" : "اضافة"}
        </button>
      </ModalFooter>
    </Modal>
  );
}

function StudentManagerDialog({
  open, onClose, route, onRefresh,
}: {
  open: boolean; onClose: () => void; route: RouteRow; onRefresh: () => void;
}) {
  const [members, setMembers] = useState<RouteMember[]>([]);
  const [allStudents, setAllStudents] = useState<StudentCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { payload } = await fetchJsonWithAuthorizedSession<{ members?: RouteMember[]; students?: StudentCandidate[] }>(
      `/api/web/transport/routes/${route.id}/students`,
    );
    setMembers(payload?.members ?? []);
    setAllStudents(payload?.students ?? []);
    setLoading(false);
  }, [route.id]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const enrolledIds = new Set(members.map((m) => m.student_id));
  const candidates = allStudents
    .filter((s) => !enrolledIds.has(s.id))
    .filter((s) => !search || s.full_name.includes(search) || (s.class_name || "").includes(search));

  const addStudent = async (studentId: string) => {
    setActionLoading(studentId);
    await fetchJsonWithAuthorizedSession(`/api/web/transport/routes/${route.id}/students`, {
      method: "POST", body: JSON.stringify({ student_id: studentId }),
    });
    setActionLoading(null);
    load();
  };

  const removeStudent = async (membershipId: string) => {
    setActionLoading(membershipId);
    await fetchJsonWithAuthorizedSession(`/api/web/transport/routes/${route.id}/students?membershipId=${membershipId}`, { method: "DELETE" });
    setActionLoading(null);
    load();
  };

  const toggleSub = async (membershipId: string, current: string | null) => {
    const next = current === "paid" ? "due" : "paid";
    setActionLoading(membershipId);
    await fetchJsonWithAuthorizedSession(`/api/web/transport/routes/${route.id}/students`, {
      method: "PATCH", body: JSON.stringify({ membership_id: membershipId, subscription_status: next }),
    });
    setActionLoading(null);
    load();
  };

  return (
    <Modal open={open} onClose={() => { onClose(); onRefresh(); }} size="xl">
      <ModalHeader title={`طلاب الخط: ${route.name}`} description={`${members.length} طالب مسجل`} />
      <ModalBody>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[var(--success)]" /></div>
        ) : (
          <div className="space-y-4">
            {members.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-muted)] mb-2">الطلاب المسجلين</h4>
                <div className="space-y-1.5">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-2.5 hover:bg-[var(--surface-soft)] transition-colors">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success)] text-[10px] font-bold text-white">{m.stop_order}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{m.students?.full_name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{m.students?.class_name || "—"}</p>
                      </div>
                      <button onClick={() => toggleSub(m.id, m.subscription_status)} disabled={actionLoading === m.id}>
                        {actionLoading === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SubBadge status={m.subscription_status} />}
                      </button>
                      <button onClick={() => removeStudent(m.id)} disabled={actionLoading === m.id} className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] transition-colors" title="ازالة">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold text-[var(--text-muted)] mb-2">اضافة طالب</h4>
              <div className="relative mb-2">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث بالاسم او الصف..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] ps-9 pe-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--success)]/30"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {candidates.slice(0, 50).map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] p-2 hover:bg-[var(--surface-soft)] transition-colors">
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">{s.full_name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{s.class_name || "—"}</p>
                    </div>
                    <button onClick={() => addStudent(s.id)} disabled={actionLoading === s.id} className="flex items-center gap-1 rounded-lg bg-[var(--success)] px-2.5 py-1 text-[10px] font-bold text-white hover:opacity-90 disabled:opacity-50 transition-colors">
                      {actionLoading === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3" /> اضافة</>}
                    </button>
                  </div>
                ))}
                {candidates.length === 0 && <p className="py-4 text-center text-xs text-[var(--text-muted)]">{search ? "لا نتائج" : "جميع الطلاب مسجلين"}</p>}
                {candidates.length > 50 && <p className="text-center text-[10px] text-[var(--text-muted)]">اكتب للبحث عن المزيد...</p>}
              </div>
            </div>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}

export function RoutesTab({ routes, drivers, onRefresh }: { routes: RouteRow[]; drivers: DriverRow[]; onRefresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<RouteRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RouteRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [studentRoute, setStudentRoute] = useState<RouteRow | null>(null);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  const openAdd = () => { setEditRoute(null); setFormOpen(true); };
  const openEdit = (r: RouteRow) => { setEditRoute(r); setFormOpen(true); };

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetchJsonWithAuthorizedSession(`/api/web/transport/routes/${deleteTarget.id}`, { method: "DELETE" });
    setDeleting(false); setDeleteTarget(null); onRefresh();
  }, [deleteTarget, onRefresh]);

  const toggleActive = async (r: RouteRow) => {
    setToggleLoading(r.id);
    await fetchJsonWithAuthorizedSession(`/api/web/transport/routes/${r.id}`, {
      method: "PATCH", body: JSON.stringify({ is_active: !r.is_active }),
    });
    setToggleLoading(null); onRefresh();
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[var(--border)] flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold">خطوط النقل</CardTitle>
          <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl bg-[var(--success)] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition-colors">
            <Plus className="h-3.5 w-3.5" /> اضافة خط
          </button>
        </CardHeader>
        {routes.length === 0 ? (
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-14">
              <p className="text-sm text-[var(--text-muted)]">لا يوجد خطوط بعد</p>
              <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-[var(--success)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-colors">
                <GitBranch className="h-4 w-4" /> اضف اول خط
              </button>
            </div>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                  {["اسم الخط", "السائق"].map((h) => <th key={h} className="px-4 py-2.5 text-start text-xs font-semibold text-[var(--text-muted)]">{h}</th>)}
                  {["عدد الطلاب", "الرسوم", "الحالة", "اجراءات"].map((h) => <th key={h} className="px-4 py-2.5 text-center text-xs font-semibold text-[var(--text-muted)]">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {routes.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-soft)] transition-colors">
                    <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{r.name}</td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.drivers?.full_name || "غير معين"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => setStudentRoute(r)} className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--primary)] hover:opacity-80 transition-colors" title="ادارة الطلاب">
                        <Users className="h-3 w-3" /> {r.student_count || 0}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-[var(--text-primary)]">{formatNumber(r.monthly_fee)} IQD</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => toggleActive(r)} disabled={toggleLoading === r.id}>
                        {toggleLoading === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto text-[var(--text-muted)]" /> : <StatusBadge active={r.is_active} />}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setStudentRoute(r)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--success)_10%,transparent)] hover:text-[var(--success)] transition-colors" title="ادارة الطلاب">
                          <Users className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-[var(--primary)] transition-colors" title="تعديل">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(r)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] hover:text-[var(--danger)] transition-colors" title="حذف">
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
        <RouteFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditRoute(null); }}
          route={editRoute}
          drivers={drivers}
          onSaved={onRefresh}
        />
      )}

      {studentRoute && (
        <StudentManagerDialog
          open={Boolean(studentRoute)}
          onClose={() => setStudentRoute(null)}
          route={studentRoute}
          onRefresh={onRefresh}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="حذف الخط"
        message={`هل تريد حذف الخط "${deleteTarget?.name}"؟`}
        loading={deleting}
      />
    </>
  );
}
