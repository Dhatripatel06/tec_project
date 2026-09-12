/**
 * Roles and permissions (PRD 7.1).
 *
 *   SUPER_ADMIN    everything, every city
 *   CITY_CURATOR   full CRUD + moderation, assigned city only
 *   CONTENT_INTERN create drafts, cannot publish
 *   PARTNER        own listings only, always moderated
 *
 * This module is the application-side mirror of the RLS policies in
 * 00600_rls.sql. It exists so the API can return a clean 403 instead of an
 * opaque database error — NOT as the only line of defence. Both layers are
 * enforced; the database is the one that cannot be bypassed.
 */

export const APP_ROLES = ['SUPER_ADMIN', 'CITY_CURATOR', 'CONTENT_INTERN', 'PARTNER'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export interface RoleGrant {
  role: AppRole;
  /** Null only for SUPER_ADMIN, which is global. */
  cityId: string | null;
}

export interface Actor {
  userId: string | null;
  grants: RoleGrant[];
}

/** An unauthenticated visitor. */
export const ANONYMOUS: Actor = { userId: null, grants: [] };

export function isSuperAdmin(actor: Actor): boolean {
  return actor.grants.some((g) => g.role === 'SUPER_ADMIN');
}

export function hasCityRole(actor: Actor, cityId: string | null, roles: AppRole[]): boolean {
  if (isSuperAdmin(actor)) return true;
  if (!cityId) return false;
  return actor.grants.some((g) => g.cityId === cityId && roles.includes(g.role));
}

export function isCurator(actor: Actor, cityId: string | null): boolean {
  return hasCityRole(actor, cityId, ['CITY_CURATOR']);
}

export function isStaff(actor: Actor, cityId: string | null): boolean {
  return hasCityRole(actor, cityId, ['CITY_CURATOR', 'CONTENT_INTERN']);
}

export function isPartner(actor: Actor, cityId: string | null): boolean {
  return hasCityRole(actor, cityId, ['PARTNER']);
}

/**
 * The effective role used for lifecycle checks in a given city. Highest
 * privilege wins, and a role held in another city counts for nothing here —
 * which is the cross-city isolation the brief calls out specifically.
 */
export function effectiveRole(actor: Actor, cityId: string | null): AppRole | null {
  if (isSuperAdmin(actor)) return 'SUPER_ADMIN';
  if (!cityId) return null;
  const inCity = actor.grants.filter((g) => g.cityId === cityId).map((g) => g.role);
  for (const role of ['CITY_CURATOR', 'CONTENT_INTERN', 'PARTNER'] as const) {
    if (inCity.includes(role)) return role;
  }
  return null;
}

export interface ListingOwnership {
  cityId: string;
  createdBy: string | null;
  organiserOwnerId?: string | null;
}

/** Any back-office access at all to this listing. */
export function canReadListingRecord(actor: Actor, listing: ListingOwnership): boolean {
  if (isStaff(actor, listing.cityId)) return true;
  if (!actor.userId) return false;
  return listing.createdBy === actor.userId || listing.organiserOwnerId === actor.userId;
}

export function canEditListing(actor: Actor, listing: ListingOwnership): boolean {
  if (isCurator(actor, listing.cityId)) return true;
  if (!actor.userId) return false;
  const ownsIt =
    listing.createdBy === actor.userId || listing.organiserOwnerId === actor.userId;
  if (!ownsIt) return false;
  // Interns and partners may edit their own work; publishing is a separate,
  // curator-only transition (see lifecycle.ts).
  return isStaff(actor, listing.cityId) || isPartner(actor, listing.cityId);
}

export function canDeleteListing(actor: Actor, listing: ListingOwnership): boolean {
  return isCurator(actor, listing.cityId);
}

export function canModerate(actor: Actor, cityId: string): boolean {
  return isCurator(actor, cityId);
}

export function canManageCities(actor: Actor): boolean {
  return isSuperAdmin(actor);
}

export function canManageRoles(actor: Actor): boolean {
  return isSuperAdmin(actor);
}

export function canViewAnalytics(actor: Actor, cityId: string): boolean {
  return isStaff(actor, cityId);
}

export function canSendNotifications(actor: Actor, cityId: string | null): boolean {
  return cityId ? isCurator(actor, cityId) : isSuperAdmin(actor);
}

/** Cities this actor has any back-office access to (empty ⇒ none; null ⇒ all). */
export function accessibleCityIds(actor: Actor): string[] | null {
  if (isSuperAdmin(actor)) return null;
  return [...new Set(actor.grants.map((g) => g.cityId).filter((id): id is string => Boolean(id)))];
}
