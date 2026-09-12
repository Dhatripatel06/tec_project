import {
  addDays,
  daysBetween,
  DEFAULT_TIMEZONE,
  localDateTimeToUtc,
  parseDateString,
  toLocalDateString,
  weekdayOf,
} from '../time/zoned';

/**
 * Recurrence expansion.
 *
 * A listing's schedule is a rule; the feed reads `occurrences`. This module is
 * the only place that turns one into the other, and it is deliberately pure —
 * no database, no clock of its own — so every case in the PRD (daily, weekly,
 * selected weekdays, a date range, a garba night crossing midnight) is
 * directly testable.
 */

export type RecurrenceFreq = 'ONCE' | 'DAILY' | 'WEEKLY';

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  /** Every N days (DAILY) or every N weeks (WEEKLY). */
  interval?: number;
  /** 0 = Sunday … 6 = Saturday. Required for WEEKLY. */
  byweekday?: number[] | null;
  /** First date of the series, local calendar (YYYY-MM-DD). */
  startsOn: string;
  /** Last date of the series, inclusive. Null only when `count` bounds it. */
  endsOn?: string | null;
  /** Stop after this many occurrences, counted from `startsOn`. */
  count?: number | null;
  /** Local wall-clock start, e.g. "19:30". */
  startTime: string;
  /** Local wall-clock end. */
  endTime: string;
  /** True when endTime lands on the following calendar day (21:00 → 01:00). */
  endsNextDay?: boolean;
  timezone?: string;
  /** Local dates removed from the series. */
  exdates?: string[] | null;
}

export interface ExpandedOccurrence {
  /** The local day the occurrence belongs to — its slot in the feed. */
  localDate: string;
  startAt: Date;
  endAt: Date;
}

export interface ExpandOptions {
  /** Only return occurrences on or after this local date. */
  from?: string;
  /** Only return occurrences on or before this local date. */
  to?: string;
  /** Hard ceiling on generated rows; protects against a pathological rule. */
  maxOccurrences?: number;
}

export const MAX_OCCURRENCES = 730; // ~2 years of a daily series
/** How far ahead occurrences are materialised by default. */
export const DEFAULT_HORIZON_DAYS = 120;

export class RecurrenceError extends Error {}

function validate(rule: RecurrenceRule): void {
  parseDateString(rule.startsOn);
  if (rule.endsOn) {
    parseDateString(rule.endsOn);
    if (daysBetween(rule.startsOn, rule.endsOn) < 0) {
      throw new RecurrenceError('Recurrence ends_on is before starts_on');
    }
  }
  const interval = rule.interval ?? 1;
  if (!Number.isInteger(interval) || interval < 1) {
    throw new RecurrenceError('Recurrence interval must be a positive integer');
  }
  if (rule.count !== null && rule.count !== undefined && rule.count < 1) {
    throw new RecurrenceError('Recurrence count must be at least 1');
  }
  if (rule.freq === 'WEEKLY') {
    const days = rule.byweekday ?? [];
    if (days.length === 0) {
      throw new RecurrenceError('A WEEKLY recurrence needs at least one weekday');
    }
    if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      throw new RecurrenceError('byweekday values must be integers 0-6 (0 = Sunday)');
    }
  }
  if (rule.freq !== 'ONCE' && !rule.endsOn && !rule.count) {
    throw new RecurrenceError('A repeating recurrence must be bounded by ends_on or count');
  }
}

/**
 * The local dates the rule fires on, in order, before exdate filtering.
 * Always enumerated from `startsOn` so that `count` means "the first N
 * occurrences of the series", not "N occurrences inside the window".
 */
function seriesDates(rule: RecurrenceRule, hardStop: string, limit: number): string[] {
  const interval = rule.interval ?? 1;
  const dates: string[] = [];

  const emit = (date: string): boolean => {
    dates.push(date);
    return dates.length < limit && (!rule.count || dates.length < rule.count);
  };

  if (rule.freq === 'ONCE') {
    dates.push(rule.startsOn);
    return dates;
  }

  const lastDate = rule.endsOn && daysBetween(rule.endsOn, hardStop) > 0 ? rule.endsOn : hardStop;

  if (rule.freq === 'DAILY') {
    let cursor = rule.startsOn;
    while (daysBetween(cursor, lastDate) >= 0) {
      if (!emit(cursor)) break;
      cursor = addDays(cursor, interval);
    }
    return dates;
  }

  // WEEKLY: walk week by week from the Sunday of the first week, so that an
  // interval of 2 means "every other week", anchored on the start date's week.
  const weekdays = [...new Set(rule.byweekday ?? [])].sort((a, b) => a - b);
  const anchorSunday = addDays(rule.startsOn, -weekdayOf(rule.startsOn));
  let weekStart = anchorSunday;

  outer: while (daysBetween(weekStart, lastDate) >= 0) {
    for (const weekday of weekdays) {
      const date = addDays(weekStart, weekday);
      if (daysBetween(rule.startsOn, date) < 0) continue; // before the series began
      if (daysBetween(date, lastDate) < 0) break outer;
      if (!emit(date)) break outer;
    }
    weekStart = addDays(weekStart, 7 * interval);
  }
  return dates;
}

