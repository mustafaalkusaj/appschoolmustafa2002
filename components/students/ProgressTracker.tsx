import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { XCircle, CheckCircle, Loader2 } from "lucide-react";

interface ProgressTrackerProps {
  processed: number;
  total: number;
  success: number;
  errors: number;
  status: string;
  onCancel?: () => void;
}

export function ProgressTracker({
  processed,
  total,
  success,
  errors,
  status,
  onCancel
}: ProgressTrackerProps) {
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
  
  const getStatusText = () => {
    switch (status) {
      case 'parsing': return 'جاري قراءة الملف...';
      case 'validating': return 'جاري التحقق من البيانات...';
      case 'importing': return 'جاري استيراد البيانات إلى قاعدة البيانات...';
      case 'completed': return 'اكتملت العملية';
      case 'cancelled': return 'تم إلغاء العملية';
      case 'failed': return 'فشلت العملية';
      default: return 'جاري المعالجة...';
    }
  };

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-strong)] p-6 shadow-[var(--shadow-xs)]">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {status !== 'completed' && status !== 'failed' && status !== 'cancelled' ? (
            <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
          ) : status === 'completed' ? (
            <CheckCircle className="h-5 w-5 text-[var(--success)]" />
          ) : (
            <XCircle className="h-5 w-5 text-[var(--danger)]" />
          )}
          <span className="font-semibold text-[var(--text-primary)]">
            {getStatusText()}
          </span>
        </div>
        <span className="rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,white)] px-2 py-1 text-sm font-medium text-[var(--primary)]">
          {percentage}%
        </span>
      </div>

      <Progress value={percentage} className="h-2 bg-[var(--surface-muted)]" />

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
          <div className="mb-1 text-xs text-[var(--text-secondary)]">تمت معالجته</div>
          <div className="text-lg font-bold text-[var(--text-primary)]">{processed}</div>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--success-soft)] p-3">
          <div className="mb-1 text-xs text-[var(--success)]">ناجح</div>
          <div className="text-lg font-bold text-[var(--success)]">{success}</div>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--danger-soft)] p-3">
          <div className="mb-1 text-xs text-[var(--danger)]">أخطاء</div>
          <div className="text-lg font-bold text-[var(--danger)]">{errors}</div>
        </div>
      </div>

      {(status === 'importing' || status === 'validating' || status === 'parsing') && onCancel && (
        <div className="flex justify-center mt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancel}
            className="text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          >
            إلغاء العملية
          </Button>
        </div>
      )}
    </div>
  );
}
