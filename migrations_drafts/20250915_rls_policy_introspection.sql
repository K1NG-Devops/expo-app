-- RLS policy introspection RPC (optional)
-- Creates a function to return policies from pg_catalog for public schema via PostgREST

create or replace function public.get_public_rls_policies()
returns table (
  schemaname text,
  tablename text,
  policyname text,
  cmd text,
  roles name[],
  permissive boolean
) language sql security definer as $$
  select p.schemaname, p.tablename, p.policyname, p.cmd, p.roles, p.permissive
  from pg_catalog.pg_policies p
  where p.schemaname = 'public'
  order by p.tablename, p.policyname;
$$;

grant execute on function public.get_public_rls_policies() to anon, authenticated, service_role;