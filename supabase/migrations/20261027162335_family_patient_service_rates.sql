begin;

create table public.family_patient_service_rates (
  id uuid primary key default gen_random_uuid(),
  family_user_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  profession text not null check (profession in ('cuidador', 'tecnico_enfermagem', 'enfermeiro', 'outros')),
  amount_cents integer not null check (amount_cents between 1 and 100000000),
  valid_from date not null,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_patient_service_rates_valid_dates check (valid_to is null or valid_to >= valid_from)
);

create index family_patient_service_rates_lookup_idx
  on public.family_patient_service_rates (family_user_id, patient_id, profession, valid_from desc);

alter table public.caregiver_schedule_entries
  add column payroll_rate_status text not null default 'valor_pendente'
    check (payroll_rate_status in ('valor_pendente', 'gerado'));

update public.caregiver_schedule_entries as entry
set payroll_rate_status = 'gerado'
where exists (
  select 1
  from public.finance_expenses as expense
  where expense.caregiver_schedule_entry_id = entry.id
);

alter table public.family_patient_service_rates enable row level security;
grant select, insert, update, delete on table public.family_patient_service_rates to authenticated, service_role;

create policy family_patient_service_rates_admin_all
on public.family_patient_service_rates
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create or replace function private.validate_family_patient_service_rate()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.patients as patient
    join public.profiles as family on family.id = patient.family_user_id
    where patient.id = new.patient_id
      and patient.family_user_id = new.family_user_id
      and family.role = 'familia'
      and family.active
  ) then
    raise exception using errcode = '23514', message = 'RATE_FAMILY_PATIENT_MISMATCH';
  end if;

  if exists (
    select 1
    from public.family_patient_service_rates as existing
    where existing.id is distinct from new.id
      and existing.family_user_id = new.family_user_id
      and existing.patient_id = new.patient_id
      and existing.profession = new.profession
      and new.valid_from <= coalesce(existing.valid_to, 'infinity'::date)
      and existing.valid_from <= coalesce(new.valid_to, 'infinity'::date)
  ) then
    raise exception using errcode = '23P01', message = 'RATE_VALIDITY_OVERLAP';
  end if;

  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create trigger family_patient_service_rates_validate
before insert or update on public.family_patient_service_rates
for each row execute function private.validate_family_patient_service_rate();

