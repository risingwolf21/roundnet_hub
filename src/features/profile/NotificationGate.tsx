import { supabase } from '@/lib/supabase';
import Cancel from '@mui/icons-material/Cancel';
import CheckCircle from '@mui/icons-material/CheckCircle';
import React, { useMemo } from 'react';

import { getErrorMessage, iOS } from '@/utils';
import Info from '@mui/icons-material/Info';
import Warning from '@mui/icons-material/Warning';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';

// --- Helpers ---------------------------------------------------------------
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function bufferToBase64Url(buf: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod|Macintosh/.test(ua) && 'ontouchend' in document) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'web';
}

async function getSW() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker not supported');
  return navigator.serviceWorker.ready;
}

async function getCurrentSubscription(reg: ServiceWorkerRegistration) {
  try {
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

async function registerOnServer(sub: PushSubscription) {
  const endpoint = sub.endpoint;
  const p256dh = bufferToBase64Url(sub.getKey('p256dh')!);
  const auth = bufferToBase64Url(sub.getKey('auth')!);
  const platform = detectPlatform();
  const device_id = getDeviceId();
  const user_agent = navigator.userAgent;

  // Prefer RPC if available
  await supabase.schema('notifications').rpc('upsert_webpush_subscription', {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_platform: platform,
    p_device_id: device_id,
    p_user_agent: user_agent,
  });
}

async function revokeOnServer(endpoint?: string | null) {
  if (endpoint)
    await supabase
      .schema('notifications')
      .from('web_push_subscriptions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('endpoint', endpoint);
}

async function ensurePermissionFromGesture(): Promise<NotificationPermission> {
  if (Notification.permission === 'granted') return 'granted';
  // importANT: only call this inside a user gesture handler (e.g., onClick)
  return await Notification.requestPermission();
}

// --- Component -------------------------------------------------------------

type Props = {
  allowDecline?: boolean;
  onReady?: (sub: PushSubscription) => void; // called when successfully registered
  vapidPublicKey?: string; // override env
};

export default function NotificationGate({ allowDecline = true, onReady, vapidPublicKey }: Props) {
  const [permission, setPermission] = React.useState<NotificationPermission>(Notification.permission);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [registered, setRegistered] = React.useState(false);
  const isPWA = useMemo(() => window.matchMedia && window.matchMedia('(display-mode: standalone)').matches, []);

  const VAPID = (vapidPublicKey || (import.meta.env.VITE_VAPID_PUBLIC_KEY as string))?.trim();

  React.useEffect(() => {
    (async () => {
      try {
        const reg = await getSW();
        const sub = await getCurrentSubscription(reg);
        setRegistered(!!sub);
      } catch (e: unknown) {
        const message = getErrorMessage(e);
        setError(message ?? String(e));
      }
    })();
  }, []);

  const handleEnable = async () => {
    setError(null);
    setLoading(true);
    try {
      const perm = await ensurePermissionFromGesture();
      setPermission(perm);
      if (perm !== 'granted') return; // user denied or default

      if (!VAPID) throw new Error('Vapid Public Key fehlt.');
      const reg = await getSW();

      // Always create a fresh subscription (prevents stale endpoints)
      const old = await reg.pushManager.getSubscription();
      await old?.unsubscribe().catch(() => {});

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });

      await registerOnServer(sub);
      setRegistered(true);
      onReady?.(sub);
    } catch (e: unknown) {
      const message = getErrorMessage(e);
      setError(message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRebind = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!VAPID) throw new Error('VAPID Public Key fehlt (VITE_VAPID_PUBLIC_KEY)');
      const reg = await getSW();
      const old = await reg.pushManager.getSubscription();
      await revokeOnServer(old?.endpoint);
      await old?.unsubscribe().catch(() => {});

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });
      await registerOnServer(sub);
      setRegistered(true);
      onReady?.(sub);
    } catch (e: unknown) {
      const message = getErrorMessage(e);
      setError(message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setError(null);
    setLoading(true);
    try {
      const reg = await getSW();
      const sub = await reg.pushManager.getSubscription();
      await revokeOnServer(sub?.endpoint);
      await sub?.unsubscribe();
      setRegistered(false);
    } catch (e: unknown) {
      const message = getErrorMessage(e);
      setError(message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const installingHint = !isPWA
    ? iOS
      ? 'Für iOS Web Push die App über Teilen > „Zum Home-Bildschirm hinzufügen“ installieren.'
      : 'Für Android Web Push die App über "Zum Home-Bildschirm hinzufügen" installieren'
    : undefined;

  return (
    <Container sx={{ mb: 2 }}>
      <Stack direction={'column'} spacing={1}>
        <ListItem
          disablePadding
          secondaryAction={
            permission === 'granted' ? (
              <CheckCircle color="success" />
            ) : permission === 'default' ? (
              <Info color="info" />
            ) : (
              <Warning color="warning" />
            )
          }
        >
          <ListItemText primary={`Berechtigung`} />
        </ListItem>
        <ListItem
          disablePadding
          secondaryAction={registered ? <CheckCircle color="success" /> : <Cancel color="warning" />}
        >
          <ListItemText primary={`Registriert`} />
        </ListItem>
        <ListItem disablePadding secondaryAction={<Chip label={`${getDeviceId().slice(0, 8)}`} variant="outlined" />}>
          <ListItemText primary={`Gerät`} />
        </ListItem>

        {installingHint && <Alert severity="info">{installingHint}</Alert>}

        {error && <Alert severity="error">{error}</Alert>}

        {/* Actions */}
        {permission !== 'granted' && (
          <Button variant="contained" onClick={handleEnable} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Benachrichtigungen aktivieren'}
          </Button>
        )}

        {permission === 'granted' && !registered && (
          <Button sx={{ m: 2 }} variant="contained" onClick={handleEnable} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Gerät registrieren'}
          </Button>
        )}

        {permission === 'granted' && registered && (
          <>
            <Button variant="outlined" onClick={handleRebind} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Neu koppeln'}
            </Button>
            {allowDecline && (
              <Button color="error" variant="text" onClick={handleDisable} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Keine Benachrichtigungen'}
              </Button>
            )}
          </>
        )}

        {permission === 'denied' && (
          <Alert severity="warning">
            Mitteilungen sind für diese Web‑App deaktiviert. Öffne die iOS Einstellungen → Mitteilungen → <b>App</b> und
            erlaube Mitteilungen. Falls die App dort nicht erscheint: App vom Homescreen entfernen, Seite in Safari
            öffnen, „Zum Home‑Bildschirm“ hinzufügen und hier erneut aktivieren.
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
