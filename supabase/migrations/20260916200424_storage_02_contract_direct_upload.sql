begin;

-- STORAGE-02: allow resumable direct uploads for private contracts up to
-- 10 MB decimal (10,000,000 bytes). The global Supabase Storage limit is a project setting and is not
-- changed by this migration.
update storage.buckets
set file_size_limit = 10000000,
    public = false,
    allowed_mime_types = array['application/pdf']::text[]
where id = 'contracts';

-- Temporary objects are created before their contract_documents row exists.
-- They remain admin-only; final objects retain the existing domain-aware read
-- policy for families and assigned caregivers.
drop policy if exists contracts_select_authorized on storage.objects;
drop policy if exists contracts_insert_admin on storage.objects;
drop policy if exists contracts_update_admin on storage.objects;
drop policy if exists contracts_delete_admin on storage.objects;

create policy contracts_select_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'contracts'
  and (
    (
      name ~ '^contracts/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
      and (
        (select private.is_admin())
        or exists (
          select 1
          from public.contract_documents as cd
          where cd.storage_key = name
        )
      )
    )
    or (
      name ~ '^contracts/pending/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
      and (select private.is_admin())
    )
  )
);

create policy contracts_insert_admin
on storage.objects for insert to authenticated
with check (
  bucket_id = 'contracts'
  and (
    name ~ '^contracts/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
    or name ~ '^contracts/pending/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
  )
  and (select private.is_admin())
);

create policy contracts_update_admin
on storage.objects for update to authenticated
using (
  bucket_id = 'contracts'
  and (
    name ~ '^contracts/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
    or name ~ '^contracts/pending/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
  )
  and (select private.is_admin())
)
with check (
  bucket_id = 'contracts'
  and (
    name ~ '^contracts/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
    or name ~ '^contracts/pending/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
  )
  and (select private.is_admin())
);

create policy contracts_delete_admin
on storage.objects for delete to authenticated
using (
  bucket_id = 'contracts'
  and (
    name ~ '^contracts/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
    or name ~ '^contracts/pending/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[.]pdf$'
  )
  and (select private.is_admin())
);

commit;
