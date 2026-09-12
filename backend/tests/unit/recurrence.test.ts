import { describe, expect, it } from 'vitest';
import {
  diffOccurrences,
  expandRecurrence,
  expandSingleEvent,
  RecurrenceError,
  type ExistingOccurrence,
  type RecurrenceRule,
} from '../../src/lib/domain/recurrence';
import { IST, localDateTimeToUtc, toLocalDateString } from '../../src/lib/time/zoned';

const base: RecurrenceRule = {
  freq: 'DAILY',
  startsOn: '2026-09-12',
  endsOn: '2026-09-16',
  startTime: '19:00',
  endTime: '21:00',
  timezone: IST,
};

const dates = (rule: RecurrenceRule, opts = {}) =>
  expandRecurrence(rule, opts).map((o) => o.localDate);

describe('recurrence expansion', () => {
  it('expands a one-time event to a single occurrence', () => {
    const result = expandRecurrence({ ...base, freq: 'ONCE', endsOn: null });
    expect(result).toHaveLength(1);
    expect(result[0]!.localDate).toBe('2026-09-12');
    expect(result[0]!.startAt.toISOString()).toBe('2026-09-12T13:30:00.000Z'); // 19:00 IST
    expect(result[0]!.endAt.toISOString()).toBe('2026-09-12T15:30:00.000Z');
  });

  it('expands a daily series across a date range', () => {
    expect(dates(base)).toEqual([
      '2026-09-12',
      '2026-09-13',
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
    ]);
  });

  it('honours a daily interval', () => {
    expect(dates({ ...base, interval: 2, endsOn: '2026-09-20' })).toEqual([
      '2026-09-12',
      '2026-09-14',
      '2026-09-16',
      '2026-09-18',
      '2026-09-20',
    ]);
  });

  it('expands a weekly series on one weekday (a Tuesday open mic)', () => {
    // 2026-09-12 is a Saturday; the first Tuesday after it is the 15th.
    expect(
      dates({
        ...base,
        freq: 'WEEKLY',
        byweekday: [2],
        endsOn: '2026-10-10',
      }),
    ).toEqual(['2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06']);
  });

  it('expands selected weekdays (Mon/Wed/Fri yoga)', () => {
    expect(
      dates({
        ...base,
        freq: 'WEEKLY',
        byweekday: [1, 3, 5],
        startsOn: '2026-09-14', // a Monday
        endsOn: '2026-09-25',
      }),
    ).toEqual([
      '2026-09-14',
      '2026-09-16',
      '2026-09-18',
      '2026-09-21',
      '2026-09-23',
      '2026-09-25',
    ]);
  });

  it('honours a weekly interval of 2 (alternate weeks)', () => {
    expect(
      dates({
        ...base,
        freq: 'WEEKLY',
        interval: 2,
        byweekday: [6],
        startsOn: '2026-09-12',
        endsOn: '2026-10-24',
      }),
    ).toEqual(['2026-09-12', '2026-09-26', '2026-10-10', '2026-10-24']);
  });

  it('stops after `count` occurrences regardless of the window', () => {
    expect(dates({ ...base, endsOn: null, count: 3 })).toEqual([
      '2026-09-12',
      '2026-09-13',
      '2026-09-14',
    ]);
  });

  it('counts from the start of the series, not from the query window', () => {
    // count:3 means the series has 3 members total; asking for a later window
    // must not yield 3 more.
    expect(dates({ ...base, endsOn: null, count: 3 }, { from: '2026-09-14' })).toEqual([
      '2026-09-14',
    ]);
  });

  it('skips exdates', () => {
    expect(dates({ ...base, exdates: ['2026-09-14', '2026-09-15'] })).toEqual([
      '2026-09-12',
      '2026-09-13',
      '2026-09-16',
    ]);
  });

  it('clips to the requested window', () => {
    expect(dates(base, { from: '2026-09-14', to: '2026-09-15' })).toEqual([
      '2026-09-14',
      '2026-09-15',
    ]);
  });

  it('handles a garba night that crosses midnight', () => {
    const result = expandRecurrence({
      ...base,
      startTime: '21:00',
      endTime: '01:00',
      endsNextDay: true,
      endsOn: '2026-09-13',
    });
    expect(result).toHaveLength(2);
    const first = result[0]!;
    // Filed under the day it STARTS, and ending on the following calendar day.
    expect(first.localDate).toBe('2026-09-12');
    expect(first.startAt.toISOString()).toBe('2026-09-12T15:30:00.000Z');
    expect(first.endAt.toISOString()).toBe('2026-09-12T19:30:00.000Z');
    expect(toLocalDateString(first.endAt, IST)).toBe('2026-09-13');
  });

  it('rejects an overnight event that forgot ends_next_day', () => {
    expect(() =>
      expandRecurrence({ ...base, startTime: '21:00', endTime: '01:00' }),
    ).toThrow(RecurrenceError);
  });

  it('rejects an unbounded repeating series', () => {
    expect(() => expandRecurrence({ ...base, endsOn: null, count: null })).toThrow(
      /bounded by ends_on or count/,
    );
  });

  it('rejects a weekly rule with no weekdays and a bad range', () => {
    expect(() => expandRecurrence({ ...base, freq: 'WEEKLY', byweekday: [] })).toThrow(
      /at least one weekday/,
    );
    expect(() => expandRecurrence({ ...base, endsOn: '2026-09-01' })).toThrow(
      /before starts_on/,
    );
  });

  it('caps runaway expansion', () => {
    const result = expandRecurrence(
      { ...base, endsOn: '2030-01-01' },
      { maxOccurrences: 10 },
    );
    expect(result).toHaveLength(10);
  });

  it('expands a single event onto its local day', () => {
    // 00:30 IST on the 13th = 19:00 UTC on the 12th.
    const start = localDateTimeToUtc('2026-09-13', '00:30', IST);
    const end = localDateTimeToUtc('2026-09-13', '02:00', IST);
    expect(expandSingleEvent(start, end, IST)[0]!.localDate).toBe('2026-09-13');
  });
});

