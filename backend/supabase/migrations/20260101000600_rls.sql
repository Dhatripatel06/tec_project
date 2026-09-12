-- ---------------------------------------------------------------------------
-- 00600 — Row Level Security.
--
-- Model:
--   anon           → read published content only; may create a submission.
--   authenticated  → the above, plus their own saves/profile/submissions.
--   CONTENT_INTERN → create + edit DRAFT listings in their city, never publish.
--   CITY_CURATOR   → full CRUD + moderation, but ONLY inside their city.
--   PARTNER        → create/edit only their own listings, never publish.
--   SUPER_ADMIN    → everything, every city.
--   service_role   → bypasses RLS entirely (server-only key, never shipped).
--
-- The status machine itself (who may move DRAFT→PENDING→PUBLISHED) is enforced
-- by the WITH CHECK clauses below AND by the service layer. Both, on purpose:
-- the brief requires that role checks not live only in application code.
-- ---------------------------------------------------------------------------

alter table public.cities                 enable row level security;
alter table public.categories             enable row level security;
alter table public.venues                 enable row level security;
alter table public.organisers             enable row level security;
alter table public.users                  enable row level security;
alter table public.user_roles             enable row level security;
alter table public.listings               enable row level security;
alter table public.listing_tags           enable row level security;
alter table public.recurrences            enable row level security;
alter table public.occurrences            enable row level security;
alter table public.editor_picks           enable row level security;
alter table public.saves                  enable row level security;
alter table public.views                  enable row level security;
alter table public.submissions            enable row level security;
alter table public.notifications          enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.device_tokens          enable row level security;
alter table public.reports                enable row level security;
alter table public.audit_logs             enable row level security;

-- cities --------------------------------------------------------------------
drop policy if exists cities_read_live on public.cities;
create policy cities_read_live on public.cities
  for select using (is_live or public.is_city_staff(id));

drop policy if exists cities_write_super_admin on public.cities;
create policy cities_write_super_admin on public.cities
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- categories ----------------------------------------------------------------
drop policy if exists categories_read_all on public.categories;
create policy categories_read_all on public.categories
  for select using (true);

drop policy if exists categories_write_super_admin on public.categories;
create policy categories_write_super_admin on public.categories
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- venues --------------------------------------------------------------------
drop policy if exists venues_read_all on public.venues;
create policy venues_read_all on public.venues
  for select using (is_active or public.is_city_staff(city_id));

-- Curators and interns may build the directory; a curator cannot touch another
-- city's venues because city_id is checked on both sides.
drop policy if exists venues_insert_staff on public.venues;
create policy venues_insert_staff on public.venues
  for insert to authenticated
  with check (public.is_city_staff(city_id));

drop policy if exists venues_update_staff on public.venues;
create policy venues_update_staff on public.venues
  for update to authenticated
  using (public.is_city_staff(city_id))
  with check (public.is_city_staff(city_id));

drop policy if exists venues_delete_curator on public.venues;
create policy venues_delete_curator on public.venues
  for delete to authenticated
  using (public.can_curate_city(city_id));

-- organisers ----------------------------------------------------------------
drop policy if exists organisers_read_all on public.organisers;
create policy organisers_read_all on public.organisers
  for select using (
    is_active or public.is_city_staff(city_id) or owner_user_id = auth.uid()
  );

drop policy if exists organisers_insert_staff on public.organisers;
create policy organisers_insert_staff on public.organisers
  for insert to authenticated
  with check (public.is_city_staff(city_id));

-- A partner may edit their own organiser profile; staff may edit any in-city.
-- Note: a partner must not be able to raise their own trust_level or set
-- auto_publish. That is enforced by the guard_organiser_privileges() trigger
-- in 00500 rather than here — a policy that subqueries its own table trips
-- Postgres's policy-recursion guard.
drop policy if exists organisers_update on public.organisers;
create policy organisers_update on public.organisers
  for update to authenticated
  using (public.is_city_staff(city_id) or owner_user_id = auth.uid())
  with check (public.is_city_staff(city_id) or owner_user_id = auth.uid());

drop policy if exists organisers_delete_curator on public.organisers;
create policy organisers_delete_curator on public.organisers
  for delete to authenticated
  using (public.can_curate_city(city_id));

-- users ---------------------------------------------------------------------
drop policy if exists users_read_self on public.users;
create policy users_read_self on public.users
  for select to authenticated
  using (id = auth.uid() or public.is_super_admin() or public.is_city_staff(city_id));

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and is_blocked = false);

drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- user_roles ----------------------------------------------------------------
-- Users may read their own grants (the app needs them to route the admin UI).
-- Only a SUPER_ADMIN may grant or revoke — a curator must not be able to
-- promote themselves into another city.
drop policy if exists user_roles_read_self on public.user_roles;
create policy user_roles_read_self on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists user_roles_write_super_admin on public.user_roles;
create policy user_roles_write_super_admin on public.user_roles
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- listings ------------------------------------------------------------------
drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings
  for select
  using (public.can_read_listing(city_id, status, created_by, organiser_id));

-- Interns and partners may only ever create non-published rows. The check also
-- pins city_id, so a curator cannot insert into a city they do not hold.
drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.can_curate_city(city_id)
      or (
        (public.is_city_staff(city_id) or public.is_city_partner(city_id))
        and status in ('DRAFT', 'PENDING')
      )
    )
    -- Partners may only file under an organiser they own.
    and (
      not public.is_city_partner(city_id)
      or public.is_city_staff(city_id)
      or public.owns_organiser(organiser_id)
    )
  );

-- Curators own the full state machine inside their city.
drop policy if exists listings_update_curator on public.listings;
create policy listings_update_curator on public.listings
  for update to authenticated
  using (public.can_curate_city(city_id))
  with check (public.can_curate_city(city_id));

-- Interns may edit their own drafts and submit them for review, never publish.
drop policy if exists listings_update_intern on public.listings;
create policy listings_update_intern on public.listings
  for update to authenticated
  using (
    public.has_city_role(city_id, array['CONTENT_INTERN']::app_role[])
    and not public.can_curate_city(city_id)
    and created_by = auth.uid()
    and status in ('DRAFT', 'PENDING', 'REJECTED')
  )
  with check (
    public.has_city_role(city_id, array['CONTENT_INTERN']::app_role[])
    and created_by = auth.uid()
    and status in ('DRAFT', 'PENDING')
  );

-- Partners may edit their own listings; edits always drop back into moderation.
drop policy if exists listings_update_partner on public.listings;
create policy listings_update_partner on public.listings
  for update to authenticated
  using (
    public.is_city_partner(city_id)
    and not public.is_city_staff(city_id)
    and (created_by = auth.uid() or public.owns_organiser(organiser_id))
    and status in ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED')
  )
  with check (
    public.is_city_partner(city_id)
    and (created_by = auth.uid() or public.owns_organiser(organiser_id))
    and status in ('DRAFT', 'PENDING', 'CANCELLED')
  );

drop policy if exists listings_delete_curator on public.listings;
create policy listings_delete_curator on public.listings
  for delete to authenticated
  using (public.can_curate_city(city_id));

-- listing_tags / recurrences: follow the parent listing's write rights -------
drop policy if exists listing_tags_read on public.listing_tags;
create policy listing_tags_read on public.listing_tags
  for select using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and public.can_read_listing(l.city_id, l.status, l.created_by, l.organiser_id)
    )
  );

drop policy if exists listing_tags_write on public.listing_tags;
create policy listing_tags_write on public.listing_tags
  for all to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (
          public.is_city_staff(l.city_id)
          or l.created_by = auth.uid()
          or public.owns_organiser(l.organiser_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (
          public.is_city_staff(l.city_id)
          or l.created_by = auth.uid()
          or public.owns_organiser(l.organiser_id)
        )
    )
  );

drop policy if exists recurrences_read on public.recurrences;
create policy recurrences_read on public.recurrences
  for select using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and public.can_read_listing(l.city_id, l.status, l.created_by, l.organiser_id)
    )
  );

drop policy if exists recurrences_write on public.recurrences;
create policy recurrences_write on public.recurrences
  for all to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (
          public.is_city_staff(l.city_id)
          or l.created_by = auth.uid()
          or public.owns_organiser(l.organiser_id)
        )
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (
          public.is_city_staff(l.city_id)
          or l.created_by = auth.uid()
          or public.owns_organiser(l.organiser_id)
        )
    )
  );

-- occurrences ---------------------------------------------------------------
-- Publicly readable only when the parent listing is published. Everything
-- about the feed depends on this policy being right.
drop policy if exists occurrences_read on public.occurrences;
create policy occurrences_read on public.occurrences
  for select using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and public.can_read_listing(l.city_id, l.status, l.created_by, l.organiser_id)
    )
  );

-- Only curators hand-edit occurrences (cancel / override). Generation runs
-- server-side under the service role.
drop policy if exists occurrences_write_curator on public.occurrences;
create policy occurrences_write_curator on public.occurrences
  for all to authenticated
  using (public.can_curate_city(city_id))
  with check (public.can_curate_city(city_id));

