/**
 * Seeds the pilot city, the PRD category taxonomy, real Bhavnagar venues and a
 * set of clearly-marked demo listings.
 *
 *   npm run db:seed
 *   npm run db:seed -- --reset-demo   # delete existing demo rows first
 *
 * Idempotent: cities, categories, venues and organisers are upserted by their
 * natural key, and demo listings are matched on title so re-running does not
 * duplicate them.
 *
 * Runs against SUPABASE_DB_URL as the database owner, which bypasses RLS. That
 * is correct for a seed and is why this is a script, not an endpoint.
 */
import { config } from 'dotenv';
import { Client } from 'pg';
import { connectionFromEnv, describeConnection } from '../src/lib/db/connection';
import {
  CATEGORIES,
  CITY,
  DEMO_NOTICE,
  DEMO_TAG,
  EVERGREEN_LISTINGS,
  ORGANISERS,
  SCHEDULED_LISTINGS,
  VENUES,
  type SeedRecurrence,
} from '../src/lib/seed/data';
import { expandRecurrence } from '../src/lib/domain/recurrence';
import { addDays, localToday } from '../src/lib/time/zoned';

config({ path: '.env.local' });
config({ path: '.env' });

const resetDemo = process.argv.includes('--reset-demo');

async function main(): Promise<void> {
  const conn = connectionFromEnv();
  const client = new Client(conn);
  await client.connect();
  console.info(`\nSeeding ${describeConnection(conn)}\n`);

  const today = localToday(new Date(), CITY.timezone);

  await client.query('begin');
  try {
    // -- City ---------------------------------------------------------------
    const city = await client.query<{ id: string }>(
      `insert into public.cities (name, name_gu, slug, lat, lng, timezone, is_live)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (slug) do update
         set name = excluded.name, name_gu = excluded.name_gu,
             lat = excluded.lat, lng = excluded.lng, is_live = excluded.is_live
       returning id`,
      [CITY.name, CITY.name_gu, CITY.slug, CITY.lat, CITY.lng, CITY.timezone, CITY.is_live],
    );
    const cityId = city.rows[0]!.id;
    console.info(`City       ${CITY.name} (${CITY.slug})`);

    // -- Categories ---------------------------------------------------------
    const categoryIds = new Map<string, string>();
    for (const [index, category] of CATEGORIES.entries()) {
      const result = await client.query<{ id: string }>(
        `insert into public.categories (slug, name, name_gu, emoji, sort_order)
         values ($1, $2, $3, $4, $5)
         on conflict (slug) do update
           set name = excluded.name, name_gu = excluded.name_gu,
               emoji = excluded.emoji, sort_order = excluded.sort_order
         returning id`,
        [category.slug, category.name, category.name_gu, category.emoji, index + 1],
      );
      categoryIds.set(category.slug, result.rows[0]!.id);
    }
    console.info(`Categories ${CATEGORIES.length}`);

    // -- Venues (real places) -----------------------------------------------
    const venueIds = new Map<string, string>();
    for (const venue of VENUES) {
      const existing = await client.query<{ id: string }>(
        `select id from public.venues where city_id = $1 and name = $2`,
        [cityId, venue.name],
      );
      if (existing.rows[0]) {
        venueIds.set(venue.key, existing.rows[0].id);
        await client.query(
          `update public.venues set name_gu = $2, address = $3, area = $4, lat = $5, lng = $6
           where id = $1`,
          [existing.rows[0].id, venue.name_gu, venue.address, venue.area, venue.lat, venue.lng],
        );
        continue;
      }
      const inserted = await client.query<{ id: string }>(
        `insert into public.venues (city_id, name, name_gu, address, area, lat, lng)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [cityId, venue.name, venue.name_gu, venue.address, venue.area, venue.lat, venue.lng],
      );
      venueIds.set(venue.key, inserted.rows[0]!.id);
    }
    console.info(`Venues     ${VENUES.length} (real Bhavnagar locations)`);

    // -- Organisers (demo) --------------------------------------------------
    const organiserIds = new Map<string, string>();
    for (const organiser of ORGANISERS) {
      const existing = await client.query<{ id: string }>(
        `select id from public.organisers where city_id = $1 and name = $2`,
        [cityId, organiser.name],
      );
      if (existing.rows[0]) {
        organiserIds.set(organiser.key, existing.rows[0].id);
        continue;
      }
      const inserted = await client.query<{ id: string }>(
        `insert into public.organisers (city_id, name, trust_level, phone, whatsapp)
         values ($1, $2, $3, $4, $4) returning id`,
        [cityId, organiser.name, organiser.trust_level, '+919000000000'],
      );
      organiserIds.set(organiser.key, inserted.rows[0]!.id);
    }
    console.info(`Organisers ${ORGANISERS.length} (demo)`);

    // -- Optionally clear previous demo content -----------------------------
    if (resetDemo) {
      const removed = await client.query(
        `delete from public.listings l
         where l.city_id = $1
           and exists (select 1 from public.listing_tags t
                       where t.listing_id = l.id and t.tag = $2)`,
        [cityId, DEMO_TAG],
      );
      console.info(`Cleared    ${removed.rowCount ?? 0} previous demo listings`);
    }

    // -- Scheduled demo listings -------------------------------------------
    let scheduledCount = 0;
    let occurrenceCount = 0;

    for (const listing of SCHEDULED_LISTINGS) {
      const categoryId = categoryIds.get(listing.category);
      const venueId = venueIds.get(listing.venue);
      if (!categoryId || !venueId) {
        throw new Error(`Seed listing "${listing.title}" references an unknown category or venue`);
      }

      const existing = await client.query<{ id: string }>(
        `select id from public.listings where city_id = $1 and title = $2`,
        [cityId, listing.title],
      );
      if (existing.rows[0]) continue;

      const rule = toRule(listing.recurrence, today);
      const occurrences = expandRecurrence(rule);
      if (occurrences.length === 0) {
        throw new Error(`Seed listing "${listing.title}" produced no occurrences`);
      }
      const firstStart = occurrences[0]!.startAt;
      const lastEnd = occurrences[occurrences.length - 1]!.endAt;

      const inserted = await client.query<{ id: string }>(
        `insert into public.listings
           (city_id, category_id, venue_id, organiser_id, title, title_gu,
            description, description_gu, hook, hook_gu, start_at, end_at, timezone,
            price_type, price_min, price_max, is_indoor, is_family_friendly,
            is_featured, rank_weight, capacity, status, source, published_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
                 'PUBLISHED','admin', now())
         returning id`,
        [
          cityId,
          categoryId,
          venueId,
          listing.organiser ? organiserIds.get(listing.organiser) : null,
          listing.title,
          listing.title_gu ?? null,
          `${DEMO_NOTICE} ${listing.description}`,
          null,
          listing.hook,
          listing.hook_gu ?? null,
          firstStart.toISOString(),
          lastEnd.toISOString(),
          CITY.timezone,
          listing.price_type,
          listing.price_min ?? null,
          listing.price_max ?? null,
          listing.is_indoor,
          listing.is_family_friendly,
          listing.is_featured ?? false,
          listing.rank_weight ?? 0,
          listing.capacity ?? null,
        ],
      );
      const listingId = inserted.rows[0]!.id;
      scheduledCount += 1;

      await client.query(
        `insert into public.listing_tags (listing_id, tag) values ($1, $2)
         on conflict do nothing`,
        [listingId, DEMO_TAG],
      );

      // Persist the recurrence rule itself, not just its expansion, so the
      // admin editor and the horizon job can work with it.
      await client.query(
        `insert into public.recurrences
           (listing_id, freq, interval, byweekday, starts_on, ends_on,
            start_time, end_time, ends_next_day, timezone)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          listingId,
          rule.freq,
          rule.interval ?? 1,
          rule.byweekday ?? null,
          rule.startsOn,
          rule.endsOn,
          rule.startTime,
          rule.endTime,
          rule.endsNextDay ?? false,
          rule.timezone,
        ],
      );

      for (const occurrence of occurrences) {
        await client.query(
          `insert into public.occurrences (listing_id, city_id, local_date, start_at, end_at)
           values ($1,$2,$3,$4,$5)
           on conflict (listing_id, local_date) do nothing`,
          [
            listingId,
            cityId,
            occurrence.localDate,
            occurrence.startAt.toISOString(),
            occurrence.endAt.toISOString(),
          ],
        );
        occurrenceCount += 1;
      }
    }
    console.info(`Listings   ${scheduledCount} scheduled demo listings`);
    console.info(`Occurrence ${occurrenceCount} rows generated`);

    // -- Evergreen pool -----------------------------------------------------
    const evergreenCategory = categoryIds.get('evergreen-picks')!;
    let evergreenCount = 0;
    for (const listing of EVERGREEN_LISTINGS) {
      const existing = await client.query<{ id: string }>(
        `select id from public.listings where city_id = $1 and title = $2`,
        [cityId, listing.title],
      );
      if (existing.rows[0]) continue;

      const inserted = await client.query<{ id: string }>(
        `insert into public.listings
           (city_id, category_id, venue_id, title, title_gu, description, hook, hook_gu,
            timezone, price_type, is_indoor, is_family_friendly, is_evergreen,
            rank_weight, status, source, published_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'free',$10,$11,true,$12,'PUBLISHED','admin', now())
         returning id`,
        [
          cityId,
          categoryIds.get(listing.category) ?? evergreenCategory,
          venueIds.get(listing.venue)!,
          listing.title,
          listing.title_gu ?? null,
          listing.description,
          listing.hook,
          listing.hook_gu ?? null,
          CITY.timezone,
          listing.is_indoor,
          listing.is_family_friendly,
          listing.rank_weight,
        ],
      );
      await client.query(
        `insert into public.listing_tags (listing_id, tag) values ($1, 'evergreen')
         on conflict do nothing`,
        [inserted.rows[0]!.id],
      );
      evergreenCount += 1;
    }
    console.info(`Evergreen  ${evergreenCount} fallback picks (real places, no schedule)`);

    // -- Editor's pick for today -------------------------------------------
    const featured = await client.query<{ id: string }>(
      `select l.id from public.listings l
       join public.occurrences o on o.listing_id = l.id
       where l.city_id = $1 and l.is_featured and o.local_date = $2
       order by l.rank_weight desc limit 1`,
      [cityId, today],
    );
    if (featured.rows[0]) {
      await client.query(
        `insert into public.editor_picks (city_id, pick_date, listing_id, note)
         values ($1, $2, $3, 'Seeded demo pick')
         on conflict (city_id, pick_date) do update set listing_id = excluded.listing_id`,
        [cityId, today, featured.rows[0].id],
      );
      console.info(`Editors    pick set for ${today}`);
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    console.error('\nSeed failed and was rolled back:');
    console.error(error instanceof Error ? error.message : error);
    await client.end();
    process.exit(1);
  }

  console.info(
    '\nDone. All seeded listings are DEMO content tagged "demo" — replace them\n' +
      'with real Bhavnagar listings before showing this to anyone.\n',
  );
  await client.end();
}

/** Converts a seed offset-based recurrence into a real rule anchored on today. */
function toRule(recurrence: SeedRecurrence, today: string) {
  const startsOn = addDays(today, recurrence.startOffset);
  const endsOn =
    recurrence.freq === 'ONCE'
      ? null
      : addDays(today, recurrence.endOffset ?? recurrence.startOffset);
  return {
    freq: recurrence.freq,
    interval: recurrence.interval ?? 1,
    byweekday: recurrence.byweekday ?? null,
    startsOn,
    endsOn,
    startTime: recurrence.startTime,
    endTime: recurrence.endTime,
    endsNextDay: recurrence.endsNextDay ?? false,
    timezone: CITY.timezone,
    exdates: [],
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
