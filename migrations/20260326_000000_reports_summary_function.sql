create or replace function public.school_reports_summary(
  p_school_id uuid,
  p_current_month text,
  p_today date
)
returns table (
  students_count bigint,
  active_students bigint,
  total_fees numeric,
  total_paid numeric,
  total_remaining numeric,
  payments_count bigint,
  payment_volume numeric,
  today_payments bigint,
  expenses_count bigint,
  expense_volume numeric,
  expense_type_count bigint,
  salaries_count bigint,
  salary_volume numeric,
  current_month_salary_count bigint,
  net_balance numeric
)
language sql
stable
set search_path = public
as $$
  with student_summary as (
    select
      count(*)::bigint as students_count,
      count(*) filter (where status = 'active')::bigint as active_students,
      coalesce(sum(total_fee), 0)::numeric as total_fees,
      coalesce(sum(paid_fee), 0)::numeric as total_paid,
      coalesce(sum(remaining_fee), 0)::numeric as total_remaining
    from public.students
    where school_id = p_school_id
      and coalesce(status, 'active') <> 'deleted'
  ),
  payment_summary as (
    select
      count(*)::bigint as payments_count,
      coalesce(sum(amount), 0)::numeric as payment_volume,
      count(*) filter (where created_at::date = p_today)::bigint as today_payments
    from public.payments
    where school_id = p_school_id
  ),
  expense_summary as (
    select
      count(*)::bigint as expenses_count,
      coalesce(sum(e.amount), 0)::numeric as expense_volume,
      count(distinct et.name)::bigint as expense_type_count
    from public.expenses e
    left join public.expense_types et on et.id = e.expense_type_id
    where e.school_id = p_school_id
  ),
  salary_summary as (
    select
      count(*)::bigint as salaries_count,
      coalesce(sum(greatest(coalesce(gross_salary, 0) - coalesce(deductions, 0), 0)), 0)::numeric as salary_volume,
      count(*) filter (where month = p_current_month)::bigint as current_month_salary_count
    from public.salaries
    where school_id = p_school_id
  )
  select
    student_summary.students_count,
    student_summary.active_students,
    student_summary.total_fees,
    student_summary.total_paid,
    student_summary.total_remaining,
    payment_summary.payments_count,
    payment_summary.payment_volume,
    payment_summary.today_payments,
    expense_summary.expenses_count,
    expense_summary.expense_volume,
    expense_summary.expense_type_count,
    salary_summary.salaries_count,
    salary_summary.salary_volume,
    salary_summary.current_month_salary_count,
    payment_summary.payment_volume - expense_summary.expense_volume - salary_summary.salary_volume as net_balance
  from student_summary, payment_summary, expense_summary, salary_summary;
$$;

grant execute on function public.school_reports_summary(uuid, text, date) to authenticated, service_role;
