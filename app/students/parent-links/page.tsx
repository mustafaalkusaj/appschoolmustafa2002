"use client";

import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { usePathname } from "next/navigation";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { resolveSchoolIdForProfile } from "@/lib/school/context";

interface ParentLink {
  id: string;
  parent_user_id: string;
  parent_email: string;
  student_id: string;
  student_name: string;
}

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
}

export default function ParentLinksPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const schoolId = resolveSchoolIdForProfile(profile, schoolScope);

  const [links, setLinks] = useState<ParentLink[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [parentEmail, setParentEmail] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingLinks, setFetchingLinks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    if (!schoolId) return;
    setFetchingLinks(true);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession(
        `/api/web/admin/parent-links?schoolId=${schoolId}`,
      );
      const data = payload as { links?: ParentLink[] };
      setLinks(data.links ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل البيانات.");
    } finally {
      setFetchingLinks(false);
    }
  }, [schoolId]);

  const fetchStudents = useCallback(async () => {
    if (!schoolId) return;
    try {
      const { payload } = await fetchJsonWithAuthorizedSession(
        `/api/web/students/list?schoolId=${schoolId}&pageSize=500`,
      );
      const data = payload as { students?: StudentOption[] };
      setStudents(data.students ?? []);
    } catch {
      // non-critical
    }
  }, [schoolId]);

  useEffect(() => {
    fetchLinks();
    fetchStudents();
  }, [fetchLinks, fetchStudents]);

  async function handleLink() {
    if (!parentEmail.trim() || !selectedStudentId || !schoolId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await fetchJsonWithAuthorizedSession("/api/web/admin/parent-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_email: parentEmail.trim(), student_id: selectedStudentId, schoolId }),
      });
      setSuccess("تم ربط ولي الأمر بالطالب بنجاح.");
      setParentEmail("");
      setSelectedStudentId("");
      await fetchLinks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل إنشاء الرابط.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(linkId: string) {
    if (!schoolId) return;
    setError(null);
    try {
      await fetchJsonWithAuthorizedSession("/api/web/admin/parent-links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link_id: linkId, schoolId }),
      });
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل حذف الرابط.");
    }
  }

  return (
    <ProtectedRoute allowedRoles={["super_admin", "admin"]}>
      <div className="flex h-screen overflow-hidden bg-background" dir={locale === "ar" ? "rtl" : "ltr"}>
        <AppSidebar currentPath={pathname} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <AppShellTopbar />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-2xl font-bold text-foreground">ربط أولياء الأمور بالطلاب</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  ابحث عن ولي الأمر بالبريد الإلكتروني واربطه بطالب.
                </p>
              </div>

              {/* Form */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">
                        البريد الإلكتروني لولي الأمر
                      </label>
                      <input
                        type="email"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">الطالب</label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">— اختر الطالب —</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.first_name} {s.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  {success && (
                    <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                  )}

                  <Button
                    onClick={handleLink}
                    disabled={loading || !parentEmail.trim() || !selectedStudentId}
                    className="w-full sm:w-auto"
                  >
                    {loading ? "جارٍ الربط..." : "ربط"}
                  </Button>
                </CardContent>
              </Card>

              {/* Links table */}
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-base font-semibold mb-4">الروابط الحالية</h2>
                  {fetchingLinks ? (
                    <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
                  ) : links.length === 0 ? (
                    <p className="text-sm text-muted-foreground">لا توجد روابط حتى الآن.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="pb-2 text-start font-medium">الطالب</th>
                            <th className="pb-2 text-start font-medium">بريد ولي الأمر</th>
                            <th className="pb-2 text-start font-medium"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {links.map((link) => (
                            <tr key={link.id} className="border-b last:border-0">
                              <td className="py-2 pe-4">{link.student_name}</td>
                              <td className="py-2 pe-4 text-muted-foreground">{link.parent_email}</td>
                              <td className="py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(link.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  حذف
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
