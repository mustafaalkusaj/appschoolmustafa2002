-- Migrate class_schedules from baseline schema to API-expected schema.
-- Baseline had: day_of_week text, period_number, subject, teacher_name, start_time text, end_time text
-- APIs/mobile expect: day_of_week smallint, subject_name, teacher_id (FK), room, academic_year, start_time time, end_time time

-- Step 1: Add new columns
alter table public.class_schedules
  add column if not exists subject_name text,
  add column if not exists teacher_id   uuid references public.teachers(id) on delete set null,
  add column if not exists room         text,
  add column if not exists academic_year text;

-- Step 2: Migrate existing data into new columns
update public.class_schedules
set subject_name = subject
where subject_name is null and subject is not null;

-- Step 3: Convert day_of_week text → smallint via new column
alter table public.class_schedules
  add column if not exists day_of_week_int smallint;

update public.class_schedules
set day_of_week_int = case day_of_week
  when 'sunday'    then 0
  when 'monday'    then 1
  when 'tuesday'   then 2
  when 'wednesday' then 3
  when 'thursday'  then 4
  when 'friday'    then 5
  when 'saturday'  then 6
  else 0
end
where day_of_week_int is null;

-- Step 4: Convert start_time/end_time text → time via temp columns
alter table public.class_schedules
  add column if not exists start_time_t time,
  add column if not exists end_time_t   time;

update public.class_schedules
set
  start_time_t = start_time::time,
  end_time_t   = end_time::time
where start_time is not null
  and start_time ~ '^\d{2}:\d{2}(:\d{2})?$'
  and end_time is not null
  and end_time ~ '^\d{2}:\d{2}(:\d{2})?$';

-- Step 5: Drop old constraint and columns, rename new ones
alter table public.class_schedules
  drop constraint if exists class_schedules_day_of_week_check;

alter table public.class_schedules
  drop column if exists day_of_week,
  drop column if exists period_number,
  drop column if exists subject,
  drop column if exists teacher_name,
  drop column if exists start_time,
  drop column if exists end_time,
  drop column if exists time_slot_id,
  drop column if exists is_locked,
  drop column if exists updated_at;

alter table public.class_schedules
  rename column day_of_week_int to day_of_week;

alter table public.class_schedules
  rename column start_time_t to start_time;

alter table public.class_schedules
  rename column end_time_t to end_time;

-- Step 6: Add constraints on new columns
alter table public.class_schedules
  alter column day_of_week set not null,
  add constraint class_schedules_day_of_week_check check (day_of_week between 0 and 6);

alter table public.class_schedules
  alter column subject_name set not null;

-- Step 7: Index on teacher_id
create index if not exists idx_class_schedules_teacher
  on public.class_schedules(teacher_id);
