"use client";

import { useState, useCallback } from "react";
import { AppIcon } from "@/components/AppIcon";
import { ClassItem, SectionItem, ClassForm, SectionForm, ClassFee } from "./types";
import { ClassFeesTable } from "./ClassFeesTable";
import { SectionFormModal } from "../../classes/_components/SectionFormModal";
import { ClassFormModal } from "../../classes/_components/ClassFormModal";

interface ClassesModalProps {
  show: boolean;
  classes: ClassItem[];
  sections: SectionItem[];
  saveError: string;
  saveSuccess: string;
  saving: boolean;
  onClose: () => void;
  onClearFeedback: () => void;
  onSaveClass: (
    classForm: ClassForm,
    editingClass: ClassItem | null,
    onSuccess: () => void
  ) => Promise<void>;
  onDeleteClass: (id: string) => Promise<void>;
  onSaveSection: (
    sectionForm: SectionForm,
    editingSection: SectionItem | null,
    onSuccess: () => void
  ) => Promise<void>;
  onDeleteSection: (id: string) => Promise<void>;
  locale?: "ar" | "en";
  // Fee table
  classFees?: ClassFee[];
  canManageClasses?: boolean;
  deleteConfirm?: string | null;
  getClassStats?: (cf: ClassFee) => { count: number; activeCount: number; transferredCount: number; totalExpected: number; totalPaid: number; totalRemaining: number; transferredPaid: number; paidPct: number };
  onOpenNewFee?: () => void;
  onEditFee?: (cf: ClassFee) => void;
  onDeleteFee?: (id: string) => void;
  onCancelDelete?: () => void;
  onConfirmDelete?: (id: string) => void;
}

