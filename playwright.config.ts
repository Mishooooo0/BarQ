import { defineConfig } from '@playwright/test';

// Browser tests use their own database so they never touch data/db. tests/fixtures.ts resets it before each test.
process.env.BARQ_DB_DIR = 'test-results/e2e-db';
const port = 5174;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: 'chrome',
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  // The AI Analyst talks to a local stand-in for the Claude-Dev endpoint (tests/fake-claude.mjs), never the real one.
  webServer: [
    { command: 'node tests/fake-claude.mjs', url: 'http://127.0.0.1:5175/health', reuseExistingServer: false, env: { FAKE_CLAUDE_PORT: '5175' } },
    { command: `npm run dev -- --port ${port} --strictPort`, url: `http://127.0.0.1:${port}/api/health`, reuseExistingServer: false, env: { BARQ_DB_DIR: process.env.BARQ_DB_DIR, CLAUDE_DEV_BASE_URL: 'http://127.0.0.1:5175', CLAUDE_DEV_KEY: 'test-key' } },
  ],
});
