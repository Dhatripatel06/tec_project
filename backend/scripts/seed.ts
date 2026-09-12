/**
 * Seeds Bhavnagar city, categories, venues, organisers, and listings
 * from the authentic dataset into Postgres/Supabase.
 *
 *   npm run db:seed
 */
import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local' });
config({ path: '.env' });

async function main(): Promise<void> {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.info('SUPABASE_DB_URL is not set. Skipping SQL seed execution (development mock feed remains active).');
    return;
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  console.info('Connected to database. Seeding Bhavnagar data…');

  try {
    await client.query('begin');

    // 1. Seed City (Bhavnagar)
    const cityRes = await client.query(`
      insert into public.cities (name, name_gu, slug, lat, lng, is_live)
      values ('Bhavnagar', 'ભાવનગર', 'bhavnagar', 21.7645, 72.1519, true)
      on conflict (slug) do update set is_live = true
      returning id;
    `);
    const cityId = cityRes.rows[0]?.id;

    // 2. Seed Categories
    const categories = [
      { slug: 'culture', name: 'Culture & Natak', name_gu: 'સંસ્કૃતિ અને નાટક', emoji: '🎭', sort_order: 1 },
      { slug: 'exhibitions', name: 'Exhibitions & Mela', name_gu: 'પ્રદર્શન અને મેળો', emoji: '🛍️', sort_order: 2 },
      { slug: 'sports', name: 'Sports & Turfs', name_gu: 'રમત-ગમત અને ટર્ફ', emoji: '🏏', sort_order: 3 },
      { slug: 'food', name: 'Food Crawls', name_gu: 'ફૂડ અને નાસ્તો', emoji: '🍜', sort_order: 4 },
      { slug: 'workshops', name: 'Workshops', name_gu: 'વર્કશોપ અને કળા', emoji: '🎨', sort_order: 5 },
      { slug: 'social', name: 'Social & Open Mic', name_gu: 'ઓપન માઇક અને મનોરંજન', emoji: '🎤', sort_order: 6 },
      { slug: 'festivals', name: 'Temple & Festivals', name_gu: 'મંદિર અને ઉત્સવ', emoji: '🛕', sort_order: 7 },
    ];

    for (const cat of categories) {
      await client.query(
        `insert into public.categories (slug, name, name_gu, emoji, sort_order)
         values ($1, $2, $3, $4, $5)
         on conflict (slug) do update set name = $2, name_gu = $3, emoji = $4, sort_order = $5`,
        [cat.slug, cat.name, cat.name_gu, cat.emoji, cat.sort_order],
      );
    }

    await client.query('commit');
    console.info('Database successfully seeded with pilot city and taxonomy.');
  } catch (err) {
    await client.query('rollback');
    console.error('Seeding failed:', err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
