/**
 * Applies every migration to a throwaway in-process Postgres and reports the
 * resulting schema. Fast feedback on SQL that would only fail at deploy time.
 *
 *   npx tsx scripts/check-migrations.ts
 */
import { createTestDb } from '../tests/helpers/db';

async function main() {
  const db = await createTestDb();

  const tables = await db.query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
     order by table_name`,
  );
  const policies = await db.query<{ tablename: string; policyname: string }>(
    `select tablename, policyname from pg_policies where schemaname = 'public'
     order by tablename, policyname`,
  );
  const indexes = await db.query<{ count: string }>(
    `select count(*)::text as count from pg_indexes where schemaname = 'public'`,
  );
  const functions = await db.query<{ proname: string }>(
    `select p.proname from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' order by p.proname`,
  );

  console.log(`\nTables (${tables.rows.length}):`);
  console.log('  ' + tables.rows.map((r) => r.table_name).join(', '));
  console.log(`\nRLS policies (${policies.rows.length}):`);
  for (const row of policies.rows) console.log(`  ${row.tablename}.${row.policyname}`);
  console.log(`\nIndexes: ${indexes.rows[0]?.count}`);
  console.log(`Functions (${functions.rows.length}):`);
  console.log('  ' + functions.rows.map((r) => r.proname).join(', '));

  await db.close();
  console.log('\nAll migrations applied cleanly.');
}

main().catch((error) => {
  console.error('\nMIGRATION CHECK FAILED\n');
  console.error(error.message);
  process.exit(1);
});
