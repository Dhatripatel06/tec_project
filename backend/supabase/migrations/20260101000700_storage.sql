-- ---------------------------------------------------------------------------
-- 00700 — Supabase Storage buckets and access policies.
--
-- Images are never stored in Postgres; listings keep only the object path/URL.
-- This file is skipped automatically on a plain Postgres (no `storage` schema),
-- so the migration set still runs in CI without Supabase.
-- ---------------------------------------------------------------------------

do $$
declare
  bucket_name text;
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'storage schema absent — skipping bucket setup (non-Supabase database)';
    return;
  end if;

  -- Public read buckets hold posters shown in the consumer feed; the
  -- submission bucket is private because it holds unmoderated user content.
  --
  -- `do nothing`, deliberately: this migration must never silently rewrite the
  -- configuration of a bucket that already exists (flipping a private bucket
  -- to public would expose unmoderated uploads). If a name is already taken,
  -- a notice is raised and the operator decides.
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('listing-covers', 'listing-covers', true, 5242880,
     array['image/jpeg', 'image/png', 'image/webp']),
    ('listing-gallery', 'listing-gallery', true, 5242880,
     array['image/jpeg', 'image/png', 'image/webp']),
    ('submission-posters', 'submission-posters', false, 5242880,
     array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;

  for bucket_name in
    select unnest(array['listing-covers', 'listing-gallery', 'submission-posters'])
  loop
    if not exists (select 1 from storage.buckets b where b.id = bucket_name) then
      raise notice 'bucket % was not created — check it manually', bucket_name;
    end if;
  end loop;

  -- Anyone may read the two public buckets.
  execute $p$
    drop policy if exists "listing images public read" on storage.objects;
    create policy "listing images public read" on storage.objects
      for select using (bucket_id in ('listing-covers', 'listing-gallery'));
  $p$;

  -- Staff upload listing imagery. Object paths are "<city_id>/<listing_id>/<file>",
  -- so the first path segment is the city and can be authorised directly.
  execute $p$
    drop policy if exists "listing images staff write" on storage.objects;
    create policy "listing images staff write" on storage.objects
      for insert to authenticated
      with check (
        bucket_id in ('listing-covers', 'listing-gallery')
        and public.is_city_staff(public.safe_uuid((storage.foldername(name))[1]))
      );
  $p$;

  execute $p$
    drop policy if exists "listing images staff update" on storage.objects;
    create policy "listing images staff update" on storage.objects
      for update to authenticated
      using (
        bucket_id in ('listing-covers', 'listing-gallery')
        and public.is_city_staff(public.safe_uuid((storage.foldername(name))[1]))
      );
  $p$;

  execute $p$
    drop policy if exists "listing images curator delete" on storage.objects;
    create policy "listing images curator delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id in ('listing-covers', 'listing-gallery')
        and public.can_curate_city(public.safe_uuid((storage.foldername(name))[1]))
      );
  $p$;

  -- Submission posters: uploaded by the public, read back only by staff.
  -- Path is "<city_id>/<random>.<ext>".
  execute $p$
    drop policy if exists "submission posters upload" on storage.objects;
    create policy "submission posters upload" on storage.objects
      for insert to anon, authenticated
      with check (bucket_id = 'submission-posters');
  $p$;

  execute $p$
    drop policy if exists "submission posters staff read" on storage.objects;
    create policy "submission posters staff read" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'submission-posters'
        and public.is_city_staff(public.safe_uuid((storage.foldername(name))[1]))
      );
  $p$;

  execute $p$
    drop policy if exists "submission posters curator delete" on storage.objects;
    create policy "submission posters curator delete" on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'submission-posters'
        and public.can_curate_city(public.safe_uuid((storage.foldername(name))[1]))
      );
  $p$;
end
$$;
