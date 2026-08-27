begin;

-- PERF-01 optimizes the DB-01 RLS paths without changing application data.
-- Rollout: apply after 20260827142537/db_01_supabase_foundation and
-- the production db_02_domain migration registered as 20260827163652.
-- Rollback: restore DB-01 policy/helper definitions and drop the new index only
-- after confirming that no foreign-key write path depends on it.

create index if not exists caregiver_assignments_assigned_by_idx
  on public.caregiver_assignments (assigned_by);

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.caregiver_assignments enable row level security;
alter table public.rate_limit_buckets enable row level security;

-- rate_limit_buckets is backend/service_role-only. Keep the client roles
-- without table grants and make the intentional authenticated denial explicit
-- for the RLS advisor; service_role remains governed by its existing backend
-- grant and bypass behavior.
drop policy if exists rate_limit_buckets_deny_authenticated
on public.rate_limit_buckets;

create policy rate_limit_buckets_deny_authenticated
on public.rate_limit_buckets for all to authenticated
using (false)
with check (false);

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.active = true
$$;

create or replace function private.current_active()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce((
    select p.active
    from public.profiles as p
    where p.id = (select auth.uid())
  ), false)
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select coalesce((select private.current_active()), false)
    and (select private.current_role()) = 'admin'
$$;

create or replace function private.is_patient_family(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.patients as p
    where p.id = target_patient_id
      and p.family_user_id = (select auth.uid())
      and (select private.current_active())
      and (select private.current_role()) = 'familia'
  )
$$;

create or replace function private.is_active_caregiver(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.caregiver_assignments as ca
    where ca.patient_id = target_patient_id
      and ca.caregiver_user_id = (select auth.uid())
      and ca.active = true
      and (select private.current_role()) = 'cuidador'
      and ca.start_date <= (now() at time zone 'UTC')::date
      and (
        ca.end_date is null
        or ca.end_date >= (now() at time zone 'UTC')::date
      )
      and (select private.current_active())
  )
$$;

revoke execute on function private.current_role() from public, anon;
revoke execute on function private.current_active() from public, anon;
revoke execute on function private.is_admin() from public, anon;
revoke execute on function private.is_patient_family(uuid) from public, anon;
revoke execute on function private.is_active_caregiver(uuid) from public, anon;
grant execute on function private.current_role() to authenticated;
grant execute on function private.current_active() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_patient_family(uuid) to authenticated;
grant execute on function private.is_active_caregiver(uuid) to authenticated;

alter policy profiles_select_self_or_admin
on public.profiles
using (id = (select auth.uid()) or (select private.is_admin()));

alter policy profiles_insert_admin
on public.profiles
with check ((select private.is_admin()));

drop policy if exists profiles_update_admin_or_self on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_update_self on public.profiles;

create policy profiles_update_admin_or_self
on public.profiles for update to authenticated
using (
  (select private.is_admin())
  or (
    id = (select auth.uid())
    and (select private.current_active())
  )
)
with check (
  (select private.is_admin())
  or (
    id = (select auth.uid())
    and (select private.current_active())
    and role = (select private.current_role())
    and active = true
  )
);

alter policy profiles_delete_admin
on public.profiles
using ((select private.is_admin()));

alter policy patients_select_authorized
on public.patients
using (
  (select private.is_admin())
  or private.is_patient_family(id)
  or private.is_active_caregiver(id)
);

alter policy patients_insert_admin
on public.patients
with check ((select private.is_admin()));

alter policy patients_update_admin
on public.patients
using ((select private.is_admin()))
with check ((select private.is_admin()));

alter policy patients_delete_admin
on public.patients
using ((select private.is_admin()));

alter policy assignments_select_authorized
on public.caregiver_assignments
using (
  (select private.is_admin())
  or (
    caregiver_user_id = (select auth.uid())
    and (select private.current_active())
    and (select private.current_role()) = 'cuidador'
  )
  or private.is_patient_family(patient_id)
);

alter policy assignments_insert_admin
on public.caregiver_assignments
with check ((select private.is_admin()));

alter policy assignments_update_admin
on public.caregiver_assignments
using ((select private.is_admin()))
with check ((select private.is_admin()));

alter policy assignments_delete_admin
on public.caregiver_assignments
using ((select private.is_admin()));

commit;
