begin;

-- STORAGE-01: private buckets for sensitive care photos and contracts.
-- The application stores only these keys in the domain tables; file bytes do
-- not belong in D1/Postgres columns. The migration is idempotent so a manual
-- production rollout can be safely retried before the migration is recorded.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'record-photos',
    'record-photos',
    false,
    3145728,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'contracts',
    'contracts',
    false,
    4194304,
    array['application/pdf']::text[]
  )
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Object names are validated both here and in the server adapter. The SQL
-- policies repeat the shape so direct Storage API calls cannot bypass the
-- application path validator. The UUIDs are compared as text to avoid casts
-- on untrusted path segments.
drop policy if exists record_photos_select_authorized on storage.objects;
drop policy if exists record_photos_insert_authorized on storage.objects;
drop policy if exists record_photos_update_authorized on storage.objects;
drop policy if exists record_photos_delete_authorized on storage.objects;
drop policy if exists contracts_select_authorized on storage.objects;
drop policy if exists contracts_insert_admin on storage.objects;
drop policy if exists contracts_update_admin on storage.objects;
drop policy if exists contracts_delete_admin on storage.objects;

create policy record_photos_select_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'record-photos'
  and name ~ '^patients/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/records/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.](jpg|jpeg|png|webp)$'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.daily_records as dr
      where dr.id::text = split_part(name, '/', 4)
        and dr.patient_id::text = split_part(name, '/', 2)
        and (
          (select private.is_patient_family(dr.patient_id))
          or (select private.is_active_caregiver(dr.patient_id))
        )
    )
  )
);

-- A caregiver may upload only after the record exists and only for an active
-- assignment. Admins may upload a valid object while creating/backfilling a
-- record; families remain read-only for photos.
create policy record_photos_insert_authorized
on storage.objects for insert to authenticated
with check (
  bucket_id = 'record-photos'
  and name ~ '^patients/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/records/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.](jpg|jpeg|png|webp)$'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.daily_records as dr
      where dr.id::text = split_part(name, '/', 4)
        and dr.patient_id::text = split_part(name, '/', 2)
        and (select private.is_active_caregiver(dr.patient_id))
    )
  )
);

-- Upsert requires SELECT + UPDATE in addition to INSERT. Keep the same
-- assignment predicate on both clauses so replacing a photo cannot broaden
-- access.
create policy record_photos_update_authorized
on storage.objects for update to authenticated
using (
  bucket_id = 'record-photos'
  and name ~ '^patients/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/records/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.](jpg|jpeg|png|webp)$'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.daily_records as dr
      where dr.id::text = split_part(name, '/', 4)
        and dr.patient_id::text = split_part(name, '/', 2)
        and (select private.is_active_caregiver(dr.patient_id))
    )
  )
)
with check (
  bucket_id = 'record-photos'
  and name ~ '^patients/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/records/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.](jpg|jpeg|png|webp)$'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.daily_records as dr
      where dr.id::text = split_part(name, '/', 4)
        and dr.patient_id::text = split_part(name, '/', 2)
        and (select private.is_active_caregiver(dr.patient_id))
    )
  )
);

create policy record_photos_delete_authorized
on storage.objects for delete to authenticated
using (
  bucket_id = 'record-photos'
  and name ~ '^patients/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/records/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.](jpg|jpeg|png|webp)$'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.daily_records as dr
      where dr.id::text = split_part(name, '/', 4)
        and dr.patient_id::text = split_part(name, '/', 2)
        and (select private.is_active_caregiver(dr.patient_id))
    )
  )
);

-- Contract reads are coupled to the domain row: contract_documents already
-- applies family/caregiver ownership RLS, while admins see all rows. Upload,
-- replacement, and deletion are admin-only; this also permits the existing
-- upload-then-insert transaction to create the object before its metadata row.
create policy contracts_select_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'contracts'
  and name ~ '^contracts/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.contract_documents as cd
      where cd.storage_key = name
    )
  )
);

create policy contracts_insert_admin
on storage.objects for insert to authenticated
with check (
  bucket_id = 'contracts'
  and name ~ '^contracts/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
  and (select private.is_admin())
);

create policy contracts_update_admin
on storage.objects for update to authenticated
using (
  bucket_id = 'contracts'
  and name ~ '^contracts/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
  and (select private.is_admin())
)
with check (
  bucket_id = 'contracts'
  and name ~ '^contracts/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
  and (select private.is_admin())
);

create policy contracts_delete_admin
on storage.objects for delete to authenticated
using (
  bucket_id = 'contracts'
  and name ~ '^contracts/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
  and (select private.is_admin())
);

-- There are deliberately no anon policies. Private buckets plus the
-- authenticated-only policies above deny anonymous reads and writes.

commit;
