/**
 * Creates or updates a user and optionally grants them a role.
 *
 *   npm run user:create -- --email demo@aajesu.test --password demo12345
 *   npm run user:create -- --email admin@aajesu.test --password admin12345 --role SUPER_ADMIN
 *   npm run user:create -- --email curator@aajesu.test --password cur12345 \
 *                          --role CITY_CURATOR --city bhavnagar
 *
 * Email + password on purpose: the PRD specifies phone OTP for real users, but
 * OTP needs an SMS provider, and nothing about the backend should wait on a
 * Twilio account. Phone OTP is a dashboard setting — the same accounts, roles
 * and RLS apply either way.
 *
 * Uses the service-role key, so it runs only here, never from a browser.
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database, AppRoleDb } from '../src/types/database';

config({ path: '.env.local' });
config({ path: '.env' });

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const VALID_ROLES: AppRoleDb[] = [
  'SUPER_ADMIN',
  'CITY_CURATOR',
  'CONTENT_INTERN',
  'PARTNER',
];

async function main(): Promise<void> {
  const email = arg('email');
  const password = arg('password');
  const role = arg('role') as AppRoleDb | undefined;
  const citySlug = arg('city');
  const phone = arg('phone');

  if (!email || !password) {
    console.error('Usage: npm run user:create -- --email <email> --password <password>');
    console.error('              [--role SUPER_ADMIN|CITY_CURATOR|CONTENT_INTERN|PARTNER]');
    console.error('              [--city <slug>] [--phone +91…]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }
  if (role && !VALID_ROLES.includes(role)) {
    console.error(`Invalid role. One of: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  const admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Find an existing account before creating one, so the script is re-runnable.
  const { data: list, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId: string;
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, { password });
    if (error) throw error;
    userId = data.user.id;
    console.info(`Updated existing user ${email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      phone: phone || undefined,
      email_confirm: true, // no inbox round trip for a demo account
    });
    if (error) throw error;
    userId = data.user.id;
    console.info(`Created user ${email}`);
  }

  // The signup trigger creates the profile row; backfill if it is missing
  // (e.g. the account predates the trigger).
  const { error: profileError } = await admin
    .from('users')
    .upsert({ id: userId, phone: phone ?? null }, { onConflict: 'id', ignoreDuplicates: true });
  if (profileError) throw profileError;

  if (role) {
    let cityId: string | null = null;
    if (role !== 'SUPER_ADMIN') {
      if (!citySlug) {
        console.error(`Role ${role} requires --city <slug>`);
        process.exit(1);
      }
      const { data: city, error: cityError } = await admin
        .from('cities')
        .select('id, name')
        .eq('slug', citySlug)
        .maybeSingle();
      if (cityError) throw cityError;
      if (!city) {
        console.error(`No city with slug "${citySlug}". Run npm run db:seed first.`);
        process.exit(1);
      }
      cityId = city.id;
    }

    const { error: roleError } = await admin
      .from('user_roles')
      .upsert(
        { user_id: userId, role, city_id: cityId },
        { onConflict: 'user_id,role,city_id', ignoreDuplicates: true },
      );
    if (roleError) throw roleError;
    console.info(`Granted ${role}${citySlug ? ` in ${citySlug}` : ' (global)'}`);
  }

  console.info(`\nUser id: ${userId}`);
  console.info('Sign in from the frontend with supabase.auth.signInWithPassword().\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
