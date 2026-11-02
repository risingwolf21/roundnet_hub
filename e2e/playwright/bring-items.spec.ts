import { randomUUID } from 'node:crypto';
import { Page } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantGroup, grantUser, logPageOnFailure, signIn } from './helpers';

// Bring list ("Mitbringen"): an editor adds items to an event, members pledge quantities,
// see each other's pledges, withdraw, and the editor removes an item again.
const stamp = Date.now();
const GROUP = randomUUID();
const EVENT = randomUUID();
const TITLE = `E2E Mitbringen ${stamp}`;
const ITEM = `Bälle ${stamp}`;
const EDITOR = { email: `e2e_bi_editor_${stamp}@test.com`, name: `E2E Mitbring Editor ${stamp}` };
const MEMBER = { email: `e2e_bi_member_${stamp}@test.com`, name: `E2E Mitbringer ${stamp}` };

let admin: SupabaseClient;
const ids: Record<string, string> = {};

const items = async () => {
  const { data } = await admin.from('event_bring_items').select('id, name, required_qty').eq('event', EVENT);
  return (data ?? []) as { id: string; name: string; required_qty: number }[];
};
const pledgeOf = async (userId: string) => {
  const { data } = await admin.from('event_bring_pledges').select('qty').eq('event', EVENT).eq('user', userId);
  return ((data ?? []) as { qty: number }[]).reduce((s, p) => s + Number(p.qty), 0);
};

async function openEditSingle(page: Page) {
  await page.goto(`/training/event/${EVENT}`);
  await page.locator('button:has(svg.lucide-ellipsis-vertical)').click();
  await page.getByRole('menuitem', { name: 'Event bearbeiten' }).click();
  await page.getByText('Nur dieses Event aktualisieren').click();
  await expect(page.getByText('Event bearbeiten')).toBeVisible();
}

/** The "Gegenstände mitbringen" row's edit (pencil) button inside the event dialog. */
const bringItemsButton = (page: Page) =>
  page.getByRole('dialog').locator('[data-slot="field"]', { hasText: 'Gegenstände mitbringen' }).locator('button:has(svg.lucide-pencil)');

