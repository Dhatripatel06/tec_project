import { describe, expect, it } from 'vitest';
import {
  buildFeed,
  EVERGREEN_THRESHOLD,
  rotateEvergreen,
  toEvergreenCandidate,
  toScheduledCandidate,
  type FeedListing,
  type FeedOccurrence,
} from '../../src/lib/domain/feed';
import { haversineKm, rankItems, scoreItem } from '../../src/lib/domain/ranking';
import { IST, localDateTimeToUtc } from '../../src/lib/time/zoned';

const DATE = '2026-09-12';
const NOW = localDateTimeToUtc(DATE, '10:00', IST);

let counter = 0;
function listing(overrides: Partial<FeedListing> = {}): FeedListing {
  counter += 1;
  return {
    listingId: `listing-${String(counter).padStart(3, '0')}`,
    cityId: 'city-a',
    categoryId: 'cat-1',
    categorySlug: 'culture-shows',
    title: `Listing ${counter}`,
    titleGu: null,
    description: null,
    descriptionGu: null,
    hook: null,
    hookGu: null,
    coverImage: null,
    priceType: 'free',
    priceMin: null,
    priceMax: null,
    isIndoor: true,
    isFamilyFriendly: false,
    isEvergreen: false,
    isFeatured: false,
    rankWeight: 0,
    venueId: 'venue-1',
    venueName: 'Venue One',
    venueLat: null,
    venueLng: null,
    organiserId: null,
    organiserName: null,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    ...overrides,
  };
}

function occurrence(l: FeedListing, start: string, end: string): FeedOccurrence {
  return {
    occurrenceId: `occ-${l.listingId}`,
    listingId: l.listingId,
    localDate: DATE,
    startAt: localDateTimeToUtc(DATE, start, IST),
    endAt: localDateTimeToUtc(DATE, end, IST),
    isCancelled: false,
  };
}

function run(
  listings: FeedListing[],
  occurrences: FeedOccurrence[],
  evergreen: FeedListing[] = [],
  request: Partial<Parameters<typeof buildFeed>[0]> = {},
) {
  const map = new Map(listings.map((l) => [l.listingId, l]));
  return buildFeed(
    { date: DATE, now: NOW, timezone: IST, isToday: true, ...request },
    map,
    occurrences,
    evergreen,
  );
}

describe('feed assembly', () => {
  it('groups items into time bands in PRD order', () => {
    const a = listing();
    const b = listing();
    const c = listing();
    const result = run(
      [a, b, c],
      [
        occurrence(c, '21:00', '23:00'),
        occurrence(a, '09:00', '10:30'),
        occurrence(b, '18:00', '19:30'),
      ],
    );
    // 09:00-10:30 contains NOW (10:00) so it is Happening Now.
    expect(result.sections.map((s) => s.band)).toEqual(['happening_now', 'evening', 'tonight']);
  });

  it('excludes an occurrence that has already finished', () => {
    const past = listing();
    const future = listing();
    const result = run(
      [past, future],
      [occurrence(past, '06:00', '08:00'), occurrence(future, '18:00', '20:00')],
    );
    expect(result.items.map((i) => i.listingId)).toEqual([future.listingId]);
  });

  it('excludes a cancelled occurrence', () => {
    const cancelled = listing();
    const result = run([cancelled], [{ ...occurrence(cancelled, '18:00', '20:00'), isCancelled: true }]);
    expect(result.items).toHaveLength(0);
  });

  it('fills a thin day from the evergreen pool', () => {
    const only = listing();
    const pool = [listing({ isEvergreen: true }), listing({ isEvergreen: true }), listing({ isEvergreen: true })];
    const result = run([only], [occurrence(only, '18:00', '20:00')], pool);

    expect(result.meta.evergreenFallbackApplied).toBe(true);
    expect(result.meta.realCount).toBe(1);
    expect(result.meta.evergreenCount).toBe(3);
    expect(result.items.length).toBe(4);
  });

  it('does not fall back when the day is already full', () => {
    const many = Array.from({ length: EVERGREEN_THRESHOLD }, () => listing());
    const result = run(
      many,
      many.map((l) => occurrence(l, '18:00', '20:00')),
      [listing({ isEvergreen: true })],
    );
    expect(result.meta.evergreenFallbackApplied).toBe(false);
    expect(result.meta.evergreenCount).toBe(0);
  });

  it('never presents an evergreen item as scheduled', () => {
    const pool = [listing({ isEvergreen: true })];
    const result = run([], [], pool);
    const filler = result.items[0]!;

    expect(filler.kind).toBe('evergreen');
    expect(filler.occurrence).toBeNull();
    expect(filler.startAt).toBeNull();
    expect(filler.band).toBe('all_day');
  });

  it('does not duplicate a listing that is both scheduled and in the pool', () => {
    const shared = listing();
    const result = run([shared], [occurrence(shared, '18:00', '20:00')], [shared]);
    expect(result.items.filter((i) => i.listingId === shared.listingId)).toHaveLength(1);
  });

  it('measures the fallback threshold against filtered results', () => {
    // Four sports items exist, but the user filtered to food — still fills.
    const sports = Array.from({ length: 4 }, () => listing({ categorySlug: 'sports-fitness' }));
    const pool = [listing({ isEvergreen: true, categorySlug: 'food-drink' })];
    const result = run(
      sports,
      sports.map((l) => occurrence(l, '18:00', '20:00')),
      pool,
      { filters: { categorySlugs: ['food-drink'] } },
    );
    expect(result.meta.realCount).toBe(0);
    expect(result.meta.evergreenCount).toBe(1);
  });
});

