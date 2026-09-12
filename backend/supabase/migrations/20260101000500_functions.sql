-- ---------------------------------------------------------------------------
-- 00500 — Authorisation helpers, audit triggers and maintenance functions.
--
-- Every helper here is SECURITY DEFINER with a pinned search_path. That is
-- deliberate: RLS policies on `listings` call them, and they read `user_roles`,
-- which is itself RLS-protected. Without SECURITY DEFINER the policy check
-- would recurse into another policy check.
-- ---------------------------------------------------------------------------

-- Is the current JWT a SUPER_ADMIN? --------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'SUPER_ADMIN'
  );
$$;

-- Does the current user hold any of `roles` in `target_city`? -----------
-- SUPER_ADMIN satisfies every check, in every city.
create or replace function public.has_city_role(target_city uuid, roles app_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.is_super_admin()
    or (
      target_city is not null
      and exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.city_id = target_city
          and ur.role = any (roles)
      )
    );
$$;

-- Full CRUD + moderation rights for a city (PRD 7.1 City Curator).
create or replace function public.can_curate_city(target_city uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_city_role(target_city, array['CITY_CURATOR']::app_role[]);
$$;

-- Any back-office user for a city: curator or intern.
create or replace function public.is_city_staff(target_city uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_city_role(
    target_city,
    array['CITY_CURATOR', 'CONTENT_INTERN']::app_role[]
  );
$$;

create or replace function public.is_city_partner(target_city uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_city_role(target_city, array['PARTNER']::app_role[]);
$$;

-- Does the current user own this organiser record? (Partner scoping.)
create or replace function public.owns_organiser(target_organiser uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select target_organiser is not null and exists (
    select 1 from public.organisers o
    where o.id = target_organiser and o.owner_user_id = auth.uid()
  );
$$;

-- Can the current user see this listing row at all? ------------------------
-- Public: PUBLISHED only. Staff: everything in their city. Partner: own rows.
create or replace function public.can_read_listing(
  target_city uuid,
  target_status listing_status,
  target_created_by uuid,
  target_organiser uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    target_status = 'PUBLISHED'
    or public.is_city_staff(target_city)
    or (auth.uid() is not null and target_created_by = auth.uid())
    or public.owns_organiser(target_organiser);
$$;

-- Audit logging ------------------------------------------------------------
-- Writes an audit row from application-supplied context. Callable over RPC by
-- authenticated users; the actor is always taken from the JWT, never trusted
-- from the client.
create or replace function public.write_audit_log(
  p_entity text,
  p_entity_id uuid,
  p_action audit_action,
  p_diff jsonb default '{}'::jsonb,
  p_city_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_id uuid;
begin
  insert into public.audit_logs (actor_id, city_id, entity, entity_id, action, diff)
  values (auth.uid(), p_city_id, p_entity, p_entity_id, p_action, coalesce(p_diff, '{}'::jsonb))
  returning id into new_id;
  return new_id;
end;
$$;

-- Automatic audit trail for listing status changes. The application also logs
-- richer diffs; this trigger guarantees nothing slips through unrecorded.
create or replace function public.audit_listing_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, city_id, entity, entity_id, action, diff)
    values (
      auth.uid(),
      new.city_id,
      'listings',
      new.id,
      case new.status
        when 'PUBLISHED' then 'PUBLISH'::audit_action
        when 'REJECTED'  then 'REJECT'::audit_action
        when 'CANCELLED' then 'CANCEL'::audit_action
        when 'EXPIRED'   then 'EXPIRE'::audit_action
        else 'UPDATE'::audit_action
      end,
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists listings_audit_status on public.listings;
create trigger listings_audit_status after update on public.listings
  for each row execute function public.audit_listing_status_change();

-- Keep occurrences.city_id honest -----------------------------------------
-- The feed filters on occurrences.city_id without joining listings, so the
-- denormalised copy must never drift.
create or replace function public.sync_occurrence_city()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select l.city_id into new.city_id from public.listings l where l.id = new.listing_id;
  if new.city_id is null then
    raise exception 'occurrence % references unknown listing %', new.id, new.listing_id;
  end if;
  return new;
end;
$$;

drop trigger if exists occurrences_sync_city on public.occurrences;
create trigger occurrences_sync_city before insert or update of listing_id
  on public.occurrences
  for each row execute function public.sync_occurrence_city();

-- Cascade a city move on the listing down to its occurrences.
create or replace function public.cascade_listing_city()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.city_id is distinct from old.city_id then
    update public.occurrences set city_id = new.city_id where listing_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_cascade_city on public.listings;
create trigger listings_cascade_city after update of city_id on public.listings
  for each row execute function public.cascade_listing_city();

-- Privilege escalation guard on organisers ---------------------------------
-- trust_level and auto_publish decide whether a partner's listings bypass the
-- moderation queue, so only city staff may change them. Enforced in a trigger
-- because an RLS policy cannot read its own table without recursing.
create or replace function public.guard_organiser_privileges()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (new.trust_level is distinct from old.trust_level
      or new.auto_publish is distinct from old.auto_publish
      or new.owner_user_id is distinct from old.owner_user_id
      or new.city_id is distinct from old.city_id)
     and not public.is_city_staff(old.city_id)
  then
    raise exception 'insufficient privileges to change organiser trust settings'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists organisers_guard_privileges on public.organisers;
create trigger organisers_guard_privileges before update on public.organisers
  for each row execute function public.guard_organiser_privileges();

-- Auto-expiry (PRD A3) -----------------------------------------------------
-- Secondary mechanism only. The feed query itself already excludes anything
-- whose occurrence has ended, so an unrun sweep can never surface stale items;
-- this just keeps the admin table honest.
create or replace function public.expire_finished_listings()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected integer;
begin
  with finished as (
    select l.id
    from public.listings l
    where l.status = 'PUBLISHED'
      and not l.is_evergreen
      -- No occurrence of this listing is still upcoming or running.
      and not exists (
        select 1 from public.occurrences o
        where o.listing_id = l.id
          and not o.is_cancelled
          and o.end_at > now()
      )
      -- Guard against listings whose occurrences were never generated.
      and (
        exists (select 1 from public.occurrences o2 where o2.listing_id = l.id)
        or (l.end_at is not null and l.end_at <= now())
      )
  )
  update public.listings l
  set status = 'EXPIRED'
  from finished f
  where l.id = f.id;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Interested count for social proof (PRD F6), without exposing who saved.
create or replace function public.listing_save_count(target_listing uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer from public.saves s where s.listing_id = target_listing;
$$;

revoke all on function public.expire_finished_listings() from public, anon, authenticated;
grant execute on function public.expire_finished_listings() to service_role;

grant execute on function public.is_super_admin() to authenticated, service_role;
grant execute on function public.has_city_role(uuid, app_role[]) to authenticated, service_role;
grant execute on function public.can_curate_city(uuid) to authenticated, service_role;
grant execute on function public.is_city_staff(uuid) to authenticated, service_role;
grant execute on function public.is_city_partner(uuid) to authenticated, service_role;
grant execute on function public.owns_organiser(uuid) to authenticated, service_role;
grant execute on function public.can_read_listing(uuid, listing_status, uuid, uuid)
  to anon, authenticated, service_role;
grant execute on function public.write_audit_log(text, uuid, audit_action, jsonb, uuid)
  to authenticated, service_role;
grant execute on function public.listing_save_count(uuid) to anon, authenticated, service_role;

-- Safe UUID cast ------------------------------------------------------------
-- Storage policies derive the city from the first folder segment of an object
-- path. A malformed path must DENY, not raise: a cast error inside a USING
-- clause aborts the whole statement, which would break listing a bucket.
create or replace function public.safe_uuid(value text)
returns uuid
language plpgsql
immutable
returns null on null input
as $$
begin
  return value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

grant execute on function public.safe_uuid(text) to anon, authenticated, service_role;
