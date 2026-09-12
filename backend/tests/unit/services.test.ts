import { describe, expect, it, beforeEach } from 'vitest';
import {
  diceCoefficient,
  DUPLICATE_THRESHOLD,
  findDuplicates,
  normaliseTitle,
  titleSimilarity,
  type DuplicateCandidate,
} from '../../src/lib/domain/duplicates';
import { localiseField, localiseListing } from '../../src/lib/domain/i18n';
import { draftFromSubmission } from '../../src/lib/services/submissions';
import {
  buildDigest,
  NoopPushProvider,
  getPushProvider,
} from '../../src/lib/services/notifications';
import { checkRateLimit, resetRateLimits, RATE_LIMITS } from '../../src/lib/api/rate-limit';
import { IST } from '../../src/lib/time/zoned';

// -- Duplicate detection (PRD A4) -----------------------------------------

describe('duplicate detection', () => {
  const existing: DuplicateCandidate[] = [
    {
      listingId: 'l1',
      title: 'Open Mic Night',
      venueId: 'v1',
      venueName: 'Nilambag Palace',
      dates: ['2026-09-15'],
    },
    {
      listingId: 'l2',
      title: 'Pottery Workshop for Beginners',
      venueId: 'v2',
      venueName: 'Barton Museum',
      dates: ['2026-09-20'],
    },
  ];

  it('normalises titles before comparing', () => {
    expect(normaliseTitle('  Open-Mic NIGHT!! ')).toBe('open mic night');
  });

  it('scores a near-identical title highly', () => {
    expect(titleSimilarity('Open Mic Night', 'Open Mic Nite')).toBeGreaterThan(0.7);
    expect(diceCoefficient('abcd', 'abcd')).toBe(1);
  });

  it('is robust to word order', () => {
    expect(titleSimilarity('Garba Night', 'Night Garba')).toBeGreaterThan(0.9);
  });

  it('flags the PRD case: similar title + same venue + same date', () => {
    const result = findDuplicates(
      { title: 'Open Mic Nite', venueId: 'v1', dates: ['2026-09-15'] },
      existing,
    );
    expect(result.potentialDuplicate).toBe(true);
    expect(result.bestMatch?.listingId).toBe('l1');
    expect(result.bestMatch?.sameVenue).toBe(true);
    expect(result.bestMatch?.sharedDates).toEqual(['2026-09-15']);
    expect(result.bestMatch!.score).toBeGreaterThanOrEqual(DUPLICATE_THRESHOLD);
  });

  it('does not flag the same title on a different date at a different venue', () => {
    const result = findDuplicates(
      { title: 'Open Mic Night', venueId: 'v9', dates: ['2026-12-01'] },
      existing,
    );
    expect(result.potentialDuplicate).toBe(false);
  });

  it('does not flag a genuinely different event', () => {
    const result = findDuplicates(
      { title: 'Blood Donation Camp', venueId: 'v1', dates: ['2026-09-15'] },
      existing,
    );
    expect(result.potentialDuplicate).toBe(false);
  });

  it('matches venues by name when ids are absent', () => {
    const result = findDuplicates(
      { title: 'Open Mic Night', venueName: 'Nilambag Palace', dates: ['2026-09-15'] },
      existing,
    );
    expect(result.bestMatch?.sameVenue).toBe(true);
  });

  it('can exclude the listing being edited', () => {
    const result = findDuplicates(
      { title: 'Open Mic Night', venueId: 'v1', dates: ['2026-09-15'], excludeListingId: 'l1' },
      existing,
    );
    expect(result.matches.find((m) => m.listingId === 'l1')).toBeUndefined();
  });

  it('returns enough detail for the admin UI to show the suspect', () => {
    const result = findDuplicates(
      { title: 'Open Mic Nite', venueId: 'v1', dates: ['2026-09-15'] },
      existing,
    );
    expect(result.bestMatch).toMatchObject({
      listingId: 'l1',
      title: 'Open Mic Night',
      sameVenue: true,
    });
    expect(typeof result.bestMatch?.titleSimilarity).toBe('number');
  });

  it('handles an empty candidate set', () => {
    const result = findDuplicates({ title: 'Anything', dates: ['2026-09-15'] }, []);
    expect(result.potentialDuplicate).toBe(false);
    expect(result.bestMatch).toBeNull();
  });
});

