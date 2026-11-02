import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Every spec imports `test` from here instead of '@playwright/test'.
 *
 * With E2E_COVERAGE=true the dev server is Istanbul-instrumented (vite.config.js), so each page
 * exposes `window.__coverage__`. After every test we dump it to .nyc_output/, and
 * `nyc report` (playwright.yml) merges all dumps into coverage/coverage-summary.json, which
 * scripts/e2e-report.mjs turns into the README table.
 */
const COVERAGE = process.env.E2E_COVERAGE === 'true';
const OUT_DIR = path.join(process.cwd(), '.nyc_output');

export const test = base.extend<{ collectCoverage: void }>({
  collectCoverage: [
    async ({ context }, use) => {
      if (!COVERAGE) return use();
      mkdirSync(OUT_DIR, { recursive: true });
      const save = (json: string | undefined) => {
        if (json) writeFileSync(path.join(OUT_DIR, `${randomUUID()}.json`), json);
      };
      // A full navigation (page.goto) throws the old window away — flush its counters first.
      await context.exposeFunction('__e2eSaveCoverage', save);
      await context.addInitScript(() =>
        window.addEventListener('beforeunload', () => {
          const w = window as unknown as { __coverage__?: unknown; __e2eSaveCoverage?: (j: string) => void };
          if (w.__coverage__) w.__e2eSaveCoverage?.(JSON.stringify(w.__coverage__));
        }),
      );
      await use();
      for (const page of context.pages()) {
        save(await page.evaluate(() => {
          const c = (window as unknown as { __coverage__?: unknown }).__coverage__;
          return c ? JSON.stringify(c) : undefined;
        }).catch(() => undefined));
      }
    },
    { auto: true },
  ],
});

/** Annotation linking a test to a flow id in e2e/coverage-manifest.json. */
export const flow = (...ids: string[]) => ids.map((description) => ({ type: 'flow', description }));

export { expect };
