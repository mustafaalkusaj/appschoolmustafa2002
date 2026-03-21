"use client";

import { useState } from "react";
import { 
  Shield, 
  Check, 
  X, 
  Plus, 
  Users,
  Copy,
  Trash2,
  ChevronDown
} from "lucide-react";
import { 
  PERMISSION_GROUPS, 
  ROLE_PERMISSIONS, 
  ROLES, 
  type Permission, 
  type UserRole 
} from "@/types/roles";
import { SectionCard, EmptyState, cx } from "./UI";

export function RolesTab() {
  const [activeTab, setActiveTab] = useState<"matrix" | "list">("matrix");

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("matrix")}
          className={cx(
            "ui-button flex-1 sm:flex-none",
            activeTab === "matrix" ? "ui-button--primary" : "ui-button--secondary"
          )}
        >
          مصفوفة الصلاحيات
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={cx(
            "ui-button flex-1 sm:flex-none",
            activeTab === "list" ? "ui-button--primary" : "ui-button--secondary"
          )}
        >
          إدارة الأدوار (قريباً)
        </button>
      </div>

      {activeTab === "matrix" ? (
        <SectionCard
          title="مصفوفة الأدوار والصلاحيات"
          description="نظرة شاملة على الصلاحيات الممنوحة لكل دور في النظام."
        >
          <div className="overflow-x-auto rounded-[24px] border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--surface-muted)]">
                  <th className="p-4 text-right text-xs font-black text-[var(--text-secondary)]">الصلاحية</th>
                  {ROLES.map((role) => (
                    <th key={role} className="p-4 text-center text-xs font-black text-[var(--text-primary)]">
                      {role === "super_admin" ? "مدير عام" :
                       role === "admin" ? "مدير مدرسة" :
                       role === "employee" ? "موظف" : "مدرس"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_GROUPS.map((group) => (
                  <details key={group.title} className="group contents" open>
                    <summary className="contents cursor-pointer">
                      <tr className="bg-[rgba(79,140,255,0.04)]">
                        <td colSpan={ROLES.length + 1} className="p-3 text-right">
                          <div className="flex items-center gap-2 text-xs font-black text-[var(--primary)]">
                            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                            {group.title}
                          </div>
                        </td>
                      </tr>
                    </summary>
                    {group.permissions.map((perm) => (
                      <tr key={perm.key} className="border-t border-[var(--border)] transition hover:bg-[rgba(79,140,255,0.02)]">
                        <td className="p-4 text-right">
                          <span className="text-sm font-semibold text-[var(--text-secondary)]">{perm.label}</span>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{perm.key}</p>
                        </td>
                        {ROLES.map((role) => {
                          const has = ROLE_PERMISSIONS[role].includes(perm.key) || ROLE_PERMISSIONS[role].includes("full_access");
                          return (
                            <td key={role} className="p-4 text-center">
                              <div className="flex justify-center">
                                {has ? (
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(47,182,122,0.14)] text-[var(--success)]">
                                    <Check size={14} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(240,90,90,0.14)] text-[var(--danger)]">
                                    <X size={14} strokeWidth={3} />
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </details>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : (
        <EmptyState 
          icon={Shield}
          title="إدارة الأدوار المخصصة"
          description="هذه الميزة تتيح لك إنشاء أدوار مخصصة وتعديل صلاحياتها بشكل مستقل لكل مدرسة."
          actionLabel="تواصل مع المطور"
          onAction={() => {}}
        />
      )}
    </div>
  );
}
