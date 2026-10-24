import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Integration tests share one PostgreSQL schema; run them serially.
    fileParallelism: false,
    hookTimeout: 20000,
    testTimeout: 20000,
  },
});
