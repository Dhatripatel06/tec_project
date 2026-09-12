/**
 * Expiry sweep.
 *
 *   npm run listings:expire
 *
 * SECONDARY mechanism only. The feed query already filters on
 * `occurrence.end_at > now()`, so a finished event cannot appear even if this
 * never runs. What this does is move finished listings to status EXPIRED so the
 * admin table reflects reality.
 */
import { config } from 'dotenv';
import { createAdminClient } from '../src/lib/supabase/clients';

config({ path: '.env.local' });
config({ path: '.env' });

async function main(): Promise<void> {
  const db = createAdminClient();
  const { data, error } = await db.rpc('expire_finished_listings');
  if (error) {
    console.error(`Expiry sweep failed: ${error.message}`);
    process.exit(1);
  }
  console.info(`\nExpired ${data ?? 0} listing(s) whose occurrences have all finished.\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
