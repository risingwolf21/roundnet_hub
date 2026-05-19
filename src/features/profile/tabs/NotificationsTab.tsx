import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { useNotificationTags, useNotificationTopics, useUpdateNotificationPreferences } from "@/tanstack/notifications";
import { UserWithGroups } from "@/types/supabaseTypes";
import { iOS } from "@/utils";
import { AlertTriangle, Bell, BellOff, CalendarIcon, CheckCircle2, Info, Swords, Trophy, Users, XCircle } from "lucide-react";
import { ElementType, Fragment, useEffect, useMemo, useState } from "react";

// --- Web Push helpers -------------------------------------------------------

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
  await supabase.schema('notifications').rpc('upsert_webpush_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: bufferToBase64Url(sub.getKey('p256dh')!),
    p_auth: bufferToBase64Url(sub.getKey('auth')!),
    p_platform: detectPlatform(),
    p_device_id: getDeviceId(),
    p_user_agent: navigator.userAgent,
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

// ---------------------------------------------------------------------------

const isNotificationSupported =
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

const CATEGORY_LABELS: Record<string, { label: string; icon: ElementType }> = {
  event:     { label: 'Veranstaltungen', icon: CalendarIcon },
  challenge: { label: 'Challenges',      icon: Trophy },
  game:      { label: 'Spiele',          icon: Swords },
  group:     { label: 'Gruppen',         icon: Users },
  item:      { label: 'Sonstiges',       icon: Bell },
  payment:   { label: 'Sonstiges',       icon: Bell },
};

const CATEGORY_ORDER = ['event', 'challenge', 'game', 'group', 'item', 'payment'];

export const NotificationsTab = ({ user }: { user: UserWithGroups }) => {
  const { data: notificationTags = [], isLoading } = useNotificationTags(user);
  const { data: topics = [] } = useNotificationTopics();
  const updateNotificationPreferences = useUpdateNotificationPreferences(user);

  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied',
  );
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const VAPID = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string)?.trim();
  const isPWA = useMemo(() => window.matchMedia?.('(display-mode: standalone)').matches ?? false, []);

  useEffect(() => {
    (async () => {
      try {
        const reg = await getSW();
        const sub = await getCurrentSubscription(reg);
        setRegistered(!!sub);
      } catch {
        // SW not supported or not ready
      }
    })();
  }, []);

  const handleEnable = async () => {
    setPushError(null);
    setPushLoading(true);
    try {
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== 'granted') return;
      }
      if (!VAPID) throw new Error('VAPID Public Key fehlt.');
      const reg = await getSW();
      const old = await reg.pushManager.getSubscription();
      await old?.unsubscribe().catch(() => {});
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });
      await registerOnServer(sub);
      setRegistered(true);
    } catch (e) {
      setPushError(e instanceof Error ? e.message : String(e));
    } finally {
      setPushLoading(false);
    }
  };

  const handleRebind = async () => {
    setPushError(null);
    setPushLoading(true);
    try {
      if (!VAPID) throw new Error('VAPID Public Key fehlt.');
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
    } catch (e) {
      setPushError(e instanceof Error ? e.message : String(e));
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisable = async () => {
    setPushError(null);
    setPushLoading(true);
    try {
      const reg = await getSW();
      const sub = await reg.pushManager.getSubscription();
      await revokeOnServer(sub?.endpoint);
      await sub?.unsubscribe();
      setRegistered(false);
    } catch (e) {
      setPushError(e instanceof Error ? e.message : String(e));
    } finally {
      setPushLoading(false);
    }
  };

  if (!isNotificationSupported) {
    return (
      <CardContent className="px-4 py-8 flex flex-col items-center gap-3 text-center">
        <BellOff className="size-10 text-muted-foreground" />
        <div>
          <div className="font-medium">Push-Benachrichtigungen nicht unterstützt</div>
          <div className="text-sm text-muted-foreground mt-1">
            Dieser Browser unterstützt keine Push-Benachrichtigungen.
          </div>
        </div>
      </CardContent>
    );
  }

  const installingHint = !isPWA
    ? iOS
      ? 'Für iOS Web Push die App über Teilen → „Zum Home-Bildschirm hinzufügen" installieren.'
      : 'Für Android Web Push die App über „Zum Home-Bildschirm hinzufügen" installieren.'
    : undefined;

  const grouped = topics.reduce<Record<string, typeof topics>>((acc, topic) => {
    const key = topic.scope_type ?? 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(topic);
    return acc;
  }, {});

  const orderedEntries: [string, typeof topics][] = [
    ...CATEGORY_ORDER.filter(k => grouped[k]).map(k => [k, grouped[k]] as [string, typeof topics]),
    ...Object.entries(grouped).filter(([k]) => !CATEGORY_ORDER.includes(k)),
  ];

  return (
    <CardContent className="px-0">
      {/* Device & permission status */}
      <div className="px-4 py-2 flex flex-col gap-1">
        <div className="flex items-center justify-between py-1">
          <span className="text-sm">Berechtigung</span>
          {permission === 'granted'
            ? <CheckCircle2 className="size-4 text-green-500" />
            : permission === 'default'
            ? <Info className="size-4 text-blue-500" />
            : <AlertTriangle className="size-4 text-yellow-500" />}
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm">Registriert</span>
          {registered
            ? <CheckCircle2 className="size-4 text-green-500" />
            : <XCircle className="size-4 text-muted-foreground" />}
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm">Gerät</span>
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{getDeviceId().slice(0, 8)}</span>
        </div>
      </div>

      <Separator />

      {installingHint && (
        <Alert className="mx-4 my-2">
          <AlertDescription>{installingHint}</AlertDescription>
        </Alert>
      )}

      {pushError && (
        <Alert variant="destructive" className="mx-4 my-2">
          <AlertDescription>{pushError}</AlertDescription>
        </Alert>
      )}

      {permission === 'denied' && (
        <Alert className="mx-4 my-2">
          <AlertDescription>
            Mitteilungen sind deaktiviert. Öffne die Einstellungen → Mitteilungen → <b>App</b> und erlaube Mitteilungen.
            Falls die App dort nicht erscheint: App deinstallieren, Seite in Safari öffnen, „Zum Home-Bildschirm" hinzufügen und hier erneut aktivieren.
          </AlertDescription>
        </Alert>
      )}

      {/* Action buttons */}
      <div className="px-4 py-3 flex flex-col gap-2">
        {permission !== 'granted' && (
          <Button onClick={handleEnable} disabled={pushLoading}>
            {pushLoading ? <Spinner className="size-4" /> : 'Benachrichtigungen aktivieren'}
          </Button>
        )}
        {permission === 'granted' && !registered && (
          <Button onClick={handleEnable} disabled={pushLoading}>
            {pushLoading ? <Spinner className="size-4" /> : 'Gerät registrieren'}
          </Button>
        )}
        {permission === 'granted' && registered && (
          <>
            <Button variant="outline" onClick={handleRebind} disabled={pushLoading}>
              {pushLoading ? <Spinner className="size-4" /> : 'Neu koppeln'}
            </Button>
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDisable} disabled={pushLoading}>
              {pushLoading ? <Spinner className="size-4" /> : 'Keine Benachrichtigungen'}
            </Button>
          </>
        )}
      </div>

      {/* Topic toggles — only when permission granted */}
      {permission === 'granted' && (
        <>
          <Separator />
          {orderedEntries.map(([scopeType, groupTopics], groupIndex) => {
            const cat = CATEGORY_LABELS[scopeType] ?? { label: scopeType, icon: Bell };
            const Icon = cat.icon;
            return (
              <Fragment key={scopeType}>
                <div className="flex items-center gap-2 px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <Icon className="size-3.5" />
                  {cat.label}
                </div>
                {groupTopics.map((topic, i) => (
                  <Fragment key={topic.topic}>
                    <Field className="px-4 py-2" orientation="horizontal">
                      <FieldContent>
                        <FieldLabel htmlFor={`switch-${topic.topic}`}>{topic.description ?? topic.topic}</FieldLabel>
                      </FieldContent>
                      {isLoading ? <Spinner /> : (
                        <Switch
                          id={`switch-${topic.topic}`}
                          checked={notificationTags.find(y => y.topic === topic.topic)?.enabled ?? true}
                          onCheckedChange={(newValue) =>
                            updateNotificationPreferences.mutate({ topic: topic.topic, enabled: newValue, scopeType: topic.scope_type })
                          }
                        />
                      )}
                    </Field>
                    {i < groupTopics.length - 1 && <Separator />}
                  </Fragment>
                ))}
                {groupIndex < orderedEntries.length - 1 && <Separator className="my-2" />}
              </Fragment>
            );
          })}
        </>
      )}
    </CardContent>
  );
};
