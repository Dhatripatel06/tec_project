import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createTestDb, type TestDb } from '../helpers/db';

/**
 * RLS policy tests, run against a real Postgres engine (PGlite) with the full
 * migration set applied.
 *
 * These are the tests that matter most before pointing the schema at a real
 * project: they execute as the `anon` and `authenticated` database roles with a
 * JWT subject set, exactly as PostgREST does, so a policy that is too loose
 * shows up here rather than in production.
 */

const CITY_A = '11111111-1111-1111-1111-111111111111';
const CITY_B = '22222222-2222-2222-2222-222222222222';
const CAT = '33333333-3333-3333-3333-333333333333';

const SUPER_ADMIN = 'aaaaaaaa-0000-0000-0000-000000000001';
const CURATOR_A = 'aaaaaaaa-0000-0000-0000-000000000002';
const CURATOR_B = 'aaaaaaaa-0000-0000-0000-000000000003';
const INTERN_A = 'aaaaaaaa-0000-0000-0000-000000000004';
const PARTNER_A = 'aaaaaaaa-0000-0000-0000-000000000005';
const PLAIN_USER = 'aaaaaaaa-0000-0000-0000-000000000006';

const ORGANISER_A = 'bbbbbbbb-0000-0000-0000-000000000001';
const PUBLISHED_A = 'cccccccc-0000-0000-0000-000000000001';
const DRAFT_A = 'cccccccc-0000-0000-0000-000000000002';
const PUBLISHED_B = 'cccccccc-0000-0000-0000-000000000003';
const PARTNER_LISTING = 'cccccccc-0000-0000-0000-000000000004';

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();

  await db.exec(`
    insert into auth.users (id, phone) values
      ('${SUPER_ADMIN}', '+919000000001'),
      ('${CURATOR_A}',   '+919000000002'),
      ('${CURATOR_B}',   '+919000000003'),
      ('${INTERN_A}',    '+919000000004'),
      ('${PARTNER_A}',   '+919000000005'),
      ('${PLAIN_USER}',  '+919000000006');

    insert into public.cities (id, name, slug, lat, lng, is_live) values
      ('${CITY_A}', 'Bhavnagar', 'bhavnagar', 21.7645, 72.1519, true),
      ('${CITY_B}', 'Rajkot',    'rajkot',    22.3039, 70.8022, true);

    insert into public.categories (id, slug, name, sort_order) values
      ('${CAT}', 'culture-shows', 'Culture & Shows', 1);

    insert into public.user_roles (user_id, role, city_id) values
      ('${SUPER_ADMIN}', 'SUPER_ADMIN',    null),
      ('${CURATOR_A}',   'CITY_CURATOR',   '${CITY_A}'),
      ('${CURATOR_B}',   'CITY_CURATOR',   '${CITY_B}'),
      ('${INTERN_A}',    'CONTENT_INTERN', '${CITY_A}'),
      ('${PARTNER_A}',   'PARTNER',        '${CITY_A}');

    insert into public.organisers (id, city_id, name, owner_user_id) values
      ('${ORGANISER_A}', '${CITY_A}', 'Bhavnagar Theatre Group', '${PARTNER_A}');

    insert into public.listings
      (id, city_id, category_id, title, status, start_at, end_at, created_by)
    values
      ('${PUBLISHED_A}', '${CITY_A}', '${CAT}', 'Published in A', 'PUBLISHED',
       now() + interval '1 day', now() + interval '1 day 2 hours', '${CURATOR_A}'),
      ('${DRAFT_A}', '${CITY_A}', '${CAT}', 'Draft in A', 'DRAFT',
       now() + interval '1 day', now() + interval '1 day 2 hours', '${CURATOR_A}'),
      ('${PUBLISHED_B}', '${CITY_B}', '${CAT}', 'Published in B', 'PUBLISHED',
       now() + interval '1 day', now() + interval '1 day 2 hours', '${CURATOR_B}');

    insert into public.listings
      (id, city_id, category_id, organiser_id, title, status, start_at, end_at, created_by, source)
    values
      ('${PARTNER_LISTING}', '${CITY_A}', '${CAT}', '${ORGANISER_A}', 'Partner listing',
       'PENDING', now() + interval '2 days', now() + interval '2 days 2 hours',
       '${PARTNER_A}', 'partner');
  `);
});

afterAll(async () => {
  await db?.close();
});

const count = async (sql: string): Promise<number> => {
  const result = await db.query<{ n: number }>(sql);
  return Number(result.rows[0]?.n ?? 0);
};

