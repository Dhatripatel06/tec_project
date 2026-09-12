import { z } from 'zod';
import {
  booleanParam,
  csvOf,
  httpUrl,
  instagramUrl,
  isoInstant,
  lang,
  latitude,
  localDate,
  localTime,
  longitude,
  money,
  optionalText,
  phone,
  priceType,
  requiredText,
  sortMode,
  tagSlug,
  timeBand,
  uuid,
} from './common';

/** Recurrence rule as it arrives from the admin listing editor (PRD A3). */
export const recurrenceInputSchema = z
  .object({
    freq: z.enum(['ONCE', 'DAILY', 'WEEKLY']),
    interval: z.number().int().min(1).max(52).default(1),
    byweekday: z.array(z.number().int().min(0).max(6)).max(7).nullish(),
    starts_on: localDate,
    ends_on: localDate.nullish(),
    count: z.number().int().min(1).max(730).nullish(),
    start_time: localTime,
    end_time: localTime,
    ends_next_day: z.boolean().default(false),
    timezone: z.string().default('Asia/Kolkata'),
    exdates: z.array(localDate).max(365).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.freq === 'WEEKLY' && (!value.byweekday || value.byweekday.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['byweekday'],
        message: 'A weekly recurrence needs at least one weekday',
      });
    }
    if (value.freq !== 'ONCE' && !value.ends_on && !value.count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ends_on'],
        message: 'A repeating recurrence must set ends_on or count',
      });
    }
    if (value.ends_on && value.ends_on < value.starts_on) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ends_on'],
        message: 'ends_on must not precede starts_on',
      });
    }
    if (!value.ends_next_day && value.end_time <= value.start_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_time'],
        message: 'end_time must be after start_time, or set ends_next_day',
      });
    }
  });

export type RecurrenceInput = z.infer<typeof recurrenceInputSchema>;

const listingBase = z.object({
  city_id: uuid,
  category_id: uuid,
  venue_id: uuid.nullish(),
  organiser_id: uuid.nullish(),
  venue_text: optionalText(200),

  title: requiredText(160, 'Title'),
  title_gu: optionalText(160),
  description: optionalText(4000),
  description_gu: optionalText(4000),
  hook: optionalText(140),
  hook_gu: optionalText(140),

  /** For a one-time listing. Omitted when `recurrence` is supplied. */
  start_at: isoInstant.nullish(),
  end_at: isoInstant.nullish(),
  timezone: z.string().default('Asia/Kolkata'),

  price_type: priceType.default('free'),
  price_min: money.nullish(),
  price_max: money.nullish(),

  is_indoor: z.boolean().default(true),
  is_family_friendly: z.boolean().default(false),
  is_evergreen: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  rank_weight: z.number().int().min(-100).max(100).default(0),

  capacity: z.number().int().positive().max(1_000_000).nullish(),
  external_url: httpUrl.nullish(),
  contact_phone: phone.nullish(),
  contact_whatsapp: phone.nullish(),
  cover_image: z.string().max(500).nullish(),
  gallery: z.array(z.string().max(500)).max(10).default([]),

  tags: z.array(tagSlug).max(10).default([]),
  recurrence: recurrenceInputSchema.nullish(),
});

function checkListingCoherence(
  value: z.infer<typeof listingBase>,
  ctx: z.RefinementCtx,
): void {
  if (value.price_type === 'paid' && (value.price_min === null || value.price_min === undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['price_min'],
      message: 'A paid listing must state price_min',
    });
  }
  if (value.price_type !== 'paid' && (value.price_min !== null && value.price_min !== undefined || value.price_max !== null && value.price_max !== undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['price_min'],
      message: 'Only a paid listing may carry a price',
    });
  }
  if (value.price_min !== null && value.price_min !== undefined && value.price_max !== null && value.price_max !== undefined && value.price_max < value.price_min) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['price_max'],
      message: 'price_max must not be below price_min',
    });
  }
  // Evergreen picks are not scheduled events (PRD §5).
  if (value.is_evergreen && (value.start_at || value.recurrence)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['is_evergreen'],
      message: 'An evergreen listing must not carry a schedule',
    });
  }
  if (!value.is_evergreen && !value.start_at && !value.recurrence) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['start_at'],
      message: 'A listing needs either start_at or a recurrence rule',
    });
  }
  if (value.start_at && value.end_at && value.end_at <= value.start_at) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['end_at'],
      message: 'end_at must be after start_at',
    });
  }
  if (value.start_at && !value.end_at) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['end_at'],
      message: 'end_at is required when start_at is set',
    });
  }
  if (!value.venue_id && !value.venue_text) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['venue_id'],
      message: 'Provide a venue from the directory or free-text venue details',
    });
  }
}

export const createListingSchema = listingBase.superRefine(checkListingCoherence);
export const updateListingSchema = listingBase.partial().extend({
  city_id: uuid.optional(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

export const listingStatusChangeSchema = z
  .object({
    status: z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'EXPIRED', 'REJECTED', 'CANCELLED']),
    reason: optionalText(500),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'REJECTED' && !value.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'A rejection must carry a reason — it is sent to the submitter',
      });
    }
  });

