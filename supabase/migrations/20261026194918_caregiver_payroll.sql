begin;

grant usage on schema private to authenticated, service_role;
grant select on table public.caregiver_assignments to service_role;
grant select, insert, update, delete on table public.finance_expenses to service_role;

alter table public.caregiver_profiles
  add column weekday_shift_rate_cents integer,
  add column sunday_shift_rate_cents integer,
  add constraint caregiver_profiles_shift_rates_nonnegative check (
    (weekday_shift_rate_cents is null or weekday_shift_rate_cents >= 0)
    and (sunday_shift_rate_cents is null or sunday_shift_rate_cents >= 0)
  );

alter table public.finance_expenses
  add column caregiver_schedule_entry_id uuid,
  add column caregiver_user_id uuid,
  add column payee text,
  add constraint finance_expenses_schedule_entry_fk
    foreign key (caregiver_schedule_entry_id)
    references public.caregiver_schedule_entries(id) on delete set null,
  add constraint finance_expenses_caregiver_user_fk
    foreign key (caregiver_user_id)
    references public.profiles(id) on delete set null;

alter table public.finance_expenses
  drop constraint if exists finance_expenses_category_check,
  add constraint finance_expenses_category_check
    check (category in ('marketing', 'sistema', 'contabilidade', 'impostos', 'equipe', 'operacao', 'outros'));

create unique index finance_expenses_schedule_entry_unique
  on public.finance_expenses (caregiver_schedule_entry_id);

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
  shift_rate_cents integer;
begin
  select entry.scheduled_date,
         entry.created_by,
         assignment.caregiver_user_id,
         caregiver.name,
         case
           when extract(dow from entry.scheduled_date) = 0 then caregiver.sunday_shift_rate_cents
           else caregiver.weekday_shift_rate_cents
         end
    into shift_date,
         schedule_created_by,
         target_caregiver_user_id,
         caregiver_name,
         shift_rate_cents
    from public.caregiver_schedule_entries as entry
    join public.caregiver_assignments as assignment
      on assignment.id = entry.caregiver_assignment_id
    left join public.caregiver_profiles as caregiver
      on caregiver.user_id = assignment.caregiver_user_id
    where entry.id = target_schedule_entry_id;

  if not found or shift_rate_cents is null or shift_rate_cents <= 0 then
    delete from public.finance_expenses as expense
    where expense.caregiver_schedule_entry_id = target_schedule_entry_id
      and expense.paid_on is null;
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
    'Plantão — ' || caregiver_name,
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
        amount_cents = excluded.amount_cents,
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
      and expense.paid_on is null;
    return old;
  end if;

  perform private.sync_caregiver_schedule_payroll(new.id);
  return new;
end;
$$;

create or replace function private.prevent_paid_caregiver_schedule_change()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if (new.scheduled_date is distinct from old.scheduled_date
      or new.caregiver_assignment_id is distinct from old.caregiver_assignment_id)
     and exists (
       select 1
       from public.finance_expenses as expense
       where expense.caregiver_schedule_entry_id = old.id
         and expense.paid_on is not null
     ) then
    raise exception using
      errcode = '23514',
      message = 'PAYROLL_PAID_SCHEDULE_CONFLICT';
  end if;
  return new;
end;
$$;

create or replace function private.sync_caregiver_profile_payroll()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  current_month_start date := pg_catalog.date_trunc(
    'month',
    pg_catalog.timezone('America/Sao_Paulo', pg_catalog.statement_timestamp())
  )::date;
  schedule_row record;
begin
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id and old.user_id is not null then
    delete from public.finance_expenses as expense
    using public.caregiver_schedule_entries as entry,
          public.caregiver_assignments as assignment
    where expense.caregiver_schedule_entry_id = entry.id
      and entry.caregiver_assignment_id = assignment.id
      and assignment.caregiver_user_id = old.user_id
      and entry.scheduled_date >= current_month_start
      and expense.paid_on is null;
  end if;

  if new.user_id is null then
    return new;
  end if;

  for schedule_row in
    select entry.id
    from public.caregiver_schedule_entries as entry
    join public.caregiver_assignments as assignment
      on assignment.id = entry.caregiver_assignment_id
    where assignment.caregiver_user_id = new.user_id
      and entry.scheduled_date >= current_month_start
  loop
    perform private.sync_caregiver_schedule_payroll(schedule_row.id);
  end loop;

  return new;
