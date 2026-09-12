import type { AppRole } from './permissions';

/**
 * Listing lifecycle (PRD A2).
 *
 *   DRAFT ──▶ PENDING ──▶ PUBLISHED ──▶ EXPIRED
 *               │             │
 *               ▼             ▼
 *           REJECTED      CANCELLED
 *
 * The single rule that must never bend: nothing reaches PUBLISHED without a
 * curator (or super admin) moving it there. Public submissions and partner
 * listings are always moderated.
 */

export const LISTING_STATUSES = [
  'DRAFT',
  'PENDING',
  'PUBLISHED',
  'EXPIRED',
  'REJECTED',
  'CANCELLED',
] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];

/** Roles allowed to perform each transition. */
const TRANSITIONS: Record<ListingStatus, Partial<Record<ListingStatus, AppRole[]>>> = {
  DRAFT: {
    PENDING: ['SUPER_ADMIN', 'CITY_CURATOR', 'CONTENT_INTERN', 'PARTNER'],
    PUBLISHED: ['SUPER_ADMIN', 'CITY_CURATOR'],
    CANCELLED: ['SUPER_ADMIN', 'CITY_CURATOR'],
  },
  PENDING: {
    PUBLISHED: ['SUPER_ADMIN', 'CITY_CURATOR'],
    REJECTED: ['SUPER_ADMIN', 'CITY_CURATOR'],
    DRAFT: ['SUPER_ADMIN', 'CITY_CURATOR', 'CONTENT_INTERN', 'PARTNER'],
  },
  PUBLISHED: {
    CANCELLED: ['SUPER_ADMIN', 'CITY_CURATOR'],
    EXPIRED: ['SUPER_ADMIN', 'CITY_CURATOR'],
    // Unpublishing back into the queue is how a curator fixes a bad publish.
    PENDING: ['SUPER_ADMIN', 'CITY_CURATOR'],
  },
  REJECTED: {
    DRAFT: ['SUPER_ADMIN', 'CITY_CURATOR', 'CONTENT_INTERN', 'PARTNER'],
    PENDING: ['SUPER_ADMIN', 'CITY_CURATOR', 'CONTENT_INTERN', 'PARTNER'],
  },
  CANCELLED: {
    // A cancelled event that is back on goes through moderation again.
    PENDING: ['SUPER_ADMIN', 'CITY_CURATOR'],
  },
  EXPIRED: {
    // Re-running a past event means new dates, hence re-moderation.
    PENDING: ['SUPER_ADMIN', 'CITY_CURATOR'],
    DRAFT: ['SUPER_ADMIN', 'CITY_CURATOR'],
  },
};

export interface TransitionCheck {
  allowed: boolean;
  reason?: string;
}

export function isTransitionDefined(from: ListingStatus, to: ListingStatus): boolean {
  return Boolean(TRANSITIONS[from][to]);
}

/** Can `role` move a listing from `from` to `to`? */
export function canTransition(
  from: ListingStatus,
  to: ListingStatus,
  role: AppRole,
): TransitionCheck {
  if (from === to) return { allowed: true };

  const allowedRoles = TRANSITIONS[from][to];
  if (!allowedRoles) {
    return { allowed: false, reason: `Cannot move a listing from ${from} to ${to}` };
  }
  if (!allowedRoles.includes(role)) {
    return { allowed: false, reason: `Role ${role} may not move a listing from ${from} to ${to}` };
  }
  return { allowed: true };
}

/** Transitions reachable by this role, for building admin UI affordances. */
export function availableTransitions(from: ListingStatus, role: AppRole): ListingStatus[] {
  return (Object.keys(TRANSITIONS[from]) as ListingStatus[]).filter(
    (to) => canTransition(from, to, role).allowed,
  );
}

/** Statuses whose listings can appear in the public feed. */
export const PUBLIC_STATUSES: ListingStatus[] = ['PUBLISHED'];

export function isPubliclyVisible(status: ListingStatus): boolean {
  return PUBLIC_STATUSES.includes(status);
}

/**
 * Has this listing finished for good? Used by the expiry sweep; the feed query
 * does not rely on it, because it filters on occurrence end instants directly.
 */
export function shouldExpire(
  status: ListingStatus,
  isEvergreen: boolean,
  lastOccurrenceEnd: Date | null,
  now: Date,
): boolean {
  if (status !== 'PUBLISHED') return false;
  if (isEvergreen) return false; // evergreen picks have no end
  if (!lastOccurrenceEnd) return false;
  return lastOccurrenceEnd.getTime() <= now.getTime();
}