export const feedQuerySchema = z.object({
  city: z.union([uuid, z.string().min(1)]).optional(),
  date: localDate.optional(),
  category: csvOf(z.string().min(1)).optional(),
  free_only: booleanParam.optional(),
  indoor: booleanParam.optional(),
  family_friendly: booleanParam.optional(),
  time_of_day: csvOf(timeBand).optional(),
  distance_km: z.coerce.number().positive().max(200).optional(),
  lat: z.coerce.number().pipe(latitude).optional(),
  lng: z.coerce.number().pipe(longitude).optional(),
  sort: sortMode.default('recommended'),
  lang: lang.default('en'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type FeedQuery = z.infer<typeof feedQuerySchema>;

export const venueSchema = z.object({
  city_id: uuid,
  name: requiredText(160, 'Venue name'),
  name_gu: optionalText(160),
  address: optionalText(500),
  area: optionalText(120),
  lat: latitude.nullish(),
  lng: longitude.nullish(),
  phone: phone.nullish(),
  maps_url: httpUrl.nullish(),
  is_active: z.boolean().default(true),
}).superRefine((value, ctx) => {
  const hasLat = value.lat !== null && value.lat !== undefined;
  const hasLng = value.lng !== null && value.lng !== undefined;
  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lng'],
      message: 'Provide both lat and lng, or neither',
    });
  }
});

export const organiserSchema = z.object({
  city_id: uuid,
  name: requiredText(160, 'Organiser name'),
  name_gu: optionalText(160),
  phone: phone.nullish(),
  whatsapp: phone.nullish(),
  instagram: optionalText(120),
  logo_url: httpUrl.nullish(),
  trust_level: z.enum(['NEW', 'TRUSTED', 'VERIFIED', 'BLOCKED']).default('NEW'),
  auto_publish: z.boolean().default(false),
  owner_user_id: uuid.nullish(),
  is_active: z.boolean().default(true),
});

/** Public submission form (PRD F7). */
export const submissionSchema = z
  .object({
    city_id: uuid,
    title: optionalText(160),
    category_id: uuid.nullish(),
    event_date: localDate.nullish(),
    start_time: localTime.nullish(),
    end_time: localTime.nullish(),
    venue_id: uuid.nullish(),
    venue_text: optionalText(200),
    price_text: optionalText(80),
    contact_phone: phone.nullish(),
    image_url: z.string().max(500).nullish(),
    instagram_url: instagramUrl.nullish(),
    raw_text: optionalText(5000),
    submitter_phone: phone.nullish(),
  })
  .superRefine((value, ctx) => {
    if (!value.title && !value.raw_text && !value.image_url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['title'],
        message: 'Provide a title, a pasted message, or a poster image',
      });
    }
    if (value.start_time && value.end_time && value.end_time <= value.start_time) {
      // Overnight submissions are normalised by the curator, not rejected here.
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_time'],
        message: 'End time must be after start time',
      });
    }
  });

export const submissionModerationSchema = z
  .object({
    action: z.enum(['APPROVE', 'REJECT']),
    reason: optionalText(500),
    /** Curator corrections applied when approving (Approve-with-edits). */
    listing: createListingSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'REJECT' && !value.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reason'],
        message: 'A rejection reason is required — it is sent to the submitter',
      });
    }
    if (value.action === 'APPROVE' && !value.listing) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['listing'],
        message: 'Approving requires the listing fields to create',
      });
    }
  });

export const analyticsEventSchema = z.object({
  listing_id: uuid.nullish(),
  city_id: uuid.nullish(),
  type: z.enum(['impression', 'detail', 'contact', 'share', 'save']),
  session_id: z.string().max(120).nullish(),
  metadata: z.record(z.unknown()).default({}),
});

export const analyticsBatchSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(50),
});

export const notificationSchema = z
  .object({
    city_id: uuid.nullish(),
    title: requiredText(120, 'Title'),
    body: requiredText(400, 'Body'),
    title_gu: optionalText(120),
    body_gu: optionalText(400),
    deep_link: optionalText(400),
    segment: z.enum(['ALL_USERS', 'CITY', 'CATEGORY', 'SAVED_LISTING']),
    segment_ref: uuid.nullish(),
    scheduled_at: isoInstant.nullish(),
  })
  .superRefine((value, ctx) => {
    if (['CATEGORY', 'SAVED_LISTING'].includes(value.segment) && !value.segment_ref) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['segment_ref'],
        message: `Segment ${value.segment} needs segment_ref`,
      });
    }
    if (value.segment === 'CITY' && !value.city_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['city_id'],
        message: 'A CITY segment needs city_id',
      });
    }
  });

export const occurrenceUpdateSchema = z
  .object({
    start_at: isoInstant.optional(),
    end_at: isoInstant.optional(),
    is_cancelled: z.boolean().optional(),
    cancel_reason: optionalText(300),
    note: optionalText(300),
  })
  .refine(
    (value) => Object.values(value).some((v) => v !== undefined),
    'Provide at least one field to change',
  );

export const profileUpdateSchema = z.object({
  name: optionalText(120),
  city_id: uuid.nullish(),
  lang: lang.optional(),
  notif_prefs: z
    .object({
      daily_digest: z.boolean().optional(),
      evening_nudge: z.boolean().optional(),
      categories: z.array(uuid).max(20).optional(),
    })
    .optional(),
});

export const parseRequestSchema = z
  .object({
    raw_text: optionalText(5000),
    image_text: optionalText(5000),
    city_id: uuid,
    /** Local date used to resolve relative phrases like "aaje"/"tomorrow". */
    reference_date: localDate.optional(),
  })
  .refine(
    (value) => Boolean(value.raw_text || value.image_text),
    'Provide raw_text or image_text to parse',
  );

export const uploadSchema = z.object({
  bucket: z.enum(['listing-covers', 'listing-gallery', 'submission-posters']),
  city_id: uuid,
  listing_id: uuid.optional(),
});
