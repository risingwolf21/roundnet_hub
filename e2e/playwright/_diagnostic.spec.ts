import { test, expect } from '@playwright/test';

// TEMPORARY diagnostic: why does #email never render on /auth/login in CI?
// Captures console output, page errors, and the rendered DOM. Always passes (logs only).
test('diagnose /auth/login render', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (m) => logs.push(`CONSOLE ${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`PAGEERROR: ${e.message}\n${e.stack ?? ''}`));
  page.on('requestfailed', (r) => logs.push(`REQFAILED: ${r.url()} ${r.failure()?.errorText ?? ''}`));

  await page.goto('/auth/login', { waitUntil: 'load' });
  await page.waitForTimeout(6000);

  const root = await page.locator('#root').innerHTML().catch(() => '<no #root>');
  const emailCount = await page.locator('#email').count();
  const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 800);

  console.log('===DIAG URL===', page.url());
  console.log('===DIAG TITLE===', await page.title());
  console.log('===DIAG #email count===', emailCount);
  console.log('===DIAG body text (0..800)===\n' + bodyText);
  console.log('===DIAG #root html (0..1500)===\n' + root.slice(0, 1500));
  console.log('===DIAG browser logs===\n' + logs.join('\n'));

  expect(true).toBe(true);
});