export function ClassesModal({
  show,
  classes,
  sections,
  saveError,
  saveSuccess,
  saving,
  onClose,
  onClearFeedback,
  onSaveClass,
  onDeleteClass,
  onSaveSection,
  onDeleteSection,
  classFees,
  canManageClasses,
  deleteConfirm,
  getClassStats,
  onOpenNewFee,
  onEditFee,
  onDeleteFee,
  onCancelDelete,
  onConfirmDelete,
  locale = "ar",
}: ClassesModalProps) {
  const [showSectionsTable, setShowSectionsTable] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [classForm, setClassForm] = useState<ClassForm>({ name: "", sections: [] });
  const [sectionForm, setSectionForm] = useState<SectionForm>({ class_id: "", name: "" });
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);
  const [confirmDeleteSectionId, setConfirmDeleteSectionId] = useState<string | null>(null);

  const resetClassForm = useCallback(() => {
    onClearFeedback();
    setEditingClass(null);
    setClassForm({ name: "", sections: [] });
    setShowClassForm(false);
  }, [onClearFeedback]);

  const resetSectionForm = useCallback(() => {
    onClearFeedback();
    setEditingSection(null);
    setSectionForm({ class_id: classes[0]?.id ?? "", name: "" });
    setShowSectionForm(false);
  }, [classes, onClearFeedback]);

  const handleSaveClass = useCallback(async () => {
    await onSaveClass(classForm, editingClass, resetClassForm);
  }, [classForm, editingClass, onSaveClass, resetClassForm]);

  const handleSaveSection = useCallback(async () => {
    await onSaveSection(sectionForm, editingSection, resetSectionForm);
  }, [sectionForm, editingSection, onSaveSection, resetSectionForm]);

  const handleEditClass = useCallback((cls: ClassItem) => {
    const clsSections = sections.filter(s => s.class_id === cls.id);
    onClearFeedback();
    setEditingClass(cls);
    setClassForm({ name: cls.name, sections: clsSections.map(s => s.name) });
    setShowClassForm(true);
    setShowSectionForm(false);
  }, [onClearFeedback, sections]);

  const handleEditSection = useCallback((sec: SectionItem) => {
    onClearFeedback();
    setEditingSection(sec);
    setSectionForm({ class_id: sec.class_id, name: sec.name });
    setShowSectionForm(true);
    setShowClassForm(false);
  }, [onClearFeedback]);

  const handleClose = useCallback(() => {
    onClose();
    onClearFeedback();
    resetClassForm();
    resetSectionForm();
  }, [onClose, onClearFeedback, resetClassForm, resetSectionForm]);

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-box w-[min(96vw,980px)]">
        <div className="p-6 sm:p-7 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div className="space-y-1">
              <div className="modal-title">
                <AppIcon token="🏫" size={18} />
                إدارة الصفوف والشعب الدراسية
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                أضف الصفوف والشعب من مكان واحد، مع الحفاظ على تنسيق متناسق وسهل القراءة.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="fee-btn"
              onClick={() => {
                onClearFeedback();
                setEditingClass(null);
                setClassForm({ name: "", sections: [] });
                setShowClassForm(true);
                setShowSectionForm(false);
              }}
              style={{ fontSize: ".8rem", padding: ".55rem 1rem" }}
            >
              + إضافة صف جديد
            </button>
            <button
              className="fee-btn"
              onClick={() => {
                onClearFeedback();
                setEditingSection(null);
                setSectionForm({ class_id: classes[0]?.id ?? "", name: "" });
                setShowSectionForm(true);
                setShowClassForm(false);
              }}
              style={{ fontSize: ".8rem", padding: ".55rem 1rem" }}
            >
              + إضافة شعبة جديدة
            </button>
            {onOpenNewFee && (
              <button
                className="fee-btn"
                onClick={onOpenNewFee}
                style={{ fontSize: ".8rem", padding: ".55rem 1rem", background: "var(--success)" }}
              >
                + إضافة قسط دراسي
              </button>
            )}
            <button
              className="fee-btn-outline"
              onClick={() => setShowSectionsTable(v => !v)}
              style={{ fontSize: ".8rem", padding: ".55rem 1rem" }}
            >
              {showSectionsTable ? "إخفاء الشعب" : "عرض الشعب"}
            </button>
          </div>

          {classFees && getClassStats && onEditFee && onDeleteFee && onCancelDelete && onConfirmDelete && onOpenNewFee && (
            <ClassFeesTable
              classFees={classFees}
              showFeesTable={true}
              canManageClasses={canManageClasses ?? false}
              deleteConfirm={deleteConfirm ?? null}
              getClassStats={getClassStats}
              onOpenNewFee={onOpenNewFee}
              onEditFee={onEditFee}
              onDeleteFee={onDeleteFee}
              onCancelDelete={onCancelDelete}
              onConfirmDelete={onConfirmDelete}
            />
          )}

          {saveError ? (
            <div className="msg-error flex items-center gap-2">
              <AppIcon token="⚠️" size={14} /> {saveError}
            </div>
          ) : null}
          {saveSuccess ? <div className="msg-success">{saveSuccess}</div> : null}

          <ClassFormModal
            show={showClassForm || !!editingClass}
            editingClass={editingClass}
            classForm={classForm}
            setClassForm={setClassForm}
            saving={saving}
            error={saveError}
            onSave={handleSaveClass}
            onClose={resetClassForm}
            locale={locale}
          />

          <SectionFormModal
            show={showSectionForm || !!editingSection}
            editingSection={editingSection}
            sectionForm={sectionForm}
            setSectionForm={setSectionForm}
            classes={classes}
            saving={saving}
            error={saveError}
            onSave={handleSaveSection}
            onClose={resetSectionForm}
            locale={locale}
          />

          <section className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)] space-y-4">
            <div className="text-sm font-extrabold text-[var(--primary)]">الصفوف الدراسية</div>
            {classes.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem", fontSize: ".8rem" }}>لا توجد صفوف مضافة</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".78rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface-soft)", color: "var(--text-muted)" }}>
                    <th style={{ padding: ".65rem", textAlign: "right", fontWeight: 800 }}>الصف</th>
                    <th style={{ padding: ".65rem", textAlign: "right", fontWeight: 800 }}>عدد الشعب</th>
                    <th style={{ padding: ".65rem", textAlign: "center", fontWeight: 800 }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map(cls => {
                    const clsSections = sections.filter(s => s.class_id === cls.id);
                    return (
                      <tr key={cls.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: ".65rem", fontWeight: 600 }}>{cls.name}</td>
                        <td style={{ padding: ".65rem" }}>{clsSections.length} شعبة</td>
                        <td style={{ padding: ".65rem", textAlign: "center" }}>
                          <button className="action-btn edit-btn" onClick={() => handleEditClass(cls)}>تعديل</button>
                          {confirmDeleteClassId === cls.id ? (
                            <>
                              <span style={{ fontSize: ".75rem", color: "var(--danger)", marginInlineStart: ".3rem" }}>تأكيد؟</span>
                              <button className="action-btn del-btn" onClick={() => { setConfirmDeleteClassId(null); void onDeleteClass(cls.id); }} style={{ marginInlineStart: ".3rem" }}>نعم</button>
                              <button className="action-btn" onClick={() => setConfirmDeleteClassId(null)} style={{ marginInlineStart: ".2rem" }}>لا</button>
                            </>
                          ) : (
                            <button className="action-btn del-btn" onClick={() => setConfirmDeleteClassId(cls.id)} style={{ marginInlineStart: ".3rem" }}>حذف</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {showSectionsTable && (
            <section className="rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)] space-y-4">
              <div className="text-sm font-extrabold text-[var(--success)]">الشعب الدراسية</div>
              {sections.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem", fontSize: ".8rem" }}>لا توجد شعب مضافة</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".78rem" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-soft)", color: "var(--text-muted)" }}>
                      <th style={{ padding: ".65rem", textAlign: "right", fontWeight: 800 }}>الشعبة</th>
                      <th style={{ padding: ".65rem", textAlign: "right", fontWeight: 800 }}>الصف</th>
                      <th style={{ padding: ".65rem", textAlign: "center", fontWeight: 800 }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map(sec => {
                      const cls = classes.find(c => c.id === sec.class_id);
                      return (
                        <tr key={sec.id} style={{ borderBottom: "1px solid rgba(108,74,182,0.05)" }}>
                          <td style={{ padding: ".5rem", fontWeight: 600 }}>{sec.name}</td>
                          <td style={{ padding: ".5rem" }}>{cls?.name || "—"}</td>
                          <td style={{ padding: ".5rem", textAlign: "center" }}>
                            <button className="action-btn edit-btn" onClick={() => handleEditSection(sec)}>تعديل</button>
                          {confirmDeleteSectionId === sec.id ? (
                            <>
                              <span style={{ fontSize: ".75rem", color: "var(--danger)", marginInlineStart: ".3rem" }}>تأكيد؟</span>
                              <button className="action-btn del-btn" onClick={() => { setConfirmDeleteSectionId(null); void onDeleteSection(sec.id); }} style={{ marginInlineStart: ".3rem" }}>نعم</button>
                              <button className="action-btn" onClick={() => setConfirmDeleteSectionId(null)} style={{ marginInlineStart: ".2rem" }}>لا</button>
                            </>
                          ) : (
                            <button className="action-btn del-btn" onClick={() => setConfirmDeleteSectionId(sec.id)} style={{ marginInlineStart: ".3rem" }}>حذف</button>
                          )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={handleClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
