import { describe, expect, it } from 'vitest';
import {
  accessibleCityIds,
  ANONYMOUS,
  canEditListing,
  canModerate,
  canReadListingRecord,
  canSendNotifications,
  effectiveRole,
  isCurator,
  isStaff,
  isSuperAdmin,
  type Actor,
} from '../../src/lib/domain/permissions';
import {
  availableTransitions,
  canTransition,
  shouldExpire,
} from '../../src/lib/domain/lifecycle';

const CITY_A = 'city-a';
const CITY_B = 'city-b';

const superAdmin: Actor = { userId: 'u1', grants: [{ role: 'SUPER_ADMIN', cityId: null }] };
const curatorA: Actor = { userId: 'u2', grants: [{ role: 'CITY_CURATOR', cityId: CITY_A }] };
const internA: Actor = { userId: 'u3', grants: [{ role: 'CONTENT_INTERN', cityId: CITY_A }] };
const partnerA: Actor = { userId: 'u4', grants: [{ role: 'PARTNER', cityId: CITY_A }] };
const plainUser: Actor = { userId: 'u5', grants: [] };

describe('role resolution', () => {
  it('recognises a super admin everywhere', () => {
    expect(isSuperAdmin(superAdmin)).toBe(true);
    expect(effectiveRole(superAdmin, CITY_A)).toBe('SUPER_ADMIN');
    expect(effectiveRole(superAdmin, CITY_B)).toBe('SUPER_ADMIN');
    expect(isCurator(superAdmin, CITY_B)).toBe(true);
  });

  it('scopes a curator to their own city', () => {
    expect(effectiveRole(curatorA, CITY_A)).toBe('CITY_CURATOR');
    expect(effectiveRole(curatorA, CITY_B)).toBeNull();
    expect(isCurator(curatorA, CITY_B)).toBe(false);
    expect(canModerate(curatorA, CITY_B)).toBe(false);
  });

  it('gives an anonymous visitor nothing', () => {
    expect(effectiveRole(ANONYMOUS, CITY_A)).toBeNull();
    expect(isStaff(ANONYMOUS, CITY_A)).toBe(false);
    expect(canModerate(ANONYMOUS, CITY_A)).toBe(false);
  });

  it('gives a signed-in user with no grants no admin access', () => {
    expect(effectiveRole(plainUser, CITY_A)).toBeNull();
    expect(isStaff(plainUser, CITY_A)).toBe(false);
  });

  it('picks the highest privilege when a user holds several in one city', () => {
    const multi: Actor = {
      userId: 'u6',
      grants: [
        { role: 'PARTNER', cityId: CITY_A },
        { role: 'CITY_CURATOR', cityId: CITY_A },
      ],
    };
    expect(effectiveRole(multi, CITY_A)).toBe('CITY_CURATOR');
  });

  it('reports accessible cities (null means all)', () => {
    expect(accessibleCityIds(superAdmin)).toBeNull();
    expect(accessibleCityIds(curatorA)).toEqual([CITY_A]);
    expect(accessibleCityIds(plainUser)).toEqual([]);
  });

  it('treats interns as staff but not curators', () => {
    expect(isStaff(internA, CITY_A)).toBe(true);
    expect(isCurator(internA, CITY_A)).toBe(false);
  });

  it('does not treat a partner as staff', () => {
    expect(isStaff(partnerA, CITY_A)).toBe(false);
  });
});

describe('listing record access', () => {
  const listing = { cityId: CITY_A, createdBy: 'u3', organiserOwnerId: 'u4' };

  it('lets in-city staff read any listing', () => {
    expect(canReadListingRecord(curatorA, listing)).toBe(true);
    expect(canReadListingRecord(internA, listing)).toBe(true);
  });

  it('lets the creator and the organiser owner read it', () => {
    expect(canReadListingRecord({ userId: 'u3', grants: [] }, listing)).toBe(true);
    expect(canReadListingRecord({ userId: 'u4', grants: [] }, listing)).toBe(true);
  });

  it('refuses an unrelated user and another city’s curator', () => {
    expect(canReadListingRecord(plainUser, listing)).toBe(false);
    expect(
      canReadListingRecord({ userId: 'x', grants: [{ role: 'CITY_CURATOR', cityId: CITY_B }] }, listing),
    ).toBe(false);
  });

  it('lets a partner edit only their own listing', () => {
    expect(canEditListing(partnerA, listing)).toBe(true);
    expect(canEditListing(partnerA, { ...listing, organiserOwnerId: 'someone-else', createdBy: 'x' }))
      .toBe(false);
  });
});

