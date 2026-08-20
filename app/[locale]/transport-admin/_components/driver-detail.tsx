"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { cn } from "@/lib/brand/brand-utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Upload, Trash2, Phone, CalendarDays, User,
  Users, Loader2, Image, FileText, Search, GraduationCap, X,
  MapPin, Activity, AlertTriangle, Bus,
} from "@/lib/icons";
import type { DriverRow, DriverDocument, DriverStudentMember } from "./types";

const DOC_LABELS = [
  "هوية الاحوال", "رخصة القيادة", "اجازة السوق", "المركبة",
  "تأمين المركبة", "فحص المركبة", "شهادة حسن السلوك", "اخرى",
];

type Props = {
  driver: DriverRow;
  onBack: () => void;
  onRefresh: () => void;
};

export function DriverDetail({ driver, onBack, onRefresh }: Props) {
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [students, setStudents] = useState<DriverStudentMember[]>([]);
  const [routes, setRoutes] = useState<{ id: string; name: string }[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [uploading, setUploading] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number>(0);

  const fetchDocs = useCallback(async () => {
    setLoadingDocs(true);
    const { payload } = await fetchJsonWithAuthorizedSession<{
      ok?: boolean; documents?: DriverDocument[];
    }>(`/api/web/transport/drivers/${driver.id}/documents`);
    setDocuments(payload?.documents ?? []);
    setLoadingDocs(false);
  }, [driver.id]);

  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    const { payload } = await fetchJsonWithAuthorizedSession<{
      ok?: boolean; students?: DriverStudentMember[]; routes?: { id: string; name: string }[];
    }>(`/api/web/transport/drivers/${driver.id}/students`);
    setStudents(payload?.students ?? []);
    setRoutes(payload?.routes ?? []);
    setLoadingStudents(false);
  }, [driver.id]);

  useEffect(() => { fetchDocs(); fetchStudents(); }, [fetchDocs, fetchStudents]);

  const handleUpload = async (file: File, slot: number) => {
    setUploading(slot);
    const form = new FormData();
    form.append("file", file);
    form.append("slot_number", String(slot));
    form.append("label", DOC_LABELS[slot - 1] ?? "");
    await fetch(`/api/web/transport/drivers/${driver.id}/documents`, {
      method: "POST",
      body: form,
    });
    setUploading(null);
    fetchDocs();
  };

  const handleDelete = async (slot: number) => {
    setDeleting(slot);
    await fetchJsonWithAuthorizedSession(
      `/api/web/transport/drivers/${driver.id}/documents?slot=${slot}`,
      { method: "DELETE" },
    );
    setDeleting(null);
    fetchDocs();
  };

  const triggerUpload = (slot: number) => {
    pendingSlotRef.current = slot;
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, pendingSlotRef.current);
    e.target.value = "";
  };

  const docBySlot = new Map(documents.map((d) => [d.slot_number, d]));

  const filteredStudents = search.trim()
    ? students.filter((m) => {
        const s = m.students;
        if (!s) return false;
        const q = search.trim().toLowerCase();
        return s.full_name.toLowerCase().includes(q)
          || (s.class_name?.toLowerCase().includes(q))
          || (s.guardian_name?.toLowerCase().includes(q));
      })
    : students;

  const routeMap = new Map(routes.map((r) => [r.id, r.name]));

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> رجوع
        </button>
        <h2 className="text-base font-bold text-[var(--text-primary)]">{driver.full_name}</h2>
        <StatusBadge status={driver.status} />
      </div>

      <Card>
        <CardHeader className="border-b border-[var(--border)]">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <User className="h-4 w-4 text-[var(--success)]" /> المعلومات الشخصية
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="الاسم الكامل" value={driver.full_name} />
            <InfoField label="رقم الهاتف" value={driver.phone} dir="ltr" icon={<Phone className="h-3.5 w-3.5 text-[var(--success)]" />} />
            <InfoField label="رقم الهوية" value={driver.national_id} dir="ltr" />
            <InfoField label="تاريخ الميلاد" value={driver.date_of_birth} icon={<CalendarDays className="h-3.5 w-3.5 text-[var(--primary)]" />} />
            <InfoField label="فصيلة الدم" value={driver.blood_type} icon={<Activity className="h-3.5 w-3.5 text-[var(--danger)]" />} />
            <InfoField label="العنوان" value={driver.address} icon={<MapPin className="h-3.5 w-3.5 text-[var(--primary)]" />} />
            <InfoField label="الحالة" value={driver.status === "active" ? "نشط" : driver.status === "suspended" ? "موقف" : driver.status === "on_leave" ? "اجازة" : "متوقف"} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-[var(--border)]">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--danger)]" /> الطوارئ
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoField label="اسم جهة الطوارئ" value={driver.emergency_contact_name} />
            <InfoField label="هاتف الطوارئ" value={driver.emergency_contact_phone} dir="ltr" icon={<Phone className="h-3.5 w-3.5 text-[var(--danger)]" />} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-[var(--border)]">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--warning)]" /> الرخصة
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="رقم الرخصة" value={driver.license_number} dir="ltr" />
            <InfoField label="نوع الرخصة" value={driver.license_type} />
            <InfoField label="انتهاء الرخصة" value={driver.license_expiry} icon={<CalendarDays className="h-3.5 w-3.5 text-[var(--warning)]" />} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-[var(--border)]">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Bus className="h-4 w-4 text-[var(--primary)]" /> المركبة
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="لوحة المركبة" value={driver.vehicle_plate} dir="ltr" />
            <InfoField label="نوع المركبة" value={driver.vehicle_model} />
            <InfoField label="لون المركبة" value={driver.vehicle_color} />
            <InfoField label="سنة الصنع" value={driver.vehicle_year} dir="ltr" />
            <InfoField label="انتهاء التأمين" value={driver.insurance_expiry} icon={<CalendarDays className="h-3.5 w-3.5 text-[var(--warning)]" />} />
            <InfoField label="انتهاء الفحص" value={driver.inspection_expiry} icon={<CalendarDays className="h-3.5 w-3.5 text-[var(--warning)]" />} />
          </div>
        </CardContent>
      </Card>

      {driver.notes && (
        <Card>
          <CardContent className="pt-4">
            <InfoField label="ملاحظات" value={driver.notes} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b border-[var(--border)]">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--primary)]" /> المستمسكات ({documents.length}/8)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loadingDocs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 8 }, (_, i) => i + 1).map((slot) => {
                const doc = docBySlot.get(slot);
                const isUploading = uploading === slot;
                const isDeleting = deleting === slot;
                return (
                  <div
                    key={slot}
                    className="group relative aspect-[3/4] rounded-xl border-2 border-dashed border-[var(--border)] overflow-hidden bg-[var(--surface-soft)] transition-colors hover:border-[var(--success)]"
                  >
                    {doc ? (
                      <>
                        <img
                          src={doc.photo_url}
                          alt={doc.label || DOC_LABELS[slot - 1]}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-[10px] font-medium text-white truncate">
                            {doc.label || DOC_LABELS[slot - 1]}
                          </p>
                        </div>
                        <div className="absolute top-1 end-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => triggerUpload(slot)}
                            disabled={isUploading}
                            className="rounded-lg bg-black/50 p-1 text-white hover:bg-black/70"
                            title="استبدال"
                          >
                            <Upload className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(slot)}
                            disabled={isDeleting}
                            className="rounded-lg bg-black/50 p-1 text-white hover:bg-red-500/80"
                            title="حذف"
                          >
                            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => triggerUpload(slot)}
                        disabled={isUploading}
                        className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:text-[var(--success)] transition-colors"
                      >
                        {isUploading ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <>
                            <Image className="h-6 w-6" />
                            <span className="text-[10px] font-medium text-center px-1">
                              {DOC_LABELS[slot - 1]}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-[var(--border)] flex-row items-center justify-between gap-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-[var(--success)]" /> طلاب السائق ({students.length})
          </CardTitle>
          {students.length > 0 && (
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث..."
                className="w-40 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] py-1.5 pe-3 ps-8 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--success)]/30"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute end-2 top-1/2 -translate-y-1/2">
                  <X className="h-3 w-3 text-[var(--text-muted)]" />
                </button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loadingStudents ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-[var(--text-muted)]">
              <Users className="h-8 w-8" />
              <p className="text-sm">{students.length === 0 ? "لا يوجد طلاب مسجلين لهذا السائق" : "لا توجد نتائج"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                    {["الطالب", "الصف", "الشعبة", "ولي الامر", "هاتف ولي الامر", "الخط"].map((h) => (
                      <th key={h} className="px-3 py-2 text-start text-xs font-semibold text-[var(--text-muted)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((m) => {
                    const s = m.students;
                    if (!s) return null;
                    return (
                      <tr key={m.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface-soft)] transition-colors">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {s.photo_url ? (
                              <img src={s.photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
                                <User className="h-3.5 w-3.5" />
                              </div>
                            )}
                            <span className="font-medium text-[var(--text-primary)]">{s.full_name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{s.class_name || "—"}</td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{s.section || "—"}</td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{s.guardian_name || "—"}</td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">
                          {s.guardian_phone ? (
                            <span className="flex items-center gap-1 text-[var(--success)]">
                              <Phone className="h-3 w-3" /> {s.guardian_phone}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--primary)]">
                            {routeMap.get(m.route_id) || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", active ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]" : "bg-[var(--surface-soft)] text-[var(--text-muted)]")}>
      {status === "active" ? "نشط" : status === "suspended" ? "موقف" : status === "on_leave" ? "اجازة" : "متوقف"}
    </span>
  );
}

function InfoField({ label, value, dir, icon, className }: {
  label: string;
  value: string | null;
  dir?: "ltr";
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl bg-[var(--surface-soft)] p-3", className)}>
      <p className="text-[10px] font-medium text-[var(--text-muted)] mb-1">{label}</p>
      <p className={cn("text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5", !value && "text-[var(--text-muted)]")} dir={dir}>
        {icon}
        {value || "—"}
      </p>
    </div>
  );
}