create or replace function private.sync_caregiver_schedule_payroll(target_schedule_entry_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  shift_date date;
  schedule_created_by uuid;
  target_caregiver_user_id uuid;
  caregiver_name text;
  patient_name text;
  shift_rate_cents integer;
  has_manual_or_paid_expense boolean;
begin
  select entry.scheduled_date,
         entry.created_by,
         assignment.caregiver_user_id,
         coalesce(caregiver.name, 'Profissional'),
         coalesce(patient.name, 'Paciente'),
         rate.amount_cents
    into shift_date,
         schedule_created_by,
         target_caregiver_user_id,
         caregiver_name,
         patient_name,
         shift_rate_cents
    from public.caregiver_schedule_entries as entry
    join public.caregiver_assignments as assignment
      on assignment.id = entry.caregiver_assignment_id
    left join public.patients as patient
      on patient.id = assignment.patient_id
    left join public.caregiver_profiles as caregiver
      on caregiver.user_id = assignment.caregiver_user_id
    left join lateral (
      select configured_rate.amount_cents
      from public.family_patient_service_rates as configured_rate
      where configured_rate.family_user_id = patient.family_user_id
        and configured_rate.patient_id = patient.id
        and configured_rate.profession = entry.profession
        and entry.scheduled_date between configured_rate.valid_from and coalesce(configured_rate.valid_to, 'infinity'::date)
      order by configured_rate.valid_from desc
      limit 1
    ) as rate on true
    where entry.id = target_schedule_entry_id;

  if not found then
    delete from public.finance_expenses as expense
    where expense.caregiver_schedule_entry_id = target_schedule_entry_id
      and expense.paid_on is null
      and not expense.caregiver_payroll_amount_overridden;
    return;
  end if;

  select exists (
    select 1
    from public.finance_expenses as expense
    where expense.caregiver_schedule_entry_id = target_schedule_entry_id
      and (expense.paid_on is not null or expense.caregiver_payroll_amount_overridden)
  ) into has_manual_or_paid_expense;

  update public.caregiver_schedule_entries
  set payroll_rate_status = case
    when (shift_rate_cents is not null and shift_rate_cents > 0) or has_manual_or_paid_expense then 'gerado'
    else 'valor_pendente'
  end
  where id = target_schedule_entry_id;

  if shift_rate_cents is null or shift_rate_cents <= 0 then
    delete from public.finance_expenses as expense
    where expense.caregiver_schedule_entry_id = target_schedule_entry_id
      and expense.paid_on is null
      and not expense.caregiver_payroll_amount_overridden;
    return;
  end if;

  insert into public.finance_expenses (
    expense_date,
    category,
    description,
    amount_cents,
    paid_on,
    caregiver_schedule_entry_id,
    caregiver_user_id,
    payee,
    created_by
  ) values (
    shift_date,
    'equipe',
    'Plantão — ' || caregiver_name || ' · ' || patient_name,
    shift_rate_cents,
    null,
    target_schedule_entry_id,
    target_caregiver_user_id,
    caregiver_name,
    schedule_created_by
  )
  on conflict (caregiver_schedule_entry_id) do update
    set expense_date = excluded.expense_date,
        description = excluded.description,
        amount_cents = case
          when finance_expenses.caregiver_payroll_amount_overridden then finance_expenses.amount_cents
          else excluded.amount_cents
        end,
        caregiver_user_id = excluded.caregiver_user_id,
        payee = excluded.payee,
        updated_at = pg_catalog.now()
    where finance_expenses.paid_on is null;
end;
$$;

create or replace function private.sync_caregiver_schedule_payroll_trigger()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.finance_expenses as expense
    where expense.caregiver_schedule_entry_id = old.id
      and expense.paid_on is null
      and not expense.caregiver_payroll_amount_overridden;
    return old;
  end if;

  perform private.sync_caregiver_schedule_payroll(new.id);
  return new;
end;
$$;

create or replace function private.sync_caregiver_assignment_payroll()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  schedule_row record;
begin
  for schedule_row in
    select entry.id
    from public.caregiver_schedule_entries as entry
    where entry.caregiver_assignment_id = new.id
  loop
    perform private.sync_caregiver_schedule_payroll(schedule_row.id);
  end loop;
  return new;
end;
$$;

create or replace function private.sync_family_patient_service_rate_payroll()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  target_patient_id uuid;
  target_profession text;
  schedule_row record;
begin
  if tg_op = 'DELETE' then
    target_patient_id := old.patient_id;
    target_profession := old.profession;
  else
    target_patient_id := new.patient_id;
    target_profession := new.profession;
  end if;

  for schedule_row in
    select entry.id
    from public.caregiver_schedule_entries as entry
    join public.caregiver_assignments as assignment
      on assignment.id = entry.caregiver_assignment_id
    where assignment.patient_id = target_patient_id
      and entry.profession = target_profession
      and entry.scheduled_date >= pg_catalog.timezone('America/Sao_Paulo', pg_catalog.statement_timestamp())::date
  loop
    perform private.sync_caregiver_schedule_payroll(schedule_row.id);
  end loop;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.sync_patient_family_payroll()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  schedule_row record;
begin
  for schedule_row in
    select entry.id
    from public.caregiver_schedule_entries as entry
    join public.caregiver_assignments as assignment
      on assignment.id = entry.caregiver_assignment_id
    where assignment.patient_id = new.id
      and entry.scheduled_date >= pg_catalog.timezone('America/Sao_Paulo', pg_catalog.statement_timestamp())::date
  loop
    perform private.sync_caregiver_schedule_payroll(schedule_row.id);
  end loop;
  return new;
end;
$$;

drop trigger if exists caregiver_profiles_sync_payroll_insert on public.caregiver_profiles;
drop trigger if exists caregiver_profiles_sync_payroll_update on public.caregiver_profiles;
drop function if exists private.sync_caregiver_profile_payroll();
drop trigger if exists caregiver_schedule_entries_sync_payroll_update on public.caregiver_schedule_entries;

create trigger caregiver_schedule_entries_sync_payroll_update
after update of caregiver_assignment_id, scheduled_date, profession
on public.caregiver_schedule_entries
for each row execute function private.sync_caregiver_schedule_payroll_trigger();

create trigger family_patient_service_rates_sync_payroll_insert
after insert on public.family_patient_service_rates
for each row execute function private.sync_family_patient_service_rate_payroll();

create trigger family_patient_service_rates_sync_payroll_update
after update of amount_cents, valid_from, valid_to
on public.family_patient_service_rates
for each row execute function private.sync_family_patient_service_rate_payroll();

create trigger family_patient_service_rates_sync_payroll_delete
after delete on public.family_patient_service_rates
for each row execute function private.sync_family_patient_service_rate_payroll();

create trigger patients_sync_family_payroll
after update of family_user_id on public.patients
for each row
when (old.family_user_id is distinct from new.family_user_id)
execute function private.sync_patient_family_payroll();

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
  local_today date := pg_catalog.timezone('America/Sao_Paulo', pg_catalog.statement_timestamp())::date;
  selected_rate record;
begin
  if not coalesce((select private.is_admin()), false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if p_effective_from is null or p_effective_from < local_today then
    raise exception using errcode = '22023', message = 'RATE_EFFECTIVE_DATE_INVALID';
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
    and valid_from >= p_effective_from;

  update public.family_patient_service_rates
  set valid_to = p_effective_from - 1
  where family_user_id = p_family_user_id
    and patient_id = p_patient_id
    and valid_from < p_effective_from
    and (valid_to is null or valid_to >= p_effective_from);

  for selected_rate in
    select rate_item.item->>'profession' as profession,
           (rate_item.item->>'amount_cents')::integer as amount_cents
    from jsonb_array_elements(p_rates) as rate_item(item)
  loop
    insert into public.family_patient_service_rates (
      family_user_id, patient_id, profession, amount_cents, valid_from
    ) values (
      p_family_user_id, p_patient_id, selected_rate.profession,
      selected_rate.amount_cents, p_effective_from
    );
  end loop;
end;
$$;

revoke all on function private.validate_family_patient_service_rate() from public, anon;
revoke all on function private.sync_caregiver_schedule_payroll(uuid) from public, anon;
revoke all on function private.sync_caregiver_schedule_payroll_trigger() from public, anon;
revoke all on function private.sync_caregiver_assignment_payroll() from public, anon;
revoke all on function private.sync_family_patient_service_rate_payroll() from public, anon;
revoke all on function private.sync_patient_family_payroll() from public, anon;
revoke all on function public.save_family_patient_service_rates(uuid, uuid, date, jsonb) from public, anon;
grant execute on function private.validate_family_patient_service_rate() to authenticated, service_role;
grant execute on function private.sync_caregiver_schedule_payroll(uuid) to authenticated, service_role;
grant execute on function private.sync_caregiver_schedule_payroll_trigger() to authenticated, service_role;
grant execute on function private.sync_caregiver_assignment_payroll() to authenticated, service_role;
grant execute on function private.sync_family_patient_service_rate_payroll() to authenticated, service_role;
grant execute on function private.sync_patient_family_payroll() to authenticated, service_role;
grant execute on function public.save_family_patient_service_rates(uuid, uuid, date, jsonb) to authenticated, service_role;

do $$
declare
  schedule_row record;
  local_today date := pg_catalog.timezone('America/Sao_Paulo', pg_catalog.statement_timestamp())::date;
begin
  delete from public.finance_expenses as expense
  using public.caregiver_schedule_entries as entry
  where expense.caregiver_schedule_entry_id = entry.id
    and entry.scheduled_date >= local_today
    and expense.paid_on is null
    and not expense.caregiver_payroll_amount_overridden;

  update public.caregiver_schedule_entries
  set payroll_rate_status = 'valor_pendente'
  where scheduled_date >= local_today;

  for schedule_row in
    select entry.id
    from public.caregiver_schedule_entries as entry
    where entry.scheduled_date >= local_today
  loop
    perform private.sync_caregiver_schedule_payroll(schedule_row.id);
  end loop;
end;
$$;

commit;
