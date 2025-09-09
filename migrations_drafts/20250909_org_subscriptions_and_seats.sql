-- Draft migration: org-owned subscriptions & seats
-- NOTE: Apply this via your Supabase migrations in the edudash-mobile-standalone project.

-- Owner type enum
create type if not exists subscription_owner_type as enum ('user','school');

-- Adjust columns as per your existing subscriptions structure
alter table public.subscriptions
  add column if not exists owner_type subscription_owner_type not null default 'user',
  add column if not exists user_id uuid references auth.users(id),
  add column if not exists school_id uuid references public.preschools(id),
  add column if not exists seats_total int not null default 1,
  add column if not exists seats_used int not null default 0;

-- Consistency check
do $$ begin
  alter table public.subscriptions
  add constraint if not exists owner_consistency check (
    (owner_type = 'user' and user_id is not null and school_id is null) or
    (owner_type = 'school' and school_id is not null and user_id is null)
  );
exception when others then null; end $$;

-- Seat assignments
create table if not exists public.subscription_seats (
  subscription_id uuid references public.subscriptions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (subscription_id, user_id)
);

-- Trigger helpers to keep seats_used in sync
create or replace function public.bump_seats_used()
returns trigger as $$
begin
  update public.subscriptions s
    set seats_used = (
      select count(*) from public.subscription_seats ss where ss.subscription_id = s.id
    )
  where s.id = coalesce(new.subscription_id, old.subscription_id);
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists subscription_seats_after_insert on public.subscription_seats;
create trigger subscription_seats_after_insert
after insert on public.subscription_seats
for each row execute function public.bump_seats_used();

drop trigger if exists subscription_seats_after_delete on public.subscription_seats;
create trigger subscription_seats_after_delete
after delete on public.subscription_seats
for each row execute function public.bump_seats_used();

-- RLS
alter table public.subscriptions enable row level security;
alter table public.subscription_seats enable row level security;

-- Helper: super admin check (adjust to your roles model if already exists)
create or replace function public.app_is_super_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin'
  );
$$;

-- Helper: is principal/admin of a school
create or replace function public.app_is_school_admin(target_school uuid)
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.preschool_id = target_school and p.role in ('principal','admin')
  );
$$;

-- Policies for subscriptions
create policy subscriptions_select_own on public.subscriptions
for select using (
  (owner_type = 'user' and user_id = auth.uid())
  or (owner_type = 'school' and public.app_is_school_admin(school_id))
  or public.app_is_super_admin()
);

create policy subscriptions_modify_own on public.subscriptions
for all using (
  (owner_type = 'user' and user_id = auth.uid())
  or (owner_type = 'school' and public.app_is_school_admin(school_id))
  or public.app_is_super_admin()
);

-- Policies for subscription_seats
create policy subscription_seats_select on public.subscription_seats
for select using (
  user_id = auth.uid()
  or public.app_is_super_admin()
  or exists (
    select 1 from public.subscriptions s
    where s.id = subscription_id and s.owner_type = 'school' and public.app_is_school_admin(s.school_id)
  )
);

create policy subscription_seats_modify on public.subscription_seats
for all using (
  public.app_is_super_admin()
  or exists (
    select 1 from public.subscriptions s
    where s.id = subscription_id and s.owner_type = 'school' and public.app_is_school_admin(s.school_id)
  )
);

-- RPCs
create or replace function public.assign_teacher_seat(p_subscription_id uuid, p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Only allow if caller can manage the subscription
  if not (
    exists (
      select 1 from public.subscriptions s where s.id = p_subscription_id and (
        public.app_is_super_admin() or (s.owner_type = 'school' and public.app_is_school_admin(s.school_id))
      )
    ) then
    raise exception 'not authorized';
  end if;

  insert into public.subscription_seats(subscription_id, user_id)
  values (p_subscription_id, p_user_id)
  on conflict do nothing;
end;
$$;

grant execute on function public.assign_teacher_seat(uuid, uuid) to authenticated;

create or replace function public.revoke_teacher_seat(p_subscription_id uuid, p_user_id uuid)
returns void language plpgsql security definer as $$
begin
  if not (
    exists (
      select 1 from public.subscriptions s where s.id = p_subscription_id and (
        public.app_is_super_admin() or (s.owner_type = 'school' and public.app_is_school_admin(s.school_id))
      )
    ) then
    raise exception 'not authorized';
  end if;

  delete from public.subscription_seats where subscription_id = p_subscription_id and user_id = p_user_id;
end;
$$;

grant execute on function public.revoke_teacher_seat(uuid, uuid) to authenticated;