// -- Gujarati / English (PRD F10) -----------------------------------------

describe('language fallback', () => {
  it('returns Gujarati when it exists', () => {
    const field = localiseField('Open Mic', 'ઓપન માઇક', 'gu');
    expect(field.value).toBe('ઓપન માઇક');
    expect(field.fellBack).toBe(false);
  });

  it('falls back to English when Gujarati is missing', () => {
    const field = localiseField('Open Mic', null, 'gu');
    expect(field.value).toBe('Open Mic');
    expect(field.resolvedLang).toBe('en');
    expect(field.fellBack).toBe(true);
  });

  it('treats whitespace-only Gujarati as missing', () => {
    expect(localiseField('Open Mic', '   ', 'gu').value).toBe('Open Mic');
  });

  it('reports which fields fell back', () => {
    const content = localiseListing(
      {
        title: 'Garba Night',
        title_gu: 'ગરબા રાત્રિ',
        description: 'Dance till late',
        description_gu: null,
        hook: null,
        hook_gu: null,
      },
      'gu',
    );
    expect(content.title).toBe('ગરબા રાત્રિ');
    expect(content.description).toBe('Dance till late');
    expect(content.fallbacks).toEqual(['description']);
  });

  it('does not report a fallback for a field that is empty in both languages', () => {
    const content = localiseListing(
      { title: 'X', title_gu: 'ક્ષ', description: null, description_gu: null },
      'gu',
    );
    expect(content.fallbacks).toEqual([]);
  });

  it('always returns a title', () => {
    const content = localiseListing({ title: 'Only English' }, 'gu');
    expect(content.title).toBe('Only English');
  });
});

// -- Submission → listing draft (PRD A4) ----------------------------------

describe('submission to listing draft', () => {
  const base = {
    city_id: 'city-a',
    title: 'Community Dance Evening',
    category_id: 'cat-1',
    event_date: '2026-09-20',
    start_time: '19:00',
    end_time: '21:00',
    venue_id: null,
    venue_text: 'Town Hall',
    contact_phone: '+919876543210',
    raw_text: 'Forwarded message',
    image_url: null,
    price_text: null,
  };

  it('converts local date + time to UTC instants', () => {
    const draft = draftFromSubmission(base, 'fallback-cat', IST);
    // 19:00 IST = 13:30 UTC
    expect(draft.start_at).toBe('2026-09-20T13:30:00.000Z');
    expect(draft.end_at).toBe('2026-09-20T15:30:00.000Z');
  });

  it('handles a submission that runs past midnight', () => {
    const draft = draftFromSubmission(
      { ...base, start_time: '21:00', end_time: '01:00' },
      'fallback-cat',
      IST,
    );
    expect(draft.start_at).toBe('2026-09-20T15:30:00.000Z');
    // Ends on the 21st, not the 20th.
    expect(draft.end_at).toBe('2026-09-20T19:30:00.000Z');
    expect(new Date(draft.end_at!).getTime()).toBeGreaterThan(new Date(draft.start_at!).getTime());
  });

  it('assumes two hours when no end time was given', () => {
    const draft = draftFromSubmission({ ...base, end_time: null }, 'fallback-cat', IST);
    const duration =
      new Date(draft.end_at!).getTime() - new Date(draft.start_at!).getTime();
    expect(duration).toBe(2 * 3_600_000);
  });

  it('uses the fallback category when the submitter chose none', () => {
    const draft = draftFromSubmission({ ...base, category_id: null }, 'fallback-cat', IST);
    expect(draft.category_id).toBe('fallback-cat');
  });

  it('reads a free price', () => {
    expect(draftFromSubmission({ ...base, price_text: 'Entry Free' }, 'c', IST).price_type)
      .toBe('free');
    expect(draftFromSubmission({ ...base, price_text: null }, 'c', IST).price_type).toBe('free');
  });

  it('reads a paid price and its amount', () => {
    const draft = draftFromSubmission({ ...base, price_text: '₹250 per head' }, 'c', IST);
    expect(draft.price_type).toBe('paid');
    expect(draft.price_min).toBe(250);
  });

  it('never produces a published listing by itself', () => {
    // The draft carries no status at all — publishing is a separate, explicit
    // curator action, never something the mapper can do.
    const draft = draftFromSubmission(base, 'c', IST) as unknown as Record<string, unknown>;
    expect(draft.status).toBeUndefined();
    expect(draft.published_at).toBeUndefined();
  });

  it('survives a submission with almost nothing in it', () => {
    const draft = draftFromSubmission(
      { ...base, title: null, event_date: null, start_time: null, end_time: null },
      'fallback-cat',
      IST,
    );
    expect(draft.title).toBe('Untitled submission');
    expect(draft.start_at).toBeNull();
  });

  it('prefers a linked venue over free text', () => {
    const draft = draftFromSubmission({ ...base, venue_id: 'venue-9' }, 'c', IST);
    expect(draft.venue_id).toBe('venue-9');
    expect(draft.venue_text).toBeNull();
  });
});

