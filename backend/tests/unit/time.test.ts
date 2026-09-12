import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  getZoneOffsetMs,
  IST,
  localDateTimeToUtc,
  localDayWindow,
  localToday,
  toLocalDateString,
  weekdayOf,
  weekendDates,
} from '../../src/lib/time/zoned';
import { ALL_DAY_MIN_HOURS, bandFor, groupByBand } from '../../src/lib/time/time-bands';

describe('IST ↔ UTC conversion', () => {
  it('offsets IST by +5:30', () => {
    expect(getZoneOffsetMs(new Date('2026-09-12T00:00:00Z'), IST)).toBe(5.5 * 3_600_000);
  });

  it('converts a local evening event to the right UTC instant', () => {
    // 19:30 IST on 12 Sep 2026 is 14:00 UTC the same day.
    expect(localDateTimeToUtc('2026-09-12', '19:30', IST).toISOString()).toBe(
      '2026-09-12T14:00:00.000Z',
    );
  });

  it('files a late-night event under the correct IST day, not the UTC day', () => {
    // 23:00 IST on 12 Sep is 17:30 UTC on 12 Sep — same day here …
    const late = localDateTimeToUtc('2026-09-12', '23:00', IST);
    expect(toLocalDateString(late, IST)).toBe('2026-09-12');

    // … but 01:00 IST on 13 Sep is 19:30 UTC on 12 Sep. Naive UTC-date handling
    // would file this under the 12th and break the day view.
    const afterMidnight = localDateTimeToUtc('2026-09-13', '01:00', IST);
    expect(afterMidnight.toISOString()).toBe('2026-09-12T19:30:00.000Z');
    expect(toLocalDateString(afterMidnight, IST)).toBe('2026-09-13');
  });

  it('produces a half-open UTC window for one local day', () => {
    const window = localDayWindow('2026-09-12', IST);
    expect(window.startUtc.toISOString()).toBe('2026-09-11T18:30:00.000Z');
    expect(window.endUtc.toISOString()).toBe('2026-09-12T18:30:00.000Z');
  });

  it('reports today in IST, not in the server timezone', () => {
    // 20:00 UTC on 12 Sep is already 01:30 IST on the 13th.
    expect(localToday(new Date('2026-09-12T20:00:00Z'), IST)).toBe('2026-09-13');
  });

  it('handles a DST timezone correctly (proof the IST path is not hardcoded)', () => {
    // 2026-03-29 is the European spring-forward date.
    expect(getZoneOffsetMs(new Date('2026-03-28T12:00:00Z'), 'Europe/London')).toBe(0);
    expect(getZoneOffsetMs(new Date('2026-03-30T12:00:00Z'), 'Europe/London')).toBe(3_600_000);
  });

  it('does date arithmetic in the calendar domain', () => {
    expect(addDays('2026-02-27', 2)).toBe('2026-03-01'); // 2026 is not a leap year
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-09-12', '2026-09-19')).toBe(7);
    expect(daysBetween('2026-09-19', '2026-09-12')).toBe(-7);
    expect(weekdayOf('2026-09-12')).toBe(6); // Saturday
  });

  it('rejects impossible dates instead of rolling them over', () => {
    expect(() => addDays('2026-02-30', 0)).toThrow(/Invalid calendar date/);
    expect(() => localDateTimeToUtc('2026-09-12', '25:00')).toThrow(/Invalid time/);
  });

  it('points "this weekend" at the weekend you are standing in', () => {
    expect(weekendDates('2026-09-09')).toEqual(['2026-09-12', '2026-09-13']); // Wed → Sat/Sun
    expect(weekendDates('2026-09-12')).toEqual(['2026-09-12', '2026-09-13']); // on Saturday
    expect(weekendDates('2026-09-13')).toEqual(['2026-09-12', '2026-09-13']); // on Sunday
  });
});

describe('time bands', () => {
  const at = (date: string, time: string) => localDateTimeToUtc(date, time, IST);

  it('assigns bands from the local start hour', () => {
    const cases: Array<[string, string, string]> = [
      ['07:00', '08:00', 'morning'],
      ['13:00', '15:00', 'afternoon'],
      ['18:00', '20:00', 'evening'],
      ['21:00', '23:30', 'tonight'],
      ['00:30', '02:00', 'tonight'],
    ];
    for (const [start, end, expected] of cases) {
      expect(
        bandFor({ startAt: at('2026-09-12', start), endAt: at('2026-09-12', end) }),
      ).toBe(expected);
    }
  });

  it('treats a long span as all day', () => {
    expect(
      bandFor({
        startAt: at('2026-09-12', '10:00'),
        endAt: at('2026-09-12', `${10 + ALL_DAY_MIN_HOURS}:00`),
      }),
    ).toBe('all_day');
  });

  it('prefers happening_now for an item in progress', () => {
    expect(
      bandFor({
        startAt: at('2026-09-12', '18:00'),
        endAt: at('2026-09-12', '21:00'),
        now: at('2026-09-12', '19:00'),
      }),
    ).toBe('happening_now');
  });

  it('never reports happening_now for a future day (now omitted)', () => {
    expect(
      bandFor({
        startAt: at('2026-09-13', '18:00'),
        endAt: at('2026-09-13', '21:00'),
        now: null,
      }),
    ).toBe('evening');
  });

  it('groups in PRD band order and drops empty bands', () => {
    const items = [
      { band: 'tonight' as const },
      { band: 'morning' as const },
      { band: 'tonight' as const },
    ];
    const grouped = groupByBand(items, (i) => i.band);
    expect([...grouped.keys()]).toEqual(['morning', 'tonight']);
    expect(grouped.get('tonight')).toHaveLength(2);
  });
});
