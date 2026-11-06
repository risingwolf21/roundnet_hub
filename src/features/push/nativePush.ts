import { getDeviceId } from '@/hooks/useDeviceId';
import { supabase } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { captureException } from '@sentry/react';

export type NativePermission = 'granted' | 'denied' | 'default';

const TOKEN_KEY = 'native-push:token';

const kind = () => (Capacitor.getPlatform() === 'ios' ? 'apns' : 'fcm');

const toPermission = (state: string): NativePermission =>
  state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : 'default';

export const getNativePermission = async () => toPermission((await PushNotifications.checkPermissions()).receive);

// Resolves with the device token, rejects when the system refuses to register.
async function registerForToken() {
  let done!: (token: string) => void;
  let fail!: (error: Error) => void;
  const result = new Promise<string>((resolve, reject) => {
    done = resolve;
    fail = reject;
  });
  const handles = await Promise.all([
    PushNotifications.addListener('registration', ({ value }) => done(value)),
    PushNotifications.addListener('registrationError', ({ error }) => fail(new Error(error))),
  ]);
  try {
    await PushNotifications.register();
    return await result;
  } finally {
    handles.forEach((h) => h.remove());
  }
}

async function upload(token: string) {
  await supabase
    .schema('notifications')
    .rpc('upsert_native_push_token', {
      p_token: token,
      p_kind: kind(),
      p_device_id: getDeviceId(),
      p_platform: Capacitor.getPlatform(),
    })
    .throwOnError();
  localStorage.setItem(TOKEN_KEY, token);
}

// Called after login. Never shows a permission prompt: that only happens when the user taps "enable".
export async function syncNativePushIfAllowed() {
  try {
    if ((await getNativePermission()) !== 'granted') return;
    await upload(await registerForToken());
  } catch (e) {
    captureException(e, { tags: { type: 'UpsertNativePushToken', scope: 'notifications' } });
  }
}

export async function enableNativePush(): Promise<NativePermission> {
  let permission = await getNativePermission();
  if (permission === 'default') permission = toPermission((await PushNotifications.requestPermissions()).receive);
  if (permission === 'granted') await upload(await registerForToken());
  return permission;
}

export async function disableNativePush() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    await supabase.schema('notifications').rpc('unregister_web_push_subscription', { p_endpoint: token }).throwOnError();
  }
  localStorage.removeItem(TOKEN_KEY);
  await PushNotifications.unregister();
}

export const hasNativeToken = () => !!localStorage.getItem(TOKEN_KEY);

// Tapping a notification opens the page the server put into data.url.
export function listenForNativePushTaps() {
  const handle = PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const url = notification.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) window.location.assign(url);
  });
  return () => {
    handle.then((h) => h.remove());
  };
}
