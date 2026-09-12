/**
 * Seed data for the Bhavnagar pilot.
 *
 * HONESTY RULE (from the brief): nothing in here is claimed to be a real
 * scheduled event. Two different kinds of data live in this file:
 *
 *  - REAL REFERENCE DATA: the city, the PRD's category taxonomy, and venues
 *    that are genuine, publicly known Bhavnagar places (Victoria Park, Takhteshwar
 *    Temple, Velavadar). Coordinates are approximate.
 *
 *  - DEMO CONTENT: every listing. These are invented for development. Each one
 *    carries the `demo` tag and a description that says so, so a demo listing
 *    can never be mistaken for real programming. Replace them with genuine
 *    listings before showing this to anyone (PRD §15, day 10).
 */

export const DEMO_NOTICE =
  '[Demo data for development — this is not a real scheduled event.]';

export const DEMO_TAG = 'demo';

export const CITY = {
  slug: 'bhavnagar',
  name: 'Bhavnagar',
  name_gu: 'ભાવનગર',
  lat: 21.7645,
  lng: 72.1519,
  timezone: 'Asia/Kolkata',
  is_live: true,
};

/** PRD §5, verbatim, in the PRD's own order. */
export const CATEGORIES = [
  { slug: 'culture-shows', name: 'Culture & Shows', name_gu: 'સંસ્કૃતિ અને શો', emoji: '🎭' },
  { slug: 'nightlife-social', name: 'Nightlife & Social', name_gu: 'નાઇટલાઇફ અને સોશિયલ', emoji: '🎤' },
  { slug: 'sports-fitness', name: 'Sports & Fitness', name_gu: 'રમતગમત અને ફિટનેસ', emoji: '🏏' },
  { slug: 'workshops-classes', name: 'Workshops & Classes', name_gu: 'વર્કશોપ અને ક્લાસ', emoji: '🎨' },
  { slug: 'food-drink', name: 'Food & Drink', name_gu: 'ખાણી-પીણી', emoji: '🍜' },
  { slug: 'shopping-exhibitions', name: 'Shopping & Exhibitions', name_gu: 'ખરીદી અને પ્રદર્શન', emoji: '🛍️' },
  { slug: 'religious-festivals', name: 'Religious & Festivals', name_gu: 'ધાર્મિક અને ઉત્સવ', emoji: '🛕' },
  { slug: 'movies', name: 'Movies', name_gu: 'ફિલ્મો', emoji: '🎬' },
  { slug: 'outdoors-day-trips', name: 'Outdoors & Day-trips', name_gu: 'બહાર અને પ્રવાસ', emoji: '🌳' },
  { slug: 'kids-family', name: 'Kids & Family', name_gu: 'બાળકો અને પરિવાર', emoji: '👨‍👩‍👧' },
  { slug: 'community', name: 'Community', name_gu: 'સમુદાય', emoji: '🤝' },
  { slug: 'evergreen-picks', name: 'Evergreen Picks', name_gu: 'હંમેશાં સારા વિકલ્પ', emoji: '⭐' },
] as const;

/**
 * Real, publicly known Bhavnagar locations. Coordinates are approximate and
 * should be corrected against Google Maps before launch.
 */
