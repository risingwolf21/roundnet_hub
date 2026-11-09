import { randomUUID } from 'node:crypto';
import { Page } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantGroup, grantUser, logPageOnFailure, signIn } from './helpers';

// More event management: form validation, fortnightly and monthly series, and ending a series
// from one occurrence on ("Dieses und alle folgenden Events löschen").
const stamp = Date.now();
const GROUP = randomUUID();
const GROUP_NAME = `E2E Events+ Gruppe ${stamp}`;
const EMAIL = `e2e_evmore_${stamp}@test.com`;
const BI = `E2E Zweiwöchig ${stamp}`;
const MONTHLY = `E2E Monatlich ${stamp}`;
const WEEKLY = `E2E Endet bald ${stamp}`;

let admin: SupabaseClient;
let userId = '';

const occurrences = async (title: string) => {
  const { data } = await admin.from('events').select('id, startingDateTime, isCancelled')
    .eq('group', GROUP).eq('title', title).order('startingDateTime');
  return (data ?? []) as { id: string; startingDateTime: string; isCancelled: boolean }[];
};
const gapsInDays = (rows: { startingDateTime: string }[]) =>
  rows.slice(1).map((r, i) => Math.round((+new Date(r.startingDateTime) - +new Date(rows[i].startingDateTime)) / 864e5));

async function openCreate(page: Page) {
  await page.goto('/training/list');
  await page.locator('button:has(svg.lucide-plus)').click();
  await expect(page.getByRole('heading', { name: 'Event erstellen' })).toBeVisible();
}

