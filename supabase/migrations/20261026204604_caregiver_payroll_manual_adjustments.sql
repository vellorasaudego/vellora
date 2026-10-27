begin;

alter table public.finance_expenses
  add column caregiver_payroll_amount_overridden boolean not null default false;

create index finance_expenses_caregiver_user_idx
  on public.finance_expenses (caregiver_user_id);

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

  if not found then
    delete from public.finance_expenses as expense
    where expense.caregiver_schedule_entry_id = target_schedule_entry_id
      and expense.paid_on is null;
    return;
  end if;

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
        amount_cents = case
          when finance_expenses.caregiver_payroll_amount_overridden
            then finance_expenses.amount_cents
          else excluded.amount_cents
        end,
        caregiver_user_id = excluded.caregiver_user_id,
        payee = excluded.payee,
        updated_at = pg_catalog.now()
    where finance_expenses.paid_on is null;
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
      and expense.paid_on is null
      and not expense.caregiver_payroll_amount_overridden;
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

update public.caregiver_profiles
set weekday_shift_rate_cents = coalesce(weekday_shift_rate_cents, sunday_shift_rate_cents),
    sunday_shift_rate_cents = coalesce(weekday_shift_rate_cents, sunday_shift_rate_cents)
where weekday_shift_rate_cents is distinct from sunday_shift_rate_cents;

commit;