describe('public read access', () => {
  it('lets an anonymous visitor read published listings only', async () => {
    const titles = await asUser(db, { role: 'anon', userId: null }, async () => {
      const result = await db.query<{ title: string }>('select title from public.listings');
      return result.rows.map((r) => r.title).sort();
    });
    expect(titles).toEqual(['Published in A', 'Published in B']);
  });

  it('hides drafts from a signed-in user with no role', async () => {
    const titles = await asUser(db, { userId: PLAIN_USER }, async () => {
      const result = await db.query<{ title: string }>('select title from public.listings');
      return result.rows.map((r) => r.title).sort();
    });
    expect(titles).toEqual(['Published in A', 'Published in B']);
  });

  it('shows a curator every listing in their own city, including drafts', async () => {
    const titles = await asUser(db, { userId: CURATOR_A }, async () => {
      const result = await db.query<{ title: string }>(
        `select title from public.listings where city_id = '${CITY_A}'`,
      );
      return result.rows.map((r) => r.title).sort();
    });
    expect(titles).toEqual(['Draft in A', 'Partner listing', 'Published in A']);
  });

  it('does NOT show city B drafts to the city A curator', async () => {
    await db.exec(
      `insert into public.listings (city_id, category_id, title, status, start_at, end_at)
       values ('${CITY_B}', '${CAT}', 'Draft in B', 'DRAFT',
               now() + interval '1 day', now() + interval '1 day 2 hours')`,
    );
    const visible = await asUser(db, { userId: CURATOR_A }, () =>
      count(`select count(*)::int as n from public.listings where title = 'Draft in B'`),
    );
    expect(visible).toBe(0);
  });
});