export const VENUES = [
  {
    key: 'victoria-park',
    name: 'Victoria Park',
    name_gu: 'વિક્ટોરિયા પાર્ક',
    area: 'Victoria Park',
    address: 'Victoria Park, Bhavnagar, Gujarat',
    lat: 21.7554,
    lng: 72.1401,
  },
  {
    key: 'takhteshwar',
    name: 'Takhteshwar Temple',
    name_gu: 'તખ્તેશ્વર મંદિર',
    area: 'Takhteshwar',
    address: 'Takhteshwar Hill, Bhavnagar, Gujarat',
    lat: 21.7597,
    lng: 72.1476,
  },
  {
    key: 'gaurishankar-lake',
    name: 'Gaurishankar Lake',
    name_gu: 'ગૌરીશંકર તળાવ',
    area: 'Gaurishankar',
    address: 'Gaurishankar Lake, Bhavnagar, Gujarat',
    lat: 21.7719,
    lng: 72.1327,
  },
  {
    key: 'nilambag',
    name: 'Nilambag Palace',
    name_gu: 'નીલમબાગ પેલેસ',
    area: 'Nilambag',
    address: 'Nilambag Palace, Bhavnagar, Gujarat',
    lat: 21.7612,
    lng: 72.1367,
  },
  {
    key: 'velavadar',
    name: 'Velavadar Blackbuck National Park',
    name_gu: 'વેલવદર કાળિયાર રાષ્ટ્રીય ઉદ્યાન',
    area: 'Velavadar',
    address: 'Blackbuck National Park, Velavadar, Bhavnagar district',
    lat: 22.0333,
    lng: 72.0333,
  },
  {
    key: 'nishkalank',
    name: 'Nishkalank Mahadev Temple',
    name_gu: 'નિષ્કલંક મહાદેવ',
    area: 'Koliyak',
    address: 'Koliyak Beach, Bhavnagar district',
    lat: 21.6500,
    lng: 72.2333,
  },
  {
    key: 'gandhi-smriti',
    name: 'Gandhi Smriti',
    name_gu: 'ગાંધી સ્મૃતિ',
    area: 'Crescent Circle',
    address: 'Gandhi Smriti, Crescent Circle, Bhavnagar',
    lat: 21.7683,
    lng: 72.1520,
  },
  {
    key: 'barton-museum',
    name: 'Barton Museum',
    name_gu: 'બાર્ટન મ્યુઝિયમ',
    area: 'Crescent Circle',
    address: 'Barton Museum, Bhavnagar',
    lat: 21.7681,
    lng: 72.1518,
  },
] as const;

export type VenueKey = (typeof VENUES)[number]['key'];

/** Invented organisers for development. Names are marked as demo. */
export const ORGANISERS = [
  { key: 'demo-theatre', name: 'Demo Theatre Collective', trust_level: 'TRUSTED' as const },
  { key: 'demo-turf', name: 'Demo Sports Turf', trust_level: 'NEW' as const },
  { key: 'demo-cafe', name: 'Demo Cafe Collective', trust_level: 'NEW' as const },
  { key: 'demo-studio', name: 'Demo Art Studio', trust_level: 'VERIFIED' as const },
  { key: 'demo-ngo', name: 'Demo Community Trust', trust_level: 'TRUSTED' as const },
];

export type OrganiserKey = (typeof ORGANISERS)[number]['key'];

export interface SeedRecurrence {
  freq: 'ONCE' | 'DAILY' | 'WEEKLY';
  interval?: number;
  byweekday?: number[];
  /** Days from "today" the series begins. */
  startOffset: number;
  /** Days from "today" the series ends. */
  endOffset?: number;
  startTime: string;
  endTime: string;
  endsNextDay?: boolean;
}

export interface SeedListing {
  title: string;
  title_gu?: string;
  hook: string;
  hook_gu?: string;
  description: string;
  category: string;
  venue: VenueKey;
  organiser?: OrganiserKey;
  price_type: 'free' | 'paid' | 'donation';
  price_min?: number;
  price_max?: number;
  is_indoor: boolean;
  is_family_friendly: boolean;
  is_featured?: boolean;
  rank_weight?: number;
  capacity?: number;
  recurrence: SeedRecurrence;
}

/**
 * Scheduled demo listings. Offsets are relative to the day the seed runs, so
 * the feed always has something in it whenever you seed.
 */
