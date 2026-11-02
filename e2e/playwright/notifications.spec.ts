import { Page } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, logPageOnFailure, signIn } from './helpers';

// In-app notifications (list, open → read + jump to target, clear all), notification topic
// preferences, and web-push registration up to the browser boundary.
const stamp = Date.now();
const EMAIL = `e2e_notify_${stamp}@test.com`;
const N_LINK = `E2E Gruppe gefunden ${stamp}`;
const N_PLAIN = `E2E Hinweis ${stamp}`;

let admin: SupabaseClient;
let userId = '';

const notifications = async () => {
  const { data } = await admin.schema('notifications').from('notifications').select('id, title, dismissed_at').eq('user', userId);
  return (data ?? []) as { id: string; title: string; dismissed_at: string | null }[];
};

/**
 * The dev server registers no service worker, and a real push subscription would talk to the
 * browser vendor's push service. Stub serviceWorker/PushManager so the app's own code path
 * (permission → subscribe → upsert_webpush_subscription) runs and we can check what it stores.
 */
async function stubPush(page: Page, endpoint: string) {
  await page.context().grantPermissions(['notifications']);
  await page.addInitScript((ep) => {
    const key = (n: number) => new Uint8Array(Array.from({ length: n }, (_, i) => (i * 7 + 3) % 256)).buffer;
    let current: unknown = null;
    const subscription = {
      endpoint: ep,
      expirationTime: null,
      getKey: (name: string) => (name === 'p256dh' ? key(65) : key(16)),
      unsubscribe: async () => { current = null; return true; },
      toJSON: () => ({ endpoint: ep }),
    };
    const registration = {
      pushManager: {
        getSubscription: async () => current,
        subscribe: async () => (current = subscription),
        permissionState: async () => 'granted',
      },
      showNotification: async () => undefined,
      update: async () => undefined,
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        controller: null,
        register: async () => registration,
        getRegistration: async () => registration,
        getRegistrations: async () => [registration],
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
  }, endpoint);
}

test.describe.configure({ mode: 'serial' });

test.describe('Benachrichtigungen', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    userId = await ensureUser(admin, EMAIL, `E2E Benachrichtigt ${stamp}`);
    await admin.schema('notifications').from('notifications').insert([
      { user: userId, title: N_LINK, body: 'Tippe, um zur Gruppenliste zu springen', topic: 'group.join', data: { url: '/groups/list' } },
      { user: userId, title: N_PLAIN, body: 'Nur zur Info', topic: 'event.canceled' },
    ]).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('the notification list shows the user’s notifications @mobile', { annotation: flow('notifications.list') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await page.goto('/notifications');
    await expect(page.getByText(N_LINK)).toBeVisible();
    await expect(page.getByText(N_PLAIN)).toBeVisible();
  });

  test('opening a notification marks it read and jumps to its target', { annotation: flow('notifications.read') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await page.goto('/notifications');
    await page.getByText(N_LINK).click();
    await expect(page).toHaveURL(/\/groups\/list/);
    await expect.poll(async () => (await notifications()).find((n) => n.title === N_LINK)?.dismissed_at).not.toBeNull();
  });

  test('clearing removes all notifications', { annotation: flow('notifications.clear') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await page.goto('/notifications');
    await expect(page.getByText(N_PLAIN)).toBeVisible();
    await page.locator('button:has(svg.lucide-trash-2)').click();
    await expect(page.getByText(N_PLAIN)).toHaveCount(0);
    await expect.poll(async () => (await notifications()).length).toBe(0);
  });

  test('a topic can be switched off in the profile', { annotation: flow('profile.notifications') }, async ({ page }) => {
    await stubPush(page, `https://push.e2e.invalid/topics-${stamp}`);
    await signIn(page, EMAIL);
    await page.goto('/user');
    await page.getByRole('tab', { name: 'Benachrichtigungen' }).click();
    const topic = page.getByRole('switch', { name: 'Event abgesagt' });
    await expect(topic).toHaveAttribute('aria-checked', 'true');
    await topic.click();
    await expect.poll(async () => {
      const { data } = await admin.schema('notifications').from('user_notification_preferences')
        .select('enabled').eq('user', userId).eq('topic', 'event.canceled');
      return (data ?? []).map((r) => (r as { enabled: boolean }).enabled);
    }).toEqual([false]);
  });

  test('enabling push stores the device subscription', { annotation: flow('notifications.push') }, async ({ page }) => {
    const endpoint = `https://push.e2e.invalid/${stamp}`;
    await stubPush(page, endpoint);
    await signIn(page, EMAIL);
    await page.goto('/user');
    await page.getByRole('tab', { name: 'Benachrichtigungen' }).click();
    // Depending on timing the app may already have registered in the background (WebPushKeeper).
    const enable = page.getByRole('button', { name: /Benachrichtigungen aktivieren|Gerät registrieren|Neu koppeln/ }).first();
    await enable.click();

    await expect.poll(async () => {
      const { data } = await admin.schema('notifications').from('web_push_subscriptions')
        .select('endpoint, revoked_at').eq('user', userId);
      return (data ?? []).filter((r) => (r as { endpoint: string; revoked_at: string | null }).endpoint === endpoint && !(r as { revoked_at: string | null }).revoked_at).length;
    }).toBe(1);
  });

  test.afterAll(async () => {
    try {
      await admin.schema('notifications').from('notifications').delete().eq('user', userId);
      await admin.schema('notifications').from('user_notification_preferences').delete().eq('user', userId);
      await admin.schema('notifications').from('web_push_subscriptions').delete().eq('user', userId);
      if (userId) await admin.auth.admin.deleteUser(userId);
    } catch {
      // best-effort
    }
  });
});
