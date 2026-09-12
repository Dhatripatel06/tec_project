import { describe, expect, it } from 'vitest';
import { httpUrl, instagramUrl, localDate, localTime, money, phone } from '../../src/lib/validation/common';
import {
  analyticsBatchSchema,
  createListingSchema,
  feedQuerySchema,
  listingStatusChangeSchema,
  notificationSchema,
  recurrenceInputSchema,
  submissionModerationSchema,
  submissionSchema,
} from '../../src/lib/validation/schemas';

const CITY = '11111111-1111-1111-1111-111111111111';
const CAT = '22222222-2222-2222-2222-222222222222';

describe('primitive validators', () => {
  it('normalises Indian phone numbers to E.164', () => {
    expect(phone.parse('9876543210')).toBe('+919876543210');
    expect(phone.parse('+91 98765 43210')).toBe('+919876543210');
    expect(phone.parse('098765-43210')).toBe('+919876543210');
  });

  it('rejects implausible phone numbers', () => {
    expect(phone.safeParse('12345').success).toBe(false);
    expect(phone.safeParse('1234567890').success).toBe(false); // must start 6-9
  });

  it('rejects non-http URL schemes', () => {
    expect(httpUrl.safeParse('https://example.com').success).toBe(true);
    expect(httpUrl.safeParse('javascript:alert(1)').success).toBe(false);
    expect(httpUrl.safeParse('data:text/html,<script>').success).toBe(false);
  });

  it('restricts instagram URLs to instagram.com', () => {
    expect(instagramUrl.safeParse('https://instagram.com/p/abc').success).toBe(true);
    expect(instagramUrl.safeParse('https://www.instagram.com/p/abc').success).toBe(true);
    expect(instagramUrl.safeParse('https://evil.com/p/abc').success).toBe(false);
  });

  it('rejects calendar-impossible dates', () => {
    expect(localDate.safeParse('2026-09-12').success).toBe(true);
    expect(localDate.safeParse('2026-02-30').success).toBe(false);
    expect(localDate.safeParse('12-09-2026').success).toBe(false);
  });

  it('rejects impossible times', () => {
    expect(localTime.safeParse('19:30').success).toBe(true);
    expect(localTime.safeParse('25:00').success).toBe(false);
    expect(localTime.safeParse('19:99').success).toBe(false);
  });

  it('rejects negative and over-precise money', () => {
    expect(money.safeParse(250).success).toBe(true);
    expect(money.safeParse(-1).success).toBe(false);
    expect(money.safeParse(1.234).success).toBe(false);
  });
});

