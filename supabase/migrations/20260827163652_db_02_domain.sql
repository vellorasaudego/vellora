begin;

-- DB-02 creates the remaining domain tables after DB-01's identity and care
-- assignment foundation is present in production.
-- Rollout: apply after 20260827142537_db_01_supabase_foundation and before
-- switching the runtime data layer to Supabase.
-- Rollback: after confirming that no domain data must be retained, remove
-- policies/indexes/tables in reverse dependency order. Never drop auth.users
-- or the DB-01 profiles, patients, assignments, or private helpers here.
--
-- Runtime compatibility work is intentionally deferred: D1's photo_data was
-- a base64 data URI. The Postgres model stores only photo_storage_key, so the
-- runtime must upload/read the object from Storage and map the old field name.
-- Audit changed_fields is text[] and before/after_data are jsonb; the runtime
-- adapter must parse/serialize the existing JSON strings at the boundary.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  patient_name text,
  care_type text,
  message text,
  status text not null default 'novo'
    check (status in ('novo', 'em_contato', 'convertido', 'recusado')),
  created_at timestamptz not null default now()
);

create index leads_status_created_at_idx
  on public.leads (status, created_at desc);

create table public.professional_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  city text,
  profession text not null
    check (profession in ('cuidador', 'tecnico_enfermagem', 'enfermeiro', 'outros')),
  coren text,
  experience text,
  availability_days text[] not null default '{}'::text[],
  availability_shifts text[] not null default '{}'::text[],
  available_from text,
  notes text,
  status text not null default 'novo'
    check (status in ('novo', 'em_analise', 'aprovado', 'recusado')),
  lgpd_consent boolean not null default false,
  lgpd_consent_at timestamptz,
  privacy_notice_version text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint professional_applications_lgpd_consent_check
    check (not lgpd_consent or lgpd_consent_at is not null)
);

create index professional_applications_status_created_at_idx
  on public.professional_applications (status, created_at desc);
create index professional_applications_reviewed_by_idx
  on public.professional_applications (reviewed_by);

create table public.caregiver_profiles (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.professional_applications(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  contact_email text not null,
  phone text not null,
  city text,
  profession text not null
    check (profession in ('cuidador', 'tecnico_enfermagem', 'enfermeiro', 'outros')),
  coren text,
  experience text,
  availability_days text[] not null default '{}'::text[],
  availability_shifts text[] not null default '{}'::text[],
  available_from text,
  notes text,
  account_status text not null default 'aguardando_acesso'
    check (account_status in ('aguardando_acesso', 'ativo', 'inativo')),
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint caregiver_profiles_application_unique unique (application_id),
  constraint caregiver_profiles_user_unique unique (user_id)
);

create index caregiver_profiles_status_approved_at_idx
  on public.caregiver_profiles (account_status, approved_at desc);

create table public.daily_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  caregiver_user_id uuid not null references public.profiles(id) on delete cascade,
  record_date date not null,
  record_time time without time zone,
  bp_systolic integer,
  bp_diastolic integer,
  heart_rate integer,
  temperature numeric(4, 1),
  spo2 integer,
  glucose integer,
  medications text,
  feeding text,
  hygiene text,
  mobility text,
  mood text,
  pain_level integer,
  notes text,
  incident boolean not null default false,
  incident_description text,
  photo_storage_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_records_vitals_check check (
    (bp_systolic is null or bp_systolic between 0 and 400)
    and (bp_diastolic is null or bp_diastolic between 0 and 300)
    and (heart_rate is null or heart_rate between 0 and 400)
    and (temperature is null or temperature between 0 and 100)
    and (spo2 is null or spo2 between 0 and 100)
    and (glucose is null or glucose between 0 and 2_000)
    and (pain_level is null or pain_level between 0 and 10)
  ),
  constraint daily_records_incident_description_check check (
    not incident or length(btrim(coalesce(incident_description, ''))) > 0
  ),
  constraint daily_records_photo_storage_key_check check (
    photo_storage_key is null
    or (
      length(photo_storage_key) between 1 and 512
      and photo_storage_key !~ '^data:[^;]+;base64,'
    )
  )
);

