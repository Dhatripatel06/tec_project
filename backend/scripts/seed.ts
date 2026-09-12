/**
 * Seeds Bhavnagar city, categories, venues, organisers, listings, and occurrences
 * into Postgres/Supabase database. First clears existing data, then seeds.
 *
 * Usage:
 *   npm run db:seed
 *   npm run db:reset
 */
import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: '.env.local' });
config({ path: '.env' });

export async function runClearAndSeed(): Promise<void> {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.info('SUPABASE_DB_URL is not set. Skipping SQL seed execution.');
    return;
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  console.info('Connected to database. Clearing old data and seeding Bhavnagar dataset...');

  try {
    await client.query('begin');

    // 0. CLEAR PREVIOUS DATA
    console.info('Clearing existing database tables...');
    await client.query(`
      truncate table 
        public.occurrences, 
        public.recurrences, 
        public.editor_picks, 
        public.listing_tags, 
        public.listings, 
        public.saves, 
        public.views, 
        public.submissions, 
        public.venues, 
        public.organisers, 
        public.categories, 
        public.cities 
      restart identity cascade;
    `);

    // 1. Seed City (Bhavnagar)
    console.info('Seeding city: Bhavnagar');
    const cityRes = await client.query(`
      insert into public.cities (name, name_gu, slug, lat, lng, timezone, is_live)
      values ('Bhavnagar', 'ભાવનગર', 'bhavnagar', 21.7645, 72.1519, 'Asia/Kolkata', true)
      returning id;
    `);
    const cityId = cityRes.rows[0].id;

    // 2. Seed Categories
    console.info('Seeding PRD categories...');
    const categoryMap = new Map<string, string>();
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
      const res = await client.query(
        `insert into public.categories (slug, name, name_gu, emoji, sort_order, is_active)
         values ($1, $2, $3, $4, $5, true)
         returning id`,
        [cat.slug, cat.name, cat.name_gu, cat.emoji, cat.sort_order],
      );
      categoryMap.set(cat.slug, res.rows[0].id);
    }

    // 3. Seed Venues
    console.info('Seeding venues...');
    const venueMap = new Map<string, string>();
    const venues = [
      { key: 'v-vjh', name: 'Victoria Jubilee Hall', name_gu: 'વિક્ટોરિયા જુબિલી હોલ', address: 'High Court Road, Bhavnagar', area: 'Nilambag', lat: 21.768, lng: 72.148 },
      { key: 'v-ccc', name: 'Crescent Circle Crafts Pavilion', name_gu: 'ક્રેસન્ટ સર્કલ પેવેલિયન', address: 'Crescent Circle, City Centre', area: 'Crescent', lat: 21.771, lng: 72.152 },
      { key: 'v-vsa', name: 'Victoria Sports Arena', name_gu: 'વિક્ટોરિયા સ્પોર્ટ્સ એરેના', address: 'Waghawadi Road, Bhavnagar', area: 'Waghawadi', lat: 21.758, lng: 72.145 },
      { key: 'v-yn', name: 'Yashwantrai Natyagruh', name_gu: 'યશવંતરાય નાટ્યગૃહ', address: 'Near Water Tank, Waghawadi Road', area: 'Waghawadi', lat: 21.761, lng: 72.147 },
      { key: 'v-ggm', name: 'Ghogha Gate Street Market', name_gu: 'ઘોઘા ગેટ માર્કેટ', address: 'Old City Ghogha Gate', area: 'Ghogha Circle', lat: 21.775, lng: 72.155 },
      { key: 'v-kas', name: 'Kalabhavan Art Studio', name_gu: 'કલાભવન આર્ટ સ્ટુડિયો', address: 'Near Nilambag Palace Drive', area: 'Nilambag', lat: 21.766, lng: 72.149 },
      { key: 'v-tcp', name: 'The Chai Project Rooftop', name_gu: 'ધ ચાઇ પ્રોજેક્ટ', address: 'Rooftop, Hill Drive Road', area: 'Kaliyabid', lat: 21.752, lng: 72.139 },
      { key: 'v-gsp', name: 'Ghogha Shoreline Promenade', name_gu: 'ઘોઘા બીચ દરિયાકિનારો', address: 'Coastal Highway, Ghogha', area: 'Ghogha Circle', lat: 21.685, lng: 72.281 },
      { key: 'v-tmt', name: 'Takhteshwar Mahadev Temple', name_gu: 'તખ્તેશ્વર મહાદેવ મંદિર', address: 'Hilltop Road, Bhavnagar', area: 'Waghawadi', lat: 21.762, lng: 72.142 },
      { key: 'v-vpf', name: 'Victoria Park Forest Sanctuary', name_gu: 'વિક્ટોરિયા પાર્ક જંગલ', address: 'Kaliyabid Road, Bhavnagar', area: 'Kaliyabid', lat: 21.748, lng: 72.140 },
    ];

    for (const v of venues) {
      const res = await client.query(
        `insert into public.venues (city_id, name, name_gu, address, area, lat, lng, is_active)
         values ($1, $2, $3, $4, $5, $6, $7, true)
         returning id`,
        [cityId, v.name, v.name_gu, v.address, v.area, v.lat, v.lng],
      );
      venueMap.set(v.key, res.rows[0].id);
    }

    // 4. Seed Organisers
    console.info('Seeding organisers...');
    const organiserMap = new Map<string, string>();
    const organisers = [
      { key: 'o-ojas', name: 'Ojas Arts & Heritage Guild', name_gu: 'ઓજસ આર્ટસ' },
      { key: 'o-sag', name: 'Saurashtra Artisan Guild', name_gu: 'સૌરાષ્ટ્ર કારીગર સંઘ' },
      { key: 'o-vsc', name: 'Victoria Sports Club', name_gu: 'વિક્ટોરિયા સ્પોર્ટ્સ કલબ' },
      { key: 'o-nst', name: 'Natya Saurabh Troupe', name_gu: 'નાટ્ય સૌરભ નાટક મંડળ' },
      { key: 'o-bfc', name: 'Bhavnagar Foodies Club', name_gu: 'ભાવનગર ફૂડીઝ ક્લબ' },
      { key: 'o-km', name: 'Kalabhavan Masters', name_gu: 'કલાભવન માસ્ટર્સ' },
      { key: 'o-cpc', name: 'Chai & Poetry Club', name_gu: 'ચાઇ એન્ડ પોએટ્રી' },
      { key: 'o-bt', name: 'Bhavnagar Tourism', name_gu: 'ભાવનગર ટુરિઝમ' },
      { key: 'o-ttrust', name: 'Takhteshwar Temple Trust', name_gu: 'તખ્તેશ્વર ટ્રસ્ટ' },
      { key: 'o-gfd', name: 'Gujarat Forest Dept', name_gu: 'ગુજરાત વન વિભાગ' },
    ];

    for (const org of organisers) {
      const res = await client.query(
        `insert into public.organisers (city_id, name, name_gu)
         values ($1, $2, $3)
         returning id`,
        [cityId, org.name, org.name_gu],
      );
      organiserMap.set(org.key, res.rows[0].id);
    }

    // 5. Seed Listings & Occurrences
    console.info('Seeding listings and occurrences...');
    const todayStr = new Date().toISOString().split('T')[0];

    const rawListings = [
      {
        slugCat: 'culture',
        venueKey: 'v-vjh',
        orgKey: 'o-ojas',
        title: 'Sur Sangam: Live Acoustic Gujarati Ghazal & Indie Fusion',
        title_gu: 'સૂર સંગમ: એકુસ્ટિક ગઝલ અને સંગીત સંધ્યા',
        description: 'A soulful live Saurashtrian evening uniting classical ghazals with modern contemporary sitar and percussionists.',
        price_type: 'paid',
        price_min: 299,
        price_max: 299,
        is_indoor: true,
        is_family_friendly: true,
        is_evergreen: false,
        is_featured: true,
        rank_weight: 100,
        startTime: '20:00:00',
        endTime: '22:00:00',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKairyZcRpTMjpTnJERNAbkEOFO31vdoPIyG22ybkw4IDUq-zHGAP3Wo1G9gz6Lijm4aBj6pCzozc9Jnhbhfhwi4Ccedu8Te3-tT9R0wfkQfrW79PaT6SnCVVr_ZIHjPWTigDYz0_rNQ8fxp_Do3LJJh1jJtpcD1Dd5jFn4fXNiJ2YniNBKOT6b7E1ZHkvumoysermLwE3gDWff6tt0mKseCODxwmfzCklXzAQjFtVOKs8PyuCbhBY1Q',
      },
      {
        slugCat: 'exhibitions',
        venueKey: 'v-ccc',
        orgKey: 'o-sag',
        title: 'Bhavnagar Artisan Khadi & Ceramic Showcase',
        title_gu: 'ભાવનગર ખાદી અને માટીકળા પ્રદર્શન',
        description: 'Vibrant Saurashtra local artisan showcase featuring handcrafted clay pottery, hand-spun organic khadi clothing.',
        price_type: 'free',
        price_min: null,
        price_max: null,
        is_indoor: false,
        is_family_friendly: true,
        is_evergreen: false,
        is_featured: false,
        rank_weight: 80,
        startTime: '16:30:00',
        endTime: '21:00:00',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuALRQnCb2arjuDTIX6DSqxum3zcPWZJ-A6gKbGGDCiA7X0hulvV_D5Av2unmGccW-7x44O5n62CkMXMbMxf6qrS10LK88XdIgijeJqzQ3ZVRXWuK6vMSLwtKT-5RvbQNLlo6rBtN2qKOS-MrdO3r0vPydn-bA-FK1f_ZvKLAo585ciiwUrkgO9zt4a2JQVaMSz-uO7WkdfNIUWQRhXkjuaqH0O3OcvsHv_xVbZ5NtR-leeZGGoVthuuyQ',
      },
      {
        slugCat: 'sports',
        venueKey: 'v-vsa',
        orgKey: 'o-vsc',
        title: 'Sunset Turf Cricket 6-a-Side Knockout',
        title_gu: 'સનસેટ ટર્ફ ક્રિકેટ ટુર્નામેન્ટ',
        description: 'High energy floodlit box turf cricket match under a dramatic dusk sky in Bhavnagar.',
        price_type: 'paid',
        price_min: 150,
        price_max: 150,
        is_indoor: false,
        is_family_friendly: true,
        is_evergreen: false,
        is_featured: false,
        rank_weight: 75,
        startTime: '17:30:00',
        endTime: '20:30:00',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGVyaFZSCuvhapUFAdNzpoRRXCk1FuWtyWA5BwuR7X8qlN2kiYxgzJIS3HJwLhjYw8S2r6fwb_SVxeDKK_0IT1dSlh2jLL3Iq49aF_4ShrQwbHjfm5H2-AZP37ec51QEkzNyDg5JpL_MEhCpWLCPzztlGkUhJ5zcO1LNeQufQWY_ettrA7fgGgfvSo8aw6ax4Lfr815JnkwQLVfZ-b2_qVWIPiRMzm6kjW-L4AiQDCxk_PvdL2IkRLJg',
      },
      {
        slugCat: 'culture',
        venueKey: 'v-yn',
        orgKey: 'o-nst',
        title: 'Superhit Gujarati Natak: "Kahaani Maa Twist Chhe"',
        title_gu: 'કહાની માં ટ્વિસ્ટ છે — હાસ્ય નાટક',
        description: 'Bhavnagar\'s biggest weekend theatre laughter riot starring renowned Saurashtrian artists.',
        price_type: 'paid',
        price_min: 200,
        price_max: 500,
        is_indoor: true,
        is_family_friendly: true,
        is_evergreen: false,
        is_featured: false,
        rank_weight: 90,
        startTime: '20:30:00',
        endTime: '23:00:00',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4iGLcIu8KTmOx1KLNcxVE3pBquAXKyhy47lqLMVqSiuQYOF5iFe4raFv7wZ5MbZpcl7aCWFqhI7gkbRUoopZ-mF8R3qF1682GmKBfU0QjvTVZWHYeCZB_26nuSm22Id2IYKIOTWcB0fBvQOGFYGGtxN9VNhHA7hJd0PWySROVsAYqcpPQz4GMk15kCjpZervNFVndQ9MzqAfJrQ6FVTTJkk08cHQ9VyDiNUuErSfgu5SCgOyJvSfeFg',
      },
      {
        slugCat: 'food',
        venueKey: 'v-ggm',
        orgKey: 'o-bfc',
        title: 'Night Food Street: Bhavnagari Gathiya & Chaat Crawl',
        title_gu: 'નાઇટ ફૂડ સ્ટ્રીટ: ભાવનગરી ગાંઠિયા સ્પેશિયલ',
        description: 'Traditional Gujarati evening street food in Bhavnagar, freshly fried crisp hot Bhavnagari gathiya.',
        price_type: 'free',
        price_min: null,
        price_max: null,
        is_indoor: false,
        is_family_friendly: true,
        is_evergreen: false,
        is_featured: false,
        rank_weight: 85,
        startTime: '19:00:00',
        endTime: '22:30:00',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCmDWgl_-uVycx1QKIGVEG2p5_4zJmj2LKvzJmL5Z22xq1H8Jlu26XwF6x1VCAG5ljDQKvA1DIxWsn8ZvkeB5ctbcuA8Nhme3Up1Yq0gDG565dpdkQRN1ja1CIQMad6OsKXhj6cr79Nt_cnbrsDOrFe7pHUHv4herEkQbRM3t5QgeO4MVnY5BGDo1VR6pebi8krb6_Ns9nYXksRHe_wF4umW-Y5LRbACdsVoYF4Vo9CjmliWdiTffjIgQ',
      },
      {
        slugCat: 'workshops',
        venueKey: 'v-kas',
        orgKey: 'o-km',
        title: 'Terracotta Pottery & Clay Sculpting Workshop',
        title_gu: 'માટીના વાસણો અને શિલ્પકળા વર્કશોપ',
        description: 'Hands gently molding terracotta red clay on pottery wheel in Kalabhavan Bhavnagar art studio.',
        price_type: 'paid',
        price_min: 350,
        price_max: 350,
        is_indoor: true,
        is_family_friendly: true,
        is_evergreen: false,
        is_featured: false,
        rank_weight: 70,
        startTime: '18:30:00',
        endTime: '20:30:00',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2A2YdU-7d8sXcZGwobsEgQZVQ77ph487AupXv0NwVFS7VtHiXsYiphoIF_QhnHnSCE-VyoZXi2wHUdMB02BwWNmgbh8ORDyzow6cau_HazvLJxMLTETIas2NhYJ_VnvXVVTuzRphl3I53XwUKJVBFDmxvUARxWsLHQ72_SCbxzZQbOHivX3NG11t3bzUJXOytH53ei1wnffmkFfsTIfOkfQYOdS_nSoFsmlBHwzxssWth3MI9Ht9FGw',
      },
      {
        slugCat: 'social',
        venueKey: 'v-tcp',
        orgKey: 'o-cpc',
        title: 'Rooftop Acoustic Open Mic & Shayari Circle',
        title_gu: 'રૂફટોપ ઓપન માઇક અને શાયરી વર્તુળ',
        description: 'Spoken word, original Gujarati poems, acoustic guitars under Saurashtra\'s night sky.',
        price_type: 'free',
        price_min: null,
        price_max: null,
        is_indoor: false,
        is_family_friendly: true,
        is_evergreen: false,
        is_featured: false,
        rank_weight: 65,
        startTime: '21:30:00',
        endTime: '23:45:00',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJSBlB75N_pGOHcCCbOTZeww--13WXYPJuroGHFYhTIcJUquJ8b5QqEndiQlKmDOj55S-FTvVJJ9qxnej43LEsEVrrux8gIzDA3w_VZ5In4o37xP-vOKHiwp3_QzxtzK2HX8ne8ANdrEgzRSI-xlPN0UKsOjQzZOFldUXjHtsKZHuLRYsT6ggCCKlT5bZqz2-zZckx3_VlpQhuuRh6ZQQyTecKd0-M-n_1A7D3THyt714JDrlOdDY4ew',
      },
      {
        slugCat: 'social',
        venueKey: 'v-gsp',
        orgKey: 'o-bt',
        title: 'Ghogha Beach Sunset Promenade',
        title_gu: 'ઘોઘા બીચ સૂર્યાસ્ત સફર',
        description: 'Serene panoramic view of Ghogha coastal shoreline near Bhavnagar at sunset.',
        price_type: 'free',
        price_min: null,
        price_max: null,
        is_indoor: false,
        is_family_friendly: true,
        is_evergreen: true,
        is_featured: false,
        rank_weight: 95,
        startTime: null,
        endTime: null,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOemAPwlEibuPwNxuAKO-qQf_Cno3m3ihlLQ_d3en7ajFaKfRb_0bfUHQq76mccxhUmtE7fK6iWRZdxwECGQcrjWRluMEAcCm0tP31uog3tsiGdtkWnC9i8faoSD40ZyFpyFun2PnVpTK17XnnR9Gur3jWOecTwBi-wkSJvnvfOvGGH3ROrppRsIrFsqxyx1qvT_rNCB10B6ZceIRF4QJO1f9aGDcy46Ix3m4K__VAMIUwf_KrNsNpnA',
      },
      {
        slugCat: 'festivals',
        venueKey: 'v-tmt',
        orgKey: 'o-ttrust',
        title: 'Takhteshwar Hilltop City Vista',
        title_gu: 'તખ્તેશ્વર મહાદેવ મંદિર દર્શન',
        description: 'Historic marble Takhteshwar temple perched on high hill overlooking Bhavnagar city skyline.',
        price_type: 'free',
        price_min: null,
        price_max: null,
        is_indoor: false,
        is_family_friendly: true,
        is_evergreen: true,
        is_featured: false,
        rank_weight: 90,
        startTime: null,
        endTime: null,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGCRh0_qN8RSdQcgHAmhK0Yw2nmJWSZUvSF_dz4MTkeN3DQSwOhfMHEwPzBhUKRQi8jfYPRefpVJdzHPg1LCFYgMSjHLENdZ8FHecu3WFDmVLoGKEyaZh57EQ0qVT2N9SnNLghtvFVgHQknm3zdD3kOphgxs5iJwFc5tM4hLFoh_ZM2xC_XYraci1h3HO-tx_G2eN5aMIZzK_j6jBEtBj_rPgvKRiW0tfK0NdvC-32kio_GRTRvCyrIQ',
      },
      {
        slugCat: 'sports',
        venueKey: 'v-vpf',
        orgKey: 'o-gfd',
        title: 'Victoria Park Nature Forest Trail',
        title_gu: 'વિક્ટોરિયા પાર્ક પ્રકૃતિ ભ્રમણ',
        description: 'Dense lush tranquil protected birding forest trails inside Victoria Park Bhavnagar.',
        price_type: 'paid',
        price_min: 20,
        price_max: 20,
        is_indoor: false,
        is_family_friendly: true,
        is_evergreen: true,
        is_featured: false,
        rank_weight: 85,
        startTime: null,
        endTime: null,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAM1CI55Lu_7KpmRgUSLd2jnXNnUood11nqgiIE4o88KxM13aTusNx6AdL1pTUZBsdAtS1ePMv_Evh6m5Uq-0Eg9HsrC4J2YyCv14GnGTnORQPA1jPyg_f2MWco51OIFEq_DMkH6-ZFUAny_FFk7jwlcQOd4sCWKAXxqz_7aItNSPpk6y0nYKxbP4Iw1Kmm1muLdQHf2xW6rlQLLRx6DiCGiz2EnwkjvnkBjf39hULifFVemoxoxfPsJg',
      },
    ];

    let featuredListingId = '';

    for (const item of rawListings) {
      const categoryId = categoryMap.get(item.slugCat);
      const venueId = venueMap.get(item.venueKey);
      const organiserId = organiserMap.get(item.orgKey);

      let startAt: string | null = null;
      let endAt: string | null = null;

      if (item.startTime && item.endTime) {
        startAt = `${todayStr}T${item.startTime}+05:30`;
        endAt = `${todayStr}T${item.endTime}+05:30`;
      }

      const listingRes = await client.query(
        `insert into public.listings (
          city_id, category_id, venue_id, organiser_id,
          title, title_gu, description, start_at, end_at,
          price_type, price_min, price_max, is_indoor, is_family_friendly,
          is_evergreen, is_featured, rank_weight, cover_image, status
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'PUBLISHED')
        returning id`,
        [
          cityId, categoryId, venueId, organiserId,
          item.title, item.title_gu, item.description, startAt, endAt,
          item.price_type, item.price_min, item.price_max, item.is_indoor, item.is_family_friendly,
          item.is_evergreen, item.is_featured, item.rank_weight, item.image,
        ],
      );

      const listingId = listingRes.rows[0].id;

      if (item.is_featured) {
        featuredListingId = listingId;
      }

      // Create occurrences for today and upcoming dates if not evergreen
      if (!item.is_evergreen && item.startTime && item.endTime) {
        for (let dayOffset = 0; dayOffset <= 3; dayOffset++) {
          const d = new Date();
          d.setDate(d.getDate() + dayOffset);
          const dateStr = d.toISOString().split('T')[0];
          const sAt = `${dateStr}T${item.startTime}+05:30`;
          const eAt = `${dateStr}T${item.endTime}+05:30`;

          await client.query(
            `insert into public.occurrences (listing_id, city_id, local_date, start_at, end_at, is_cancelled)
             values ($1, $2, $3, $4, $5, false)`,
            [listingId, cityId, dateStr, sAt, eAt],
          );
        }
      }
    }

    // 6. Seed Editor Picks for today
    if (featuredListingId) {
      console.info('Seeding editor pick for today...');
      await client.query(
        `insert into public.editor_picks (city_id, listing_id, pick_date)
         values ($1, $2, $3)
         on conflict (city_id, pick_date) do update set listing_id = $2`,
        [cityId, featuredListingId, todayStr],
      );
    }

    await client.query('commit');
    console.info('Database cleared and successfully seeded with Bhavnagar city, categories, venues, organisers, listings, and occurrences!');
  } catch (err) {
    await client.query('rollback');
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  await runClearAndSeed();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
