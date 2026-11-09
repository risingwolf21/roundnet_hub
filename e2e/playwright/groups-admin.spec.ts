import { Page } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantUser, logPageOnFailure, signIn } from './helpers';

// Group administration: create, edit, add members, change roles, accept/decline requests, remove.
const stamp = Date.now();
const NAME = `E2E Verwaltete Gruppe ${stamp}`;
const NAME_EDITED = `E2E Umbenannte Gruppe ${stamp}`;
const OWNER = { email: `e2e_ga_owner_${stamp}@test.com`, name: `E2E Gruppenchefin ${stamp}` };
const NEWBIE = { email: `e2e_ga_new_${stamp}@test.com`, name: `E2E Neuling ${stamp}` };
const ASKER = { email: `e2e_ga_ask_${stamp}@test.com`, name: `E2E Anfragerin ${stamp}` };
const DECLINED = { email: `e2e_ga_decl_${stamp}@test.com`, name: `E2E Abgelehnter ${stamp}` };

let admin: SupabaseClient;
const ids: Record<string, string> = {};
let groupId = '';

const roleOf = async (userId: string) => {
  const { data } = await admin.from('group_user_mapping').select('role').eq('group', groupId).eq('user', userId).maybeSingle();
  return (data as { role?: string } | null)?.role ?? null;
};

/** A member's row on the group page (rows carry no test ids — find the innermost one with the name). */
const memberRow = (page: Page, name: string) =>
  page.locator('[data-slot="item"]', { has: page.getByText(name, { exact: true }) }).last();

test.describe.configure({ mode: 'serial' });

test.describe('Gruppenverwaltung', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ OWNER, NEWBIE, ASKER, DECLINED })) ids[k] = await ensureUser(admin, u.email, u.name);
    await grantUser(admin, ids.OWNER, { perms: ['groups.manage.admin'] });
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a group manager creates a group and becomes its admin', { annotation: flow('groups.create') }, async ({ page }) => {
    await signIn(page, OWNER.email);
    await page.goto('/groups/list');
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await page.getByPlaceholder('Name').fill(NAME);
    await page.getByPlaceholder('Beschreibung').fill('Gruppe aus dem E2E-Test');
    await page.getByRole('button', { name: 'Gruppe erstellen' }).click();

    await expect.poll(async () => {
      const { data } = await admin.from('event_group').select('id').eq('name', NAME);
      groupId = (data?.[0] as { id: string } | undefined)?.id ?? '';
      return groupId;
    }).not.toBe('');
    await expect.poll(() => roleOf(ids.OWNER)).toBe('admin');
  });

  test('the admin renames the group', { annotation: flow('groups.edit') }, async ({ page }) => {
    await signIn(page, OWNER.email);
    await page.goto(`/groups/${groupId}`);
    await page.locator('button:has(svg.lucide-pencil)').first().click();
    await page.getByPlaceholder('Name').fill(NAME_EDITED);
    await page.getByRole('button', { name: 'Gruppe speichern' }).click();

    await expect(page.getByText('Gruppe wurde erfolgreich bearbeitet.')).toBeVisible();
    await expect.poll(async () => (await admin.from('event_group').select('name').eq('id', groupId).single()).data?.name).toBe(NAME_EDITED);
  });

  test('the admin adds a member', { annotation: flow('groups.addusers') }, async ({ page }) => {
    await signIn(page, OWNER.email);
    await page.goto(`/groups/${groupId}`);
    await page.locator('div.fixed.right-6 button').click();
    await page.getByRole('dialog').getByRole('searchbox').fill(NEWBIE.name.split(' ').slice(0, 2).join(' '));
    await page.getByRole('dialog').getByText(NEWBIE.name, { exact: true }).click();
    await page.getByRole('button', { name: '1 Spieler hinzufügen' }).click();

    await expect.poll(() => roleOf(ids.NEWBIE)).toBe('user');
    await expect(memberRow(page, NEWBIE.name)).toBeVisible();
  });

  test('the admin promotes a member to admin and back', { annotation: flow('groups.role') }, async ({ page }) => {
    await signIn(page, OWNER.email);
    await page.goto(`/groups/${groupId}`);
    await memberRow(page, NEWBIE.name).getByRole('button', { name: `Aktionen für ${NEWBIE.name}` }).click();
    await page.getByRole('menuitem', { name: 'Zum Admin machen' }).click();
    await page.getByRole('button', { name: 'Bestätigen' }).click();
    await expect.poll(() => roleOf(ids.NEWBIE)).toBe('admin');

    // Admins can be demoted back to a regular member.
    await page.reload();
    await memberRow(page, NEWBIE.name).getByRole('button', { name: `Aktionen für ${NEWBIE.name}` }).click();
    await page.getByRole('menuitem', { name: 'Admin-Rolle entfernen' }).click();
    await page.getByRole('button', { name: 'Bestätigen' }).click();
    await expect.poll(() => roleOf(ids.NEWBIE)).toBe('user');
  });

  test('the admin accepts one join request and declines another', { annotation: flow('groups.accept', 'groups.decline') }, async ({ page }) => {
    await admin.from('group_user_mapping').insert([
      { user: ids.ASKER, group: groupId, role: 'joinRequested' },
      { user: ids.DECLINED, group: groupId, role: 'joinRequested' },
    ]).throwOnError();
    await signIn(page, OWNER.email);
    await page.goto(`/groups/${groupId}`);
    // Join requests are listed under their own filter.
    await page.getByRole('radio', { name: /^Anfragen/ }).click();

    await memberRow(page, ASKER.name).getByRole('button', { name: 'Bearbeiten' }).click();
    await page.getByRole('menuitem', { name: 'Akzeptieren' }).click();
    await page.getByRole('button', { name: 'Akzeptieren' }).click();
    await expect.poll(() => roleOf(ids.ASKER)).toBe('user');

    await memberRow(page, DECLINED.name).getByRole('button', { name: 'Bearbeiten' }).click();
    await page.getByRole('menuitem', { name: 'Ablehnen' }).click();
    await page.getByRole('button', { name: 'Ablehnen' }).click();
    await expect.poll(() => roleOf(ids.DECLINED)).toBeNull();
  });

  test('the admin removes a member', { annotation: flow('groups.remove') }, async ({ page }) => {
    await signIn(page, OWNER.email);
    await page.goto(`/groups/${groupId}`);
    // "Auswählen" starts the selection; a removal bar appears for the selected rows.
    await page.getByRole('button', { name: 'Auswählen' }).click();
    await memberRow(page, ASKER.name).click();
    await page.getByRole('button', { name: 'Entfernen' }).click();
    await page.getByRole('button', { name: 'Entfernen' }).last().click();
    await expect.poll(() => roleOf(ids.ASKER)).toBeNull();
  });

  test.afterAll(async () => {
    try {
      if (groupId) {
        await admin.from('group_user_mapping').delete().eq('group', groupId);
        await admin.from('event_group').delete().eq('id', groupId);
      }
      for (const id of Object.values(ids)) {
        await admin.from('user_direct_grants').delete().eq('user', id);
        await admin.auth.admin.deleteUser(id);
      }
    } catch {
      // best-effort
    }
  });
});
