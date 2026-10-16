begin;

create table public.finance_charges (
  id uuid primary key default gen_random_uuid(),
  label text not null check (length(trim(label)) between 1 and 180),
  competence_month date not null
    check (extract(day from competence_month) = 1),
  due_date date not null,
  amount_cents integer not null check (amount_cents > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index finance_charges_month_due_idx
  on public.finance_charges (competence_month, due_date);

create table public.finance_receipts (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null
    references public.finance_charges(id) on delete cascade,
  received_on date not null,
  amount_cents integer not null check (amount_cents > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index finance_receipts_charge_date_idx
  on public.finance_receipts (charge_id, received_on);
create index finance_receipts_date_idx
  on public.finance_receipts (received_on);

create table public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category text not null
    check (category in ('marketing', 'sistema', 'contabilidade', 'impostos', 'operacao', 'outros')),
  description text not null check (length(trim(description)) between 1 and 180),
  amount_cents integer not null check (amount_cents > 0),
  paid_on date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index finance_expenses_date_idx
  on public.finance_expenses (expense_date);
create index finance_expenses_paid_on_idx
  on public.finance_expenses (paid_on);

create or replace function private.prevent_finance_receipt_overpayment()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  charge_amount integer;
  already_received bigint;
  excluded_receipt_id uuid;
begin
  if tg_op = 'UPDATE' then
    excluded_receipt_id := old.id;
  end if;

  select charge.amount_cents
    into charge_amount
    from public.finance_charges as charge
    where charge.id = new.charge_id
    for update;

  if not found then
    raise exception using errcode = '23503', message = 'FINANCE_CHARGE_NOT_FOUND';
  end if;

  select coalesce(sum(receipt.amount_cents), 0)
    into already_received
    from public.finance_receipts as receipt
    where receipt.charge_id = new.charge_id
      and (excluded_receipt_id is null or receipt.id <> excluded_receipt_id);

  if already_received + new.amount_cents > charge_amount then
    raise exception using errcode = '23514', message = 'FINANCE_RECEIPT_EXCEEDS_CHARGE';
  end if;

  return new;
end;
$$;

create trigger finance_receipts_prevent_overpayment
before insert or update of charge_id, amount_cents
on public.finance_receipts
for each row execute function private.prevent_finance_receipt_overpayment();

create or replace function private.prevent_finance_charge_reduction_below_received()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  already_received bigint;
begin
  select coalesce(sum(receipt.amount_cents), 0)
    into already_received
    from public.finance_receipts as receipt
    where receipt.charge_id = new.id;

  if new.amount_cents < already_received then
    raise exception using errcode = '23514', message = 'FINANCE_CHARGE_BELOW_RECEIVED';
  end if;

  return new;
end;
$$;

create trigger finance_charges_prevent_reduction_below_received
before update of amount_cents
on public.finance_charges
for each row execute function private.prevent_finance_charge_reduction_below_received();

revoke all on function private.prevent_finance_receipt_overpayment() from public, anon;
revoke all on function private.prevent_finance_charge_reduction_below_received() from public, anon;
grant execute on function private.prevent_finance_receipt_overpayment() to authenticated;
grant execute on function private.prevent_finance_charge_reduction_below_received() to authenticated;

revoke all on table public.finance_charges from public, anon, authenticated;
revoke all on table public.finance_receipts from public, anon, authenticated;
revoke all on table public.finance_expenses from public, anon, authenticated;
grant select, insert, update, delete on table public.finance_charges to authenticated;
grant select, insert, delete on table public.finance_receipts to authenticated;
grant select, insert, update, delete on table public.finance_expenses to authenticated;

alter table public.finance_charges enable row level security;
alter table public.finance_receipts enable row level security;
alter table public.finance_expenses enable row level security;

create policy finance_charges_admin_all
on public.finance_charges for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy finance_receipts_admin_select
on public.finance_receipts for select to authenticated
using ((select private.is_admin()));

create policy finance_receipts_admin_insert
on public.finance_receipts for insert to authenticated
with check ((select private.is_admin()));

create policy finance_receipts_admin_delete
on public.finance_receipts for delete to authenticated
using ((select private.is_admin()));

create policy finance_expenses_admin_all
on public.finance_expenses for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

commit;
