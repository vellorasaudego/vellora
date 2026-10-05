begin;

-- Schedule entries belong to one exact patient-professional assignment. This
-- keeps a professional's view scoped to their own assignment, even when other
-- professionals are scheduled for the same patient and date.
create table public.caregiver_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  caregiver_assignment_id uuid not null
    references public.caregiver_assignments(id) on delete restrict,
  scheduled_date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  ends_next_day boolean not null default false,
  profession text not null
    check (profession in ('cuidador', 'tecnico_enfermagem', 'enfermeiro', 'outros')),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint caregiver_schedule_entries_time_order
    check (
      (not ends_next_day and end_time > start_time)
      or (ends_next_day and end_time <= start_time)
    )
);

create index caregiver_schedule_entries_assignment_date_idx
  on public.caregiver_schedule_entries (caregiver_assignment_id, scheduled_date, start_time);
create index caregiver_schedule_entries_date_idx
  on public.caregiver_schedule_entries (scheduled_date, caregiver_assignment_id);

-- Serialize schedule writes per professional before checking overlaps. This
-- closes the read-then-write race when two admins save shifts concurrently.
create or replace function private.prevent_caregiver_schedule_overlap()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  target_caregiver_user_id uuid;
  old_caregiver_user_id uuid;
  lock_user_id uuid;
  new_start timestamp without time zone;
  new_end timestamp without time zone;
begin
  select ca.caregiver_user_id
    into target_caregiver_user_id
    from public.caregiver_assignments as ca
    where ca.id = new.caregiver_assignment_id
    for key share;

  if tg_op = 'UPDATE' then
    select ca.caregiver_user_id
      into old_caregiver_user_id
      from public.caregiver_assignments as ca
      where ca.id = old.caregiver_assignment_id
      for key share;
  end if;

  new_start := new.scheduled_date + new.start_time;
  new_end := new.scheduled_date + new.end_time
    + case when new.ends_next_day then interval '1 day' else interval '0 days' end;

  for lock_user_id in
    select distinct candidates.user_id
    from unnest(array[target_caregiver_user_id, old_caregiver_user_id]) as candidates(user_id)
    where candidates.user_id is not null
    order by candidates.user_id
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(lock_user_id::text, 0)
    );
  end loop;

  if exists (
    select 1
    from public.caregiver_schedule_entries as existing_entry
    join public.caregiver_assignments as existing_assignment
      on existing_assignment.id = existing_entry.caregiver_assignment_id
    where existing_entry.id <> new.id
      and existing_assignment.caregiver_user_id = target_caregiver_user_id
      and (existing_entry.scheduled_date + existing_entry.start_time) < new_end
      and new_start < (
        existing_entry.scheduled_date + existing_entry.end_time
        + case when existing_entry.ends_next_day then interval '1 day' else interval '0 days' end
      )
  ) then
    raise exception using
      errcode = '23P01',
      message = 'SCHEDULE_OVERLAP_CONFLICT';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_caregiver_schedule_overlap() from public, anon;
grant execute on function private.prevent_caregiver_schedule_overlap() to authenticated;

create trigger caregiver_schedule_entries_prevent_overlap
before insert or update of caregiver_assignment_id, scheduled_date, start_time, end_time, ends_next_day
on public.caregiver_schedule_entries
for each row execute function private.prevent_caregiver_schedule_overlap();

create or replace function private.can_read_caregiver_schedule(
  target_assignment_id uuid,
  target_scheduled_date date
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.caregiver_assignments as ca
    join public.profiles as professional
      on professional.id = ca.caregiver_user_id
    where ca.id = target_assignment_id
      and ca.caregiver_user_id = (select auth.uid())
      and ca.start_date <= target_scheduled_date
      and (ca.end_date is null or ca.end_date >= target_scheduled_date)
      and professional.role = 'cuidador'
      and professional.active = true
      and (select private.current_active())
      and (select private.current_role()) = 'cuidador'
  )
$$;

revoke execute on function private.can_read_caregiver_schedule(uuid, date) from public, anon;
grant execute on function private.can_read_caregiver_schedule(uuid, date) to authenticated;

revoke all on table public.caregiver_schedule_entries from public, anon, authenticated;
grant select, insert, update, delete on table public.caregiver_schedule_entries to authenticated, service_role;

alter table public.caregiver_schedule_entries enable row level security;

create policy caregiver_schedule_entries_select_admin_or_owner
on public.caregiver_schedule_entries for select to authenticated
using (
  (select private.is_admin())
  or private.can_read_caregiver_schedule(caregiver_assignment_id, scheduled_date)
);

create policy caregiver_schedule_entries_insert_admin
on public.caregiver_schedule_entries for insert to authenticated
with check ((select private.is_admin()));

create policy caregiver_schedule_entries_update_admin
on public.caregiver_schedule_entries for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy caregiver_schedule_entries_delete_admin
on public.caregiver_schedule_entries for delete to authenticated
using ((select private.is_admin()));

commit;