-- editor_picks --------------------------------------------------------------
drop policy if exists editor_picks_read on public.editor_picks;
create policy editor_picks_read on public.editor_picks
  for select using (true);

drop policy if exists editor_picks_write_curator on public.editor_picks;
create policy editor_picks_write_curator on public.editor_picks
  for all to authenticated
  using (public.can_curate_city(city_id))
  with check (public.can_curate_city(city_id));

-- saves ---------------------------------------------------------------------
drop policy if exists saves_own on public.saves;
create policy saves_own on public.saves
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- views (analytics) ---------------------------------------------------------
-- Anyone, signed in or not, may record an event; nobody but staff may read
-- them back. user_id must be your own id (or null) so events cannot be forged
-- against another account.
drop policy if exists views_insert_anyone on public.views;
create policy views_insert_anyone on public.views
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists views_read_staff on public.views;
create policy views_read_staff on public.views
  for select to authenticated
  using (public.is_city_staff(city_id));

-- submissions ---------------------------------------------------------------
-- PRD F7: the public form is open. Submitters see their own; curators see the
-- queue for their city only.
drop policy if exists submissions_insert_anyone on public.submissions;
create policy submissions_insert_anyone on public.submissions
  for insert to anon, authenticated
  with check (
    status = 'PENDING'
    and reviewed_by is null
    and listing_id is null
    and (submitted_by is null or submitted_by = auth.uid())
  );

drop policy if exists submissions_read on public.submissions;
create policy submissions_read on public.submissions
  for select to authenticated
  using (submitted_by = auth.uid() or public.is_city_staff(city_id));

drop policy if exists submissions_moderate on public.submissions;
create policy submissions_moderate on public.submissions
  for update to authenticated
  using (public.can_curate_city(city_id))
  with check (public.can_curate_city(city_id));

drop policy if exists submissions_delete_curator on public.submissions;
create policy submissions_delete_curator on public.submissions
  for delete to authenticated
  using (public.can_curate_city(city_id));

-- notifications -------------------------------------------------------------
drop policy if exists notifications_staff on public.notifications;
create policy notifications_staff on public.notifications
  for all to authenticated
  using (
    case when city_id is null then public.is_super_admin() else public.can_curate_city(city_id) end
  )
  with check (
    case when city_id is null then public.is_super_admin() else public.can_curate_city(city_id) end
  );

drop policy if exists notification_deliveries_own on public.notification_deliveries;
create policy notification_deliveries_own on public.notification_deliveries
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists device_tokens_own on public.device_tokens;
create policy device_tokens_own on public.device_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- reports -------------------------------------------------------------------
drop policy if exists reports_insert_anyone on public.reports;
create policy reports_insert_anyone on public.reports
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

drop policy if exists reports_read_staff on public.reports;
create policy reports_read_staff on public.reports
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and public.is_city_staff(l.city_id)
    )
  );

drop policy if exists reports_resolve_curator on public.reports;
create policy reports_resolve_curator on public.reports
  for update to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and public.can_curate_city(l.city_id)
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and public.can_curate_city(l.city_id)
    )
  );

-- audit_logs ----------------------------------------------------------------
-- Read-only to staff, append-only through write_audit_log(). No UPDATE or
-- DELETE policy exists, so the trail cannot be rewritten from a client key.
drop policy if exists audit_logs_read_staff on public.audit_logs;
create policy audit_logs_read_staff on public.audit_logs
  for select to authenticated
  using (public.is_super_admin() or public.is_city_staff(city_id));

-- Table grants --------------------------------------------------------------
-- RLS only filters rows that a role is already allowed to touch.
grant select on
  public.cities, public.categories, public.venues, public.organisers,
  public.listings, public.listing_tags, public.recurrences, public.occurrences,
  public.editor_picks
to anon, authenticated;

grant insert on public.views, public.submissions, public.reports to anon, authenticated;

grant select, insert, update, delete on
  public.saves, public.users, public.device_tokens
to authenticated;

grant select on
  public.submissions, public.views, public.audit_logs, public.user_roles,
  public.notifications, public.notification_deliveries, public.reports
to authenticated;

grant insert, update, delete on
  public.cities, public.categories, public.venues, public.organisers,
  public.listings, public.listing_tags, public.recurrences, public.occurrences,
  public.editor_picks, public.notifications, public.user_roles
to authenticated;

grant update on public.submissions, public.reports to authenticated;

grant all on all tables in schema public to service_role;
