-- Membership-aware RLS policies for principals/teachers/parents
-- This migration creates a SECURITY DEFINER helper that checks role membership
-- via either public.users.preschool_id or public.organization_members.organization_id,
-- and (re)creates SELECT policies for public.users and public.students that rely on it.

begin;

-- 1) Helper function: has_role_in_preschool()
create or replace function public.has_role_in_preschool(target_preschool uuid, roles text[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    left join public.organization_members m
      on m.user_id = u.id
    where u.auth_user_id = auth.uid()
      and (
        u.preschool_id = target_preschool
        or m.organization_id = target_preschool
      )
      and (
        u.role = any(roles)
        or m.role = any(roles)
      )
  );
$$;

-- Lock down helper permissions
revoke all on function public.has_role_in_preschool(uuid, text[]) from public;
grant execute on function public.has_role_in_preschool(uuid, text[]) to authenticated;

-- Ensure RLS is enabled on target tables
alter table if exists public.users enable row level security;
alter table if exists public.students enable row level security;

-- 2) Users: self-read + principals (and super) can read users in their school
-- Drop/replace policy to avoid duplicates
drop policy if exists users_self_or_principal_same_school on public.users;
create policy users_self_or_principal_same_school
on public.users
as permissive
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or public.has_role_in_preschool(preschool_id, array['principal','principal_admin','super_admin'])
);

-- 3) Students: principals (and super) can read students in their school
-- Drop/replace policy to avoid duplicates
drop policy if exists students_visible_to_principal_or_super on public.students;
create policy students_visible_to_principal_or_super
on public.students
as permissive
for select
to authenticated
using (
  public.has_role_in_preschool(preschool_id, array['principal','principal_admin','super_admin'])
);

-- 4) Students: parent/guardian self-read (keep simple self policy)
drop policy if exists students_self_only on public.students;
create policy students_self_only
on public.students
as permissive
for select
to authenticated
using (
  auth.uid() = parent_id or auth.uid() = guardian_id
);

commit;

