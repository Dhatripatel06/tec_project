import { getZonedParts, IST } from './zoned';

/**
 * Feed time bands (PRD F1: "Happening now → This afternoon → This evening →
 * Tonight → All day").
 *
 * `morning` is an addition, not a change of intent: the PRD's own Bhavnagar
 * examples include marathons, aarti timings and morning yoga camps, and those
 * items must land somewhere when you are looking at *tomorrow* (where nothing
 * can be "happening now"). It is ordered first among the scheduled bands so
 * the PRD's sequence is preserved.
 */
export const TIME_BANDS = [
  'happening_now',
  'morning',
  'afternoon',
  'evening',
  'tonight',
  'all_day',
] as const;

export type TimeBand = (typeof TIME_BANDS)[number];

export const TIME_BAND_LABELS: Record<TimeBand, { en: string; gu: string }> = {
  happening_now: { en: 'Happening Now', gu: 'અત્યારે ચાલુ છે' },
  morning: { en: 'This Morning', gu: 'આજે સવારે' },
  afternoon: { en: 'This Afternoon', gu: 'આજે બપોરે' },
  evening: { en: 'This Evening', gu: 'આજે સાંજે' },
  tonight: { en: 'Tonight', gu: 'આજે રાત્રે' },
  all_day: { en: 'All Day', gu: 'આખો દિવસ' },
};

/** An occurrence spanning at least this many hours is treated as all-day. */
export const ALL_DAY_MIN_HOURS = 8;

const HOUR_MS = 3_600_000;

export interface BandInput {
  startAt: Date;
  endAt: Date;
  /** Reference instant. `happening_now` is only assigned relative to this. */
  now?: Date | null;
  timeZone?: string;
}

/**
 * Assigns exactly one band to an occurrence.
 *
 * Precedence: an item running right now is "Happening Now" whatever its hours;
 * otherwise a long span is "All Day"; otherwise the band follows the local
 * start hour.
 */
export function bandFor({ startAt, endAt, now = null, timeZone = IST }: BandInput): TimeBand {
  if (now && startAt.getTime() <= now.getTime() && now.getTime() < endAt.getTime()) {
    return 'happening_now';
  }

  const durationHours = (endAt.getTime() - startAt.getTime()) / HOUR_MS;
  if (durationHours >= ALL_DAY_MIN_HOURS) return 'all_day';

  const hour = getZonedParts(startAt, timeZone).hour;
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'tonight'; // 20:00–03:59
}

export function bandOrder(band: TimeBand): number {
  return TIME_BANDS.indexOf(band);
}

/** Groups items into bands, preserving input order inside each band. */
export function groupByBand<T>(items: T[], bandOf: (item: T) => TimeBand): Map<TimeBand, T[]> {
  const groups = new Map<TimeBand, T[]>();
  for (const band of TIME_BANDS) groups.set(band, []);
  for (const item of items) {
    groups.get(bandOf(item))!.push(item);
  }
  // Drop empty bands: the client renders only what it is given.
  for (const [band, list] of groups) {
    if (list.length === 0) groups.delete(band);
  }
  return groups;
}
