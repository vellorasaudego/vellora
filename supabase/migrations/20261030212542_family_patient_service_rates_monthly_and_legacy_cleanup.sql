-- A tariff is a monthly competence. Any day sent by an older client is
-- normalized to the first day of that month before the RPC writes the rate.
create or replace function private.sync_family_patient_service_rate_payroll()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  target_patient_id uuid;
  target_profession text;
  sync_from date;
  sync_through date;
  local_today date := pg_catalog.timezone('America/Sao_Paulo', pg_catalog.statement_timestamp())::date;
  schedule_row record;
begin
  if tg_op = 'DELETE' then
    target_patient_id := old.patient_id;
    target_profession := old.profession;
    -- Removing a tariff must not erase obligations from earlier dates.
    sync_from := greatest(old.valid_from, local_today);
    sync_through := old.valid_to;
  else
    target_patient_id := new.patient_id;
    target_profession := new.profession;
    sync_from := new.valid_from;
    sync_through := new.valid_to;
    if tg_op = 'UPDATE' then
      sync_from := least(old.valid_from, new.valid_from);
    end if;
  end if;

  if sync_through is not null and sync_through < sync_from then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  for schedule_row in
    select entry.id
    from public.caregiver_schedule_entries as entry
    join public.caregiver_assignments as assignment
      on assignment.id = entry.caregiver_assignment_id
    where assignment.patient_id = target_patient_id
      and entry.profession = target_profession
      and entry.scheduled_date >= sync_from
      and (sync_through is null or entry.scheduled_date <= sync_through)
  loop
    perform private.sync_caregiver_schedule_payroll(schedule_row.id);
  end loop;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.save_family_patient_service_rates(
  p_family_user_id uuid,
  p_patient_id uuid,
  p_effective_from date,
  p_rates jsonb
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_month_start date := pg_catalog.date_trunc('month', pg_catalog.timezone('America/Sao_Paulo', pg_catalog.statement_timestamp()))::date;
  effective_month_start date;
  selected_rate record;
begin
  if not coalesce((select private.is_admin()), false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if p_effective_from is null then
    raise exception using errcode = '22023', message = 'RATE_COMPETENCE_INVALID';
  end if;
  effective_month_start := pg_catalog.date_trunc('month', p_effective_from::timestamp)::date;
  if effective_month_start < current_month_start then
    raise exception using errcode = '22023', message = 'RATE_COMPETENCE_INVALID';
  end if;
  if jsonb_typeof(p_rates) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'RATE_LIST_INVALID';
  end if;
  if not exists (
    select 1
    from public.patients as patient
    join public.profiles as family on family.id = patient.family_user_id
    where patient.id = p_patient_id
      and patient.family_user_id = p_family_user_id
      and family.role = 'familia'
      and family.active
  ) then
    raise exception using errcode = '23514', message = 'RATE_FAMILY_PATIENT_MISMATCH';
  end if;
  if exists (
    select rate_item.item->>'profession'
    from jsonb_array_elements(p_rates) as rate_item(item)
    group by rate_item.item->>'profession'
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'RATE_DUPLICATE_PROFESSION';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_rates) as rate_item(item)
    where rate_item.item->>'profession' not in ('cuidador', 'tecnico_enfermagem', 'enfermeiro', 'outros')
       or coalesce(rate_item.item->>'amount_cents', '') !~ '^[1-9][0-9]{0,8}$'
  ) then
    raise exception using errcode = '22023', message = 'RATE_VALUE_INVALID';
  end if;

  delete from public.family_patient_service_rates
  where family_user_id = p_family_user_id
    and patient_id = p_patient_id
    and valid_from >= effective_month_start;

  update public.family_patient_service_rates
  set valid_to = effective_month_start - 1
  where family_user_id = p_family_user_id
    and patient_id = p_patient_id
    and valid_from < effective_month_start
    and (valid_to is null or valid_to >= effective_month_start);

  for selected_rate in
    select rate_item.item->>'profession' as profession,
           (rate_item.item->>'amount_cents')::integer as amount_cents
    from jsonb_array_elements(p_rates) as rate_item(item)
  loop
    insert into public.family_patient_service_rates (
      family_user_id, patient_id, profession, amount_cents, valid_from
    ) values (
      p_family_user_id, p_patient_id, selected_rate.profession,
      selected_rate.amount_cents, effective_month_start
    );
  end loop;
end;
$$;

-- Retire the old caregiver-wide values. They have no patient/family scope and
-- are no longer read by application code or payroll synchronization.
alter table public.caregiver_profiles
  drop constraint if exists caregiver_profiles_shift_rates_nonnegative;

alter table public.caregiver_profiles
  drop column if exists weekday_shift_rate_cents,
  drop column if exists sunday_shift_rate_cents;
