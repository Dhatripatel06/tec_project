import { z } from 'zod';
import { parseDateString, parseTimeString } from '../time/zoned';

/**
 * Shared validators. Every external input passes through one of these — query
 * strings, JSON bodies, uploads. Nothing trusts the client.
 */

export const uuid = z.string().uuid('Must be a UUID');

/** YYYY-MM-DD, and a real calendar date (rejects 2026-02-30). */
export const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((value) => {
    try {
      parseDateString(value);
      return true;
    } catch {
      return false;
    }
  }, 'Not a valid calendar date');

/** HH:MM or HH:MM:SS, 24-hour. */
export const localTime = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM or HH:MM:SS')
  .refine((value) => {
    try {
      parseTimeString(value);
      return true;
    } catch {
      return false;
    }
  }, 'Not a valid time');

export const isoInstant = z
  .string()
  .datetime({ offset: true, message: 'Must be an ISO 8601 instant with an offset' });

/**
 * Indian mobile numbers, stored E.164. Accepts the shapes people actually
 * paste (+91 98765 43210, 098765 43210, 9876543210) and normalises them.
 */
export const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ''))
  .refine(
    (value) => /^(\+91)?[6-9]\d{9}$/.test(value) || /^0[6-9]\d{9}$/.test(value),
    'Must be a valid Indian mobile number',
  )
  .transform((value) => {
    const digits = value.replace(/^\+91/, '').replace(/^0/, '');
    return `+91${digits}`;
  });

/** http(s) only — no javascript:, data: or other schemes from user input. */
export const httpUrl = z
  .string()
  .trim()
  .url('Must be a URL')
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Only http(s) URLs are allowed');

export const instagramUrl = httpUrl.refine(
  (value) => /(^|\.)instagram\.com$/.test(new URL(value).hostname),
  'Must be an instagram.com URL',
);

export const lang = z.enum(['en', 'gu']);

export const priceType = z.enum(['free', 'paid', 'donation']);

export const money = z
  .number()
  .nonnegative('Price cannot be negative')
  .max(1_000_000, 'Price is implausibly large')
  .multipleOf(0.01, 'Price may have at most two decimal places');

export const latitude = z.number().min(-90).max(90);
export const longitude = z.number().min(-180).max(180);

export const timeBand = z.enum([
  'happening_now',
  'morning',
  'afternoon',
  'evening',
  'tonight',
  'all_day',
]);

export const sortMode = z.enum(['recommended', 'starting_soon', 'nearest']);

export const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Comma-separated query parameter → array. `?category=music,food` */
export const csvOf = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .string()
    .transform((value) => value.split(',').map((part) => part.trim()).filter(Boolean))
    .pipe(z.array(schema));

/** `?free_only=true` — accepts true/false/1/0. */
export const booleanParam = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

export const tagSlug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Tags must be lowercase kebab-case');

/** Free text with a length bound, trimmed; empty becomes null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .transform((value) => (value.length === 0 ? null : value))
    .nullish();

export const requiredText = (max: number, field = 'Value') =>
  z.string().trim().min(1, `${field} is required`).max(max, `${field} is too long`);
