// useSwSentryMessaging.ts
import { useEffect } from 'react';
import * as Sentry from '@sentry/browser';
import useDeviceId from './useDeviceId';
import { supabase } from 'src/components/services/supabase/supabaseClient';

type SwMessage =
  | { type: 'push_received'; payload?: any; sw?: string }
  | { type: 'notification_click'; url?: string; sw?: string }
  | { type: 'push_resubscribe_failed'; error: string; sw?: string }
  | {
    type: 'push_resubscribe_needed';
    params: {
      p_endpoint: string,
      p_p256dh: string,
      p_auth: string
    }
  }
  | { type: string;[k: string]: any };

export type RegisterParams = {
  p_endpoint: string;
  p_p256dh: string;
  p_auth: string;
  p_platform: string;
  p_device_id: string;
  p_user_agent: string;
};

function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf); let str = '';
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

export function pushSubToParams(sub: PushSubscription, deviceId: string): RegisterParams {
  return {
    p_endpoint: sub.endpoint,
    p_p256dh: arrayBufferToBase64(sub.getKey('p256dh')!),
    p_auth: arrayBufferToBase64(sub.getKey('auth')!),
    p_platform: 'pwa',
    p_device_id: deviceId,
    p_user_agent: navigator.userAgent,
  };
}

export function useSwSentryMessaging(deviceId: string) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onMessage = async (e: MessageEvent<SwMessage>) => {
      const m = e.data;
      if (!m || typeof m !== 'object') return;

      if (m.type === 'push_recieved') {
        Sentry.logger.info('Push Notification recieved', {
          category: 'push',
          message: 'push_received',
          data: { payload: m.payload, sw: m.sw },
        });
      } else if (m.type === 'notification_click') {
        Sentry.logger.info('Push Notification clicked', {
          category: 'push',
          message: 'notification_click',
          data: { url: m.url, sw: m.sw },
        });
      } else if (m.type === 'push_resubscribe_failed') {
        Sentry.logger.info('Push Notification resubscribe failed', {
          category: 'push',
          message: 'notification_click',
          data: { error: m.error, sw: m.sw },
        });
      } else if (m.type === 'push_resubscribe_needed' && m.params) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (!sub) return;

          const fullParams = {
            ...m.params,
            deviceId,
            p_user_agent: navigator.userAgent,
            p_platform: /Android/i.test(navigator.userAgent) ? 'android'
              : /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'desktop',
          };
          const { error } = await supabase.rpc('upsert_webpush_subscription', fullParams);
          if (error) {
            Sentry.logger.error('RPC register failed (resubscribe)', {
              error,
              fullParams
            });
          } else {
            Sentry.logger.info('RPC register succesful (resubscribe)')
          }
        } catch (err) {
          console.error('resubscribe handle failed', err);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);
}
