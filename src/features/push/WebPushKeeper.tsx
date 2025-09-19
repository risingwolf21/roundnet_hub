// @/push/WebPushKeeper.tsx
import useDeviceId from '@/hooks/useDeviceId';
import { supabase } from '@/lib/supabase';
import { logger } from '@sentry/react';
import type { Session } from '@supabase/supabase-js';
import { PropsWithChildren, useEffect, useRef } from 'react';

type Props = PropsWithChildren & {
  session: Session | null; // reingegeben aus deinem Auth-Context
  vapidPublicKey: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

export default function WebPushKeeper({ children, session, vapidPublicKey }: Props) {
  const deviceId = useDeviceId();
  const lastSigRef = useRef<string | null>(localStorage.getItem('push:lastSig'));

  useEffect(() => {
    (async () => {
      try {
        if (!session?.user) {
          logger.error('webpush_not_available_without_a_user', {
            type: 'webpush',
            message: 'not_available_without_a_user',
          });
          return;
        }
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !vapidPublicKey) {
          logger.error('webpush_not_available', {
            type: 'webpush',
            message: 'not_available',
            user: session.user.id,
          });
          return;
        }
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') {
            logger.error('webpush_notification_permission_denied', {
              type: 'webpush',
              message: 'notification_permission_denied',
              user: session.user.id,
            });
            return;
          }
        } else if (Notification.permission === 'denied') {
          logger.error('webpush_notification_permission_denied', {
            type: 'webpush',
            message: 'notification_permission_denied',
            user: session.user.id,
          });
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        const endpoint = sub.endpoint;
        const p256dh = arrayBufferToBase64(sub.getKey('p256dh')!);
        const auth = arrayBufferToBase64(sub.getKey('auth')!);
        if (!p256dh || !auth) {
          throw new Error('missing_keys');
        }

        const sig = `${endpoint}|${deviceId}`;
        if (lastSigRef.current === sig) return; // in-memory Dedupe
        lastSigRef.current = sig;

        // optional: persistentes Dedupe über Reloads
        const persisted = localStorage.getItem('push:lastSig');
        if (persisted === sig) return;
        localStorage.setItem('push:lastSig', sig);

        await upsertToDb(endpoint, p256dh, auth, { user: session.user.id }, { origin: 'useEffect' });
      } catch (e: any) {
        logger.error('webpush_subscribe_failed', {
          type: 'webpush',
          message: 'subscribe_failed',
          user: session?.user.id,
          error: e,
        });
      }
    })();
  }, [session?.user?.id, vapidPublicKey]);

  async function upsertToDb(p_endpoint: string, p_p256dh: string, p_auth: string, ...params: any[]) {
    const { error } = await supabase.rpc('upsert_webpush_subscription', {
      p_endpoint,
      p_p256dh,
      p_auth,
      p_device_id: deviceId,
      p_user_agent: navigator.userAgent,
      p_platform: /Android/i.test(navigator.userAgent)
        ? 'android'
        : /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? 'ios'
          : 'desktop',
    });
    if (error) throw error;
    logger.info('webpush_subscribe_successful', {
      type: 'webpush',
      message: 'subscribe_successful',
      user: session?.user?.id,
      ...params,
    });
  }

  return children;
}
