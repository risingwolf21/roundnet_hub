import { test, expect } from '@playwright/test';

// Simple smoke test: open homepage and check the title contains "Roundnet"
test('homepage has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Roundnet/i);
});