export const SCHEDULED_LISTINGS: SeedListing[] = [
  {
    title: 'Gujarati Natak: Demo Evening Show',
    title_gu: 'ગુજરાતી નાટક: ડેમો સાંજનો શો',
    hook: 'A two-act comedy from the demo troupe',
    hook_gu: 'ડેમો મંડળી તરફથી બે અંકનું હાસ્ય નાટક',
    description: 'A full-length Gujarati play staged by a local theatre group.',
    category: 'culture-shows',
    venue: 'gandhi-smriti',
    organiser: 'demo-theatre',
    price_type: 'paid',
    price_min: 150,
    price_max: 300,
    is_indoor: true,
    is_family_friendly: true,
    is_featured: true,
    rank_weight: 8,
    capacity: 250,
    recurrence: { freq: 'ONCE', startOffset: 0, startTime: '19:30', endTime: '21:30' },
  },
  {
    title: 'Open Mic Tuesdays',
    title_gu: 'ઓપન માઇક મંગળવાર',
    hook: 'Poetry, standup and acoustic sets',
    description:
      'Weekly open mic. Sign-ups on the night; five minutes a slot. Recurs every Tuesday.',
    category: 'nightlife-social',
    venue: 'nilambag',
    organiser: 'demo-cafe',
    price_type: 'free',
    is_indoor: true,
    is_family_friendly: false,
    rank_weight: 5,
    // Tuesday, for eight weeks — the PRD's "weekly open mic" case.
    recurrence: {
      freq: 'WEEKLY',
      byweekday: [2],
      startOffset: 0,
      endOffset: 56,
      startTime: '19:00',
      endTime: '21:30',
    },
  },
  {
    title: 'Handicraft & Saree Exhibition',
    title_gu: 'હસ્તકલા અને સાડી પ્રદર્શન',
    hook: 'Five days of block prints and weaves',
    description:
      'A multi-day exhibition of regional handicraft. Runs daily — the PRD "exhibition running 5 days" case.',
    category: 'shopping-exhibitions',
    venue: 'barton-museum',
    organiser: 'demo-studio',
    price_type: 'free',
    is_indoor: true,
    is_family_friendly: true,
    rank_weight: 3,
    recurrence: {
      freq: 'DAILY',
      startOffset: 0,
      endOffset: 4,
      startTime: '10:00',
      endTime: '20:00', // 10 hours ⇒ lands in the All Day band
    },
  },
  {
    title: 'Garba Night',
    title_gu: 'ગરબા રાત્રિ',
    hook: 'Dandiya till past midnight',
    hook_gu: 'મધ્યરાત્રિ પછી સુધી દાંડિયા',
    description:
      'Evening garba with live dhol. Runs past midnight — the overnight-event case.',
    category: 'religious-festivals',
    venue: 'victoria-park',
    organiser: 'demo-ngo',
    price_type: 'paid',
    price_min: 100,
    is_indoor: false,
    is_family_friendly: true,
    is_featured: true,
    rank_weight: 9,
    recurrence: {
      freq: 'DAILY',
      startOffset: 1,
      endOffset: 3,
      startTime: '21:00',
      endTime: '01:00',
      endsNextDay: true,
    },
  },
  {
    title: 'Morning Yoga in the Park',
    title_gu: 'પાર્કમાં સવારની યોગ',
    hook: 'Free session, mats provided',
    description: 'Mon/Wed/Fri morning yoga. Beginners welcome.',
    category: 'sports-fitness',
    venue: 'victoria-park',
    organiser: 'demo-ngo',
    price_type: 'free',
    is_indoor: false,
    is_family_friendly: true,
    rank_weight: 4,
    recurrence: {
      freq: 'WEEKLY',
      byweekday: [1, 3, 5],
      startOffset: 0,
      endOffset: 30,
      startTime: '06:30',
      endTime: '07:30',
    },
  },
  {
    title: 'Turf Cricket Tournament',
    hook: 'Eight-team knockout under lights',
    description: 'Box cricket knockout. Teams of six.',
    category: 'sports-fitness',
    venue: 'gaurishankar-lake',
    organiser: 'demo-turf',
    price_type: 'paid',
    price_min: 500,
    is_indoor: false,
    is_family_friendly: false,
    rank_weight: 2,
    recurrence: { freq: 'ONCE', startOffset: 2, startTime: '18:00', endTime: '22:00' },
  },
  {
    title: 'Pottery Workshop for Beginners',
    title_gu: 'શરૂઆત કરનારાઓ માટે માટીકામ વર્કશોપ',
    hook: 'Wheel throwing, clay included',
    description: 'Three-hour hands-on pottery session. All materials provided.',
    category: 'workshops-classes',
    venue: 'barton-museum',
    organiser: 'demo-studio',
    price_type: 'paid',
    price_min: 800,
    is_indoor: true,
    is_family_friendly: true,
    rank_weight: 3,
    capacity: 12,
    recurrence: { freq: 'ONCE', startOffset: 1, startTime: '15:00', endTime: '18:00' },
  },
  {
    title: 'Blood Donation Camp',
    title_gu: 'રક્તદાન શિબિર',
    hook: 'Walk in, 30 minutes, free refreshments',
    description: 'Community blood donation drive.',
    category: 'community',
    venue: 'gandhi-smriti',
    organiser: 'demo-ngo',
    price_type: 'free',
    is_indoor: true,
    is_family_friendly: false,
    rank_weight: 6,
    recurrence: { freq: 'ONCE', startOffset: 0, startTime: '09:00', endTime: '14:00' },
  },
  {
    title: 'Kids Science Show',
    title_gu: 'બાળકો માટે વિજ્ઞાન શો',
    hook: 'Live experiments, ages 6-12',
    description: 'Interactive science demonstrations for children.',
    category: 'kids-family',
    venue: 'barton-museum',
    price_type: 'paid',
    price_min: 50,
    is_indoor: true,
    is_family_friendly: true,
    rank_weight: 4,
    recurrence: { freq: 'ONCE', startOffset: 1, startTime: '11:00', endTime: '12:30' },
  },
  {
    title: 'Street Food Festival',
    title_gu: 'સ્ટ્રીટ ફૂડ ફેસ્ટિવલ',
    hook: 'Thirty stalls, one evening',
    description: 'Weekend food festival with regional stalls.',
    category: 'food-drink',
    venue: 'victoria-park',
    organiser: 'demo-cafe',
    price_type: 'free',
    is_indoor: false,
    is_family_friendly: true,
    rank_weight: 7,
    recurrence: { freq: 'ONCE', startOffset: 3, startTime: '17:00', endTime: '22:00' },
  },
];

