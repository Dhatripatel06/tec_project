/**
 * Timezone primitives.
 *
 * The rule from the PRD (§8) is absolute: every instant is stored in UTC and
 * rendered in IST. Nothing in this codebase parses or compares date strings to
 * decide what day something falls on — a listing that starts at 21:00 IST is
 * 15:30 UTC, and naive string handling would file it under the wrong day.
 *
 * These helpers convert between an instant (`Date`, always UTC) and the
 * wall-clock calendar of an IANA timezone, using `Intl` rather than a hard
 * +05:30 so the same code is correct if a future city is not on IST.
 */

export const IST = 'Asia/Kolkata';
export const DEFAULT_TIMEZONE = IST;

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock parts of `instant` as seen in `timeZone`. */
export function getZonedParts(instant: Date, timeZone: string = IST): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const found = parts.find((p) => p.type === type);
    if (!found) throw new Error(`Missing ${type} in formatted date`);
    return Number(found.value);
  };
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (IST = +19800000). */
export function getZoneOffsetMs(instant: Date, timeZone: string = IST): number {
  const p = getZonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Discard sub-second noise: formatToParts has second resolution.
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock time in `timeZone` into the UTC instant it denotes.
 * The second pass handles DST transitions (a no-op for IST, which has none).
 */
export function zonedTimeToUtc(
  parts: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
  timeZone: string = IST,
): Date {
  const naive = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  const firstOffset = getZoneOffsetMs(new Date(naive), timeZone);
  const candidate = naive - firstOffset;
  const secondOffset = getZoneOffsetMs(new Date(candidate), timeZone);
  return secondOffset === firstOffset ? new Date(candidate) : new Date(naive - secondOffset);
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function parseDateString(value: string): { year: number; month: number; day: number } {
  const match = DATE_RE.exec(value);
  if (!match) throw new RangeError(`Invalid date (expected YYYY-MM-DD): ${value}`);
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  // Round-trip guards against 2026-02-31 and friends.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid calendar date: ${value}`);
  }
  return { year, month, day };
}

export function parseTimeString(value: string): { hour: number; minute: number; second: number } {
  const match = TIME_RE.exec(value);
  if (!match) throw new RangeError(`Invalid time (expected HH:MM or HH:MM:SS): ${value}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? '0');
  if (hour > 23 || minute > 59 || second > 59) {
    throw new RangeError(`Invalid time value: ${value}`);
  }
  return { hour, minute, second };
}

/** `2026-09-12` + `19:30` in IST → the corresponding UTC instant. */
export function localDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string = IST,
): Date {
  return zonedTimeToUtc({ ...parseDateString(date), ...parseTimeString(time) }, timeZone);
}

/** The local calendar date (`YYYY-MM-DD`) that `instant` falls on in `timeZone`. */
export function toLocalDateString(instant: Date, timeZone: string = IST): string {
  const p = getZonedParts(instant, timeZone);
  return formatDateParts(p.year, p.month, p.day);
}

export function formatDateParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Adds whole days to a `YYYY-MM-DD` string, staying in the calendar domain. */
export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDateString(date);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return formatDateParts(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const a = parseDateString(from);
  const b = parseDateString(to);
  const ms = Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day);
  return Math.round(ms / 86_400_000);
}

/** Day of week for a local date: 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: string): number {
  const { year, month, day } = parseDateString(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export interface DayWindow {
  /** Inclusive lower bound: local midnight, as UTC. */
  startUtc: Date;
  /** Exclusive upper bound: next local midnight, as UTC. */
  endUtc: Date;
  date: string;
}

/**
 * The UTC half-open interval covering one local calendar day. This is what
 * every "today's feed" query filters on.
 */
export function localDayWindow(date: string, timeZone: string = IST): DayWindow {
  return {
    date,
    startUtc: localDateTimeToUtc(date, '00:00', timeZone),
    endUtc: localDateTimeToUtc(addDays(date, 1), '00:00', timeZone),
  };
}

/** The local date "right now" in `timeZone`. */
export function localToday(now: Date = new Date(), timeZone: string = IST): string {
  return toLocalDateString(now, timeZone);
}

/**
 * The next weekend as local dates. Saturday and Sunday; if today is already
 * Sat or Sun, the current weekend (so "This Weekend" never points a week ahead
 * while you are standing in it).
 */
export function weekendDates(today: string): string[] {
  const dow = weekdayOf(today);
  if (dow === 6) return [today, addDays(today, 1)];
  if (dow === 0) return [addDays(today, -1), today];
  return [addDays(today, 6 - dow), addDays(today, 7 - dow)];
}
