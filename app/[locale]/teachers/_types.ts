// Teachers page type definitions

import type { ManagedTeacherAssignmentInput, ManagedUserAccountCard, ManagedUserRecord, ManagedUserRole } from "@/lib/managed-users";

export type FieldErrors = Record<string, string>;

export type ClassOption = { id: string; name: string };

export type SectionOption = { id: string; name: string; class_id: string };

export type SubjectOption = { id: string; name: string };

export type TeacherAssignmentFormState = ManagedTeacherAssignmentInput;

export type RawClassOption = { id: string; name?: string | null; grade?: string | null; section?: string | null };

export type RawSectionOption = { id: string; name?: string | null; class_id?: string | null; section?: string | null };

export type UserFormState = {
  role: ManagedUserRole;
  full_name: string;
  email: string;
  password: string;
  phone: string;
  is_active: boolean;
  student: {
    class_name: string;
    section: string;
  };
  teacher: {
    assignments: TeacherAssignmentFormState[];
  };
};

export type ImportPayload = { line: number; payload: unknown };

export type TeachersPageState = {
  classes: ClassOption[];
  sections: SectionOption[];
  subjects: SubjectOption[];
  users: ManagedUserRecord[];
  loading: boolean;
  saving: boolean;
  togglingId: string | null;
  cardLoadingId: string | null;
  searchInput: string;
  query: string;
  roleFilter: ManagedUserRole;
  statusFilter: "all" | "active" | "inactive";
  classFilter: string;
  sectionFilter: string;
  subjectFilter: string;
  page: number;
  totalCount: number;
  success: string;
  error: string;
  fieldErrors: FieldErrors;
  showCreateModal: boolean;
  editingUser: ManagedUserRecord | null;
  accountCard: ManagedUserAccountCard | null;
  revealedPassword: string | null;
  showImportModal: boolean;
  importing: boolean;
  importPreview: Array<Record<string, unknown>>;
  importPayloads: ImportPayload[];
  importErrors: string[];
  form: UserFormState;
};

export type TeachersPageActions = {
  setClasses: (classes: ClassOption[]) => void;
  setSections: (sections: SectionOption[]) => void;
  setSubjects: (subjects: SubjectOption[]) => void;
  setUsers: (users: ManagedUserRecord[]) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setTogglingId: (id: string | null) => void;
  setCardLoadingId: (id: string | null) => void;
  setSearchInput: (input: string) => void;
  setQuery: (query: string) => void;
  setStatusFilter: (filter: "all" | "active" | "inactive") => void;
  setClassFilter: (filter: string) => void;
  setSectionFilter: (filter: string) => void;
  setSubjectFilter: (filter: string) => void;
  setPage: (page: number) => void;
  setTotalCount: (count: number) => void;
  setSuccess: (success: string) => void;
  setError: (error: string) => void;
  setFieldErrors: (errors: FieldErrors) => void;
  setShowCreateModal: (show: boolean) => void;
  setEditingUser: (user: ManagedUserRecord | null) => void;
  setAccountCard: (card: ManagedUserAccountCard | null) => void;
  setRevealedPassword: (password: string | null) => void;
  setShowImportModal: (show: boolean) => void;
  setImporting: (importing: boolean) => void;
  setImportPreview: (preview: Array<Record<string, unknown>>) => void;
  setImportPayloads: (payloads: ImportPayload[]) => void;
  setImportErrors: (errors: string[]) => void;
  setForm: (form: UserFormState | ((prev: UserFormState) => UserFormState)) => void;
  clearMessages: () => void;
  resetTableFilters: () => void;
  resetForm: (role?: ManagedUserRole) => void;
  openCreateModal: (role?: ManagedUserRole) => void;
  openEditModal: (user: ManagedUserRecord) => void;
  closeModal: () => void;
  closeAccountCard: () => void;
  updateTeacherAssignment: (key: keyof TeacherAssignmentFormState, value: string) => void;
};

export type TeachersFilterProps = {
  searchInput: string;
  setSearchInput: (value: string) => void;
  statusFilter: "all" | "active" | "inactive";
  setStatusFilter: (value: "all" | "active" | "inactive") => void;
  classFilter: string;
  setClassFilter: (value: string) => void;
  sectionFilter: string;
  setSectionFilter: (value: string) => void;
  subjectFilter: string;
  setSubjectFilter: (value: string) => void;
  classes: ClassOption[];
  sections: SectionOption[];
  subjects: SubjectOption[];
  availableTeacherSections: SectionOption[];
  onResetFilters: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onImport: () => void;
  loading: boolean;
  query: string;
  normalizedClassFilter: string;
  normalizedSectionFilter: string;
  normalizedSubjectFilter: string;
};

export type TeacherStatsItem = {
  label: string;
  value: number;
  hint: string;
};
