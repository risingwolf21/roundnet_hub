import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/lib/supabase', async () => (await import('./helpers/supabaseMock')).supabaseModule);
vi.mock('@/lib/queryClient', () => ({ queryClient: { clear: vi.fn() } }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import { signOut } from '@/features/auth/signOut';
import WebPushKeeper, { PUSH_OPTED_OUT_KEY } from '@/features/push/WebPushKeeper';
import { getDeviceId } from '@/hooks/useDeviceId';
import { op, supabaseClientMock, supabaseMock } from './helpers/supabaseMock';
import type { Session } from '@supabase/supabase-js';

const ENDPOINT = 'https://push.example/abc';
const subscription = {
  endpoint: ENDPOINT,
  getKey: () => new Uint8Array([1, 2, 3]).buffer,
};

beforeEach(() => {
  supabaseMock.reset();
  const registration = { pushManager: { getSubscription: async () => subscription, subscribe: vi.fn() } };
  vi.stubGlobal('navigator', {
    ...navigator,
    serviceWorker: { ready: Promise.resolve(registration), getRegistration: async () => registration },
  });
  vi.stubGlobal('PushManager', function PushManager() {});
  vi.stubGlobal('Notification', { permission: 'granted' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('WebPushKeeper', () => {
  test('saves the device on every start, even when this device was saved before', async () => {
    // What the old one-time check left behind: it used to skip the save for good.
    localStorage.setItem('push:lastSig', `${ENDPOINT}|${getDeviceId()}`);
    const session = { user: { id: 'anna' } } as Session;

    render(<WebPushKeeper session={session} vapidPublicKey="BKey" />);

    await waitFor(() =>
      expect(supabaseMock.queries.find((q) => q.rpc === 'upsert_webpush_subscription')?.args).toMatchObject({
        p_endpoint: ENDPOINT,
      })
    );
  });

  test('leaves the device alone after the person turned push off', async () => {
    localStorage.setItem(PUSH_OPTED_OUT_KEY, '1');
    const session = { user: { id: 'anna' } } as Session;

    render(<WebPushKeeper session={session} vapidPublicKey="BKey" />);

    // Let the effect run to completion before checking that it saved nothing.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(supabaseMock.queries.find((q) => q.rpc === 'upsert_webpush_subscription')).toBeUndefined();
  });
});

describe('signOut', () => {
  test("revokes this device's subscription before the session ends", async () => {
    const calls: string[] = [];
    supabaseMock.respond = (q) => {
      calls.push(q.table ?? q.rpc ?? '');
      return { data: null, error: null };
    };
    Object.assign(supabaseClientMock.auth, {
      signOut: vi.fn(async () => {
        calls.push('auth.signOut');
        return { error: null };
      }),
    });

    await signOut();

    const revoke = supabaseMock.queries.find((q) => q.table === 'web_push_subscriptions');
    expect(revoke?.schema).toBe('notifications');
    expect(op(revoke, 'eq')).toEqual(['endpoint', ENDPOINT]);
    expect(op(revoke, 'update')?.[0]).toHaveProperty('revoked_at');
    expect(calls).toEqual(['web_push_subscriptions', 'auth.signOut']);
  });
});
