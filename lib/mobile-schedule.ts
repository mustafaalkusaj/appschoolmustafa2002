/**
 * Shared helpers for mobile schedule endpoints.
 *
 * The `class_schedules` table stores `day_of_week` (0=Sun..4=Thu, 6=Sat) and a
 * `teacher_id`, but the mobile client (app/(role)/schedule.tsx) expects each
 * slot as `{ day, start_time, end_time, subject_name, class_name,
 * teacher_name, room }`. These helpers translate the DB shape into the mobile
 * contract and resolve teacher ids to display names in a single batched query.
 */

export interface MobileScheduleRow {
  id: string;
  day: number | string | null;
  start_time: string | null;
  end_time: string | null;
  subject_name: string | null;
  class_name: string | null;
  teacher_name: string | null;
  room: string | null;
}

/**
 * Turn raw class_schedules rows into the mobile slot shape, resolving
 * teacher_id -> teacher_name via one batched lookup against `teachers`.
 *
 * `supabase` is the service Supabase client from the mobile route context;
 * typed loosely to avoid coupling to its generic parameters.
 */
export async function buildScheduleItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  rows: Array<Record<string, unknown>> | null | undefined,
): Promise<MobileScheduleRow[]> {
  const list = rows ?? [];

  const teacherIds = Array.from(
    new Set(
      list
        .map((r) => r.teacher_id)
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  );

  const teacherNames = new Map<string, string>();
  if (teacherIds.length) {
    const { data: teachers } = await supabase
      .from("teachers")
      .select("id, full_name")
      .in("id", teacherIds);

    for (const teacher of teachers ?? []) {
      const id = teacher.id;
      const name = teacher.full_name;
      if (typeof id === "string" && typeof name === "string") {
        teacherNames.set(id, name);
      }
    }
  }

  return list.map((row) => {
    const teacherId = typeof row.teacher_id === "string" ? row.teacher_id : null;
    return {
      id: String(row.id),
      day: (row.day_of_week as number | string | null) ?? null,
      start_time: (row.start_time as string | null) ?? null,
      end_time: (row.end_time as string | null) ?? null,
      subject_name: (row.subject_name as string | null) ?? null,
      class_name: (row.class_name as string | null) ?? null,
      teacher_name: teacherId ? teacherNames.get(teacherId) ?? null : null,
      room: (row.room as string | null) ?? null,
    };
  });
}