async function createSeries(page: Page, title: string, recurrence: string) {
  await openCreate(page);
  await page.locator('#event-title').fill(title);
  await page.locator('#event-description').fill('Serie aus dem E2E-Test');
  await page.getByText('Keine Gruppe gewählt').click();
  await page.getByText(GROUP_NAME, { exact: true }).click();
  await page.getByRole('dialog').getByRole('radio', { name: recurrence }).click();
  await page.getByRole('button', { name: 'Event erstellen' }).click();
  await expect(page.getByText('Serie wurde erstellt')).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test.describe('Events – Prüfungen & Serien', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    userId = await ensureUser(admin, EMAIL, `E2E Serienplaner ${stamp}`);
    await admin.from('event_group').upsert({ id: GROUP, name: GROUP_NAME, visible: false }).throwOnError();
    await grantGroup(admin, GROUP, { feats: ['events'], perms: ['event.signup'] });
    await grantUser(admin, userId, { perms: ['event.edit', 'event.delete'] });
    await admin.from('group_user_mapping').upsert({ user: userId, group: GROUP, role: 'admin' }).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('the event form refuses incomplete events', { annotation: flow('events.validation') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await openCreate(page);
    const save = page.getByRole('button', { name: 'Event erstellen' });
    const toast = (text: string) => page.locator('[data-sonner-toast]', { hasText: text });

    await save.click();
    const noGroup = toast('Es ist keine Gruppe für dieses Event ausgewählt!');
    await expect(noGroup).toBeVisible();
    await expect(page.locator('#event-title')).toHaveAttribute('aria-invalid', 'true');
    // The error toast sits over the save button until it fades out.
    await expect(noGroup).toBeHidden({ timeout: 15_000 });

    await page.getByText('Keine Gruppe gewählt').click();
    await page.getByText(GROUP_NAME, { exact: true }).click();
    await page.locator('#event-title').fill('Kurz');
    await save.click();
    const tooShort = toast('Der Titel des Events muss aus mindestens 6 Zeichen bestehen');
    await expect(tooShort).toBeVisible();
    await expect(tooShort).toBeHidden({ timeout: 15_000 });

    await page.locator('#event-title').fill(`E2E Ohne Beschreibung ${stamp}`);
    await save.click();
    await expect(toast('Die Beschreibung des Events darf nicht leer sein')).toBeVisible();
    await expect(page.locator('#event-description')).toHaveAttribute('aria-invalid', 'true');

    // Nothing was stored, and the dialog is still open.
    await expect(page.getByRole('heading', { name: 'Event erstellen' })).toBeVisible();
    const { data } = await admin.from('events').select('id').eq('group', GROUP);
    expect(data ?? []).toEqual([]);
  });

  test('a fortnightly series has occurrences 14 days apart', { annotation: flow('events.create.recurring') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await createSeries(page, BI, 'Alle 2 Wochen');
    await expect.poll(async () => (await occurrences(BI)).length).toBeGreaterThanOrEqual(3);
    expect(new Set(gapsInDays(await occurrences(BI)))).toEqual(new Set([14]));
  });

  test('a monthly series has one occurrence per month', { annotation: flow('events.create.recurring') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await createSeries(page, MONTHLY, 'Monatlich');
    // The expander looks 60 days ahead, so a monthly series created today has 1–2 occurrences:
    // check the stored rule and that occurrences fall on the series' day of month.
    await expect.poll(async () => (await occurrences(MONTHLY)).length).toBeGreaterThanOrEqual(1);
    const { data: series } = await admin.from('event_series').select('rrule, dtstart').eq('group', GROUP).eq('title', MONTHLY).single();
    const { rrule, dtstart } = series as { rrule: string; dtstart: string };
    expect(rrule).toContain('FREQ=MONTHLY');
    for (const o of await occurrences(MONTHLY)) {
      expect(new Date(o.startingDateTime).getDate()).toBe(new Date(dtstart).getDate());
    }
    for (const gap of gapsInDays(await occurrences(MONTHLY))) expect(gap).toBeGreaterThanOrEqual(28);
  });

  test('deleting "this and all following" ends the series from that occurrence', { annotation: flow('events.delete.series') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await createSeries(page, WEEKLY, 'Wöchentlich');
    await expect.poll(async () => (await occurrences(WEEKLY)).length).toBeGreaterThanOrEqual(4);
    const before = await occurrences(WEEKLY);

    await page.goto(`/training/event/${before[1].id}`);
    await page.locator('button:has(svg.lucide-ellipsis-vertical)').click();
    await page.getByRole('menuitem', { name: 'Löschen' }).click();
    await page.getByText('Dieses und alle folgenden Events löschen').click();
    await expect(page).toHaveURL(/\/training\/list/);

    // Only the first occurrence is left as a real (not cancelled) training.
    await expect.poll(async () => (await occurrences(WEEKLY)).filter((o) => !o.isCancelled).map((o) => o.id))
      .toEqual([before[0].id]);
  });

  test('an event gets a location picked on the map', { annotation: flow('events.place') }, async ({ page }) => {
    // External parts stubbed: OSM map tiles (empty) and Nominatim reverse geocoding (fixed answer).
    await page.route('**/*.tile.openstreetmap.org/**', (route) => route.fulfill({ status: 204, body: '' }));
    await page.route('https://nominatim.openstreetmap.org/**', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ name: 'E2E Sporthalle', address: { road: 'Teststraße', house_number: '1', postcode: '76131', city: 'Karlsruhe' } }),
    }));
    const title = `E2E Mit Ort ${stamp}`;
    await signIn(page, EMAIL);
    await openCreate(page);
    await page.locator('#event-title').fill(title);
    await page.locator('#event-description').fill('Training mit Ort');
    await page.getByText('Keine Gruppe gewählt').click();
    await page.getByText(GROUP_NAME, { exact: true }).click();

    await page.getByRole('dialog').locator('button:has(svg.lucide-map)').click();
    await page.locator('.leaflet-container').last().click({ position: { x: 200, y: 200 } });
    const mapDialog = page.getByRole('dialog').last();
    await expect(mapDialog.getByPlaceholder('Name')).toHaveValue('E2E Sporthalle');
    await expect(mapDialog.getByPlaceholder('Beschreibung')).toHaveValue('Teststraße 1, 76131 Karlsruhe');
    await mapDialog.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByRole('dialog').getByText('E2E Sporthalle')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Speichern' })).toHaveCount(0); // map dialog closed
    await page.getByRole('button', { name: 'Event erstellen' }).click();

    await expect(page.getByText('Event wurde erstellt')).toBeVisible();
    await expect.poll(async () => {
      const { data } = await admin.from('events').select('place').eq('group', GROUP).eq('title', title).maybeSingle();
      const place = (data as { place: string | null } | null)?.place;
      return place ? JSON.parse(place).name : null;
    }).toBe('E2E Sporthalle');
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
