// src/push/WebPushKeeper.tsx
import { logger } from '@sentry/react';
import type { Session } from '@supabase/supabase-js';
import { PropsWithChildren, useEffect, useRef } from 'react';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import useDeviceId from 'src/hooks/useDeviceId';

type Props = PropsWithChildren & {
  session: Session | null; // reingegeben aus deinem Auth-Context
  vapidPublicKey: string
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
  const bytes = new Uint8Array(buf); let str = '';
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

export default function WebPushKeeper({
  children,
  session,
  vapidPublicKey
}: Props) {
  const deviceId = useDeviceId();

  useEffect(() => {
    const onMsg = async (ev: MessageEvent) => {
      const data = ev.data || {};
      if (data.type === "push_resubscribe_needed") {
        try {
          const { p_endpoint, p_p256dh, p_auth } = data.params || {};
          await upsertToDb(p_endpoint, p_p256dh, p_auth);
        } catch (e: any) {
        }
      } else if (data.type === "push_resubscribe_failed") {
        console.error(data);
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!session?.user) {
          console.error("Cannot recieve Notifications without a user present.");
          return;
        }
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !vapidPublicKey) {
          console.error("Notifications recieving is not possible");
          return;
        }
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') {
            console.warn("Notification permission not granted");
            return;
          }
        } else if (Notification.permission === "denied") {
          console.log("Notification permission not granted");
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
          throw new Error("missing_keys");
        }
        await upsertToDb(endpoint, p256dh, auth);
      } catch (e: any) {
        console.log(e);
      }
    })();
  }, [session?.user?.id, vapidPublicKey]);

  async function upsertToDb(p_endpoint: string, p_p256dh: string, p_auth: string) {
    const { error } = await supabase.rpc("upsert_webpush_subscription", {
      p_endpoint,
      p_p256dh,
      p_auth,
      p_device_id: deviceId,
      p_user_agent: navigator.userAgent,
      p_platform: /Android/i.test(navigator.userAgent) ? 'android'
        : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'desktop',
    });
    if (error) throw error;
  }

  return children;
}