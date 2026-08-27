begin;

-- DB-01 establishes the Supabase identity and care-assignment foundation.
-- Rollout: apply this migration before enabling Supabase-backed application reads.
-- Rollback: drop policies, tables, and private helpers in reverse dependency order;
-- preserve auth.users and review production data before any destructive rollback.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'familia'
    check (role in ('admin', 'familia', 'cuidador')),
  name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth_date date,
  address text,
  care_level text,
  condition_summary text,
  family_user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pendente'
    check (status in ('pendente', 'ativo', 'inativo')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.caregiver_assignments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  caregiver_user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date,
  active boolean not null default true,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint caregiver_assignments_date_order
    check (end_date is null or end_date >= start_date),
  constraint caregiver_assignments_patient_caregiver_start_key
    unique (patient_id, caregiver_user_id, start_date)
);

create index caregiver_assignments_patient_active_idx
  on public.caregiver_assignments (patient_id, active);
create index caregiver_assignments_caregiver_active_idx
  on public.caregiver_assignments (caregiver_user_id, active);
create index patients_family_user_idx on public.patients (family_user_id);

create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select p.role
  from public.profiles as p
  where p.id = auth.uid()
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
    where p.id = auth.uid()
  ), false)
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select coalesce(private.current_active(), false)
    and private.current_role() = 'admin'
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
      and p.family_user_id = auth.uid()
      and private.current_active()
      and private.current_role() = 'familia'
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
      and ca.caregiver_user_id = auth.uid()
      and ca.active = true
      and private.current_role() = 'cuidador'
      and ca.start_date <= (now() at time zone 'UTC')::date
      and (
        ca.end_date is null
        or ca.end_date >= (now() at time zone 'UTC')::date
      )
      and private.current_active()
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

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.patients from public, anon, authenticated;
revoke all on table public.caregiver_assignments from public, anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.patients to authenticated;
grant select, insert, update, delete on table public.caregiver_assignments to authenticated;

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.caregiver_assignments enable row level security;

create policy profiles_select_self_or_admin
on public.profiles for select to authenticated
using (id = auth.uid() or private.is_admin());

create policy profiles_insert_admin
on public.profiles for insert to authenticated
with check (private.is_admin());

create policy profiles_update_admin
on public.profiles for update to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy profiles_update_self
on public.profiles for update to authenticated
using (id = auth.uid() and private.current_active())
with check (
  id = auth.uid()
  and private.current_active()
  and role = private.current_role()
  and active = true
);

create policy profiles_delete_admin
on public.profiles for delete to authenticated
using (private.is_admin());

create policy patients_select_authorized
on public.patients for select to authenticated
using (
  private.is_admin()
  or private.is_patient_family(id)
  or private.is_active_caregiver(id)
);

create policy patients_insert_admin
on public.patients for insert to authenticated
with check (private.is_admin());

create policy patients_update_admin
on public.patients for update to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy patients_delete_admin
on public.patients for delete to authenticated
using (private.is_admin());

create policy assignments_select_authorized
on public.caregiver_assignments for select to authenticated
using (
  private.is_admin()
  or (
    caregiver_user_id = auth.uid()
    and private.current_active()
    and private.current_role() = 'cuidador'
  )
  or private.is_patient_family(patient_id)
);

create policy assignments_insert_admin
on public.caregiver_assignments for insert to authenticated
with check (private.is_admin());

create policy assignments_update_admin
on public.caregiver_assignments for update to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy assignments_delete_admin
on public.caregiver_assignments for delete to authenticated
using (private.is_admin());

commit;
