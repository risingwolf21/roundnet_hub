import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e/playwright',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    // Playwright uses baseURL for relative navigations. Vite dev server runs on :5173 by default.
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    // Increase action and navigation timeouts (default 30s)
    actionTimeout: 120_000,
    navigationTimeout: 120_000,
  },
  webServer: {
    // Start the Vite dev server automatically for tests (useful locally and in CI).
    command: 'yarn start',
    url: process.env.BASE_URL ?? 'http://localhost:5173',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      // Forward Vite env vars needed by the client at build/runtime
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
      VITE_SUPABASE_PROJECT_ID: process.env.VITE_SUPABASE_PROJECT_ID,
      VITE_APP_HOMEPAGE: process.env.VITE_APP_HOMEPAGE,
      // index.html substitutes %VITE_WEBSITE_NAME% / %VITE_WEBSITE_PATH% / %VITE_ICON_PREFIX%;
      // the title smoke test needs WEBSITE_NAME to be present.
      VITE_WEBSITE_NAME: process.env.VITE_WEBSITE_NAME ?? 'Roundnet Karlsruhe',
      VITE_WEBSITE_PATH: process.env.VITE_WEBSITE_PATH ?? 'roundnet-karlsruhe',
      VITE_ICON_PREFIX: process.env.VITE_ICON_PREFIX ?? 'roundnet-karlsruhe',
      VITE_ENV: process.env.VITE_ENV ?? 'development',
      // Ensure the server is aware of the base URL
      BASE_URL: process.env.BASE_URL ?? 'http://localhost:5173',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
