"use client";

import { useCallback } from "react";
import type { StudentWithFees, ManagedUserAccountCard } from "../_types";
import { buildPrintableCardHtml, buildSingleStudentPrintHtml, buildStudentPrintCardHtml } from "../_utils";
import { formatNumber } from "@/lib/formatting";
import { wrapPrintDocument } from "@/lib/print/branding";

export interface UseStudentsPrintOptions {
  locale: "ar" | "en";
  runtimeBranding: {
    schoolName?: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
  };
  setError: (error: string) => void;
}

export function useStudentsPrint(options: UseStudentsPrintOptions) {
  const { locale, runtimeBranding, setError } = options;

  const printOptions = {
    locale,
    ...runtimeBranding,
  };

  const handlePrint = useCallback((s: StudentWithFees) => {
    setError("");
    const w = window.open("", "_blank");
    if (!w) {
      setError("يرجى السماح بالنوافذ المنبثقة للطباعة");
      return;
    }
    w.document.write(buildSingleStudentPrintHtml(s, printOptions));
    w.document.close();
  }, [printOptions, setError]);

  const printFilteredStudents = useCallback((students: StudentWithFees[]) => {
    if (students.length === 0) {
      setError("لا يوجد طلاب للطباعة بعد تطبيق الفلاتر.");
      return;
    }
    setError("");
    const w = window.open("", "_blank");
    if (!w) {
      setError("يرجى السماح بالنوافذ المنبثقة للطباعة");
      return;
    }
    const cardsHtml = students
      .map((s) => buildStudentPrintCardHtml(s, printOptions))
      .join("");
    w.document.write(
      wrapPrintDocument({
        title: locale === "en" ? "Students list" : "قائمة الطلاب",
        subtitle:
          locale === "en"
            ? `${students.length} filtered students`
            : `${students.length} طالب بعد تطبيق الفلاتر`,
        branding: {
          schoolName: runtimeBranding.schoolName,
          logoUrl: runtimeBranding.logoUrl,
          primaryColor: runtimeBranding.primaryColor,
          secondaryColor: runtimeBranding.secondaryColor,
          locale,
        },
        bodyHtml: `
          <div class="print-panel" style="margin-bottom:20px">
            <div class="print-grid">
              <div>
                <span class="print-label">${locale === "en" ? "Total students" : "إجمالي الطلاب"}</span>
                <div class="print-value">${students.length}</div>
              </div>
              <div>
                <span class="print-label">${locale === "en" ? "Total fees" : "إجمالي الرسوم"}</span>
                <div class="print-value">د.ع ${formatNumber(students.reduce((sum, s) => sum + (s.total_fee || 0), 0))}</div>
              </div>
              <div>
                <span class="print-label">${locale === "en" ? "Total remaining" : "المتبقي الكلي"}</span>
                <div class="print-value">د.ع ${formatNumber(students.reduce((sum, s) => sum + (s.remaining_fee || 0), 0))}</div>
              </div>
            </div>
          </div>
          ${cardsHtml}
        `,
        extraStyles: `
          @page { margin: 1.5cm; size: A4; }
          .student-card { page-break-inside: avoid; }
        `,
      })
    );
    w.document.close();
  }, [locale, printOptions, runtimeBranding, setError]);

  const openAccountCardWindow = useCallback((card: ManagedUserAccountCard, autoPrint = true, revealedPassword?: string | null) => {
    const w = window.open("", "_blank");
    if (!w) {
      setError("يرجى السماح بالنوافذ المنبثقة لعرض بطاقة الحساب");
      return;
    }
    // Use the revealed password if available, otherwise the card's password (which may be a placeholder)
    const passwordToShow = revealedPassword && revealedPassword !== "••••••••"
      ? revealedPassword
      : card.temporary_password;
    const cardWithPassword = { ...card, temporary_password: passwordToShow };
    w.document.open();
    w.document.write(buildPrintableCardHtml(cardWithPassword, printOptions, autoPrint));
    w.document.close();
  }, [printOptions, setError]);

  const copyAccountCardCredentials = useCallback(
    async (card: ManagedUserAccountCard | null, setSuccess: (msg: string) => void, revealedPassword?: string | null) => {
      if (!card) return;
      const passwordText = revealedPassword && revealedPassword !== "••••••••"
        ? revealedPassword
        : "تم التعيين (غير متوفر للنسخ)";
      await navigator.clipboard.writeText(
        `معرّف الدخول: ${card.login_identifier}\nكلمة المرور المؤقتة: ${passwordText}`
      );
      setSuccess("تم نسخ بيانات الدخول المؤقتة");
    },
    []
  );

  return {
    handlePrint,
    printFilteredStudents,
    openAccountCardWindow,
    copyAccountCardCredentials,
  };
}