describe('cross-city isolation', () => {
  it('stops a city A curator updating a city B listing', async () => {
    const updated = await asUser(db, { userId: CURATOR_A }, async () => {
      const result = await db.query(
        `update public.listings set title = 'HIJACKED' where id = '${PUBLISHED_B}'`,
      );
      return result.affectedRows ?? 0;
    });
    // RLS filters the row out of the UPDATE entirely — 0 rows, no error.
    expect(updated).toBe(0);

    const title = await db.query<{ title: string }>(
      `select title from public.listings where id = '${PUBLISHED_B}'`,
    );
    expect(title.rows[0]?.title).toBe('Published in B');
  });

  it('stops a city A curator deleting a city B listing', async () => {
    const deleted = await asUser(db, { userId: CURATOR_A }, async () => {
      const result = await db.query(`delete from public.listings where id = '${PUBLISHED_B}'`);
      return result.affectedRows ?? 0;
    });
    expect(deleted).toBe(0);
    expect(
      await count(`select count(*)::int as n from public.listings where id = '${PUBLISHED_B}'`),
    ).toBe(1);
  });

  it('stops a city A curator inserting into city B', async () => {
    await expect(
      asUser(db, { userId: CURATOR_A }, () =>
        db.query(
          `insert into public.listings (city_id, category_id, title, status, start_at, end_at, created_by)
           values ('${CITY_B}', '${CAT}', 'Sneaky', 'PUBLISHED',
                   now() + interval '1 day', now() + interval '1 day 2 hours', '${CURATOR_A}')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('stops a curator creating venues in another city', async () => {
    await expect(
      asUser(db, { userId: CURATOR_A }, () =>
        db.query(
          `insert into public.venues (city_id, name) values ('${CITY_B}', 'Not my city')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('lets a super admin act in every city', async () => {
    const updated = await asUser(db, { userId: SUPER_ADMIN }, async () => {
      const result = await db.query(
        `update public.listings set rank_weight = 5 where id = '${PUBLISHED_B}'`,
      );
      return result.affectedRows ?? 0;
    });
    expect(updated).toBe(1);
  });
});

describe('content intern', () => {
  it('may create a draft in their city', async () => {
    await asUser(db, { userId: INTERN_A }, () =>
      db.query(
        `insert into public.listings (city_id, category_id, title, status, start_at, end_at, created_by)
         values ('${CITY_A}', '${CAT}', 'Intern draft', 'DRAFT',
                 now() + interval '3 days', now() + interval '3 days 2 hours', '${INTERN_A}')`,
      ),
    );
    expect(
      await count(`select count(*)::int as n from public.listings where title = 'Intern draft'`),
    ).toBe(1);
  });

  it('may NOT create a listing that is already published', async () => {
    await expect(
      asUser(db, { userId: INTERN_A }, () =>
        db.query(
          `insert into public.listings (city_id, category_id, title, status, start_at, end_at, created_by)
           values ('${CITY_A}', '${CAT}', 'Intern publish attempt', 'PUBLISHED',
                   now() + interval '3 days', now() + interval '3 days 2 hours', '${INTERN_A}')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('may NOT publish an existing draft', async () => {
    await expect(
      asUser(db, { userId: INTERN_A }, () =>
        db.query(
          `update public.listings set status = 'PUBLISHED'
           where title = 'Intern draft'`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('may not edit a listing created by someone else', async () => {
    const updated = await asUser(db, { userId: INTERN_A }, async () => {
      const result = await db.query(
        `update public.listings set title = 'intern edit' where id = '${DRAFT_A}'`,
      );
      return result.affectedRows ?? 0;
    });
    expect(updated).toBe(0);
  });
});

describe('partner', () => {
  it('may edit their own listing but never publish it', async () => {
    const updated = await asUser(db, { userId: PARTNER_A }, async () => {
      const result = await db.query(
        `update public.listings set title = 'Partner listing v2'
         where id = '${PARTNER_LISTING}'`,
      );
      return result.affectedRows ?? 0;
    });
    expect(updated).toBe(1);

    await expect(
      asUser(db, { userId: PARTNER_A }, () =>
        db.query(
          `update public.listings set status = 'PUBLISHED' where id = '${PARTNER_LISTING}'`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('may not touch another organiser’s listing', async () => {
    const updated = await asUser(db, { userId: PARTNER_A }, async () => {
      const result = await db.query(
        `update public.listings set title = 'stolen' where id = '${PUBLISHED_A}'`,
      );
      return result.affectedRows ?? 0;
    });
    expect(updated).toBe(0);
  });

  it('may not raise their own organiser trust level or set auto-publish', async () => {
    await expect(
      asUser(db, { userId: PARTNER_A }, () =>
        db.query(
          `update public.organisers set trust_level = 'VERIFIED', auto_publish = true
           where id = '${ORGANISER_A}'`,
        ),
      ),
    ).rejects.toThrow(/insufficient privileges/i);

    // …but may still edit their own contact details.
    const updated = await asUser(db, { userId: PARTNER_A }, async () => {
      const result = await db.query(
        `update public.organisers set instagram = 'btg_bhavnagar' where id = '${ORGANISER_A}'`,
      );
      return result.affectedRows ?? 0;
    });
    expect(updated).toBe(1);
  });
});

describe('roles table', () => {
  it('lets a user read only their own grants', async () => {
    const rows = await asUser(db, { userId: CURATOR_A }, async () => {
      const result = await db.query<{ user_id: string }>('select user_id from public.user_roles');
      return result.rows;
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.user_id).toBe(CURATOR_A);
  });

  it('stops a curator granting themselves a role in another city', async () => {
    await expect(
      asUser(db, { userId: CURATOR_A }, () =>
        db.query(
          `insert into public.user_roles (user_id, role, city_id)
           values ('${CURATOR_A}', 'CITY_CURATOR', '${CITY_B}')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('stops a curator promoting themselves to super admin', async () => {
    await expect(
      asUser(db, { userId: CURATOR_A }, () =>
        db.query(
          `insert into public.user_roles (user_id, role, city_id)
           values ('${CURATOR_A}', 'SUPER_ADMIN', null)`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe('saves', () => {
  it('lets a user save a listing and blocks a duplicate save', async () => {
    await asUser(db, { userId: PLAIN_USER }, () =>
      db.query(
        `insert into public.saves (user_id, listing_id)
         values ('${PLAIN_USER}', '${PUBLISHED_A}')`,
      ),
    );

    await expect(
      asUser(db, { userId: PLAIN_USER }, () =>
        db.query(
          `insert into public.saves (user_id, listing_id)
           values ('${PLAIN_USER}', '${PUBLISHED_A}')`,
        ),
      ),
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it('stops a user saving on behalf of someone else', async () => {
    await expect(
      asUser(db, { userId: PLAIN_USER }, () =>
        db.query(
          `insert into public.saves (user_id, listing_id)
           values ('${CURATOR_A}', '${PUBLISHED_A}')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('shows a user only their own saves', async () => {
    const visible = await asUser(db, { userId: CURATOR_A }, () =>
      count('select count(*)::int as n from public.saves'),
    );
    expect(visible).toBe(0);
  });
});

describe('submissions', () => {
  it('lets anyone submit, but only as PENDING', async () => {
    await asUser(db, { role: 'anon', userId: null }, () =>
      db.query(
        `insert into public.submissions (city_id, title, raw_text)
         values ('${CITY_A}', 'Anon submission', 'forwarded text')`,
      ),
    );

    await expect(
      asUser(db, { role: 'anon', userId: null }, () =>
        db.query(
          `insert into public.submissions (city_id, title, status)
           values ('${CITY_A}', 'Self approved', 'APPROVED')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('keeps the queue invisible to non-staff', async () => {
    const visible = await asUser(db, { userId: PLAIN_USER }, () =>
      count('select count(*)::int as n from public.submissions'),
    );
    expect(visible).toBe(0);

    const curatorSees = await asUser(db, { userId: CURATOR_A }, () =>
      count('select count(*)::int as n from public.submissions'),
    );
    expect(curatorSees).toBeGreaterThan(0);
  });

  it('stops a city B curator moderating a city A submission', async () => {
    const updated = await asUser(db, { userId: CURATOR_B }, async () => {
      const result = await db.query(
        `update public.submissions set status = 'REJECTED', reason = 'no',
           reviewed_by = '${CURATOR_B}', reviewed_at = now()
         where city_id = '${CITY_A}'`,
      );
      return result.affectedRows ?? 0;
    });
    expect(updated).toBe(0);
  });
});

describe('analytics and audit', () => {
  it('lets anyone record a view but nobody but staff read them', async () => {
    await asUser(db, { role: 'anon', userId: null }, () =>
      db.query(
        `insert into public.views (listing_id, city_id, type, session_id)
         values ('${PUBLISHED_A}', '${CITY_A}', 'impression', 'sess-1')`,
      ),
    );

    // anon holds INSERT but no SELECT grant, so reading is refused at the
    // grant level — stricter than an RLS filter, which would return 0 rows.
    await expect(
      asUser(db, { role: 'anon', userId: null }, () =>
        count('select count(*)::int as n from public.views'),
      ),
    ).rejects.toThrow(/permission denied/i);

    const staffReads = await asUser(db, { userId: CURATOR_A }, () =>
      count('select count(*)::int as n from public.views'),
    );
    expect(staffReads).toBeGreaterThan(0);
  });

  it('stops a viewer attributing an event to another user', async () => {
    await expect(
      asUser(db, { userId: PLAIN_USER }, () =>
        db.query(
          `insert into public.views (listing_id, city_id, type, user_id)
           values ('${PUBLISHED_A}', '${CITY_A}', 'detail', '${CURATOR_A}')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('records an audit row automatically on a status change', async () => {
    await asUser(db, { userId: CURATOR_A }, () =>
      db.query(`update public.listings set status = 'PENDING' where id = '${DRAFT_A}'`),
    );
    const audits = await count(
      `select count(*)::int as n from public.audit_logs
       where entity = 'listings' and entity_id = '${DRAFT_A}'`,
    );
    expect(audits).toBeGreaterThan(0);
  });

  it('keeps the audit trail append-only from a client key', async () => {
    // audit_logs carries a SELECT grant for staff and nothing else — no UPDATE
    // or DELETE grant and no policy for either. The trail cannot be rewritten
    // with an anon or user token; only the service role can touch it.
    await expect(
      asUser(db, { userId: CURATOR_A }, () =>
        db.query(`update public.audit_logs set action = 'CREATE'`),
      ),
    ).rejects.toThrow(/permission denied/i);

    await expect(
      asUser(db, { userId: CURATOR_A }, () => db.query(`delete from public.audit_logs`)),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe('occurrences', () => {
  it('exposes occurrences of published listings to anonymous readers only', async () => {
    await db.exec(`
      insert into public.occurrences (listing_id, city_id, local_date, start_at, end_at)
      values
        ('${PUBLISHED_A}', '${CITY_A}', current_date + 1,
         now() + interval '1 day', now() + interval '1 day 2 hours'),
        ('${DRAFT_A}', '${CITY_A}', current_date + 1,
         now() + interval '1 day', now() + interval '1 day 2 hours');
    `);

    const anonSees = await asUser(db, { role: 'anon', userId: null }, () =>
      count('select count(*)::int as n from public.occurrences'),
    );
    // DRAFT_A was moved to PENDING above, so exactly one published occurrence.
    expect(anonSees).toBe(1);
  });
});