end;
$$;

create or replace function private.prevent_paid_caregiver_assignment_change()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.caregiver_user_id is distinct from old.caregiver_user_id
     and exists (
       select 1
       from public.caregiver_schedule_entries as entry
       join public.finance_expenses as expense
         on expense.caregiver_schedule_entry_id = entry.id
       where entry.caregiver_assignment_id = old.id
         and expense.paid_on is not null
     ) then
    raise exception using
      errcode = '23514',
      message = 'PAYROLL_PAID_SCHEDULE_CONFLICT';
  end if;
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

revoke all on function private.sync_caregiver_schedule_payroll(uuid) from public, anon;
revoke all on function private.sync_caregiver_schedule_payroll_trigger() from public, anon;
revoke all on function private.prevent_paid_caregiver_schedule_change() from public, anon;
revoke all on function private.sync_caregiver_profile_payroll() from public, anon;
revoke all on function private.prevent_paid_caregiver_assignment_change() from public, anon;
revoke all on function private.sync_caregiver_assignment_payroll() from public, anon;
grant execute on function private.sync_caregiver_schedule_payroll(uuid) to authenticated, service_role;
grant execute on function private.sync_caregiver_schedule_payroll_trigger() to authenticated, service_role;
grant execute on function private.prevent_paid_caregiver_schedule_change() to authenticated, service_role;
grant execute on function private.sync_caregiver_profile_payroll() to authenticated, service_role;
grant execute on function private.prevent_paid_caregiver_assignment_change() to authenticated, service_role;
grant execute on function private.sync_caregiver_assignment_payroll() to authenticated, service_role;

create trigger caregiver_schedule_entries_prevent_paid_payroll_change
before update of caregiver_assignment_id, scheduled_date
on public.caregiver_schedule_entries
for each row execute function private.prevent_paid_caregiver_schedule_change();

create trigger caregiver_schedule_entries_sync_payroll_insert
after insert on public.caregiver_schedule_entries
for each row execute function private.sync_caregiver_schedule_payroll_trigger();

create trigger caregiver_schedule_entries_sync_payroll_update
after update of caregiver_assignment_id, scheduled_date
on public.caregiver_schedule_entries
for each row execute function private.sync_caregiver_schedule_payroll_trigger();

create trigger caregiver_schedule_entries_sync_payroll_delete
before delete on public.caregiver_schedule_entries
for each row execute function private.sync_caregiver_schedule_payroll_trigger();

create trigger caregiver_profiles_sync_payroll_insert
after insert on public.caregiver_profiles
for each row execute function private.sync_caregiver_profile_payroll();

create trigger caregiver_profiles_sync_payroll_update
after update of user_id, name, weekday_shift_rate_cents, sunday_shift_rate_cents
on public.caregiver_profiles
for each row execute function private.sync_caregiver_profile_payroll();

create trigger caregiver_assignments_prevent_paid_payroll_change
before update of caregiver_user_id on public.caregiver_assignments
for each row execute function private.prevent_paid_caregiver_assignment_change();

create trigger caregiver_assignments_sync_payroll
after update of caregiver_user_id on public.caregiver_assignments
for each row execute function private.sync_caregiver_assignment_payroll();

do $$
declare
  schedule_row record;
  current_month_start date := pg_catalog.date_trunc(
    'month',
    pg_catalog.timezone('America/Sao_Paulo', pg_catalog.statement_timestamp())
  )::date;
begin
  for schedule_row in
    select entry.id
    from public.caregiver_schedule_entries as entry
    join public.caregiver_assignments as assignment
      on assignment.id = entry.caregiver_assignment_id
    join public.caregiver_profiles as caregiver
      on caregiver.user_id = assignment.caregiver_user_id
    where entry.scheduled_date >= current_month_start
      and case
        when extract(dow from entry.scheduled_date) = 0 then caregiver.sunday_shift_rate_cents
        else caregiver.weekday_shift_rate_cents
      end > 0
  loop
    perform private.sync_caregiver_schedule_payroll(schedule_row.id);
  end loop;
end;
$$;

commit;
