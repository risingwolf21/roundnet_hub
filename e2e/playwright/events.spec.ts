import { randomUUID } from 'node:crypto';
import { Page } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantGroup, grantUser, logPageOnFailure, signIn } from './helpers';

// Event management through the UI: create (single + weekly series), view, edit (this event /
// this and all following), cancel, delete, and the recurring-events page.
const stamp = Date.now();
const GROUP = randomUUID(); // per worker: desktop and mobile projects run in parallel
const GROUP_NAME = `E2E Events Group ${stamp}`;
const EMAIL = `e2e_events_editor_${stamp}@test.com`;
const SINGLE = `E2E Einzeltraining ${stamp}`;
const SINGLE_EDITED = `E2E Einzeltraining bearbeitet ${stamp}`;
const SERIES = `E2E Serie ${stamp}`;
const SERIES_EDITED = `E2E Serie neu ${stamp}`;

let admin: SupabaseClient;
let userId = '';

const eventsTitled = async (title: string) => {
  const { data } = await admin.from('events').select('id, title, isCancelled, detached, series_id, startingDateTime')
    .eq('group', GROUP).eq('title', title).order('startingDateTime');
  return (data ?? []) as { id: string; title: string; isCancelled: boolean; detached: boolean; series_id: string | null; startingDateTime: string }[];
};

/** Fill title/description/group in the open "Event erstellen" dialog. */
async function fillBasics(page: Page, title: string) {
  await page.locator('#event-title').fill(title);
  await page.locator('#event-description').fill('Angelegt vom E2E-Test');
  await page.getByText('Keine Gruppe gewählt').click();
  await page.getByText(GROUP_NAME, { exact: true }).click();
  await expect(page.getByText('Keine Gruppe gewählt')).toHaveCount(0);
}

async function openCreateDialog(page: Page) {
  await page.goto('/training/list');
  await page.locator('button:has(svg.lucide-plus)').click();
  await expect(page.getByRole('heading', { name: 'Event erstellen' })).toBeVisible();
}

async function openEventMenu(page: Page, eventId: string) {
  await page.goto(`/training/event/${eventId}`);
  await page.locator('button:has(svg.lucide-ellipsis-vertical)').click();
}

test.describe.configure({ mode: 'serial' });