describe('feed filters', () => {
  const free = listing({ priceType: 'free' });
  const paid = listing({ priceType: 'paid', priceMin: 200 });
  const outdoor = listing({ isIndoor: false });
  const family = listing({ isFamilyFriendly: true });
  const all = [free, paid, outdoor, family];
  const occurrences = all.map((l) => occurrence(l, '18:00', '20:00'));

  it('filters free only', () => {
    const result = run(all, occurrences, [], { filters: { freeOnly: true } });
    expect(result.items.map((i) => i.listingId)).not.toContain(paid.listingId);
  });

  it('filters indoor and outdoor', () => {
    const indoorOnly = run(all, occurrences, [], { filters: { indoor: true } });
    expect(indoorOnly.items.map((i) => i.listingId)).not.toContain(outdoor.listingId);

    const outdoorOnly = run(all, occurrences, [], { filters: { indoor: false } });
    expect(outdoorOnly.items.map((i) => i.listingId)).toEqual([outdoor.listingId]);
  });

  it('filters family friendly', () => {
    const result = run(all, occurrences, [], { filters: { familyFriendly: true } });
    expect(result.items.map((i) => i.listingId)).toEqual([family.listingId]);
  });

  it('filters by time band', () => {
    const evening = listing();
    const night = listing();
    const result = run(
      [evening, night],
      [occurrence(evening, '18:00', '19:30'), occurrence(night, '21:00', '23:00')],
      [],
      { filters: { timeOfDay: ['tonight'] } },
    );
    expect(result.items.map((i) => i.listingId)).toEqual([night.listingId]);
  });

  it('filters by distance when the user is located', () => {
    // Bhavnagar centre, and a point roughly 40km away.
    const near = listing({ venueLat: 21.7645, venueLng: 72.1519 });
    const far = listing({ venueLat: 22.0333, venueLng: 72.0333 });
    const result = run(
      [near, far],
      [occurrence(near, '18:00', '20:00'), occurrence(far, '18:00', '20:00')],
      [],
      {
        userLocation: { lat: 21.7645, lng: 72.1519 },
        filters: { maxDistanceKm: 10 },
      },
    );
    expect(result.items.map((i) => i.listingId)).toEqual([near.listingId]);
  });

  it('keeps items with unknown distance rather than hiding them', () => {
    const unlocated = listing({ venueLat: null, venueLng: null });
    const result = run([unlocated], [occurrence(unlocated, '18:00', '20:00')], [], {
      userLocation: { lat: 21.76, lng: 72.15 },
      filters: { maxDistanceKm: 1 },
    });
    expect(result.items).toHaveLength(1);
  });
});