// -- Notifications foundation (PRD F8 / A8) -------------------------------

describe('notifications foundation', () => {
  it('uses the no-op provider when PUSH_PROVIDER is none', () => {
    expect(getPushProvider().name).toBe('none');
  });

  it('reports a simulated send rather than claiming delivery', async () => {
    const result = await new NoopPushProvider().send({
      title: 'x',
      body: 'y',
      userIds: ['u1', 'u2'],
    });
    expect(result.simulated).toBe(true);
    expect(result.sent).toBe(0);
  });

  it('builds the daily digest from the top listings', () => {
    const digest = buildDigest('Bhavnagar', [
      { title: 'Garba Night', hook: 'Dandiya till late' },
      { title: 'Open Mic', hook: null },
    ]);
    expect(digest.title).toBe('2 things to do in Bhavnagar today');
    expect(digest.body).toBe('Garba Night — Dandiya till late\nOpen Mic');
  });

  it('gets the singular right', () => {
    expect(buildDigest('Bhavnagar', [{ title: 'One', hook: null }]).title)
      .toBe('1 thing to do in Bhavnagar today');
  });

  it('caps the digest at five items', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ title: `Item ${i}`, hook: null }));
    expect(buildDigest('Bhavnagar', many).body.split('\n')).toHaveLength(5);
  });
});

// -- Rate limiting ---------------------------------------------------------

describe('rate limiting', () => {
  beforeEach(() => resetRateLimits());

  it('allows requests up to the limit then blocks', () => {
    const limit = RATE_LIMITS.submission.limit;
    for (let i = 0; i < limit; i += 1) {
      expect(checkRateLimit('submission', 'ip:1.2.3.4').allowed).toBe(true);
    }
    const blocked = checkRateLimit('submission', 'ip:1.2.3.4');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('keeps separate buckets per identity', () => {
    for (let i = 0; i < RATE_LIMITS.submission.limit; i += 1) {
      checkRateLimit('submission', 'ip:1.1.1.1');
    }
    expect(checkRateLimit('submission', 'ip:2.2.2.2').allowed).toBe(true);
  });

  it('keeps separate buckets per rule', () => {
    for (let i = 0; i < RATE_LIMITS.submission.limit; i += 1) {
      checkRateLimit('submission', 'ip:3.3.3.3');
    }
    expect(checkRateLimit('analytics', 'ip:3.3.3.3').allowed).toBe(true);
  });

  it('resets after the window elapses', () => {
    const start = 1_000_000;
    for (let i = 0; i < RATE_LIMITS.submission.limit; i += 1) {
      checkRateLimit('submission', 'ip:4.4.4.4', start);
    }
    expect(checkRateLimit('submission', 'ip:4.4.4.4', start).allowed).toBe(false);
    const later = start + RATE_LIMITS.submission.windowMs + 1;
    expect(checkRateLimit('submission', 'ip:4.4.4.4', later).allowed).toBe(true);
  });
});
