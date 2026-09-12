/**
 * Database types.
 *
 * Hand-maintained to match supabase/migrations. Once a Supabase project is
 * linked these can be regenerated instead:
 *
 *   npx supabase gen types typescript --linked > src/types/database.ts
 *
 * Keep the two in step — this file is what gives the service layer its safety.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type ListingStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PUBLISHED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'CANCELLED';
export type PriceType = 'free' | 'paid' | 'donation';
export type ListingSource =
  | 'admin'
  | 'partner'
  | 'user_submission'
  | 'whatsapp'
  | 'instagram'
  | 'scraped';
export type AppRoleDb = 'SUPER_ADMIN' | 'CITY_CURATOR' | 'CONTENT_INTERN' | 'PARTNER';
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ViewType = 'impression' | 'detail' | 'contact' | 'share' | 'save';
export type RecurrenceFreqDb = 'ONCE' | 'DAILY' | 'WEEKLY';
export type NotificationSegment = 'ALL_USERS' | 'CITY' | 'CATEGORY' | 'SAVED_LISTING';
export type NotificationStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'SENDING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';
export type TrustLevel = 'NEW' | 'TRUSTED' | 'VERIFIED' | 'BLOCKED';
export type AppLang = 'en' | 'gu';
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'REJECT'
  | 'CANCEL'
  | 'EXPIRE'
  | 'APPROVE'
  | 'SUBMIT'
  | 'ROLE_GRANT'
  | 'ROLE_REVOKE';

/**
 * Row types are declared as `type`, not `interface`, on purpose: an interface
 * has no implicit index signature, so it fails supabase-js's `GenericTable`
 * constraint and every `.select('col_a,col_b')` silently degrades to `never`.
 */

export type CityRow = {
  id: string;
  name: string;
  name_gu: string | null;
  slug: string;
  lat: number;
  lng: number;
  timezone: string;
  is_live: boolean;
  created_at: string;
  updated_at: string;
}

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  name_gu: string | null;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type VenueRow = {
  id: string;
  city_id: string;
  name: string;
  name_gu: string | null;
  address: string | null;
  area: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  maps_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type OrganiserRow = {
  id: string;
  city_id: string;
  name: string;
  name_gu: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  logo_url: string | null;
  trust_level: TrustLevel;
  auto_publish: boolean;
  owner_user_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRow = {
  id: string;
  phone: string | null;
  name: string | null;
  city_id: string | null;
  lang: AppLang;
  notif_prefs: Json;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export type UserRoleRow = {
  id: string;
  user_id: string;
  role: AppRoleDb;
  city_id: string | null;
  granted_by: string | null;
  created_at: string;
}

export type ListingRow = {
  id: string;
  city_id: string;
  category_id: string;
  venue_id: string | null;
  organiser_id: string | null;
  venue_text: string | null;
  title: string;
  title_gu: string | null;
  description: string | null;
  description_gu: string | null;
  hook: string | null;
  hook_gu: string | null;
  start_at: string | null;
  end_at: string | null;
  timezone: string;
  price_type: PriceType;
  price_min: number | null;
  price_max: number | null;
  is_indoor: boolean;
  is_family_friendly: boolean;
  is_evergreen: boolean;
  is_featured: boolean;
  rank_weight: number;
  capacity: number | null;
  external_url: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  cover_image: string | null;
  gallery: string[];
  status: ListingStatus;
  source: ListingSource;
  submitted_by: string | null;
  created_by: string | null;
  published_by: string | null;
  published_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type RecurrenceRow = {
  id: string;
  listing_id: string;
  freq: RecurrenceFreqDb;
  interval: number;
  byweekday: number[] | null;
  starts_on: string;
  ends_on: string | null;
  count: number | null;
  start_time: string;
  end_time: string;
  ends_next_day: boolean;
  timezone: string;
  exdates: string[];
  created_at: string;
  updated_at: string;
}

export type OccurrenceRow = {
  id: string;
  listing_id: string;
  city_id: string;
  local_date: string;
  start_at: string;
  end_at: string;
  is_cancelled: boolean;
  is_override: boolean;
  cancel_reason: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type EditorPickRow = {
  id: string;
  city_id: string;
  pick_date: string;
  listing_id: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export type SaveRow = {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
}

export type ViewRow = {
  id: string;
  listing_id: string | null;
  city_id: string | null;
  user_id: string | null;
  session_id: string | null;
  type: ViewType;
  metadata: Json;
  created_at: string;
}

export type SubmissionRow = {
  id: string;
  city_id: string;
  raw_text: string | null;
  parsed_json: Json | null;
  image_url: string | null;
  instagram_url: string | null;
  title: string | null;
  category_id: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_id: string | null;
  venue_text: string | null;
  price_text: string | null;
  contact_phone: string | null;
  status: SubmissionStatus;
  reason: string | null;
  submitted_by: string | null;
  submitter_phone: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  listing_id: string | null;
  potential_duplicate: boolean;
  duplicate_of: string | null;
  duplicate_score: number | null;
  created_at: string;
  updated_at: string;
}

export type NotificationRow = {
  id: string;
  city_id: string | null;
  title: string;
  body: string;
  title_gu: string | null;
  body_gu: string | null;
  deep_link: string | null;
  segment: NotificationSegment;
  segment_ref: string | null;
  status: NotificationStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  stats: Json;
  provider: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationDeliveryRow = {
  id: string;
  notification_id: string;
  user_id: string;
  sent_at: string | null;
  opened_at: string | null;
  error: string | null;
  created_at: string;
}

export type DeviceTokenRow = {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ReportRow = {
  id: string;
  listing_id: string;
  occurrence_id: string | null;
  user_id: string | null;
  reason: string;
  details: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  city_id: string | null;
  entity: string;
  entity_id: string | null;
  action: AuditAction;
  diff: Json;
  created_at: string;
}

export type ListingTagRow = {
  listing_id: string;
  tag: string;
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      cities: Table<CityRow>;
      categories: Table<CategoryRow>;
      venues: Table<VenueRow>;
      organisers: Table<OrganiserRow>;
      users: Table<UserRow>;
      user_roles: Table<UserRoleRow>;
      listings: Table<ListingRow>;
      listing_tags: Table<ListingTagRow>;
      recurrences: Table<RecurrenceRow>;
      occurrences: Table<OccurrenceRow>;
      editor_picks: Table<EditorPickRow>;
      saves: Table<SaveRow>;
      views: Table<ViewRow>;
      submissions: Table<SubmissionRow>;
      notifications: Table<NotificationRow>;
      notification_deliveries: Table<NotificationDeliveryRow>;
      device_tokens: Table<DeviceTokenRow>;
      reports: Table<ReportRow>;
      audit_logs: Table<AuditLogRow>;
    };
    Views: { [_ in never]: never };
    Functions: {
      expire_finished_listings: { Args: Record<string, never>; Returns: number };
      listing_save_count: { Args: { target_listing: string }; Returns: number };
      write_audit_log: {
        Args: {
          p_entity: string;
          p_entity_id: string;
          p_action: AuditAction;
          p_diff?: Json;
          p_city_id?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      listing_status: ListingStatus;
      price_type: PriceType;
      listing_source: ListingSource;
      app_role: AppRoleDb;
      submission_status: SubmissionStatus;
      view_type: ViewType;
      recurrence_freq: RecurrenceFreqDb;
      notification_segment: NotificationSegment;
      notification_status: NotificationStatus;
      trust_level: TrustLevel;
      app_lang: AppLang;
      audit_action: AuditAction;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
