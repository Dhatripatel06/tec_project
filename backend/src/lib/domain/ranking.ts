/**
 * Feed ranking — deterministic, no ML (PRD §3 non-goals: "Recommendation ML.
 * Human curation is the moat at this scale").
 *
 * The score is a weighted sum of explicit, admin-controllable signals. Given
 * the same inputs it always produces the same order, which is what makes it
 * testable and what lets a curator predict the effect of pinning something.
 *
 * Deliberately modular: `SORTS` maps a sort mode to a comparator, so adding a
 * mode later does not touch the feed service.
 */

export interface RankableItem {
  listingId: string;
  isEditorsPick: boolean;
  isFeatured: boolean;
  /** Admin-set weight, higher ranks higher (PRD A3 `rank_weight`). */
  rankWeight: number;
  isEvergreen: boolean;
  /** Null for evergreen items, which are not scheduled. */
  startAt: Date | null;
  /** Kilometres from the user, when both user and venue are located. */
  distanceKm: number | null;
  createdAt: Date;
}

export interface RankingContext {
  now: Date;
  /** Soft cut-off for the "starting soon" bonus. */
  soonWindowHours?: number;
  /** Distance beyond which the proximity bonus is zero. */
  nearRadiusKm?: number;
}

export const WEIGHTS = {
  editorsPick: 10_000,
  featured: 5_000,
  /** Each unit of admin rank_weight. */
  rankWeight: 100,
  /** Full value when starting right now, decaying to 0 at soonWindowHours. */
  startingSoon: 400,
  /** Full value at distance 0, decaying to 0 at nearRadiusKm. */
  proximity: 200,
  /** Evergreen filler sits below real scheduled content of equal merit. */
  evergreenPenalty: -1_500,
  /** Something already running beats something that has not started. */
  liveNow: 300,
} as const;

export const DEFAULT_SOON_WINDOW_HOURS = 6;
export const DEFAULT_NEAR_RADIUS_KM = 10;

/** Linear decay from 1 at zero to 0 at `span`. */
function decay(value: number, span: number): number {
  if (span <= 0) return 0;
  if (value <= 0) return 1;
  if (value >= span) return 0;
  return 1 - value / span;
}

export function scoreItem(item: RankableItem, ctx: RankingContext): number {
  const soonWindow = ctx.soonWindowHours ?? DEFAULT_SOON_WINDOW_HOURS;
  const nearRadius = ctx.nearRadiusKm ?? DEFAULT_NEAR_RADIUS_KM;

  let score = 0;
  if (item.isEditorsPick) score += WEIGHTS.editorsPick;
  if (item.isFeatured) score += WEIGHTS.featured;
  score += item.rankWeight * WEIGHTS.rankWeight;
  if (item.isEvergreen) score += WEIGHTS.evergreenPenalty;

  if (item.startAt) {
    const hoursAway = (item.startAt.getTime() - ctx.now.getTime()) / 3_600_000;
    if (hoursAway < 0) {
      score += WEIGHTS.liveNow;
    } else {
      score += WEIGHTS.startingSoon * decay(hoursAway, soonWindow);
    }
  }

  if (item.distanceKm !== null) {
    score += WEIGHTS.proximity * decay(item.distanceKm, nearRadius);
  }

  return Math.round(score * 1000) / 1000;
}

export type SortMode = 'recommended' | 'starting_soon' | 'nearest';
export const SORT_MODES: SortMode[] = ['recommended', 'starting_soon', 'nearest'];

/** Stable tie-break so two runs never disagree. */
function byIdAsc(a: RankableItem, b: RankableItem): number {
  return a.listingId < b.listingId ? -1 : a.listingId > b.listingId ? 1 : 0;
}

const comparators: Record<SortMode, (ctx: RankingContext) => (a: RankableItem, b: RankableItem) => number> = {
  recommended: (ctx) => (a, b) => {
    const diff = scoreItem(b, ctx) - scoreItem(a, ctx);
    return diff !== 0 ? diff : byIdAsc(a, b);
  },
  starting_soon: () => (a, b) => {
    // Unscheduled (evergreen) items have no start and sort last.
    if (a.startAt && b.startAt) {
      const diff = a.startAt.getTime() - b.startAt.getTime();
      return diff !== 0 ? diff : byIdAsc(a, b);
    }
    if (a.startAt) return -1;
    if (b.startAt) return 1;
    return byIdAsc(a, b);
  },
  nearest: () => (a, b) => {
    // Items with no known distance sort last rather than pretending to be at 0.
    if (a.distanceKm !== null && b.distanceKm !== null) {
      const diff = a.distanceKm - b.distanceKm;
      return diff !== 0 ? diff : byIdAsc(a, b);
    }
    if (a.distanceKm !== null) return -1;
    if (b.distanceKm !== null) return 1;
    return byIdAsc(a, b);
  },
};

export function rankItems<T extends RankableItem>(
  items: T[],
  mode: SortMode,
  ctx: RankingContext,
): T[] {
  const compare = comparators[mode](ctx);
  // The editor's pick is pinned to the top of the feed in every sort mode
  // (PRD F1: "Pinned Editor's pick of the day at top").
  return [...items].sort((a, b) => {
    if (a.isEditorsPick !== b.isEditorsPick) return a.isEditorsPick ? -1 : 1;
    return compare(a, b);
  });
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. */
export function haversineKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}
