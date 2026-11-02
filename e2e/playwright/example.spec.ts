import { test, expect, flow } from './fixtures';

// Simple smoke test: open homepage and check the title contains "Roundnet"
test('homepage has title', { annotation: flow('misc.title') }, async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Roundnet/i);
});
