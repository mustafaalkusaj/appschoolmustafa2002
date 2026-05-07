import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, FileText, ArrowRight } from "lucide-react";

interface ImportSummaryProps {
  success: number;
  errors: number;
  onClose: () => void;
  onReset: () => void;
}

export function ImportSummary({ success, errors, onClose, onReset }: ImportSummaryProps) {
  const hasFailures = errors > 0;

  return (
    <div className="text-center py-8 px-4 space-y-6 animate-in fade-in zoom-in duration-300">
      <div className="flex justify-center">
        {!hasFailures ? (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success-soft)]">
            <CheckCircle className="h-12 w-12 text-[var(--success)]" />
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--warning-soft)]">
            <AlertCircle className="h-12 w-12 text-[var(--warning)]" />
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-2xl font-bold text-[var(--text-primary)]">
          {!hasFailures ? "اكتملت عملية الاستيراد بنجاح" : "اكتمل الاستيراد مع بعض الملاحظات"}
        </h3>
        <p className="text-[var(--text-secondary)]">
          {!hasFailures ? "تمت معالجة جميع البيانات الموجودة في الملف." : "تم استيراد البيانات الصالحة مع تسجيل الصفوف التي تعذر حفظها."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-xs)]">
          <div className="mb-1 text-sm text-[var(--text-secondary)]">تم استيرادهم</div>
          <div className="text-2xl font-bold text-[var(--success)]">{success}</div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow-xs)]">
          <div className="mb-1 text-sm text-[var(--text-secondary)]">فشل استيرادهم</div>
          <div className="text-2xl font-bold text-[var(--danger)]">{errors}</div>
        </div>
      </div>

      <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button variant="primary" size="lg" onClick={onClose} className="w-full sm:w-auto min-w-[140px]">
          <ArrowRight className="h-4 w-4 ml-2" />
          الرجوع للطلاب
        </Button>
        <Button variant="outline" size="lg" onClick={onReset} className="w-full sm:w-auto min-w-[140px]">
          <FileText className="h-4 w-4 ml-2" />
          استيراد ملف آخر
        </Button>
      </div>
    </div>
  );
}
