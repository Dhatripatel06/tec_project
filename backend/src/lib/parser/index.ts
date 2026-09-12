import { addDays, localToday, DEFAULT_TIMEZONE } from '../time/zoned';

/**
 * Quick-add / paste parser (PRD A5).
 *
 *   ListingParser
 *     ├── ManualParser      deterministic, no network, always available
 *     └── AIListingParser   provider adapter, enabled by configuration
 *
 * The abstraction is the deliverable here. AI_PARSER_PROVIDER is `none` for the
 * MVP, so `getParser()` returns the ManualParser and nothing calls out to a
 * paid API. No key is required, and none is hard-coded anywhere — an adapter
 * reads it from the environment or the provider stays disabled.
 */

export interface ParserInput {
  /** A pasted WhatsApp forward or Instagram caption. */
  rawText?: string | null;
  /** Text already extracted from a poster by OCR. */
  imageText?: string | null;
  /** Local date used to resolve "today"/"tomorrow"/"aaje". */
  referenceDate?: string;
  timezone?: string;
}

export interface ParsedListing {
  title: string | null;
  title_gu: string | null;
  description: string | null;
  description_gu: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  price: string | null;
  contact: string | null;
  category: string | null;
}

export interface ParseResult {
  parsed: ParsedListing;
  /** Which provider produced this. */
  provider: string;
  /** 0-1, how much of the structure was actually recognised. */
  confidence: number;
  /** Fields a curator must fill in or check. */
  needsReview: string[];
}

export interface ListingParser {
  readonly name: string;
  parse(input: ParserInput): Promise<ParseResult>;
}

const EMPTY: ParsedListing = {
  title: null,
  title_gu: null,
  description: null,
  description_gu: null,
  date: null,
  start_time: null,
  end_time: null,
  venue: null,
  price: null,
  contact: null,
  category: null,
};

// -- Manual (rule-based) parser -------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Category hints keyed by words that actually show up in Bhavnagar posters. */
const CATEGORY_HINTS: Array<[RegExp, string]> = [
  [/\b(natak|drama|play|theatre|kavi|sammelan|dance|recital)\b/i, 'culture-shows'],
  [/\b(open mic|comedy|live music|dj|standup|stand-up)\b/i, 'nightlife-social'],
  [/\b(turf|cricket|football|marathon|yoga|cycling|tournament|fitness)\b/i, 'sports-fitness'],
  [/\b(workshop|class|bootcamp|pottery|painting|photography walk)\b/i, 'workshops-classes'],
  [/\b(food festival|tasting|menu|cafe|restaurant|opening)\b/i, 'food-drink'],
  [/\b(mela|expo|exhibition|fair|sale|bazaar)\b/i, 'shopping-exhibitions'],
  [/\b(garba|navratri|aarti|utsav|temple|mandir|puja|festival)\b/i, 'religious-festivals'],
  [/\b(movie|film|screening|showtime|multiplex)\b/i, 'movies'],
  [/\b(trek|picnic|park|beach|safari|day.?trip)\b/i, 'outdoors-day-trips'],
  [/\b(kids|children|family|science show)\b/i, 'kids-family'],
  [/\b(blood donation|ngo|volunteer|health camp|donation)\b/i, 'community'],
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** "7pm", "7:30 PM", "19:30" → "19:30". */
function normaliseTime(hour: number, minute: number, meridiem?: string | null): string | null {
  let h = hour;
  const m = meridiem?.toLowerCase();
  if (m === 'pm' && h < 12) h += 12;
  if (m === 'am' && h === 12) h = 0;
  if (h > 23 || minute > 59) return null;
  return `${pad(h)}:${pad(minute)}`;
}

export function extractTimes(text: string): { start: string | null; end: string | null } {
  const pattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;
  const found: string[] = [];

  // Prefer explicit ranges: "7pm to 9pm", "7-9 pm".
  const range =
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|-|–|—|till|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(
      text,
    );
  if (range) {
    // A bare first half inherits the meridiem of the second ("7-9 pm").
    const start = normaliseTime(Number(range[1]), Number(range[2] ?? 0), range[3] ?? range[6]);
    const end = normaliseTime(Number(range[4]), Number(range[5] ?? 0), range[6] ?? range[3]);
    if (start && end) return { start, end };
  }

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    // Require a meridiem or a colon, or "12" alone matches a price or a date.
    if (!match[3] && !match[2]) continue;
    const time = normaliseTime(Number(match[1]), Number(match[2] ?? 0), match[3]);
    if (time) found.push(time);
  }

  return { start: found[0] ?? null, end: found[1] ?? null };
}