/** Expands a rule into concrete UTC instants. */
export function expandRecurrence(
  rule: RecurrenceRule,
  options: ExpandOptions = {},
): ExpandedOccurrence[] {
  validate(rule);

  const timezone = rule.timezone ?? DEFAULT_TIMEZONE;
  const limit = options.maxOccurrences ?? MAX_OCCURRENCES;
  const hardStop =
    options.to ??
    (rule.endsOn ?? addDays(rule.startsOn, DEFAULT_HORIZON_DAYS));

  const excluded = new Set(rule.exdates ?? []);
  const dates = seriesDates(rule, hardStop, limit);

  const results: ExpandedOccurrence[] = [];
  for (const localDate of dates) {
    if (excluded.has(localDate)) continue;
    if (options.from && daysBetween(options.from, localDate) < 0) continue;
    if (options.to && daysBetween(localDate, options.to) < 0) continue;

    const startAt = localDateTimeToUtc(localDate, rule.startTime, timezone);
    const endDate = rule.endsNextDay ? addDays(localDate, 1) : localDate;
    const endAt = localDateTimeToUtc(endDate, rule.endTime, timezone);

    if (endAt.getTime() <= startAt.getTime()) {
      throw new RecurrenceError(
        `Occurrence on ${localDate} ends before it starts; set ends_next_day for overnight events`,
      );
    }
    results.push({ localDate, startAt, endAt });
  }
  return results;
}

/**
 * A one-time listing expands to exactly one occurrence, filed under the local
 * day its start instant falls on. Keeping this here means single and recurring
 * listings reach `occurrences` through the same door.
 */
export function expandSingleEvent(
  startAt: Date,
  endAt: Date,
  timezone: string = DEFAULT_TIMEZONE,
): ExpandedOccurrence[] {
  if (endAt.getTime() <= startAt.getTime()) {
    throw new RecurrenceError('Listing end_at must be after start_at');
  }
  return [{ localDate: toLocalDateString(startAt, timezone), startAt, endAt }];
}

// -- Regeneration ----------------------------------------------------------

export interface ExistingOccurrence {
  id: string;
  localDate: string;
  startAt: Date;
  endAt: Date;
  isCancelled: boolean;
  isOverride: boolean;
}

export interface OccurrenceDiff {
  insert: ExpandedOccurrence[];
  /** Times drifted (the rule changed) and the row is not hand-edited. */
  update: Array<{ id: string; localDate: string; startAt: Date; endAt: Date }>;
  /** Future rows whose date left the series. */
  deleteIds: string[];
  /** Rows kept untouched because a curator edited or cancelled them. */
  preservedIds: string[];
}

/**
 * Reconciles a freshly expanded series against what is already stored.
 *
 * The contract that makes per-occurrence overrides and cancellations usable:
 * regenerating a series NEVER silently discards a curator's edit. An overridden
 * or cancelled occurrence is left exactly as it is for as long as its date is
 * still part of the series.
 *
 * `today` guards history: occurrences in the past are never deleted, because
 * analytics rows and saves point at them.
 */
export function diffOccurrences(
  expanded: ExpandedOccurrence[],
  existing: ExistingOccurrence[],
  today: string,
): OccurrenceDiff {
  const expandedByDate = new Map(expanded.map((o) => [o.localDate, o]));
  const existingByDate = new Map(existing.map((o) => [o.localDate, o]));

  const diff: OccurrenceDiff = { insert: [], update: [], deleteIds: [], preservedIds: [] };

  for (const occurrence of expanded) {
    const current = existingByDate.get(occurrence.localDate);
    if (!current) {
      diff.insert.push(occurrence);
      continue;
    }
    if (current.isOverride || current.isCancelled) {
      diff.preservedIds.push(current.id);
      continue;
    }
    const changed =
      current.startAt.getTime() !== occurrence.startAt.getTime() ||
      current.endAt.getTime() !== occurrence.endAt.getTime();
    if (changed) {
      diff.update.push({
        id: current.id,
        localDate: occurrence.localDate,
        startAt: occurrence.startAt,
        endAt: occurrence.endAt,
      });
    } else {
      diff.preservedIds.push(current.id);
    }
  }

  for (const current of existing) {
    if (expandedByDate.has(current.localDate)) continue;
    if (daysBetween(today, current.localDate) < 0) {
      diff.preservedIds.push(current.id); // in the past — keep the record
    } else {
      diff.deleteIds.push(current.id);
    }
  }

  return diff;
}