/**
 * Evergreen pool (PRD §5 / A9). These are real places, described as places to
 * go — never as events happening on a given date. The PRD targets ~30; this is
 * a working subset for development.
 */
export interface SeedEvergreen {
  title: string;
  title_gu?: string;
  hook: string;
  hook_gu?: string;
  description: string;
  category: string;
  venue: VenueKey;
  is_indoor: boolean;
  is_family_friendly: boolean;
  rank_weight: number;
}

export const EVERGREEN_LISTINGS: SeedEvergreen[] = [
  {
    title: 'Walk through Victoria Park',
    title_gu: 'વિક્ટોરિયા પાર્કમાં ચાલવું',
    hook: 'Bird-watching and shaded trails',
    hook_gu: 'પક્ષી નિહાળવા અને છાંયડાવાળા રસ્તા',
    description: 'A large urban forest on the edge of town. Best early morning or late afternoon.',
    category: 'outdoors-day-trips',
    venue: 'victoria-park',
    is_indoor: false,
    is_family_friendly: true,
    rank_weight: 9,
  },
  {
    title: 'Sunset at Takhteshwar Temple',
    title_gu: 'તખ્તેશ્વર મંદિરે સૂર્યાસ્ત',
    hook: 'The whole city from the hilltop',
    description: 'Hilltop temple with a view over Bhavnagar. Evening aarti is worth timing for.',
    category: 'religious-festivals',
    venue: 'takhteshwar',
    is_indoor: false,
    is_family_friendly: true,
    rank_weight: 8,
  },
  {
    title: 'Blackbuck spotting at Velavadar',
    title_gu: 'વેલવદરમાં કાળિયાર',
    hook: 'Grassland safari, about an hour away',
    description:
      'Blackbuck National Park. Check opening season and timings before travelling.',
    category: 'outdoors-day-trips',
    venue: 'velavadar',
    is_indoor: false,
    is_family_friendly: true,
    rank_weight: 9,
  },
  {
    title: 'Nishkalank Mahadev at low tide',
    title_gu: 'ઓટ સમયે નિષ્કલંક મહાદેવ',
    hook: 'A temple in the sea — tide-dependent',
    description:
      'Reachable on foot only at low tide. Check the tide table before you go.',
    category: 'outdoors-day-trips',
    venue: 'nishkalank',
    is_indoor: false,
    is_family_friendly: true,
    rank_weight: 7,
  },
  {
    title: 'Barton Museum collection',
    title_gu: 'બાર્ટન મ્યુઝિયમ સંગ્રહ',
    hook: 'Archaeology and local history',
    description: 'One of the older museums in Gujarat. Small, and quiet on weekdays.',
    category: 'culture-shows',
    venue: 'barton-museum',
    is_indoor: true,
    is_family_friendly: true,
    rank_weight: 6,
  },
  {
    title: 'Gandhi Smriti library and exhibit',
    title_gu: 'ગાંધી સ્મૃતિ પુસ્તકાલય',
    hook: 'Photographs, letters, and a reading room',
    description: 'A memorial and library at Crescent Circle.',
    category: 'culture-shows',
    venue: 'gandhi-smriti',
    is_indoor: true,
    is_family_friendly: true,
    rank_weight: 5,
  },
  {
    title: 'Evening at Gaurishankar Lake',
    title_gu: 'ગૌરીશંકર તળાવે સાંજ',
    hook: 'Lakeside walk and street food nearby',
    description: 'A popular evening spot for a walk.',
    category: 'outdoors-day-trips',
    venue: 'gaurishankar-lake',
    is_indoor: false,
    is_family_friendly: true,
    rank_weight: 6,
  },
  {
    title: 'Nilambag Palace grounds',
    title_gu: 'નીલમબાગ પેલેસ',
    hook: 'Heritage architecture, garden cafe',
    description: 'A former royal residence, now a heritage hotel. The grounds are worth a look.',
    category: 'culture-shows',
    venue: 'nilambag',
    is_indoor: false,
    is_family_friendly: true,
    rank_weight: 5,
  },
  {
    title: 'Bhavnagar old city food walk',
    title_gu: 'ભાવનગર જૂના શહેરમાં ફૂડ વોક',
    hook: 'Ganthiya, jalebi, and chai',
    description: 'Self-guided wander through the old market lanes. Best in the early evening.',
    category: 'food-drink',
    venue: 'gandhi-smriti',
    is_indoor: false,
    is_family_friendly: true,
    rank_weight: 7,
  },
  {
    title: 'Morning walk at Victoria Park',
    title_gu: 'વિક્ટોરિયા પાર્કમાં સવારની ચાલ',
    hook: 'Cooler, quieter, full of birds',
    description: 'The same park, a completely different place before 8am.',
    category: 'sports-fitness',
    venue: 'victoria-park',
    is_indoor: false,
    is_family_friendly: true,
    rank_weight: 4,
  },
  {
    title: 'Kids afternoon at Barton Museum',
    title_gu: 'બાર્ટન મ્યુઝિયમમાં બાળકોની બપોર',
    hook: 'Small, cool, and free to wander',
    description: 'An easy indoor option with children on a hot afternoon.',
    category: 'kids-family',
    venue: 'barton-museum',
    is_indoor: true,
    is_family_friendly: true,
    rank_weight: 4,
  },
  {
    title: 'Koliyak beach morning',
    title_gu: 'કોળિયાક બીચ સવાર',
    hook: 'Flat sands, good for a long walk',
    description: 'The beach beside Nishkalank Mahadev. Quiet outside festival days.',
    category: 'outdoors-day-trips',
    venue: 'nishkalank',
    is_indoor: false,
    is_family_friendly: true,
    rank_weight: 5,
  },
];
