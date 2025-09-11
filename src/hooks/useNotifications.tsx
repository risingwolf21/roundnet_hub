import { useEffect } from 'react';
import { supabase } from 'src/components/services/supabase/supabaseClient';


export function useNotifications(user: User) {
  useEffect(() => {
    ensureWebPushSubscription(process.env.REACT_APP_VAPID_PUBLIC_KEY)
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
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || ! vapidPublicKey) return null;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return null;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }
  const body = {
    p_endpoint: sub.endpoint,
    p_p256dh: arrayBufferToBase64(sub.getKey('p256dh')!),
    p_auth: arrayBufferToBase64(sub.getKey('auth')!),
    p_ua: navigator.userAgent,
    p_platform: /Android/i.test(navigator.userAgent) ? 'android'
      : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'desktop',
  };
  const { error } = await supabase.rpc('register_web_push_subscription', body);
  if (error) throw error;
  return sub;
}