-- Keep the patient and caregiver links stable for application users. The
-- trigger is SECURITY INVOKER: it does not query daily_records, so it avoids
-- recursive RLS evaluation. A signed-in admin may repair links; postgres and
-- service_role remain trusted maintenance/backend roles.
create or replace function private.prevent_daily_record_links_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if current_user not in ('postgres', 'service_role')
     and not coalesce((select private.is_admin()), false)
     and (
       new.patient_id is distinct from old.patient_id
       or new.caregiver_user_id is distinct from old.caregiver_user_id
     )
  then
    raise exception using
      errcode = '42501',
      message = 'patient_id and caregiver_user_id are immutable for non-admin users';
  end if;

  return new;
end;
$$;

create trigger daily_records_immutable_links_before_update
before update on public.daily_records
for each row
execute function private.prevent_daily_record_links_update();

-- Trigger functions are invoked by PostgreSQL internally; they are not an
-- RPC surface. Keep direct execution closed to every API role.
revoke execute on function private.prevent_daily_record_links_update() from public, anon, authenticated, service_role;

create index daily_records_patient_date_idx
  on public.daily_records (patient_id, record_date desc, record_time desc);
create index daily_records_caregiver_date_idx
  on public.daily_records (caregiver_user_id, record_date desc);

create table public.daily_record_audit_events (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.daily_records(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  action text not null
    check (action in ('created', 'updated')),
  changed_fields text[] not null default '{}'::text[],
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index daily_record_audit_record_created_at_idx
  on public.daily_record_audit_events (record_id, created_at desc);
create index daily_record_audit_patient_created_at_idx
  on public.daily_record_audit_events (patient_id, created_at desc);
create index daily_record_audit_actor_idx
  on public.daily_record_audit_events (actor_user_id);

create table public.rate_limit_buckets (
  bucket_key text primary key,
  count integer not null default 0 check (count >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index rate_limit_buckets_expires_at_idx
  on public.rate_limit_buckets (expires_at);

create table public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  family_user_id uuid references public.profiles(id) on delete cascade,
  caregiver_profile_id uuid references public.caregiver_profiles(id) on delete cascade,
  caregiver_user_id uuid references public.profiles(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  file_size integer not null,
  storage_key text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint contract_documents_storage_key_unique unique (storage_key),
  constraint contract_documents_file_size_check check (file_size > 0),
  constraint contract_documents_storage_key_check check (
    length(storage_key) between 1 and 512
    and storage_key !~ '^data:[^;]+;base64,'
  ),
  constraint contract_documents_single_owner check (
    num_nonnulls(family_user_id, caregiver_profile_id, caregiver_user_id) = 1
  )
);

create index contract_documents_family_created_at_idx
  on public.contract_documents (family_user_id, created_at desc);
create index contract_documents_profile_created_at_idx
  on public.contract_documents (caregiver_profile_id, created_at desc);
create index contract_documents_caregiver_created_at_idx
  on public.contract_documents (caregiver_user_id, created_at desc);
create index contract_documents_uploaded_by_idx
  on public.contract_documents (uploaded_by);

-- Every domain table is protected before it can be used through the Data API.
revoke all on table public.leads from public, anon, authenticated, service_role;
revoke all on table public.professional_applications from public, anon, authenticated, service_role;
revoke all on table public.caregiver_profiles from public, anon, authenticated, service_role;
revoke all on table public.daily_records from public, anon, authenticated, service_role;
revoke all on table public.daily_record_audit_events from public, anon, authenticated, service_role;
revoke all on table public.rate_limit_buckets from public, anon, authenticated, service_role;
revoke all on table public.contract_documents from public, anon, authenticated, service_role;

-- Authenticated access is always narrowed by RLS. Public form submissions and
-- rate-limit bookkeeping use a trusted server client with service_role only.
grant select, insert, update, delete on table public.leads to authenticated, service_role;
grant select, insert, update, delete on table public.professional_applications to authenticated, service_role;
grant select, insert, update, delete on table public.caregiver_profiles to authenticated, service_role;
grant select, insert, update, delete on table public.daily_records to authenticated, service_role;
grant select on table public.daily_record_audit_events to authenticated;
grant select, insert on table public.daily_record_audit_events to service_role;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;
grant select, insert, update, delete on table public.contract_documents to authenticated, service_role;

alter table public.leads enable row level security;
alter table public.professional_applications enable row level security;
alter table public.caregiver_profiles enable row level security;
alter table public.daily_records enable row level security;
alter table public.daily_record_audit_events enable row level security;
alter table public.rate_limit_buckets enable row level security;
alter table public.contract_documents enable row level security;

-- Public submissions are accepted only by the trusted backend/service role;
-- authenticated users reach these records only as administrators.
create policy leads_admin_all
on public.leads for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy professional_applications_admin_all
on public.professional_applications for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy caregiver_profiles_select_admin_or_self
on public.caregiver_profiles for select to authenticated
using (
  private.is_admin()
  or (
    user_id = (select auth.uid())
    and private.current_active()
    and private.current_role() = 'cuidador'
  )
);

create policy caregiver_profiles_insert_admin
on public.caregiver_profiles for insert to authenticated
with check (private.is_admin());

create policy caregiver_profiles_update_admin
on public.caregiver_profiles for update to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy caregiver_profiles_delete_admin
on public.caregiver_profiles for delete to authenticated
using (private.is_admin());

create policy daily_records_select_authorized
on public.daily_records for select to authenticated
using (
  private.is_admin()
  or private.is_patient_family(patient_id)
  or (
    caregiver_user_id = (select auth.uid())
    and private.is_active_caregiver(patient_id)
  )
);

create policy daily_records_insert_authorized
on public.daily_records for insert to authenticated
with check (
  private.is_admin()
  or (
    caregiver_user_id = (select auth.uid())
    and private.is_active_caregiver(patient_id)
  )
);

create policy daily_records_update_authorized
on public.daily_records for update to authenticated
using (
  private.is_admin()
  or (
    caregiver_user_id = (select auth.uid())
    and private.is_active_caregiver(patient_id)
  )
)
with check (
  private.is_admin()
  or (
    caregiver_user_id = (select auth.uid())
    and private.is_active_caregiver(patient_id)
  )
);

create policy daily_records_delete_admin
on public.daily_records for delete to authenticated
using (private.is_admin());

-- Audit rows are immutable to authenticated clients. The backend writes them;
-- readers must have access to the same patient record they are auditing.
create policy daily_record_audit_select_authorized
on public.daily_record_audit_events for select to authenticated
using (
  private.is_admin()
  or private.is_patient_family(patient_id)
  or private.is_active_caregiver(patient_id)
);

-- rate_limit_buckets intentionally has no anon/authenticated grants or policy.
-- It is an internal service_role-only table.

create policy contract_documents_select_authorized
on public.contract_documents for select to authenticated
using (
  private.is_admin()
  or (
    family_user_id = (select auth.uid())
    and private.current_active()
    and private.current_role() = 'familia'
  )
  or (
    caregiver_user_id = (select auth.uid())
    and private.current_active()
    and private.current_role() = 'cuidador'
  )
  or (
    caregiver_profile_id is not null
    and private.current_active()
    and private.current_role() = 'cuidador'
    and exists (
      select 1
      from public.caregiver_profiles as cp
      where cp.id = contract_documents.caregiver_profile_id
        and cp.user_id = (select auth.uid())
    )
  )
);

create policy contract_documents_insert_admin
on public.contract_documents for insert to authenticated
with check (private.is_admin());

create policy contract_documents_update_admin
on public.contract_documents for update to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy contract_documents_delete_admin
on public.contract_documents for delete to authenticated
using (private.is_admin());

commit;
