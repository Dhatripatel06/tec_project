/**
 * Duplicate detection (PRD A4: "warns on similar title + same date + same
 * venue").
 *
 * Deliberately simple and explainable — string similarity plus exact-ish venue
 * and date agreement. No AI, no embeddings; a curator needs to understand in
 * one glance why two rows were flagged. The output carries the matched listing
 * and a score so the admin UI can show the suspected duplicate side by side.
 */

export interface DuplicateCandidate {
  listingId: string;
  title: string;
  venueId: string | null;
  venueName: string | null;
  /** Local dates this listing occupies. */
  dates: string[];
}

export interface DuplicateQuery {
  title: string;
  venueId?: string | null;
  venueName?: string | null;
  dates: string[];
  /** Exclude this listing (when re-checking an existing record). */
  excludeListingId?: string | null;
}

export interface DuplicateMatch {
  listingId: string;
  title: string;
  score: number;
  titleSimilarity: number;
  sameVenue: boolean;
  sharedDates: string[];
}

export interface DuplicateResult {
  potentialDuplicate: boolean;
  bestMatch: DuplicateMatch | null;
  matches: DuplicateMatch[];
}

/** A duplicate is flagged at or above this combined score. */
export const DUPLICATE_THRESHOLD = 0.6;
/** Below this, two titles are not the same event whatever else matches. */
export const MIN_TITLE_SIMILARITY = 0.45;

const WEIGHTS = { title: 0.5, venue: 0.25, date: 0.25 } as const;

/** Lowercase, strip punctuation, collapse whitespace, drop noise words. */
export function normaliseTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'at', 'in', 'on', 'of', 'for', 'and', 'with', 'to', 'by',
  'live', 'event', 'show',
]);

function tokens(value: string): string[] {
  return normaliseTitle(value)
    .split(' ')
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/** Character bigrams, used for the Dice coefficient. */
function bigrams(value: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < value.length - 1; i += 1) {
    const gram = value.slice(i, i + 2);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}

/**
 * Sørensen–Dice coefficient over character bigrams, in [0, 1].
 * Robust to the transpositions and typos real WhatsApp forwards are full of
 * ("Open Mic Night" vs "Open Mic Nite").
 */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

  const gramsA = bigrams(a);
  const gramsB = bigrams(b);
  let intersection = 0;
  let totalA = 0;
  let totalB = 0;

  for (const count of gramsA.values()) totalA += count;
  for (const count of gramsB.values()) totalB += count;
  for (const [gram, count] of gramsA) {
    intersection += Math.min(count, gramsB.get(gram) ?? 0);
  }
  return (2 * intersection) / (totalA + totalB);
}

/**
 * Title similarity: the better of character-level Dice and token overlap, so
 * that "Garba Night" ≈ "Night Garba" scores high despite the word order.
 */
export function titleSimilarity(a: string, b: string): number {
  const normA = normaliseTitle(a);
  const normB = normaliseTitle(b);
  if (!normA || !normB) return 0;

  const charScore = diceCoefficient(normA, normB);

  const tokensA = new Set(tokens(a));
  const tokensB = new Set(tokens(b));
  let tokenScore = 0;
  if (tokensA.size > 0 && tokensB.size > 0) {
    let shared = 0;
    for (const token of tokensA) if (tokensB.has(token)) shared += 1;
    tokenScore = (2 * shared) / (tokensA.size + tokensB.size);
  }

  return Math.max(charScore, tokenScore);
}

function venuesMatch(query: DuplicateQuery, candidate: DuplicateCandidate): boolean {
  if (query.venueId && candidate.venueId) return query.venueId === candidate.venueId;
  if (query.venueName && candidate.venueName) {
    return titleSimilarity(query.venueName, candidate.venueName) >= 0.8;
  }
  return false;
}

/**
 * Scores every candidate. Callers pass a pre-filtered candidate set (same city,
 * overlapping dates) — this function does the comparison, not the fetching.
 */
export function findDuplicates(
  query: DuplicateQuery,
  candidates: DuplicateCandidate[],
): DuplicateResult {
  const queryDates = new Set(query.dates);
  const matches: DuplicateMatch[] = [];

  for (const candidate of candidates) {
    if (query.excludeListingId && candidate.listingId === query.excludeListingId) continue;

    const similarity = titleSimilarity(query.title, candidate.title);
    if (similarity < MIN_TITLE_SIMILARITY) continue;

    const sharedDates = candidate.dates.filter((d) => queryDates.has(d));
    const sameVenue = venuesMatch(query, candidate);

    const score =
      similarity * WEIGHTS.title +
      (sameVenue ? WEIGHTS.venue : 0) +
      (sharedDates.length > 0 ? WEIGHTS.date : 0);

    matches.push({
      listingId: candidate.listingId,
      title: candidate.title,
      score: Math.round(score * 1000) / 1000,
      titleSimilarity: Math.round(similarity * 1000) / 1000,
      sameVenue,
      sharedDates,
    });
  }

  matches.sort((a, b) => b.score - a.score || (a.listingId < b.listingId ? -1 : 1));
  const bestMatch = matches[0] ?? null;

  return {
    potentialDuplicate: bestMatch !== null && bestMatch.score >= DUPLICATE_THRESHOLD,
    bestMatch,
    matches,
  };
}
