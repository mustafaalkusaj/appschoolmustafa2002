"use client";

import { formatNumber } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { Student, PayFormState } from "../_types";

interface PaymentModalProps {
  show: boolean;
  payStudent: Student | null;
  payForm: PayFormState;
  setPayForm: (form: PayFormState) => void;
  saving: boolean;
  totalPaymentCount: number;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  // Student search
  studentSearch: string;
  setStudentSearch: (value: string) => void;
  studentSearchResults: Student[];
  studentSearchLoading: boolean;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  searchRef: React.RefObject<HTMLDivElement | null>;
  onSelectStudent: (student: Student) => void;
}

export function PaymentModal({
  show,
  payStudent,
  payForm,
  setPayForm,
  saving,
  totalPaymentCount,
  onClose,
  onSubmit,
  error,
  studentSearch,
  setStudentSearch,
  studentSearchResults,
  studentSearchLoading,
  showDropdown,
  setShowDropdown,
  searchRef,
  onSelectStudent,
}: PaymentModalProps) {
  if (!show) return null;

  const nextReceiptNum = `REC-${(totalPaymentCount + 1001).toString()}`;

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="mh">
          <div className="mt">تسجيل دفعة جديدة</div>
          <button className="mc" onClick={onClose}>
            <AppIcon token="✕" size={14} />
          </button>
        </div>
        {error && <div className="err">{error}</div>}
        <form onSubmit={onSubmit}>
          <div className="fg">
            <div className="ff full">
              <label className="fl">اسم الطالب *</label>
              <div className="search-wrap" ref={searchRef}>
                <input
                  className={`search-input${payStudent ? " selected" : ""}`}
                  placeholder="ابحث باسم الطالب..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  autoComplete="off"
                />
                {payStudent && (
                  <span
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#10B981",
                      display: "inline-flex",
                    }}
                  >
                    <AppIcon token="✓" size={14} />
                  </span>
                )}
                {showDropdown && !payStudent && studentSearch && (
                  <div className="dropdown">
                    {studentSearchLoading ? (
                      <div className="dropdown-status">جارٍ البحث...</div>
                    ) : studentSearchResults.length === 0 ? (
                      <div className="dropdown-status">لا توجد نتائج</div>
                    ) : (
                      studentSearchResults.map((s) => (
                        <div
                          key={s.id}
                          className="dropdown-item"
                          onMouseDown={() => onSelectStudent(s)}
                        >
                          <div className="d-name">{s.full_name}</div>
                          <div className="d-meta">
                            <span className="d-cls">{s.class_name}</span>
                            <span className="d-rem">متبقي: د.ع {formatNumber(s.remaining_fee)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            {payStudent && (
              <div className="ff full">
                <div className="student-info-box">
                  <div className="si-row">
                    <span className="si-label">الكلي:</span>
                    <span className="si-val">د.ع {formatNumber(payStudent.total_fee)}</span>
                  </div>
                  <div className="si-row">
                    <span className="si-label">المدفوع:</span>
                    <span className="si-val" style={{ color: "#10B981" }}>
                      د.ع {formatNumber(payStudent.paid_fee)}
                    </span>
                  </div>
                  <div className="si-row">
                    <span className="si-label">المتبقي:</span>
                    <span className="si-val" style={{ color: "#EF4444" }}>
                      د.ع {formatNumber(payStudent.remaining_fee)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="ff">
              <label className="fl">تاريخ الإيصال *</label>
              <input
                className="fis"
                type="date"
                required
                value={payForm.receipt_date}
                onChange={(e) => setPayForm({ ...payForm, receipt_date: e.target.value })}
              />
            </div>
            <div className="ff">
              <label className="fl">المبلغ (د.ع) *</label>
              <input
                className="fis"
                type="number"
                required
                placeholder="500000"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              />
            </div>
            <div className="ff">
              <label className="fl">
                رقم الإيصال الورقي <span className="opt">(اختياري)</span>
              </label>
              <input
                className="fis"
                placeholder="مثال: 1042"
                value={payForm.manual_receipt_number}
                onChange={(e) => setPayForm({ ...payForm, manual_receipt_number: e.target.value })}
              />
            </div>
            <div className="ff">
              <label className="fl">رقم الإيصال الإلكتروني</label>
              <div className="receipt-auto">{nextReceiptNum}</div>
            </div>
            <div className="ff">
              <label className="fl">طريقة الدفع</label>
              <select
                className="fis"
                value={payForm.payment_method}
                onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}
              >
                <option value="cash">نقداً</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="check">شيك</option>
              </select>
            </div>
            <div className="ff">
              <label className="fl">
                ملاحظات <span className="opt">(اختياري)</span>
              </label>
              <input
                className="fis"
                placeholder="أي ملاحظات..."
                value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="fa">
            <button type="submit" className="bs" disabled={saving || !payStudent}>
              {saving ? "جارٍ الحفظ..." : "تسجيل الدفعة"}
            </button>
            <button type="button" className="bc" onClick={onClose}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