test.describe('Events verwalten', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    userId = await ensureUser(admin, EMAIL, `E2E Event Editor ${stamp}`);
    await admin.from('event_group')
      .upsert({ id: GROUP, name: GROUP_NAME, visible: true, is_public: true, need_request_to_join: false })
      .throwOnError();
    await grantGroup(admin, GROUP, { feats: ['events'], perms: ['event.signup'] });
    await grantUser(admin, userId, { perms: ['event.edit', 'event.cancel', 'event.delete'] });
    await admin.from('group_user_mapping').upsert({ user: userId, group: GROUP, role: 'admin' }).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('an editor creates a single event @mobile', { annotation: flow('events.create') }, async ({ page }, testInfo) => {
    const title = testInfo.project.name === 'mobile' ? `${SINGLE} mobil` : SINGLE;
    await signIn(page, EMAIL);
    await openCreateDialog(page);
    await fillBasics(page, title);
    await page.getByRole('button', { name: 'Event erstellen' }).click();

    await expect(page.getByText('Event wurde erstellt')).toBeVisible();
    await expect.poll(async () => (await eventsTitled(title)).length).toBe(1);
    // …and it shows up in the list.
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  });

  test('the event page shows its details', { annotation: flow('events.details') }, async ({ page }) => {
    const [ev] = await eventsTitled(SINGLE);
    await signIn(page, EMAIL);
    await page.goto(`/training/event/${ev.id}`);
    await expect(page.getByText(SINGLE, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Angelegt vom E2E-Test').first()).toBeVisible();
  });

  test('an editor changes only this event', { annotation: flow('events.edit.single') }, async ({ page }) => {
    const [ev] = await eventsTitled(SINGLE);
    await signIn(page, EMAIL);
    await openEventMenu(page, ev.id);
    await page.getByRole('menuitem', { name: 'Event bearbeiten' }).click();
    await page.getByText('Nur dieses Event aktualisieren').click();
    await page.locator('#event-title').fill(SINGLE_EDITED);
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByText('Event wurde gespeichert')).toBeVisible();
    await expect.poll(async () => (await eventsTitled(SINGLE_EDITED)).map((e) => e.id)).toEqual([ev.id]);
  });

  test('an editor cancels the event and lets it take place again', { annotation: flow('events.cancel') }, async ({ page }) => {
    const [ev] = await eventsTitled(SINGLE_EDITED);
    await signIn(page, EMAIL);
    await openEventMenu(page, ev.id);
    await page.getByRole('menuitem', { name: 'Absagen' }).click();
    await page.getByRole('button', { name: 'Bestätigen' }).click();

    await expect(page.getByText('abgesagt').first()).toBeVisible();
    await expect.poll(async () => (await eventsTitled(SINGLE_EDITED))[0]?.isCancelled).toBe(true);

    await page.locator('button:has(svg.lucide-ellipsis-vertical)').click();
    await page.getByRole('menuitem', { name: 'Stattfinden' }).click();
    await page.getByRole('button', { name: 'Bestätigen' }).click();
    await expect.poll(async () => (await eventsTitled(SINGLE_EDITED))[0]?.isCancelled).toBe(false);
  });

  test('an editor deletes the event', { annotation: flow('events.delete') }, async ({ page }) => {
    const [ev] = await eventsTitled(SINGLE_EDITED);
    await signIn(page, EMAIL);
    await openEventMenu(page, ev.id);
    await page.getByRole('menuitem', { name: 'Löschen' }).click();
    await page.getByText('Nur dieses Event', { exact: true }).click();

    await expect(page).toHaveURL(/\/training\/list/);
    await expect.poll(async () => (await eventsTitled(SINGLE_EDITED)).length).toBe(0);
  });

  test('an editor creates a weekly series', { annotation: flow('events.create.recurring') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await openCreateDialog(page);
    await fillBasics(page, SERIES);
    const weekly = page.getByRole('dialog').getByRole('radio', { name: 'Wöchentlich' });
    await weekly.click();
    await expect(weekly).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: 'Event erstellen' }).click();

    await expect(page.getByText('Serie wurde erstellt')).toBeVisible();
    // The expander materialises the next weeks (60-day horizon) — all linked to one series.
    await expect.poll(async () => (await eventsTitled(SERIES)).length).toBeGreaterThanOrEqual(4);
    const occurrences = await eventsTitled(SERIES);
    expect(new Set(occurrences.map((o) => o.series_id)).size).toBe(1);
    const gaps = occurrences.slice(1).map((o, i) =>
      Math.round((+new Date(o.startingDateTime) - +new Date(occurrences[i].startingDateTime)) / 864e5));
    expect(gaps.every((d) => d === 7)).toBe(true);
  });

  test('the recurring-events page lists the series and regenerates occurrences',
    { annotation: flow('events.recurring.list', 'events.recurring.generate') }, async ({ page }) => {
      const before = (await eventsTitled(SERIES)).length;
      await signIn(page, EMAIL);
      await page.goto('/training/list');
      await page.locator('button:has(svg.lucide-calendar-sync)').click();
      await expect(page).toHaveURL(/recurringEvents/);
      await expect(page.getByText(SERIES, { exact: true }).first()).toBeVisible();

      await page.getByRole('button', { name: 'Erstellen' }).click();
      await expect(page.getByText(/Serie\(n\) aktualisiert/).first()).toBeVisible();
      // Idempotent: regenerating must not duplicate occurrences.
      expect((await eventsTitled(SERIES)).length).toBe(before);
    });

  test('an editor changes this and all following events of the series', { annotation: flow('events.edit.series') }, async ({ page }) => {
    const occurrences = await eventsTitled(SERIES);
    await signIn(page, EMAIL);
    await openEventMenu(page, occurrences[0].id);
    await page.getByRole('menuitem', { name: 'Event bearbeiten' }).click();
    await page.getByText('Dieses und alle folgenden Events aktualisieren').click();
    await page.locator('#event-title').fill(SERIES_EDITED);
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByText('Events wurden gespeichert')).toBeVisible();
    // Updated in place: same occurrence ids (attendance etc. survive), new title.
    await expect.poll(async () => (await eventsTitled(SERIES_EDITED)).length).toBe(occurrences.length);
    expect((await eventsTitled(SERIES_EDITED)).map((e) => e.id).sort()).toEqual(occurrences.map((e) => e.id).sort());
  });

  test.afterAll(async () => {
    try {
      await admin.from('events').delete().eq('group', GROUP);
      await admin.from('event_series').delete().eq('group', GROUP);
      await admin.from('group_user_mapping').delete().eq('group', GROUP);
      await admin.from('group_features').delete().eq('group', GROUP);
      await admin.from('group_permissions').delete().eq('group', GROUP);
      await admin.from('event_group').delete().eq('id', GROUP);
      await admin.from('user_direct_grants').delete().eq('user', userId);
      if (userId) await admin.auth.admin.deleteUser(userId);
    } catch {
      // best-effort
    }
  });
});
