-- Parent and Teacher Onboarding Schema (draft)
-- Creates guardian_requests (parent join) and teacher_invites (teacher onboarding)
-- NOTE: Apply via your standard migration process in Supabase

begin;

-- Guardian Requests
create table if not exists public.guardian_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.preschools(id) on delete cascade,
  parent_auth_id uuid references auth.users(id) on delete cascade,
  parent_email text,
  student_id uuid references public.students(id) on delete set null,
  child_full_name text,
  child_class text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id)
);

-- Teacher Invites
create table if not exists public.teacher_invites (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.preschools(id) on delete cascade,
  email text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid not null references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz
);

-- Indexes
create index if not exists idx_guardian_requests_school on public.guardian_requests(school_id);
create index if not exists idx_guardian_requests_parent on public.guardian_requests(parent_auth_id);
create index if not exists idx_teacher_invites_school on public.teacher_invites(school_id);
create index if not exists idx_teacher_invites_email on public.teacher_invites(email);

-- Enable RLS
alter table public.guardian_requests enable row level security;
alter table public.teacher_invites enable row level security;

-- Helper to check current user
create or replace function public.uid()
returns uuid language sql stable as $$ select auth.uid() $$;

-- RLS Policies for guardian_requests
-- Parents: insert/select own requests
create policy guardian_req_parent_insert on public.guardian_requests
  for insert with check (parent_auth_id = public.uid());
create policy guardian_req_parent_select on public.guardian_requests
  for select using (parent_auth_id = public.uid());

-- Principals: select/manage requests for their school
create policy guardian_req_principal_select on public.guardian_requests
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = public.uid()
        and p.role in ('principal','principal_admin','super_admin')
        and p.preschool_id = guardian_requests.school_id
    )
  );
create policy guardian_req_principal_update on public.guardian_requests
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = public.uid()
        and p.role in ('principal','principal_admin','super_admin')
        and p.preschool_id = guardian_requests.school_id
    )
  );

-- RLS Policies for teacher_invites
-- Principals: manage invites in their school
create policy teacher_inv_principal_all on public.teacher_invites
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = public.uid()
        and p.role in ('principal','principal_admin','super_admin')
        and p.preschool_id = teacher_invites.school_id
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = public.uid()
        and p.role in ('principal','principal_admin','super_admin')
        and p.preschool_id = teacher_invites.school_id
    )
  );

commit;