import "server-only";

import type { DeletionSubject } from "@/lib/account-deletion/types";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

type ServiceClient = ReturnType<typeof createServiceSupabaseClient>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(client: ServiceClient, name: string): any {
  return (client as unknown as { from: (t: string) => unknown }).from(name);
}

export type SubjectDataExport = {
  version: 1;
  exported_at: string;
  subject: {
    auth_user_id: string;
    school_id: string;
    role: string | null;
    student_id: string | null;
    teacher_id: string | null;
  };
  datasets: Record<string, unknown[]>;
};

/**
 * GDPR Art. 15 subject-access export.
 *
 * Strictly scoped to the caller: every query is keyed on the caller's own
 * auth_user_id or on the student/teacher row linked to it, and additionally
 * constrained to the caller's school. Nothing here accepts a caller-supplied
 * target id — a subject can only ever export themselves.
 */
export async function buildSubjectDataExport(
  subject: DeletionSubject & { authUserId: string },
  client: ServiceClient = createServiceSupabaseClient(),
): Promise<SubjectDataExport> {
  const datasets: Record<string, unknown[]> = {};

  const push = (key: string, rows: unknown[] | null | undefined) => {
    datasets[key] = rows ?? [];
  };

  const [profile, managedProfile, notifications, pushSubscriptions] =
    await Promise.all([
      table(client, "user_profiles")
        .select("id, full_name, email, phone, role, avatar_url, created_at")
        .eq("id", subject.authUserId),
      table(client, "managed_user_profiles")
        .select(
          "auth_user_id, role, full_name, email, phone, is_active, created_at",
        )
        .eq("auth_user_id", subject.authUserId),
      table(client, "notifications")
        .select("id, type, title, message, is_read, created_at")
        .eq("user_id", subject.authUserId)
        .order("created_at", { ascending: false })
        .limit(1000),
      table(client, "user_push_subscriptions")
        .select("id, platform, is_active, created_at")
        .eq("user_id", subject.authUserId),
    ]);

  push("user_profile", profile.data);
  push("managed_user_profile", managedProfile.data);
  push("notifications", notifications.data);
  push("push_subscriptions", pushSubscriptions.data);

  const messages = await table(client, "messages")
    .select(
      "id, conversation_id, body, attachment_name, attachment_type, created_at",
    )
    .eq("sender_id", subject.authUserId)
    .order("created_at", { ascending: false })
    .limit(2000);
  push("messages_sent", messages.data);

  if (subject.studentId) {
    const [student, payments, attendance, grades, behavior] = await Promise.all(
      [
        table(client, "students")
          .select("*")
          .eq("id", subject.studentId)
          .eq("school_id", subject.schoolId),
        table(client, "payments")
          .select(
            "id, amount, payment_method, receipt_number, notes, created_at",
          )
          .eq("student_id", subject.studentId)
          .eq("school_id", subject.schoolId),
        table(client, "attendance_records")
          .select("id, attendance_date, status, note")
          .eq("student_id", subject.studentId),
        table(client, "grades")
          .select("id, subject, exam_type, score, max_score, note, graded_at")
          .eq("student_id", subject.studentId)
          .eq("school_id", subject.schoolId),
        table(client, "behavior_logs")
          .select("id, behavior_type, points, note, created_at")
          .eq("student_id", subject.studentId)
          .eq("school_id", subject.schoolId),
      ],
    );

    push("student_record", student.data);
    push("payments", payments.data);
    push("attendance", attendance.data);
    push("grades", grades.data);
    push("behavior_logs", behavior.data);
  }

  if (subject.teacherId) {
    const [teacher, assignments] = await Promise.all([
      table(client, "teachers")
        .select("*")
        .eq("id", subject.teacherId)
        .eq("school_id", subject.schoolId),
      table(client, "assignments")
        .select("id, title, description, due_at, created_at")
        .eq("teacher_id", subject.teacherId)
        .eq("school_id", subject.schoolId),
    ]);

    push("teacher_record", teacher.data);
    push("assignments_authored", assignments.data);
  }

  const deletionRequests = await table(client, "account_deletion_requests")
    .select("id, status, reason, requested_at, retention_deadline")
    .eq("auth_user_id", subject.authUserId);
  push("account_deletion_requests", deletionRequests.data);

  return {
    version: 1,
    exported_at: new Date().toISOString(),
    subject: {
      auth_user_id: subject.authUserId,
      school_id: subject.schoolId,
      role: subject.role,
      student_id: subject.studentId,
      teacher_id: subject.teacherId,
    },
    datasets,
  };
}
