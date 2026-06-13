import { CheckCircle2 } from "lucide-react";

export function RequiredFieldsNotice() {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      {/* Required */}
      <div className="p-3 border-b border-[var(--border)]">
        <p className="text-[11px] font-black text-[var(--danger)] mb-2 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--danger)] inline-block" />
          الحقول الإجبارية (يجب ملؤها)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[
            "الاسم الكامل (3 أحرف على الأقل)",
            "الصف (يجب أن يكون موجوداً في النظام)",
          ].map((col) => (
            <span
              key={col}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
              style={{
                background: "color-mix(in srgb, var(--danger) 10%, transparent)",
                color: "var(--danger)",
              }}
            >
              <CheckCircle2 size={11} />
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* Optional */}
      <div className="p-3 bg-[var(--surface-soft)]">
        <p className="text-[11px] font-black text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)] inline-block" />
          الحقول الاختيارية (يمكن تركها فارغة)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[
            "الشعبة",
            "رقم الهاتف",
            "تاريخ الميلاد",
            "الجنس",
            "العنوان",
            "اسم ولي الأمر",
            "رقم هاتف ولي الأمر",
            "الرسوم",
            "المدفوع",
            "ملاحظات",
          ].map((col) => (
            <span
              key={col}
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--border)] text-[var(--text-muted)]"
            >
              {col}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-[var(--primary)] mt-2 font-bold">
          * النظام يكتشف أسماء الأعمدة تلقائياً بالعربية أو الإنجليزية
        </p>
      </div>
    </div>
  );
}
