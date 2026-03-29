"use client";

import { UltrathinkLogo } from "@/components/brand";

export function Header() {
  return (
    <header className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <UltrathinkLogo size={34} title="منصة إدارة المدرسة" subtitle="تشغيل المدرسة" />
    </header>
  );
}
