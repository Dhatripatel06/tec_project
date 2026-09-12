import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Integration tests need network and credentials; they have their own
    // config and script so `npm test` stays offline.
    exclude: ['tests/integration/**'],
  },
});
