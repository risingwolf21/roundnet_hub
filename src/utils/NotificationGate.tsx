import React from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { Button, Stack, Typography, Alert, Chip, Divider, CircularProgress, Tooltip } from '@mui/material';
import { supabase } from 'src/components/services/supabase/supabaseClient';

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
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('device_id', id); }
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
  try { return await reg.pushManager.getSubscription(); } catch { return null; }
}

async function registerOnServer(sub: PushSubscription) {
  const endpoint = sub.endpoint;
  const p256dh = bufferToBase64Url(sub.getKey('p256dh')!);
  const auth = bufferToBase64Url(sub.getKey('auth')!);
  const platform = detectPlatform();
  const device_id = getDeviceId();
  const user_agent = navigator.userAgent;

  // Prefer RPC if available
  const { error } = await supabase.rpc('upsert_webpush_subscription', {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_platform: platform,
    p_device_id: device_id,
    p_user_agent: user_agent,
  });
}

async function revokeOnServer(endpoint?: string | null) {
  try {
    if (!endpoint) return;
    const { error } = await supabase.rpc('revoke_web_push_subscription', { p_endpoint: endpoint, p_device_id: getDeviceId() }).catch(() => ({ error: null } as any));
    if (error) throw error;
  } catch {
    // fallback: soft-revoke
    await supabase.from('web_push_subscriptions').update({ revoked_at: new Date().toISOString() }).eq('endpoint', endpoint).catch(() => {});
  }
}

async function ensurePermissionFromGesture(): Promise<NotificationPermission> {
  if (Notification.permission === 'granted') return 'granted';
  // IMPORTANT: only call this inside a user gesture handler (e.g., onClick)
  return await Notification.requestPermission();
}

// --- Component -------------------------------------------------------------

type Props = {
  title?: string;
  description?: string;
  allowDecline?: boolean;
  onReady?: (sub: PushSubscription) => void; // called when successfully registered
  vapidPublicKey?: string; // override env
};

export default function NotificationGate({
  title = 'Benachrichtigungen',
  description = 'Aktiviere Push-Benachrichtigungen, um über Änderungen sofort informiert zu werden.',
  allowDecline = true,
  onReady,
  vapidPublicKey,
}: Props) {
  const [permission, setPermission] = React.useState<NotificationPermission>(Notification.permission);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [registered, setRegistered] = React.useState(false);
  const [lastMsg, setLastMsg] = React.useState<{ title?: string; url?: string; at?: string } | null>(null);
  const [isPWA, setIsPWA] = React.useState<boolean>(false);
  const [scope, setScope] = React.useState<string | null>(null);

  const VAPID = (vapidPublicKey || (process.env.REACT_APP_VAPID_PUBLIC_KEY as string))?.trim();

  React.useEffect(() => {
    const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone === true;
    setIsPWA(standalone);
    (async () => {
      try {
        const reg = await getSW();
        setScope(reg.scope ?? null);
        const sub = await getCurrentSubscription(reg);
        setRegistered(!!sub);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    })();

    const onMsg = (e: MessageEvent) => {
      if (e?.data?.type === 'push_received') {
        setLastMsg({ title: e.data.payload?.title, url: e.data.payload?.url, at: new Date().toISOString() });
      }
    };
    navigator.serviceWorker?.addEventListener?.('message', onMsg as any);
    return () => navigator.serviceWorker?.removeEventListener?.('message', onMsg as any);
  }, []);

  const handleEnable = async () => {
    setError(null);
    setLoading(true);
    try {
      const perm = await ensurePermissionFromGesture();
      setPermission(perm);
      if (perm !== 'granted') return; // user denied or default

      if (!VAPID) throw new Error('VAPID Public Key fehlt (REACT_APP_VAPID_PUBLIC_KEY)');
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
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRebind = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!VAPID) throw new Error('VAPID Public Key fehlt (REACT_APP_VAPID_PUBLIC_KEY)');
      const reg = await getSW();
      const old = await reg.pushManager.getSubscription();
      await revokeOnServer(old?.endpoint);
      await old?.unsubscribe().catch(() => {});

      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) });
      await registerOnServer(sub);
      setRegistered(true);
      onReady?.(sub);
    } catch (e: any) {
      setError(e?.message ?? String(e));
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
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const installingHint = !isPWA ? 'Für iOS Web Push die App über „Zum Home-Bildschirm“ installieren.' : undefined;

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 6 }}>
      <CardHeader title={title} subheader={description} />
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip label={`Permission: ${permission}`} color={permission === 'granted' ? 'success' : permission === 'default' ? 'info' : 'warning'} variant="outlined" />
            <Chip label={`Registriert: ${registered ? 'Ja' : 'Nein'}`} color={registered ? 'success' : 'default'} variant="outlined" />
            {scope && <Chip label={`SW: ${scope}`} variant="outlined" />}
            <Chip label={`Device: ${getDeviceId().slice(0,8)}`} variant="outlined" />
          </Stack>

          {installingHint && <Alert severity="info">{installingHint}</Alert>}

          {error && <Alert severity="error">{error}</Alert>}

          {/* Actions */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {permission !== 'granted' && (
              <Button variant="contained" onClick={handleEnable} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : 'Benachrichtigungen aktivieren'}
              </Button>
            )}

            {permission === 'granted' && !registered && (
              <Button variant="contained" onClick={handleEnable} disabled={loading}>
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
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography variant="subtitle2">Letzte empfangene Nachricht</Typography>
            {lastMsg ? (
              <Typography variant="body2">
                {lastMsg.title || '—'} {lastMsg.url ? `(${lastMsg.url})` : ''} – {new Date(lastMsg.at!).toLocaleString()}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">Noch keine Nachricht empfangen.</Typography>
            )}
          </Stack>

          {permission === 'denied' && (
            <Alert severity="warning">
              Mitteilungen sind für diese Web‑App deaktiviert. Öffne die iOS Einstellungen → Mitteilungen → <b>App</b> und erlaube Mitteilungen. 
              Falls die App dort nicht erscheint: App vom Homescreen entfernen, Seite in Safari öffnen, „Zum Home‑Bildschirm“ hinzufügen und hier erneut aktivieren.
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
