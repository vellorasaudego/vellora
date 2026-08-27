begin;

-- SEC-02 provides the Supabase-backed rate-limit primitive. The application
-- calls it through PostgREST using a server-only service key. The public RPC
-- name is required by the Data API, but EXECUTE is revoked from every client
-- role; only service_role may invoke it.
create or replace function public.increment_rate_limit_bucket(
  p_bucket_key text,
  p_window_seconds integer
)
returns table (
  count integer,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if p_bucket_key is null
     or length(p_bucket_key) < 1
     or length(p_bucket_key) > 200
     or p_bucket_key ~ '[[:cntrl:]]' then
    raise exception using
      errcode = '22023',
      message = 'Invalid rate-limit bucket key';
  end if;

  if p_window_seconds is null
     or p_window_seconds < 1
     or p_window_seconds > 86400 then
    raise exception using
      errcode = '22023',
      message = 'Invalid rate-limit window';
  end if;

  -- Cleanup and increment happen in the same database transaction. The
  -- upsert takes the row lock and is safe under concurrent requests.
  delete from public.rate_limit_buckets
  where public.rate_limit_buckets.expires_at <= clock_timestamp();

  insert into public.rate_limit_buckets as buckets (
    bucket_key,
    count,
    expires_at
  )
  values (
    p_bucket_key,
    1,
    clock_timestamp() + (p_window_seconds * interval '1 second')
  )
  on conflict (bucket_key) do update
    set count = buckets.count + 1
  returning buckets.count, buckets.expires_at
  into count, expires_at;

  return next;
end;
$function$;

revoke execute on function public.increment_rate_limit_bucket(text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.increment_rate_limit_bucket(text, integer)
  to service_role;

commit;
