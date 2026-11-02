import { randomUUID } from 'node:crypto';
import { Page } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantGroup, grantUser, logPageOnFailure, signIn } from './helpers';

// Event comments: write, reply, and when sending is not allowed (no event.comment / past event).
const stamp = Date.now();
const GROUP = randomUUID();
const EVENT = randomUUID();
const PAST_EVENT = randomUUID();
const WRITER = { email: `e2e_cm_writer_${stamp}@test.com`, name: `E2E Kommentator ${stamp}` };
const REPLIER = { email: `e2e_cm_reply_${stamp}@test.com`, name: `E2E Antworter ${stamp}` };
const SILENT = { email: `e2e_cm_silent_${stamp}@test.com`, name: `E2E Stumm ${stamp}` };
const COMMENT = `Wer bringt das Netz mit? ${stamp}`;
const REPLY = `Ich bringe es mit! ${stamp}`;

let admin: SupabaseClient;
const ids: Record<string, string> = {};

const comments = async () => {
  const { data } = await admin.from('event_comments').select('id, comment, user, reply_to').eq('event', EVENT).order('created_at');
  return (data ?? []) as { id: string; comment: string; user: string; reply_to: string | null }[];
};

async function openComments(page: Page, eventId = EVENT) {
  await page.goto(`/training/event/${eventId}`);
  await page.getByRole('tab', { name: /Kommentare/ }).click();
}

test.describe.configure({ mode: 'serial' });

test.describe('Kommentare', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ WRITER, REPLIER, SILENT })) ids[k] = await ensureUser(admin, u.email, u.name);
    await admin.from('event_group').upsert({ id: GROUP, name: `E2E Kommentar Gruppe ${stamp}`, visible: false }).throwOnError();
    await grantGroup(admin, GROUP, { feats: ['events'], perms: ['event.signup'] });
    for (const k of ['WRITER', 'REPLIER']) await grantUser(admin, ids[k], { perms: ['event.comment'] });
    await admin.from('group_user_mapping').upsert(Object.values(ids).map((user) => ({ user, group: GROUP, role: 'user' }))).throwOnError();
    const now = Date.now();
    await admin.from('events').insert([
      { id: EVENT, title: `E2E Kommentare ${stamp}`, description: '—', group: GROUP,
        startingDateTime: new Date(now + 2 * 864e5).toISOString(), endDateTime: new Date(now + 2 * 864e5 + 36e5).toISOString() },
      { id: PAST_EVENT, title: `E2E Vergangen ${stamp}`, description: '—', group: GROUP,
        startingDateTime: new Date(now - 2 * 864e5).toISOString(), endDateTime: new Date(now - 2 * 864e5 + 36e5).toISOString() },
    ]).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a member writes a comment @mobile', { annotation: flow('comments.create') }, async ({ page }, testInfo) => {
    const text = testInfo.project.name === 'mobile' ? `${COMMENT} (mobil)` : COMMENT;
    await signIn(page, WRITER.email);
    await openComments(page);
    await expect(page.getByText('Noch keine Kommentare.')).toBeVisible();
    await page.getByPlaceholder('Kommentar schreiben...').fill(text);
    await page.getByRole('button', { name: 'Senden' }).click();

    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expect.poll(async () => (await comments()).filter((c) => c.comment === text && c.user === ids.WRITER).length).toBe(1);
  });

  test('another member replies to it', { annotation: flow('comments.reply') }, async ({ page }) => {
    const [parent] = (await comments()).filter((c) => c.comment === COMMENT);
    await signIn(page, REPLIER.email);
    await openComments(page);
    await page.getByRole('button', { name: 'Antworten' }).first().click();
    await expect(page.getByText(/Antworte auf @/)).toBeVisible();
    await page.getByPlaceholder('Kommentar schreiben...').fill(REPLY);
    await page.getByRole('button', { name: 'Senden' }).click();

    await expect(page.getByText(REPLY, { exact: true })).toBeVisible();
    await expect.poll(async () => (await comments()).find((c) => c.comment === REPLY)?.reply_to).toBe(parent.id);
    // The tab counts comments including replies.
    await expect(page.getByRole('tab', { name: 'Kommentare (2)' })).toBeVisible();
  });

  test('without event.comment the member neither sees nor sends comments', { annotation: flow('comments.noperm') }, async ({ page }) => {
    await signIn(page, SILENT.email);
    await openComments(page);
    // RLS (comments_select_member) requires event.comment for reading as well.
    await expect(page.getByText('Noch keine Kommentare.')).toBeVisible();
    await expect(page.getByText(COMMENT, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Senden' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Antworten' })).toHaveCount(0);
  });

  test('comments on a past event are closed', { annotation: flow('comments.past') }, async ({ page }) => {
    await signIn(page, WRITER.email);
    await openComments(page, PAST_EVENT);
    await expect(page.getByRole('button', { name: 'Senden' })).toBeDisabled();
  });

  test.afterAll(async () => {
    try {
      await admin.from('event_comments').delete().in('event', [EVENT, PAST_EVENT]);
      await admin.from('events').delete().in('id', [EVENT, PAST_EVENT]);
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