async function pledge(page: Page, qty: number) {
  await page.goto(`/training/event/${EVENT}`);
  await page.locator('button:has(svg.lucide-shopping-bag)').click();
  const row = page.locator('div.px-4.py-3', { has: page.getByText(ITEM, { exact: true }) });
  await row.locator('input[type="number"]').fill(String(qty));
  await page.getByRole('button', { name: 'Zusagen speichern' }).click();
  await expect(page.getByText('Zusagen gespeichert')).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test.describe('Mitbringliste', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ EDITOR, MEMBER })) ids[k] = await ensureUser(admin, u.email, u.name);
    await admin.from('event_group').upsert({ id: GROUP, name: `E2E Mitbring Gruppe ${stamp}`, visible: false }).throwOnError();
    await grantGroup(admin, GROUP, { feats: ['events', 'items'], perms: ['event.signup'] });
    await grantUser(admin, ids.EDITOR, { perms: ['event.edit'] });
    await admin.from('group_user_mapping').upsert([
      { user: ids.EDITOR, group: GROUP, role: 'admin' },
      { user: ids.MEMBER, group: GROUP, role: 'user' },
    ]).throwOnError();
    const now = Date.now();
    await admin.from('events').insert({
      id: EVENT, title: TITLE, description: '—', group: GROUP,
      startingDateTime: new Date(now + 5 * 864e5).toISOString(),
      endDateTime: new Date(now + 5 * 864e5 + 2 * 36e5).toISOString(),
    }).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('an editor adds an item to bring and sets the needed key', { annotation: flow('items.add', 'items.required') }, async ({ page }) => {
    await signIn(page, EDITOR.email);
    await openEditSingle(page);

    // "Benötigter Gegenstand" (feature `items`): which key/room is needed for this training.
    // force: the switch sits in a <label> whose first control (the select) is disabled until it's on.
    const requiredSwitch = page.getByRole('dialog').locator('[data-slot="field"]', { hasText: 'Benötigter Gegenstand' }).first().getByRole('switch');
    await requiredSwitch.click({ force: true });
    await expect(requiredSwitch).toHaveAttribute('aria-checked', 'true');

    await bringItemsButton(page).click();
    await page.getByRole('button', { name: 'Hinzufügen' }).click();
    await page.getByPlaceholder('Gegenstand').fill(ITEM);
    await page.getByPlaceholder('Anzahl').fill('3');
    await page.keyboard.press('Escape'); // closing the drawer hands the list back to the form
    await expect(page.getByText(`3x ${ITEM}`)).toBeVisible();

    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Event wurde gespeichert')).toBeVisible();
    await expect.poll(async () => (await items()).map((i) => [i.name, Number(i.required_qty)])).toEqual([[ITEM, 3]]);
    const { data: ev } = await admin.from('events').select('required_item').eq('id', EVENT).single();
    expect((ev as { required_item: string | null }).required_item).toBe('mtvGym');
  });

  test('a member pledges, others see the pledge, and it can be withdrawn @mobile',
    { annotation: flow('items.pledge', 'items.unpledge') }, async ({ page }) => {
      // The mobile project runs this test alone, without the editor test before it.
      if ((await items()).length === 0) {
        await admin.from('event_bring_items').insert({ event: EVENT, name: ITEM, required_qty: 3, unit: 'Stk.' }).throwOnError();
        // Pledging is only allowed (RLS) once the event has items enabled — the dialog sets this.
        await admin.from('events').update({ items_enabled: true }).eq('id', EVENT).throwOnError();
      }
      await signIn(page, MEMBER.email);
      await pledge(page, 2);
      await expect.poll(() => pledgeOf(ids.MEMBER)).toBe(2);
      await expect(page.getByText(`2 von 3`)).toBeVisible();
      // Reopening shows my own pledge (regression: the items query overwrote the pledges cache → 0).
      await page.reload();
      await page.locator('button:has(svg.lucide-shopping-bag)').click();
      await expect(page.locator('div.px-4.py-3', { has: page.getByText(ITEM, { exact: true }) }).locator('input[type="number"]')).toHaveValue('2');

      // The editor sees who brings what.
      await signIn(page, EDITOR.email);
      await page.goto(`/training/event/${EVENT}`);
      await page.locator('button:has(svg.lucide-shopping-bag)').click();
      await expect(page.getByText(`${MEMBER.name}: 2`)).toBeVisible();

      // Withdraw.
      await signIn(page, MEMBER.email);
      await pledge(page, 0);
      await expect.poll(() => pledgeOf(ids.MEMBER)).toBe(0);
    });

  test('an editor removes the item again', { annotation: flow('items.remove') }, async ({ page }) => {
    await signIn(page, EDITOR.email);
    await openEditSingle(page);
    await bringItemsButton(page).click();
    await page.getByRole('dialog', { name: 'Gegenstände mitbringen' }).locator('button:has(svg.lucide-trash-2)').click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Event wurde gespeichert')).toBeVisible();
    await expect.poll(async () => (await items()).length).toBe(0);
  });

  test.afterAll(async () => {
    try {
      await admin.from('event_bring_pledges').delete().eq('event', EVENT);
      await admin.from('event_bring_items').delete().eq('event', EVENT);
      await admin.from('events').delete().eq('id', EVENT);
      await admin.from('group_user_mapping').delete().eq('group', GROUP);
      await admin.from('group_features').delete().eq('group', GROUP);
      await admin.from('group_permissions').delete().eq('group', GROUP);
      await admin.from('event_group').delete().eq('id', GROUP);
      for (const id of Object.values(ids)) {
        await admin.from('user_direct_grants').delete().eq('user', id);
        await admin.auth.admin.deleteUser(id);
      }
    } catch {
      // best-effort
    }
  });
});
