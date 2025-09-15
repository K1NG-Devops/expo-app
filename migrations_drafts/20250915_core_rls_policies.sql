-- Core RLS policies for app tables (idempotent)
-- Enables RLS and creates policies for: attendance_records, homework_submissions,
-- class_events, financial_transactions, guardian_requests, teacher_invites

begin;

-- attendance_records
alter table if exists public.attendance_records enable row level security;
-- select: parents of the student; teachers/principals of the same school
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='attendance_records' and policyname='attendance_parent_read_child') then
    create policy attendance_parent_read_child on public.attendance_records for select using (
      exists (
        select 1 from public.students s
        join public.guardians g on g.student_id = s.id
        where s.id = attendance_records.student_id
          and g.parent_id = auth.uid()
      )
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='attendance_records' and policyname='attendance_staff_read_school') then
    create policy attendance_staff_read_school on public.attendance_records for select using (
      exists (
        select 1 from public.profiles me
        where me.id = auth.uid()
          and me.preschool_id = attendance_records.preschool_id
      )
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='attendance_records' and policyname='attendance_teacher_manage') then
    create policy attendance_teacher_manage on public.attendance_records for all using (
      exists (
        select 1 from public.profiles me
        where me.id = auth.uid()
          and me.preschool_id = attendance_records.preschool_id
          and me.role in ('teacher','principal','principal_admin','super_admin')
      )
    );
  end if;
end $$;

-- homework_submissions
alter table if exists public.homework_submissions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='homework_submissions' and policyname='hw_sub_parent_student_read') then
    create policy hw_sub_parent_student_read on public.homework_submissions for select using (
      homework_submissions.student_id = auth.uid() or
      exists (
        select 1 from public.guardians g where g.student_id = homework_submissions.student_id and g.parent_id = auth.uid()
      )
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='homework_submissions' and policyname='hw_sub_parent_student_insert') then
    create policy hw_sub_parent_student_insert on public.homework_submissions for insert with check (
      homework_submissions.student_id = auth.uid() or
      exists (
        select 1 from public.guardians g where g.student_id = homework_submissions.student_id and g.parent_id = auth.uid()
      )
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='homework_submissions' and policyname='hw_sub_teacher_grade') then
    create policy hw_sub_teacher_grade on public.homework_submissions for update using (
      exists (
        select 1 from public.classes c
        join public.homework_assignments a on a.class_id = c.id
        where a.id = homework_submissions.assignment_id
          and (c.teacher_id = auth.uid() or exists (select 1 from public.profiles me where me.id = auth.uid() and me.role in ('principal','principal_admin','super_admin')))
      )
    );
  end if;
end $$;

-- class_events
alter table if exists public.class_events enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='class_events' and policyname='events_read_same_school') then
    create policy events_read_same_school on public.class_events for select using (
      exists (select 1 from public.profiles me where me.id = auth.uid() and me.preschool_id = class_events.preschool_id)
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='class_events' and policyname='events_manage_teacher_principal') then
    create policy events_manage_teacher_principal on public.class_events for all using (
      exists (select 1 from public.profiles me where me.id = auth.uid() and me.preschool_id = class_events.preschool_id and me.role in ('teacher','principal','principal_admin','super_admin'))
    );
  end if;
end $$;

-- financial_transactions
alter table if exists public.financial_transactions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='financial_transactions' and policyname='fin_principal_read_school') then
    create policy fin_principal_read_school on public.financial_transactions for select using (
      exists (select 1 from public.profiles me where me.id = auth.uid() and me.preschool_id = financial_transactions.preschool_id and me.role in ('principal','principal_admin','super_admin'))
    );
  end if;
  if not exists (select 1 from pg_policies where tablename='financial_transactions' and policyname='fin_parent_read_child') then
    create policy fin_parent_read_child on public.financial_transactions for select using (
      exists (select 1 from public.guardians g where g.student_id = financial_transactions.student_id and g.parent_id = auth.uid())
    );
  end if;
end $$;

-- guardian_requests (enable only; policies created in onboarding draft)
alter table if exists public.guardian_requests enable row level security;
-- teacher_invites (enable only)
alter table if exists public.teacher_invites enable row level security;

commit;