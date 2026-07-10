
import { UltrathinkLogo } from "@/components/brand";

export function Header() {
  return (
    <header className="flex justify-between items-center p-4 bg-[var(--surface-strong)] dark:bg-[var(--surface-inset)] border-b border-[var(--border)]">
      <UltrathinkLogo size={34} title="منصة إدارة المدرسة" subtitle="تشغيل المدرسة" />
    </header>
  );
}
