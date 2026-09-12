import { describe, expect, it } from 'vitest';
import {
  extractDate,
  extractPhone,
  extractPrice,
  extractTimes,
  extractTitle,
  extractVenue,
  getParser,
  guessCategory,
  ManualParser,
} from '../../src/lib/parser';

/**
 * The quick-add parser (PRD A5). Provider is `none`, so these all exercise the
 * deterministic ManualParser — no network, no key, no cost.
 */

const REFERENCE = '2026-09-12';

describe('parser selection', () => {
  it('returns the manual parser when no provider is configured', () => {
    expect(getParser({ provider: 'none' }).name).toBe('manual');
  });

  it('returns the manual parser when a provider is named but has no key', () => {
    expect(getParser({ provider: 'anthropic', apiKey: undefined }).name).toBe('manual');
  });

  it('never hard-codes a key', () => {
    // With a provider AND a key it selects the AI adapter; the key comes from
    // the caller/environment, never from source.
    expect(getParser({ provider: 'anthropic', apiKey: 'supplied-at-runtime' }).name)
      .toBe('anthropic');
  });
});

describe('time extraction', () => {
  it('reads a 12-hour range', () => {
    expect(extractTimes('Open mic from 7pm to 9pm')).toEqual({ start: '19:00', end: '21:00' });
  });

  it('reads a hyphenated range with one meridiem', () => {
    expect(extractTimes('Show 7-9 pm')).toEqual({ start: '19:00', end: '21:00' });
  });

  it('reads minutes', () => {
    expect(extractTimes('Starts 7:30 PM till 9:45 PM')).toEqual({ start: '19:30', end: '21:45' });
  });

  it('reads 24-hour times', () => {
    expect(extractTimes('19:00 to 21:00')).toEqual({ start: '19:00', end: '21:00' });
  });

  it('handles midnight and noon correctly', () => {
    expect(extractTimes('12:00 am').start).toBe('00:00');
    expect(extractTimes('12:00 pm').start).toBe('12:00');
  });

  it('returns nulls when there is no time', () => {
    expect(extractTimes('Something is happening')).toEqual({ start: null, end: null });
  });
});

describe('date extraction', () => {
  it('resolves relative words, including Gujarati', () => {
    expect(extractDate('Event today at 7pm', REFERENCE)).toBe('2026-09-12');
    expect(extractDate('આજે સાંજે', REFERENCE)).toBe('2026-09-12');
    expect(extractDate('tomorrow evening', REFERENCE)).toBe('2026-09-13');
  });

  it('reads day-first numeric dates', () => {
    expect(extractDate('On 20/09/2026', REFERENCE)).toBe('2026-09-20');
    expect(extractDate('On 20-09-26', REFERENCE)).toBe('2026-09-20');
  });

  it('reads written dates both ways round', () => {
    expect(extractDate('20th September 2026', REFERENCE)).toBe('2026-09-20');
    expect(extractDate('Sept 20', REFERENCE)).toBe('2026-09-20');
  });

  it('assumes the reference year when none is given', () => {
    expect(extractDate('5 Oct', REFERENCE)).toBe('2026-10-05');
  });

  it('returns null when there is no date', () => {
    expect(extractDate('Come along sometime', REFERENCE)).toBeNull();
  });
});