describe('notification permissions', () => {
  it('requires a curator for a city campaign and super admin for a global one', () => {
    expect(canSendNotifications(curatorA, CITY_A)).toBe(true);
    expect(canSendNotifications(curatorA, CITY_B)).toBe(false);
    expect(canSendNotifications(curatorA, null)).toBe(false);
    expect(canSendNotifications(superAdmin, null)).toBe(true);
  });
});

describe('listing lifecycle', () => {
  it('walks the documented happy path', () => {
    expect(canTransition('DRAFT', 'PENDING', 'CONTENT_INTERN').allowed).toBe(true);
    expect(canTransition('PENDING', 'PUBLISHED', 'CITY_CURATOR').allowed).toBe(true);
    expect(canTransition('PUBLISHED', 'EXPIRED', 'CITY_CURATOR').allowed).toBe(true);
  });

  it('never lets an intern publish', () => {
    const check = canTransition('PENDING', 'PUBLISHED', 'CONTENT_INTERN');
    expect(check.allowed).toBe(false);
    expect(check.reason).toMatch(/CONTENT_INTERN/);
  });

  it('never lets a partner publish', () => {
    expect(canTransition('PENDING', 'PUBLISHED', 'PARTNER').allowed).toBe(false);
    expect(canTransition('DRAFT', 'PUBLISHED', 'PARTNER').allowed).toBe(false);
  });

  it('refuses transitions that are not defined at all', () => {
    expect(canTransition('DRAFT', 'EXPIRED', 'SUPER_ADMIN').allowed).toBe(false);
    expect(canTransition('EXPIRED', 'PUBLISHED', 'SUPER_ADMIN').allowed).toBe(false);
    expect(canTransition('REJECTED', 'PUBLISHED', 'CITY_CURATOR').allowed).toBe(false);
  });

  it('allows a no-op transition', () => {
    expect(canTransition('DRAFT', 'DRAFT', 'PARTNER').allowed).toBe(true);
  });

  it('routes a revived cancelled event back through moderation', () => {
    expect(canTransition('CANCELLED', 'PUBLISHED', 'CITY_CURATOR').allowed).toBe(false);
    expect(canTransition('CANCELLED', 'PENDING', 'CITY_CURATOR').allowed).toBe(true);
  });

  it('lists the moves a role can actually make', () => {
    expect(availableTransitions('PENDING', 'CONTENT_INTERN')).toEqual(['DRAFT']);
    expect(availableTransitions('PENDING', 'CITY_CURATOR').sort()).toEqual([
      'DRAFT',
      'PUBLISHED',
      'REJECTED',
    ]);
  });
});

describe('expiry rule', () => {
  const now = new Date('2026-09-12T12:00:00Z');

  it('expires a published listing whose last occurrence has ended', () => {
    expect(shouldExpire('PUBLISHED', false, new Date('2026-09-12T11:00:00Z'), now)).toBe(true);
  });

  it('does not expire one still to come', () => {
    expect(shouldExpire('PUBLISHED', false, new Date('2026-09-12T13:00:00Z'), now)).toBe(false);
  });

  it('never expires an evergreen pick', () => {
    expect(shouldExpire('PUBLISHED', true, null, now)).toBe(false);
  });

  it('ignores listings that are not published', () => {
    expect(shouldExpire('DRAFT', false, new Date('2020-01-01T00:00:00Z'), now)).toBe(false);
  });
});
