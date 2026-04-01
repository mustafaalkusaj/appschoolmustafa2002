"use client";

import { useState, useCallback } from "react";
import { AppIcon } from "@/components/AppIcon";
import { ClassItem, SectionItem, ClassForm, SectionForm } from "./types";

interface ClassesModalProps {
  show: boolean;
  classes: ClassItem[];
  sections: SectionItem[];
  onClose: () => void;
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
}

export function ClassesModal({
  show,
  classes,
  sections,
  onClose,
  onSaveClass,
  onDeleteClass,
  onSaveSection,
  onDeleteSection,
}: ClassesModalProps) {
  const [showSectionsTable, setShowSectionsTable] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);
  const [classForm, setClassForm] = useState<ClassForm>({ name: "", sections: [""] });
  const [sectionForm, setSectionForm] = useState<SectionForm>({ class_id: "", name: "" });

  const resetClassForm = useCallback(() => {
    setEditingClass(null);
    setClassForm({ name: "", sections: [""] });
    setShowClassForm(false);
  }, []);

  const resetSectionForm = useCallback(() => {
    setEditingSection(null);
    setSectionForm({ class_id: "", name: "" });
    setShowSectionForm(false);
  }, []);

  const handleSaveClass = useCallback(async () => {
    await onSaveClass(classForm, editingClass, resetClassForm);
  }, [classForm, editingClass, onSaveClass, resetClassForm]);

  const handleSaveSection = useCallback(async () => {
    await onSaveSection(sectionForm, editingSection, resetSectionForm);
  }, [sectionForm, editingSection, onSaveSection, resetSectionForm]);

  const handleEditClass = useCallback((cls: ClassItem) => {
    const clsSections = sections.filter(s => s.class_id === cls.id);
    setEditingClass(cls);
    setClassForm({ name: cls.name, sections: clsSections.map(s => s.name) });
    setShowClassForm(true);
    setShowSectionForm(false);
  }, [sections]);

  const handleEditSection = useCallback((sec: SectionItem) => {
    setEditingSection(sec);
    setSectionForm({ class_id: sec.class_id, name: sec.name });
    setShowSectionForm(true);
    setShowClassForm(false);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    resetClassForm();
    resetSectionForm();
  }, [onClose, resetClassForm, resetSectionForm]);

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-box" style={{ width: "600px" }}>
        <div className="modal-title">
          <AppIcon token="🏫" size={18} />
          إدارة الصفوف والشعب الدراسية
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", gap: ".5rem", marginBottom: ".8rem" }}>
            <button
              className="fee-btn"
              onClick={() => {
                setEditingClass(null);
                setClassForm({ name: "", sections: [""] });
                setShowClassForm(true);
                setShowSectionForm(false);
              }}
              style={{ fontSize: ".75rem", padding: ".4rem .8rem" }}
            >
              + إضافة صف جديد
            </button>
            <button
              className="fee-btn"
              onClick={() => {
                setEditingSection(null);
                setSectionForm({ class_id: "", name: "" });
                setShowSectionForm(true);
                setShowClassForm(false);
              }}
              style={{ fontSize: ".75rem", padding: ".4rem .8rem" }}
            >
              + إضافة شعبة جديدة
            </button>
            <button
              className="fee-btn-outline"
              onClick={() => setShowSectionsTable(v => !v)}
              style={{ fontSize: ".75rem" }}
            >
              {showSectionsTable ? "إخفاء الشعب" : "عرض الشعب"}
            </button>
          </div>

          {/* Class form */}
          {(showClassForm || editingClass) && (
            <div style={{ background: "#F8F6FF", borderRadius: "12px", padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--p2)", marginBottom: ".6rem" }}>
                {editingClass ? "تعديل الصف" : "إضافة صف جديد"}
              </div>
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">اسم الصف <span>*</span></label>
                  <input
                    className="form-input"
                    value={classForm.name}
                    onChange={e => setClassForm({ ...classForm, name: e.target.value })}
                    placeholder="مثال: الصف الخامس"
                  />
                </div>
                <div className="form-group full">
                  <label className="form-label">
                    الشعب <span style={{ fontWeight: 400, color: "var(--gray)", fontSize: ".7rem" }}>
                      (كل شعبة في سطر — مثال: أ، ب، ج)
                    </span>
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={classForm.sections.join('\n')}
                    onChange={e => setClassForm({ ...classForm, sections: e.target.value.split('\n') })}
                    placeholder={"أ\nب\nج"}
                    style={{ resize: "none" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end", marginTop: ".8rem" }}>
                <button className="btn-cancel" onClick={resetClassForm}>إلغاء</button>
                <button className="btn-save" onClick={() => void handleSaveClass()}>
                  {editingClass ? "حفظ التعديلات" : "إضافة صف"}
                </button>
              </div>
            </div>
          )}

          {/* Section form */}
          {(showSectionForm || editingSection) && (
            <div style={{ background: "#F0FDF4", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", border: "1px solid #BBF7D0" }}>
              <div style={{ fontSize: ".85rem", fontWeight: 700, color: "#166534", marginBottom: ".6rem" }}>
                {editingSection ? "تعديل الشعبة" : "إضافة شعبة جديدة"}
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">الصف <span>*</span></label>
                  <select
                    className="form-select"
                    value={sectionForm.class_id}
                    onChange={e => setSectionForm({ ...sectionForm, class_id: e.target.value })}
                  >
                    <option value="">اختر الصف</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">اسم الشعبة <span>*</span></label>
                  <input
                    className="form-input"
                    value={sectionForm.name}
                    onChange={e => setSectionForm({ ...sectionForm, name: e.target.value })}
                    placeholder="مثال: أ"
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end", marginTop: ".8rem" }}>
                <button className="btn-cancel" onClick={resetSectionForm}>إلغاء</button>
                <button className="btn-save" onClick={() => void handleSaveSection()}>
                  {editingSection ? "حفظ التعديلات" : "إضافة شعبة"}
                </button>
              </div>
            </div>
          )}

          {/* Classes table */}
          <div style={{ background: "white", borderRadius: "12px", padding: "1rem", border: "1px solid rgba(108,74,182,0.1)" }}>
            <div style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--p2)", marginBottom: ".6rem" }}>الصفوف الدراسية</div>
            {classes.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--gray)", padding: "2rem", fontSize: ".8rem" }}>لا توجد صفوف مضافة</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".78rem" }}>
                <thead>
                  <tr style={{ background: "#EDE8FA", color: "var(--p2)" }}>
                    <th style={{ padding: ".5rem", textAlign: "right", fontWeight: 800 }}>الصف</th>
                    <th style={{ padding: ".5rem", textAlign: "right", fontWeight: 800 }}>عدد الشعب</th>
                    <th style={{ padding: ".5rem", textAlign: "center", fontWeight: 800 }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map(cls => {
                    const clsSections = sections.filter(s => s.class_id === cls.id);
                    return (
                      <tr key={cls.id} style={{ borderBottom: "1px solid rgba(108,74,182,0.05)" }}>
                        <td style={{ padding: ".5rem", fontWeight: 600 }}>{cls.name}</td>
                        <td style={{ padding: ".5rem" }}>{clsSections.length} شعبة</td>
                        <td style={{ padding: ".5rem", textAlign: "center" }}>
                          <button className="action-btn edit-btn" onClick={() => handleEditClass(cls)}>تعديل</button>
                          <button className="action-btn del-btn" onClick={() => void onDeleteClass(cls.id)} style={{ marginLeft: ".3rem" }}>حذف</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Sections table */}
          {showSectionsTable && (
            <div style={{ background: "white", borderRadius: "12px", padding: "1rem", marginTop: "1rem", border: "1px solid rgba(108,74,182,0.1)" }}>
              <div style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--p2)", marginBottom: ".6rem" }}>الشعب الدراسية</div>
              {sections.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--gray)", padding: "2rem", fontSize: ".8rem" }}>لا توجد شعب مضافة</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".78rem" }}>
                  <thead>
                    <tr style={{ background: "#EDE8FA", color: "var(--p2)" }}>
                      <th style={{ padding: ".5rem", textAlign: "right", fontWeight: 800 }}>الشعبة</th>
                      <th style={{ padding: ".5rem", textAlign: "right", fontWeight: 800 }}>الصف</th>
                      <th style={{ padding: ".5rem", textAlign: "center", fontWeight: 800 }}>الإجراءات</th>
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
                            <button className="action-btn del-btn" onClick={() => void onDeleteSection(sec.id)} style={{ marginLeft: ".3rem" }}>حذف</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={handleClose}>إغلاق</button>
        </div>
      </div>
    </div>
  );
}