describe('recurrence validation', () => {
  const base = {
    freq: 'WEEKLY' as const,
    starts_on: '2026-09-12',
    ends_on: '2026-10-12',
    start_time: '19:00',
    end_time: '21:00',
    byweekday: [2],
  };

  it('accepts a well-formed weekly rule', () => {
    expect(recurrenceInputSchema.safeParse(base).success).toBe(true);
  });

  it('requires weekdays for a weekly rule', () => {
    expect(recurrenceInputSchema.safeParse({ ...base, byweekday: [] }).success).toBe(false);
  });

  it('rejects an out-of-range weekday', () => {
    expect(recurrenceInputSchema.safeParse({ ...base, byweekday: [7] }).success).toBe(false);
  });

  it('requires a repeating rule to be bounded', () => {
    const result = recurrenceInputSchema.safeParse({
      ...base,
      freq: 'DAILY',
      ends_on: null,
      count: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an end date before the start', () => {
    expect(
      recurrenceInputSchema.safeParse({ ...base, ends_on: '2026-09-01' }).success,
    ).toBe(false);
  });

  it('rejects an end time before the start unless it is overnight', () => {
    expect(
      recurrenceInputSchema.safeParse({ ...base, start_time: '21:00', end_time: '01:00' }).success,
    ).toBe(false);
    expect(
      recurrenceInputSchema.safeParse({
        ...base,
        start_time: '21:00',
        end_time: '01:00',
        ends_next_day: true,
      }).success,
    ).toBe(true);
  });
});

describe('listing validation', () => {
  const base = {
    city_id: CITY,
    category_id: CAT,
    title: 'A listing',
    venue_text: 'Somewhere',
    start_at: '2026-09-20T13:30:00.000Z',
    end_at: '2026-09-20T15:30:00.000Z',
  };

  it('accepts a one-time listing', () => {
    expect(createListingSchema.safeParse(base).success).toBe(true);
  });

  it('requires a schedule unless the listing is evergreen', () => {
    const { start_at, end_at, ...noSchedule } = base;
    expect(createListingSchema.safeParse(noSchedule).success).toBe(false);
    expect(
      createListingSchema.safeParse({ ...noSchedule, is_evergreen: true }).success,
    ).toBe(true);
  });

  it('refuses to let an evergreen listing carry a schedule', () => {
    expect(createListingSchema.safeParse({ ...base, is_evergreen: true }).success).toBe(false);
  });

  it('requires a price on a paid listing and forbids one otherwise', () => {
    expect(
      createListingSchema.safeParse({ ...base, price_type: 'paid' }).success,
    ).toBe(false);
    expect(
      createListingSchema.safeParse({ ...base, price_type: 'paid', price_min: 200 }).success,
    ).toBe(true);
    expect(
      createListingSchema.safeParse({ ...base, price_type: 'free', price_min: 200 }).success,
    ).toBe(false);
  });

  it('rejects an end before the start', () => {
    expect(
      createListingSchema.safeParse({ ...base, end_at: '2026-09-20T10:00:00.000Z' }).success,
    ).toBe(false);
  });

  it('requires a venue of some kind', () => {
    const { venue_text, ...noVenue } = base;
    expect(createListingSchema.safeParse(noVenue).success).toBe(false);
  });

  it('rejects a non-UUID city id', () => {
    expect(createListingSchema.safeParse({ ...base, city_id: 'bhavnagar' }).success).toBe(false);
  });
});

describe('status change validation', () => {
  it('requires a reason when rejecting', () => {
    expect(listingStatusChangeSchema.safeParse({ status: 'REJECTED' }).success).toBe(false);
    expect(
      listingStatusChangeSchema.safeParse({ status: 'REJECTED', reason: 'Duplicate' }).success,
    ).toBe(true);
  });

  it('does not require a reason to publish', () => {
    expect(listingStatusChangeSchema.safeParse({ status: 'PUBLISHED' }).success).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(listingStatusChangeSchema.safeParse({ status: 'LIVE' }).success).toBe(false);
  });
});

describe('submission validation', () => {
  it('accepts a minimal submission with just pasted text', () => {
    expect(
      submissionSchema.safeParse({ city_id: CITY, raw_text: 'Forwarded poster text' }).success,
    ).toBe(true);
  });

  it('rejects a submission with no content at all', () => {
    expect(submissionSchema.safeParse({ city_id: CITY }).success).toBe(false);
  });

  it('rejects a non-instagram link in the instagram field', () => {
    expect(
      submissionSchema.safeParse({
        city_id: CITY,
        title: 'X',
        instagram_url: 'https://evil.example/p/1',
      }).success,
    ).toBe(false);
  });

  it('requires a reason to reject and a listing to approve', () => {
    expect(submissionModerationSchema.safeParse({ action: 'REJECT' }).success).toBe(false);
    expect(
      submissionModerationSchema.safeParse({ action: 'REJECT', reason: 'Spam' }).success,
    ).toBe(true);
    expect(submissionModerationSchema.safeParse({ action: 'APPROVE' }).success).toBe(false);
  });
});

describe('feed query validation', () => {
  it('applies sensible defaults', () => {
    const parsed = feedQuerySchema.parse({});
    expect(parsed.sort).toBe('recommended');
    expect(parsed.lang).toBe('en');
    expect(parsed.limit).toBe(50);
  });

  it('parses comma-separated categories and boolean flags', () => {
    const parsed = feedQuerySchema.parse({ category: 'food-drink,movies', free_only: 'true' });
    expect(parsed.category).toEqual(['food-drink', 'movies']);
    expect(parsed.free_only).toBe(true);
  });

  it('rejects an unknown sort mode and an out-of-range latitude', () => {
    expect(feedQuerySchema.safeParse({ sort: 'popular' }).success).toBe(false);
    expect(feedQuerySchema.safeParse({ lat: '100' }).success).toBe(false);
  });

  it('caps the limit', () => {
    expect(feedQuerySchema.safeParse({ limit: '5000' }).success).toBe(false);
  });
});

describe('analytics and notification validation', () => {
  it('accepts a batch of known event types', () => {
    const result = analyticsBatchSchema.safeParse({
      events: [{ type: 'impression' }, { type: 'detail', listing_id: CITY }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown event type and an empty batch', () => {
    expect(analyticsBatchSchema.safeParse({ events: [{ type: 'hover' }] }).success).toBe(false);
    expect(analyticsBatchSchema.safeParse({ events: [] }).success).toBe(false);
  });

  it('requires segment_ref for targeted segments', () => {
    const base = { title: 'T', body: 'B' };
    expect(
      notificationSchema.safeParse({ ...base, segment: 'CATEGORY' }).success,
    ).toBe(false);
    expect(
      notificationSchema.safeParse({ ...base, segment: 'CATEGORY', segment_ref: CAT }).success,
    ).toBe(true);
    expect(notificationSchema.safeParse({ ...base, segment: 'ALL_USERS' }).success).toBe(true);
  });

  it('requires a city for a CITY segment', () => {
    expect(
      notificationSchema.safeParse({ title: 'T', body: 'B', segment: 'CITY' }).success,
    ).toBe(false);
  });
});
