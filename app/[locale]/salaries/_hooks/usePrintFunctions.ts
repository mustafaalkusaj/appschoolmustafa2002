"use client";

import { formatNumber, formatDate } from "@/lib/formatting";
import { wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import type { Teacher, Salary, DailyLecture } from "../_types";

interface PrintFunctionsProps {
  isEnglish: boolean;
  runtimeBranding: {
    schoolName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export function usePrintFunctions({ isEnglish, runtimeBranding }: PrintFunctionsProps) {
  const openPrintWindow = (title: string, subtitle: string, bodyHtml: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      wrapPrintDocument({
        title,
        subtitle,
        bodyHtml,
        branding: {
          schoolName: runtimeBranding.schoolName,
          logoUrl: runtimeBranding.logoUrl,
          primaryColor: runtimeBranding.primaryColor,
          secondaryColor: runtimeBranding.secondaryColor,
          locale: isEnglish ? "en" : "ar",
        },
      })
    );
    w.document.close();
  };

  const printSalarySlip = (salary: Salary) => {
    const net = (salary.gross_salary || 0) - (salary.deductions || 0);
    openPrintWindow(
      isEnglish ? "Salary slip" : "قسيمة راتب",
      escapeHtml(salary.teachers?.full_name || (isEnglish ? "Teacher account" : "سجل الأستاذ")),
      `<div class="print-grid">
        <div class="print-panel"><span class="print-label">${isEnglish ? "Teacher" : "الاسم"}</span><div class="print-value">${escapeHtml(salary.teachers?.full_name || "—")}</div></div>
        <div class="print-panel"><span class="print-label">${isEnglish ? "Month" : "الشهر"}</span><div class="print-value">${escapeHtml(salary.month || "—")}</div></div>
        <div class="print-panel"><span class="print-label">${isEnglish ? "Gross salary" : "الإجمالي"}</span><div class="print-value">د.ع ${formatNumber(salary.gross_salary || 0)}</div></div>
        <div class="print-panel"><span class="print-label">${isEnglish ? "Deductions" : "الخصومات"}</span><div class="print-value" style="color:#dc2626">د.ع ${formatNumber(salary.deductions || 0)}</div></div>
      </div>
      <div class="print-panel" style="margin-top:16px;text-align:center;background:linear-gradient(135deg,var(--print-surface),#ffffff)">
        <span class="print-label">${isEnglish ? "Net amount" : "الصافي"}</span>
        <div class="print-value" style="font-size:30px">د.ع ${formatNumber(net)}</div>
      </div>`
    );
  };

  const printReport = (reportTeacher: string, teachers: Teacher[], dailyLectures: DailyLecture[]) => {
    const teacher = reportTeacher ? teachers.find((t) => t.id === reportTeacher) : null;
    const lectures = reportTeacher ? dailyLectures.filter((l) => l.teacher_id === reportTeacher) : dailyLectures;
    const total = lectures.reduce((a, l) => a + l.price, 0);
    openPrintWindow(
      isEnglish ? "Teacher statement" : "كشف حساب",
      teacher?.full_name || (isEnglish ? "All teachers" : "جميع الأساتذة"),
      `<table><thead><tr><th>#</th><th>${isEnglish ? "Date" : "التاريخ"}</th><th>${isEnglish ? "Class" : "الصف"}</th><th>${isEnglish ? "Section" : "الشعبة"}</th><th>${isEnglish ? "Lesson" : "الدرس"}</th><th>${isEnglish ? "Price" : "السعر"}</th></tr></thead>
        <tbody>${lectures.map((l, i) => `<tr><td>${i + 1}</td><td>${formatDate(l.lecture_date)}</td><td>${escapeHtml(l.grade || "—")}</td><td>${escapeHtml(l.section || "—")}</td><td>${isEnglish ? "Lesson" : "الدرس"} ${escapeHtml(String(l.period ?? "—"))}</td><td>${formatNumber(l.price || 0)}</td></tr>`).join("")}</tbody></table>
        <div class="print-panel" style="margin-top:16px;text-align:center"><span class="print-label">${isEnglish ? "Total" : "الإجمالي"}</span><div class="print-value">د.ع ${formatNumber(total)}</div></div>`
    );
  };

  const printAllTeachers = (teachers: Teacher[]) => {
    openPrintWindow(
      isEnglish ? "Teachers summary" : "تقرير شامل",
      isEnglish ? `${teachers.length} teachers` : `${teachers.length} أستاذ`,
      `<table><thead><tr><th>#</th><th>${isEnglish ? "Name" : "الاسم"}</th><th>${isEnglish ? "Job title" : "المسمى"}</th><th>${isEnglish ? "Subject" : "المادة"}</th><th>${isEnglish ? "Salary" : "الراتب"}</th><th>${isEnglish ? "Lecture price" : "سعر المحاضرة"}</th></tr></thead>
        <tbody>${teachers.map((t, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(t.full_name || "—")}</td><td>${escapeHtml(t.job_title || "—")}</td><td>${escapeHtml(t.subject || "—")}</td><td>${formatNumber(t.base_salary || 0)}</td><td>${formatNumber(t.lecture_price || 0)}</td></tr>`).join("")}</tbody></table>`
    );
  };

  return {
    openPrintWindow,
    printSalarySlip,
    printReport,
    printAllTeachers,
  };
}
