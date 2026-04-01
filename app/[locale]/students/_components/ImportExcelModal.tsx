"use client";

import { AppIcon } from "@/components/AppIcon";

interface ImportExcelModalProps {
  show: boolean;
  isReadOnlyView: boolean;
  canManageStudentAccounts: boolean;
  importPreview: Record<string, unknown>[];
  importError: string;
  importing: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onDownloadTemplate: () => void;
  onClose: () => void;
}

export function ImportExcelModal({
  show,
  isReadOnlyView,
  canManageStudentAccounts,
  importPreview,
  importError,
  importing,
  fileRef,
  onFileChange,
  onImport,
  onDownloadTemplate,
  onClose,
}: ImportExcelModalProps) {
  if (isReadOnlyView || !canManageStudentAccounts || !show) return null;

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal modal-lg">
        <div className="mh">
          <div className="mt">استيراد طلاب من إكسل</div>
          <button className="mc" onClick={onClose}>
            <AppIcon token="✕" size={13} />
          </button>
        </div>
        <div className="cols-info">
          <div className="cols-title">أعمدة الملف:</div>
          <div className="cols-grid">
            <div className="col-item">
              <span style={{ color: "#EF4444" }}>*</span> اسم الطالب (إلزامي)
            </div>
            <div className="col-item">
              <span style={{ color: "#EF4444" }}>*</span> الصف (إلزامي)
            </div>
            <div className="col-item">
              <span style={{ color: "var(--gray)" }}>○</span> العنوان
            </div>
            <div className="col-item">
              <span style={{ color: "var(--gray)" }}>○</span> الهاتف
            </div>
            <div className="col-item">
              <span style={{ color: "var(--gray)" }}>○</span> هاتف ولي الأمر
            </div>
            <div className="col-item">
              <span style={{ color: "var(--gray)" }}>○</span> إجمالي الرسوم
            </div>
            <div className="col-item">
              <span style={{ color: "var(--gray)" }}>○</span> المدفوع
            </div>
          </div>
        </div>
        <button className="template-btn" onClick={onDownloadTemplate}>
          <AppIcon token="⬇️" size={15} />
          تحميل نموذج إكسل جاهز
        </button>
        <div className="upload-area" onClick={() => fileRef.current?.click()}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 12 15 15" />
          </svg>
          <div style={{ fontWeight: 700, marginBottom: ".2rem" }}>اضغط لرفع ملف إكسل</div>
          <div style={{ fontSize: ".75rem", color: "var(--gray)" }}>xlsx فقط</div>
          <input ref={fileRef} type="file" accept=".xlsx" style={{ display: "none" }} onChange={onFileChange} />
        </div>
        {importError && <div className="err">{importError}</div>}
        {importPreview.length > 0 && (
          <>
            <div style={{ fontSize: ".8rem", fontWeight: 700, marginBottom: ".5rem" }}>
              معاينة أول {importPreview.length} صفوف:
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="preview-table">
                <thead>
                  <tr>
                    {Object.keys(importPreview[0]).map((k, i) => (
                      <th key={i}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((v: any, j) => (
                        <td key={j}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="fa">
          <button className="bs" disabled={importing || importPreview.length === 0} onClick={onImport}>
            {importing ? "جارٍ الاستيراد..." : "استيراد الطلاب"}
          </button>
          <button className="bc" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
