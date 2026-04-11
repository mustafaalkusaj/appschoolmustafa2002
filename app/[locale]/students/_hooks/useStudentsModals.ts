"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { StudentWithFees, StudentFormData, ManagedUserAccountCard } from "../_types";
import { DEFAULT_STUDENT_FORM } from "../_constants";

const STUDENT_MENU_WIDTH = 216;
const STUDENT_MENU_VIEWPORT_GAP = 12;

export interface UseStudentsModalsReturn {
  // Modal visibility states
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  addStep: number;
  setAddStep: (step: number) => void;
  showImport: boolean;
  setShowImport: (show: boolean) => void;
  showEdit: boolean;
  setShowEdit: (show: boolean) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  
  // Selected student
  selectedStudent: StudentWithFees | null;
  setSelectedStudent: (student: StudentWithFees | null) => void;
  
  // Form states
  form: StudentFormData;
  setForm: (form: StudentFormData) => void;
  editForm: StudentFormData;
  setEditForm: (form: StudentFormData) => void;
  
  // UI states
  saving: boolean;
  setSaving: (saving: boolean) => void;
  importing: boolean;
  setImporting: (importing: boolean) => void;
  printingCards: boolean;
  setPrintingCards: (printing: boolean) => void;
  
  // Messages
  success: string;
  setSuccess: (msg: string) => void;
  error: string;
  setError: (msg: string) => void;
  
  // Account card
  accountCard: ManagedUserAccountCard | null;
  setAccountCard: (card: ManagedUserAccountCard | null) => void;
  /** The plaintext password from a reset action (one-time reveal). Cleared when modal closes. */
  revealedPassword: string | null;
  setRevealedPassword: (password: string | null) => void;
  
  // Import preview
  importPreview: Record<string, unknown>[];
  setImportPreview: (preview: Record<string, unknown>[]) => void;
  importError: string;
  setImportError: (error: string) => void;
  
  // Dropdown menu
  activeMenu: string | null;
  setActiveMenu: (menu: string | null) => void;
  menuPos: { top: number; left: number };
  setMenuPos: (pos: { top: number; left: number }) => void;
  
  // File ref
  fileRef: React.RefObject<HTMLInputElement | null>;
  
  // Helper functions
  openEdit: (student: StudentWithFees) => void;
  openMenu: (e: React.MouseEvent, student: StudentWithFees) => void;
  resetForm: () => void;
  closeAllModals: () => void;
}

export function useStudentsModals(): UseStudentsModalsReturn {
  const [showModal, setShowModal] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState<StudentWithFees | null>(null);
  
  const [form, setForm] = useState<StudentFormData>(DEFAULT_STUDENT_FORM);
  const [editForm, setEditForm] = useState<StudentFormData>(DEFAULT_STUDENT_FORM);
  
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [printingCards, setPrintingCards] = useState(false);
  
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  
  const [accountCard, setAccountCard] = useState<ManagedUserAccountCard | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  
  const [importPreview, setImportPreview] = useState<Record<string, unknown>[]>([]);
  const [importError, setImportError] = useState("");
  
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-student-dropdown-menu]")) return;
      if (target.closest("[data-student-menu-trigger]")) return;
      setActiveMenu(null);
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const openEdit = useCallback((student: StudentWithFees) => {
    setError("");
    setSelectedStudent(student);
    setEditForm({
      full_name: student.full_name,
      class_name: student.class_name,
      section: student.section || "",
      phone: student.phone || "",
      address: student.address || "",
      total_fee: student.total_fee?.toString() || "0",
      paid_fee: student.paid_fee?.toString() || "0",
      discount_value: student.discount_value?.toString() || "",
      status: student.status,
    });
    setShowEdit(true);
    setActiveMenu(null);
  }, []);

  const openMenu = useCallback((e: React.MouseEvent, student: StudentWithFees) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isRTL = document.documentElement.getAttribute("dir") === "rtl";
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const top = Math.max(
      STUDENT_MENU_VIEWPORT_GAP,
      Math.min(rect.bottom + 8, viewportHeight - 260),
    );
    const rawLeft = isRTL ? rect.right - STUDENT_MENU_WIDTH : rect.left;
    const left = Math.max(
      STUDENT_MENU_VIEWPORT_GAP,
      Math.min(rawLeft, viewportWidth - STUDENT_MENU_WIDTH - STUDENT_MENU_VIEWPORT_GAP),
    );

    setMenuPos({ top, left });
    setActiveMenu((current) => (current === student.id ? null : student.id));
    setSelectedStudent(student);
  }, []);

  const resetForm = useCallback(() => {
    setForm(DEFAULT_STUDENT_FORM);
    setAddStep(1);
  }, []);

  const closeAllModals = useCallback(() => {
    setShowModal(false);
    setShowImport(false);
    setShowEdit(false);
    setShowDeleteConfirm(false);
    setImportPreview([]);
    setImportError("");
    setAddStep(1);
  }, []);

  return {
    showModal,
    setShowModal,
    addStep,
    setAddStep,
    showImport,
    setShowImport,
    showEdit,
    setShowEdit,
    showDeleteConfirm,
    setShowDeleteConfirm,
    selectedStudent,
    setSelectedStudent,
    form,
    setForm,
    editForm,
    setEditForm,
    saving,
    setSaving,
    importing,
    setImporting,
    printingCards,
    setPrintingCards,
    success,
    setSuccess,
    error,
    setError,
    accountCard,
    setAccountCard,
    revealedPassword,
    setRevealedPassword,
    importPreview,
    setImportPreview,
    importError,
    setImportError,
    activeMenu,
    setActiveMenu,
    menuPos,
    setMenuPos,
    fileRef,
    openEdit,
    openMenu,
    resetForm,
    closeAllModals,
  };
}
