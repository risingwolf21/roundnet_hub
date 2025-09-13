import { useEffect } from 'react';
import { supabase } from 'src/components/services/supabase/supabaseClient';

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }
  return id;
}

export function useNotifications(user: User) {
  useEffect(() => {
    const run = async () => {
      const reg = await navigator.serviceWorker.ready;
      const old = await reg.pushManager.getSubscription();
      if (old) await old.unsubscribe();
      await ensureWebPushSubscription(process.env.REACT_APP_VAPID_PUBLIC_KEY)
    }
    run();
  }, [user]);
}

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

export async function ensureWebPushSubscription(vapidPublicKey?: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !vapidPublicKey) {
    console.error("Notifications recieving is not possible");
    return null;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    console.warn("Notification permission not granted")
    return null;
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }
  const deviceId = getOrCreateDeviceId();

  const body = {
    p_endpoint: sub.endpoint,
    p_p256dh: arrayBufferToBase64(sub.getKey('p256dh')!),
    p_auth: arrayBufferToBase64(sub.getKey('auth')!),
    p_user_agent: navigator.userAgent,
    p_platform: /Android/i.test(navigator.userAgent) ? 'android'
      : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'desktop',
    p_device_id: deviceId,
  };
  const { data, error } = await supabase.rpc("upsert_webpush_subscription", body);
  if (error) {
    console.error(error);
    throw error;
  }
  console.log("Subscribed to Notifications");
  return sub;
}
