import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e/playwright',
  // Keep timeouts tight so a broken selector/assertion fails fast instead of hanging the
  // whole job (the earlier 120s action/nav timeouts × retries made a failing run take 30min+).
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // results.json feeds scripts/e2e-report.mjs (README test-status table).
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    // Playwright uses baseURL for relative navigations. Vite dev server runs on :5173 by default.
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Optional: use a preinstalled Chromium instead of the one bundled with this Playwright version.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
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
      // Dummy VAPID public key (any valid P-256 point format): the push UI only needs one to call
      // pushManager.subscribe, which the push spec stubs — nothing is ever sent to a push service.
      VITE_VAPID_PUBLIC_KEY: process.env.VITE_VAPID_PUBLIC_KEY ?? 'BIbzjRo-26J02OpLy8VLcHxMMXR9ACKx4IICJIcaeTuJxaAACnMTijz22ewScFVdyoi2CDRkZMNRoy5dFh3Cjv4',
      // Istanbul instrumentation for e2e code coverage (see vite.config.js / fixtures.ts).
      E2E_COVERAGE: process.env.E2E_COVERAGE ?? 'false',
      // Ensure the server is aware of the base URL
      BASE_URL: process.env.BASE_URL ?? 'http://localhost:5173',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // The most important flows again on a phone-sized screen (most members use the PWA on
      // iPhones). Chromium with the iPhone viewport/touch — no extra browser download needed.
      name: 'mobile',
      grep: /@mobile/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: devices['iPhone 13'].viewport,
        deviceScaleFactor: devices['iPhone 13'].deviceScaleFactor,
        isMobile: true,
        hasTouch: true,
        userAgent: devices['iPhone 13'].userAgent,
      },
    },
  ],
});