describe('field extraction', () => {
  it('reads a free entry', () => {
    expect(extractPrice('Entry free for all')).toBe('Free');
    expect(extractPrice('FREE ENTRY')).toBe('Free');
  });

  it('reads rupee amounts in several notations', () => {
    expect(extractPrice('Tickets ₹250')).toBe('₹250');
    expect(extractPrice('Rs. 1,500 per person')).toBe('₹1500');
    expect(extractPrice('300/- entry')).toBe('₹300');
  });

  it('reads an Indian mobile number', () => {
    expect(extractPhone('Call 98765 43210 to book')).toBe('+919876543210');
    expect(extractPhone('Contact +91 9876543210')).toBe('+919876543210');
  });

  it('does not invent a phone number', () => {
    expect(extractPhone('No numbers here')).toBeNull();
  });

  it('reads a labelled venue', () => {
    expect(extractVenue('Venue: Gandhi Smriti Hall')).toBe('Gandhi Smriti Hall');
  });

  it('reads an "at <Place>" venue', () => {
    expect(extractVenue('Live music at Nilambag Palace tonight')).toBe('Nilambag Palace');
  });

  it('takes the first meaningful line as the title', () => {
    expect(extractTitle('🎭 Gujarati Natak\nDate: 20 Sept\nVenue: Town Hall'))
      .toBe('Gujarati Natak');
  });

  it('skips metadata lines when looking for a title', () => {
    expect(extractTitle('Date: 20 Sept\nOpen Mic Night\nVenue: Cafe')).toBe('Open Mic Night');
  });

  it('guesses a category from Bhavnagar vocabulary', () => {
    expect(guessCategory('Gujarati natak this Saturday')).toBe('culture-shows');
    expect(guessCategory('Navratri garba grounds open')).toBe('religious-festivals');
    expect(guessCategory('Box cricket turf tournament')).toBe('sports-fitness');
    expect(guessCategory('Pottery workshop for beginners')).toBe('workshops-classes');
    expect(guessCategory('Blood donation camp')).toBe('community');
    expect(guessCategory('Nothing recognisable')).toBeNull();
  });
});

describe('end-to-end parse of a realistic WhatsApp forward', () => {
  const forward = `🎭 Gujarati Natak - Sanju Vala
Date: 20/09/2026
Time: 7:30 PM to 9:30 PM
Venue: Gandhi Smriti Hall
Entry: ₹200
Contact: 98765 43210`;

  it('extracts every key field', async () => {
    const result = await new ManualParser().parse({
      rawText: forward,
      referenceDate: REFERENCE,
    });

    expect(result.provider).toBe('manual');
    expect(result.parsed.title).toBe('Gujarati Natak - Sanju Vala');
    expect(result.parsed.date).toBe('2026-09-20');
    expect(result.parsed.start_time).toBe('19:30');
    expect(result.parsed.end_time).toBe('21:30');
    expect(result.parsed.venue).toBe('Gandhi Smriti Hall');
    expect(result.parsed.price).toBe('₹200');
    expect(result.parsed.contact).toBe('+919876543210');
    expect(result.parsed.category).toBe('culture-shows');
  });

  it('reports full confidence when everything was found', async () => {
    const result = await new ManualParser().parse({ rawText: forward, referenceDate: REFERENCE });
    expect(result.confidence).toBe(1);
  });

  it('always asks a human to supply the Gujarati title', async () => {
    const result = await new ManualParser().parse({ rawText: forward, referenceDate: REFERENCE });
    expect(result.needsReview).toContain('title_gu');
    expect(result.parsed.title_gu).toBeNull();
  });

  it('flags what it could not find', async () => {
    const result = await new ManualParser().parse({
      rawText: 'Something happening soon, come along',
      referenceDate: REFERENCE,
    });
    expect(result.confidence).toBeLessThan(1);
    expect(result.needsReview).toContain('date');
    expect(result.needsReview).toContain('start_time');
  });

  it('handles empty input without throwing', async () => {
    const result = await new ManualParser().parse({ rawText: '' });
    expect(result.confidence).toBe(0);
    expect(result.parsed.title).toBeNull();
  });

  it('combines pasted text with poster OCR text', async () => {
    const result = await new ManualParser().parse({
      rawText: 'Open Mic Night',
      imageText: 'Venue: Nilambag Palace\n7pm to 9pm',
      referenceDate: REFERENCE,
    });
    expect(result.parsed.title).toBe('Open Mic Night');
    expect(result.parsed.venue).toBe('Nilambag Palace');
    expect(result.parsed.start_time).toBe('19:00');
  });
});
