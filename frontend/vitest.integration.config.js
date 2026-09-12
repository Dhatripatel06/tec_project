import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Integration tests talk to the real Supabase project, so they read the same
// .env.local the dev server does. They are a separate config (and a separate
// script) so `npm test` stays offline and fast.
config({ path: '.env.local' });

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.js'],
    testTimeout: 20000,
  },
});