export function extractDate(text: string, referenceDate: string): string | null {
  const lower = text.toLowerCase();

  // Relative words, including the Gujarati/Hindi the intake channel actually
  // carries. Latin terms use \b; Gujarati cannot, because JavaScript's \b is
  // defined on ASCII word characters and never matches beside Gujarati script.
  if (/\b(today|aaje|aaj)\b/.test(lower) || /આજે|આજ/.test(text)) return referenceDate;
  if (/\b(tomorrow|kal)\b/.test(lower) || /આવતીકાલે|કાલે/.test(text)) {
    return addDays(referenceDate, 1);
  }

  // 12/09/2026 or 12-09-26 (day first, the Indian convention).
  const numeric = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/.exec(text);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    let year = Number(numeric[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  // "12 Sept", "12th September 2026", "Sept 12"
  const dayFirst = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?\s*(\d{4})?\b/i.exec(text);
  const monthFirst = /\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})?\b/i.exec(text);

  for (const [candidate, dayIndex, monthIndex, yearIndex] of [
    [dayFirst, 1, 2, 3],
    [monthFirst, 2, 1, 3],
  ] as const) {
    if (!candidate) continue;
    const monthKey = candidate[monthIndex]!.slice(0, 3).toLowerCase();
    const month = MONTHS[monthKey];
    if (!month) continue;
    const day = Number(candidate[dayIndex]);
    if (day < 1 || day > 31) continue;
    const year = candidate[yearIndex]
      ? Number(candidate[yearIndex])
      : Number(referenceDate.slice(0, 4));
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  return null;
}

export function extractPrice(text: string): string | null {
  if (/\b(free entry|entry free|free|no entry fee|નિ:શુલ્ક)\b/i.test(text)) return 'Free';
  const rupees = /(?:₹|rs\.?|inr)\s*(\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?)/i.exec(text);
  if (rupees) return `₹${rupees[1]!.replace(/,/g, '')}`;
  const perHead = /(\d{2,6})\s*(?:\/-|per head|per person|entry)/i.exec(text);
  if (perHead) return `₹${perHead[1]}`;
  return null;
}

export function extractPhone(text: string): string | null {
  const match = /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/.exec(text.replace(/[()]/g, ''));
  if (!match) return null;
  const digits = match[0].replace(/[^\d]/g, '').slice(-10);
  return `+91${digits}`;
}

export function extractVenue(text: string): string | null {
  // "at Gandhi Smriti", "venue: Barton Museum", "@ Nilambag"
  const labelled = /(?:venue|place|location)\s*[:\-–]\s*([^\n,.]{3,60})/i.exec(text);
  if (labelled) return labelled[1]!.trim();
  const at = /\bat\s+([A-Z][\w'&.-]*(?:\s+[A-Z][\w'&.-]*){0,4})/.exec(text);
  if (at) return at[1]!.trim();
  return null;
}

export function extractTitle(text: string): string | null {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    // Skip lines that are purely metadata.
    if (/^(date|time|venue|place|location|contact|price|entry)\s*[:\-–]/i.test(line)) continue;
    const cleaned = line.replace(/^[^\p{L}\p{N}]+/u, '').trim();
    if (cleaned.length >= 3) return cleaned.slice(0, 160);
  }
  return null;
}

export function guessCategory(text: string): string | null {
  for (const [pattern, slug] of CATEGORY_HINTS) {
    if (pattern.test(text)) return slug;
  }
  return null;
}

/**
 * Deterministic parser over the shapes a WhatsApp forward or Instagram caption
 * actually takes. No network, no key, no cost — and because it is rule-based,
 * its behaviour is fully testable.
 */
export class ManualParser implements ListingParser {
  readonly name = 'manual';

  async parse(input: ParserInput): Promise<ParseResult> {
    const text = [input.rawText, input.imageText].filter(Boolean).join('\n').trim();
    const timezone = input.timezone ?? DEFAULT_TIMEZONE;
    const referenceDate = input.referenceDate ?? localToday(new Date(), timezone);

    if (!text) {
      return {
        parsed: { ...EMPTY },
        provider: this.name,
        confidence: 0,
        needsReview: ['title', 'date', 'start_time', 'venue'],
      };
    }

    const times = extractTimes(text);
    const parsed: ParsedListing = {
      ...EMPTY,
      title: extractTitle(text),
      description: text.slice(0, 4000),
      date: extractDate(text, referenceDate),
      start_time: times.start,
      end_time: times.end,
      venue: extractVenue(text),
      price: extractPrice(text),
      contact: extractPhone(text),
      category: guessCategory(text),
    };

    // Confidence is the share of the fields that matter which were recognised.
    const key: Array<keyof ParsedListing> = ['title', 'date', 'start_time', 'venue'];
    const found = key.filter((field) => parsed[field] !== null);
    const needsReview = key.filter((field) => parsed[field] === null) as string[];
    // Gujarati is never machine-produced here; a curator writes it.
    needsReview.push('title_gu');

    return {
      parsed,
      provider: this.name,
      confidence: Math.round((found.length / key.length) * 100) / 100,
      needsReview,
    };
  }
}

/**
 * Placeholder for a provider-backed parser.
 *
 * Not implemented for the MVP and not reachable: `getParser()` only returns it
 * when AI_PARSER_PROVIDER names a provider AND a key is configured. Keeping the
 * class here fixes the seam so adding Claude or another provider later is one
 * file, not a refactor.
 */
export class AIListingParser implements ListingParser {
  readonly name: string;

  constructor(
    provider: string,
    private readonly apiKey: string,
    private readonly model: string,
    /** Used for the fields the model does not return. */
    private readonly fallback: ListingParser = new ManualParser(),
  ) {
    this.name = provider;
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    // No provider call is implemented yet. Rather than fail a curator's paste,
    // fall back to the deterministic parser and say which one ran.
    const result = await this.fallback.parse(input);
    return {
      ...result,
      provider: `${this.name}:unimplemented→${result.provider}`,
      needsReview: [...result.needsReview],
    };
  }
}

export interface ParserConfig {
  provider: string;
  apiKey?: string;
  model?: string;
}

/**
 * Chooses a parser from configuration. Defaults to the manual parser and never
 * throws for a missing key, so the quick-add flow always works.
 */
export function getParser(config?: ParserConfig): ListingParser {
  const provider = config?.provider ?? process.env.AI_PARSER_PROVIDER ?? 'none';
  const apiKey = config?.apiKey ?? process.env.AI_PARSER_API_KEY;
  const model = config?.model ?? process.env.AI_PARSER_MODEL ?? 'claude-sonnet-5';

  if (provider === 'none' || !apiKey) return new ManualParser();
  return new AIListingParser(provider, apiKey, model);
}