describe('ranking', () => {
  const ctx = { now: NOW };

  it('puts the editor’s pick first in every sort mode', () => {
    const pick = listing();
    const featured = listing({ isFeatured: true, rankWeight: 50 });
    const result = run(
      [pick, featured],
      [occurrence(pick, '22:00', '23:00'), occurrence(featured, '11:00', '12:00')],
      [],
      { editorsPickListingId: pick.listingId, sort: 'starting_soon' },
    );
    expect(result.items[0]!.listingId).toBe(pick.listingId);
  });

  it('ranks featured above ordinary items', () => {
    const plain = listing();
    const featured = listing({ isFeatured: true });
    const result = run(
      [plain, featured],
      [occurrence(plain, '18:00', '20:00'), occurrence(featured, '18:00', '20:00')],
    );
    expect(result.items[0]!.listingId).toBe(featured.listingId);
  });

  it('respects admin rank_weight', () => {
    const low = listing({ rankWeight: 1 });
    const high = listing({ rankWeight: 9 });
    const result = run(
      [low, high],
      [occurrence(low, '18:00', '20:00'), occurrence(high, '18:00', '20:00')],
    );
    expect(result.items[0]!.listingId).toBe(high.listingId);
  });

  it('scores evergreen below equivalent real content', () => {
    const real = toScheduledCandidate(listing(), occurrence(listing(), '18:00', '20:00'), {
      now: NOW,
      isToday: true,
    });
    const filler = toEvergreenCandidate(listing({ isEvergreen: true }), {});
    expect(scoreItem(real, ctx)).toBeGreaterThan(scoreItem(filler, ctx));
  });

  it('orders starting_soon strictly by start time, unscheduled last', () => {
    const late = listing();
    const early = listing();
    const filler = listing({ isEvergreen: true });
    const result = run(
      [late, early],
      [occurrence(late, '22:00', '23:00'), occurrence(early, '11:00', '12:00')],
      [filler],
      { sort: 'starting_soon' },
    );
    expect(result.items.map((i) => i.listingId)).toEqual([
      early.listingId,
      late.listingId,
      filler.listingId,
    ]);
  });

  it('is deterministic: the same input always yields the same order', () => {
    const items = [listing({ rankWeight: 3 }), listing({ rankWeight: 3 }), listing({ rankWeight: 3 })];
    const occurrences = items.map((l) => occurrence(l, '18:00', '20:00'));
    const first = run(items, occurrences).items.map((i) => i.listingId);
    const second = run(items, occurrences).items.map((i) => i.listingId);
    expect(first).toEqual(second);
  });

  it('sorts nearest by distance, unlocated last', () => {
    const near = listing({ venueLat: 21.7645, venueLng: 72.1519 });
    const far = listing({ venueLat: 22.0333, venueLng: 72.0333 });
    const unknown = listing();
    const all = [far, unknown, near];
    const result = run(all, all.map((l) => occurrence(l, '18:00', '20:00')), [], {
      sort: 'nearest',
      userLocation: { lat: 21.7645, lng: 72.1519 },
    });
    expect(result.items.map((i) => i.listingId)).toEqual([
      near.listingId,
      far.listingId,
      unknown.listingId,
    ]);
  });

  it('computes great-circle distance sensibly', () => {
    const km = haversineKm({ lat: 21.7645, lng: 72.1519 }, { lat: 22.0333, lng: 72.0333 });
    expect(km).toBeGreaterThan(25);
    expect(km).toBeLessThan(40);
  });

  it('keeps rankItems stable for identical scores', () => {
    const base = { isEditorsPick: false, isFeatured: false, rankWeight: 0, isEvergreen: false,
      startAt: null, distanceKm: null, createdAt: new Date() };
    const items = [
      { ...base, listingId: 'c' },
      { ...base, listingId: 'a' },
      { ...base, listingId: 'b' },
    ];
    expect(rankItems(items, 'recommended', ctx).map((i) => i.listingId)).toEqual(['a', 'b', 'c']);
  });
});

describe('evergreen rotation', () => {
  const pool = Array.from({ length: 6 }, (_, i) =>
    toEvergreenCandidate(listing({ isEvergreen: true, rankWeight: 6 - i }), {}),
  );

  it('is deterministic for a given date', () => {
    const a = rotateEvergreen(pool, '2026-09-12', 3).map((i) => i.listingId);
    const b = rotateEvergreen(pool, '2026-09-12', 3).map((i) => i.listingId);
    expect(a).toEqual(b);
  });

  it('rotates across days so the pool gets airtime', () => {
    const day1 = rotateEvergreen(pool, '2026-09-12', 2).map((i) => i.listingId);
    const day2 = rotateEvergreen(pool, '2026-09-13', 2).map((i) => i.listingId);
    expect(day1).not.toEqual(day2);
  });

  it('handles an empty pool and a zero take', () => {
    expect(rotateEvergreen([], '2026-09-12', 3)).toEqual([]);
    expect(rotateEvergreen(pool, '2026-09-12', 0)).toEqual([]);
  });

  it('never returns more than asked for', () => {
    expect(rotateEvergreen(pool, '2026-09-12', 2)).toHaveLength(2);
    expect(rotateEvergreen(pool.slice(0, 2), '2026-09-12', 5)).toHaveLength(2);
  });
});