describe('occurrence regeneration', () => {
  const today = '2026-09-12';
  const existing = (
    overrides: Partial<ExistingOccurrence> & { localDate: string },
  ): ExistingOccurrence => ({
    id: `occ-${overrides.localDate}`,
    startAt: localDateTimeToUtc(overrides.localDate, '19:00', IST),
    endAt: localDateTimeToUtc(overrides.localDate, '21:00', IST),
    isCancelled: false,
    isOverride: false,
    ...overrides,
  });

  it('inserts occurrences that do not exist yet', () => {
    const diff = diffOccurrences(expandRecurrence(base), [], today);
    expect(diff.insert).toHaveLength(5);
    expect(diff.update).toHaveLength(0);
    expect(diff.deleteIds).toHaveLength(0);
  });

  it('updates times when the rule changes', () => {
    const stored = expandRecurrence(base).map((o) => existing({ localDate: o.localDate }));
    const diff = diffOccurrences(
      expandRecurrence({ ...base, startTime: '20:00', endTime: '22:00' }),
      stored,
      today,
    );
    expect(diff.update).toHaveLength(5);
    expect(diff.update[0]!.startAt.toISOString()).toBe('2026-09-12T14:30:00.000Z');
  });

  it('never overwrites a cancelled occurrence', () => {
    const stored = expandRecurrence(base).map((o) =>
      existing({ localDate: o.localDate, isCancelled: o.localDate === '2026-09-14' }),
    );
    const diff = diffOccurrences(
      expandRecurrence({ ...base, startTime: '20:00', endTime: '22:00' }),
      stored,
      today,
    );
    expect(diff.update.map((u) => u.localDate)).not.toContain('2026-09-14');
    expect(diff.preservedIds).toContain('occ-2026-09-14');
  });

  it('never overwrites a hand-edited (override) occurrence', () => {
    const stored = [existing({ localDate: '2026-09-13', isOverride: true, startAt: new Date('2026-09-13T10:00:00Z') })];
    const diff = diffOccurrences(expandRecurrence(base), stored, today);
    expect(diff.update).toHaveLength(0);
    expect(diff.preservedIds).toEqual(['occ-2026-09-13']);
    expect(diff.insert.map((i) => i.localDate)).not.toContain('2026-09-13');
  });

  it('deletes future occurrences that left the series', () => {
    const stored = expandRecurrence(base).map((o) => existing({ localDate: o.localDate }));
    const diff = diffOccurrences(
      expandRecurrence({ ...base, endsOn: '2026-09-13' }),
      stored,
      today,
    );
    expect(diff.deleteIds.sort()).toEqual([
      'occ-2026-09-14',
      'occ-2026-09-15',
      'occ-2026-09-16',
    ]);
  });

  it('keeps past occurrences even when the series no longer covers them', () => {
    const stored = [existing({ localDate: '2026-09-01' })];
    const diff = diffOccurrences(expandRecurrence(base), stored, today);
    expect(diff.deleteIds).toHaveLength(0);
    expect(diff.preservedIds).toContain('occ-2026-09-01');
  });
});
