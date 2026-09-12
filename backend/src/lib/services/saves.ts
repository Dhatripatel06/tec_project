import type { Db } from '../supabase/clients';
import { ApiError, ERROR_CODES } from '../api/response';

/**
 * Saves / "Interested" (PRD F6).
 *
 * RLS restricts every row to `user_id = auth.uid()`, and a unique constraint on
 * (user_id, listing_id) makes a duplicate save impossible at the database
 * level. This service treats a repeat save as success rather than an error —
 * a heart tapped twice is not a failure, and the client should not have to
 * special-case it.
 */

export interface SaveResult {
  listing_id: string;
  saved: boolean;
  save_count: number;
  /** True when this call created the row, false when it already existed. */
  created: boolean;
}

async function countSaves(db: Db, listingId: string): Promise<number> {
  const { count, error } = await db
    .from('saves')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId);
  if (error) throw error;
  return count ?? 0;
}

/** Confirms the listing exists and the caller is allowed to see it. */
async function assertListingVisible(db: Db, listingId: string): Promise<void> {
  const { data, error } = await db
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw ApiError.notFound('Listing', ERROR_CODES.LISTING_NOT_FOUND);
}

export async function saveListing(
  db: Db,
  userId: string,
  listingId: string,
): Promise<SaveResult> {
  await assertListingVisible(db, listingId);

  const { data: existing, error: existingError } = await db
    .from('saves')
    .select('id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (existingError) throw existingError;

  let created = false;
  if (!existing) {
    const { error } = await db.from('saves').insert({ user_id: userId, listing_id: listingId });
    // 23505 means a concurrent request won the race. That is still a save, not
    // an error the user should ever see.
    if (error && error.code !== '23505') throw error;
    created = !error;
  }

  return {
    listing_id: listingId,
    saved: true,
    save_count: await countSaves(db, listingId),
    created,
  };
}

export async function unsaveListing(
  db: Db,
  userId: string,
  listingId: string,
): Promise<SaveResult> {
  const { error } = await db
    .from('saves')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId);
  if (error) throw error;

  // Unsaving something that was never saved is also success — idempotent.
  return {
    listing_id: listingId,
    saved: false,
    save_count: await countSaves(db, listingId),
    created: false,
  };
}

export interface SavedListingItem {
  listing_id: string;
  saved_at: string;
  title: string;
  title_gu: string | null;
  hook: string | null;
  cover_image: string | null;
  status: string;
  is_evergreen: boolean;
  category: { slug: string; name: string; emoji: string | null } | null;
  venue: { id: string; name: string } | null;
  next_occurrence: { start_at: string; end_at: string; local_date: string } | null;
}

/**
 * The user's saved list (PRD F6 "My saves"), each item carrying its next
 * upcoming occurrence so the client can show when it is on without a second
 * round trip.
 */
export async function listSaves(
  db: Db,
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ items: SavedListingItem[]; total: number }> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const { data, error, count } = await db
    .from('saves')
    .select(
      `listing_id, created_at,
       listing:listings!inner(
         id, title, title_gu, hook, cover_image, status, is_evergreen,
         category:categories(slug, name, emoji),
         venue:venues(id, name)
       )`,
      { count: 'exact' },
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const rows = (data ?? []) as unknown as Array<{
    listing_id: string;
    created_at: string;
    listing: {
      id: string;
      title: string;
      title_gu: string | null;
      hook: string | null;
      cover_image: string | null;
      status: string;
      is_evergreen: boolean;
      category: { slug: string; name: string; emoji: string | null } | null;
      venue: { id: string; name: string } | null;
    } | null;
  }>;

  const listingIds = rows.map((r) => r.listing_id);
  const nextByListing = new Map<string, { start_at: string; end_at: string; local_date: string }>();

  if (listingIds.length > 0) {
    const { data: occurrences, error: occurrenceError } = await db
      .from('occurrences')
      .select('listing_id, start_at, end_at, local_date')
      .in('listing_id', listingIds)
      .eq('is_cancelled', false)
      .gt('end_at', new Date().toISOString())
      .order('start_at', { ascending: true });
    if (occurrenceError) throw occurrenceError;

    for (const occurrence of occurrences ?? []) {
      // Ordered ascending, so the first one seen per listing is the next one.
      if (!nextByListing.has(occurrence.listing_id)) {
        nextByListing.set(occurrence.listing_id, {
          start_at: occurrence.start_at,
          end_at: occurrence.end_at,
          local_date: occurrence.local_date,
        });
      }
    }
  }

  const items: SavedListingItem[] = rows
    .filter((row) => row.listing !== null)
    .map((row) => ({
      listing_id: row.listing_id,
      saved_at: row.created_at,
      title: row.listing!.title,
      title_gu: row.listing!.title_gu,
      hook: row.listing!.hook,
      cover_image: row.listing!.cover_image,
      status: row.listing!.status,
      is_evergreen: row.listing!.is_evergreen,
      category: row.listing!.category,
      venue: row.listing!.venue,
      next_occurrence: nextByListing.get(row.listing_id) ?? null,
    }));

  return { items, total: count ?? items.length };
}

/**
 * Saved-state lookup for a batch of listings, so a feed render can show filled
 * hearts in one request instead of one per card.
 */
export async function getSavedState(
  db: Db,
  userId: string,
  listingIds: string[],
): Promise<Record<string, boolean>> {
  const state: Record<string, boolean> = {};
  for (const id of listingIds) state[id] = false;
  if (listingIds.length === 0) return state;

  const { data, error } = await db
    .from('saves')
    .select('listing_id')
    .eq('user_id', userId)
    .in('listing_id', listingIds);
  if (error) throw error;

  for (const row of data ?? []) state[row.listing_id] = true;
  return state;
}
