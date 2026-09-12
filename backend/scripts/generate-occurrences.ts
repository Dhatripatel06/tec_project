/**
 * Rolling occurrence horizon.
 *
 *   npm run occurrences:generate
 *   npm run occurrences:generate -- --days 180
 *
 * Recurring listings are materialised a fixed window ahead, so this keeps the
 * calendar from running dry. Safe to run repeatedly and safe to run often: it
 * is a diff, not a rebuild, and cancelled or hand-edited occurrences are never
 * touched (see diffOccurrences).
 *
 * Uses the service role, so it is a server-side job — never an endpoint.
 */
import { config } from 'dotenv';
import { createAdminClient } from '../src/lib/supabase/clients';
import { extendHorizon } from '../src/lib/services/occurrences';

config({ path: '.env.local' });
config({ path: '.env' });

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main(): Promise<void> {
  const days = Number(arg('days') ?? process.env.OCCURRENCE_HORIZON_DAYS ?? 120);
  if (!Number.isInteger(days) || days < 1) {
    console.error('--days must be a positive integer');
    process.exit(1);
  }

  const db = createAdminClient();
  const results = await extendHorizon(db, { horizonDays: days });

  const inserted = results.reduce((sum, r) => sum + r.inserted, 0);
  const updated = results.reduce((sum, r) => sum + r.updated, 0);
  const deleted = results.reduce((sum, r) => sum + r.deleted, 0);
  const preserved = results.reduce((sum, r) => sum + r.preserved, 0);

  console.info(`\nHorizon: ${days} days across ${results.length} published listing(s)`);
  console.info(`  inserted  ${inserted}`);
  console.info(`  updated   ${updated}`);
  console.info(`  removed   ${deleted}   (future dates no longer in the series)`);
  console.info(`  preserved ${preserved}   (cancelled, overridden, or already correct)\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
