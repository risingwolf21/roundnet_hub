import { getDeviceId } from "@/hooks/useDeviceId";
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
import { Capacitor } from "@capacitor/core";
import { disableNativePush, enableNativePush, getNativePermission, hasNativeToken } from "@/features/push/nativePush";
import { AlertTriangle, Bell, BellOff, CalendarIcon, CheckCircle2, Info, Swords, Trophy, Users, XCircle } from "lucide-react";
import { ElementType, Fragment, useEffect, useMemo, useState } from "react";
import i18n from "i18next";
import { useTranslation } from "react-i18next";

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


function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod|Macintosh/.test(ua) && 'ontouchend' in document) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'web';
}

async function getSW() {
  if (!('serviceWorker' in navigator)) throw new Error(i18n.t('profile.notifications.serviceWorkerNotSupported'));
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

const isNative = Capacitor.isNativePlatform();

const isNotificationSupported = isNative ||
  ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window);

const CATEGORY_ICON_MAP: Record<string, ElementType> = {
  event:     CalendarIcon,
  challenge: Trophy,
  game:      Swords,
  group:     Users,
  item:      Bell,
  payment:   Bell,
};

const CATEGORY_ORDER = ['event', 'challenge', 'game', 'group', 'item', 'payment'];

export const NotificationsTab = ({ user }: { user: UserWithGroups }) => {
  const { t } = useTranslation();
  const { data: notificationTags = [], isLoading } = useNotificationTags(user);
  const { data: topics = [] } = useNotificationTopics();
  const updateNotificationPreferences = useUpdateNotificationPreferences(user);

  const CATEGORY_LABELS: Record<string, { label: string; icon: ElementType }> = {
    event:     { label: t('profile.notifications.categoryEvents'),     icon: CalendarIcon },
    challenge: { label: t('profile.notifications.categoryChallenges'), icon: Trophy },
    game:      { label: t('profile.notifications.categoryGames'),      icon: Swords },
    group:     { label: t('profile.notifications.categoryGroups'),     icon: Users },
    item:      { label: t('profile.notifications.categoryOther'),      icon: Bell },
    payment:   { label: t('profile.notifications.categoryOther'),      icon: Bell },
  };

  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied',
  );
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const VAPID = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string)?.trim();
  const isPWA = useMemo(() => window.matchMedia?.('(display-mode: standalone)').matches ?? false, []);

  useEffect(() => {
    if (isNative) {
      getNativePermission().then((p) => {
        setPermission(p);
        setRegistered(p === 'granted' && hasNativeToken());
      });
      return;
    }
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
      if (isNative) {
        const perm = await enableNativePush();
        setPermission(perm);
        setRegistered(perm === 'granted');
        return;
      }
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== 'granted') return;
      }
      if (!VAPID) throw new Error(t('profile.notifications.vapidMissing'));
      const reg = await getSW();
      const old = await reg.pushManager.getSubscription();
      await old?.unsubscribe().catch(() => { });
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
      if (isNative) {
        await enableNativePush();
        setRegistered(true);
        return;
      }
      if (!VAPID) throw new Error(t('profile.notifications.vapidMissing'));
      const reg = await getSW();
      const old = await reg.pushManager.getSubscription();
      await revokeOnServer(old?.endpoint);
      await old?.unsubscribe().catch(() => { });
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
      if (isNative) {
        await disableNativePush();
        setRegistered(false);
        return;
      }
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
          <div className="font-medium">{t('profile.notifications.notSupported')}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {t('profile.notifications.notSupportedDescription')}
          </div>
        </div>
      </CardContent>
    );
  }

  const installingHint = !isNative && !isPWA
    ? iOS
      ? t('profile.notifications.installHintIos')
      : t('profile.notifications.installHintAndroid')
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
          <span className="text-sm">{t('profile.notifications.permission')}</span>
          {permission === 'granted'
            ? <CheckCircle2 className="size-4 text-green-500" />
            : permission === 'default'
            ? <Info className="size-4 text-blue-500" />
            : <AlertTriangle className="size-4 text-yellow-500" />}
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm">{t('profile.notifications.registered')}</span>
          {registered
            ? <CheckCircle2 className="size-4 text-green-500" />
            : <XCircle className="size-4 text-muted-foreground" />}
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm">{t('profile.notifications.device')}</span>
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{getDeviceId().slice(0, 8)}</span>
        </div>
      </div>

      <Separator />

      {installingHint && (
        <Alert className="px-4 my-2">
          <AlertDescription>{installingHint}</AlertDescription>
        </Alert>
      )}

      {pushError && (
        <Alert variant="destructive" className="px-4 my-2">
          <AlertDescription>{pushError}</AlertDescription>
        </Alert>
      )}

      {permission === 'denied' && (
        <Alert className="px-4 my-2">
          <AlertDescription>
            {t('profile.notifications.deniedAlert')}
          </AlertDescription>
        </Alert>
      )}

      {/* Action buttons */}
      <div className="py-3 flex flex-col gap-2">
        {permission !== 'granted' && (
          <Button onClick={handleEnable} disabled={pushLoading}>
            {pushLoading ? <Spinner className="size-4" /> : t('profile.notifications.enable')}
          </Button>
        )}
        {permission === 'granted' && !registered && (
          <Button onClick={handleEnable} disabled={pushLoading}>
            {pushLoading ? <Spinner className="size-4" /> : t('profile.notifications.registerDevice')}
          </Button>
        )}
        {permission === 'granted' && registered && (
          <>
            <Button variant="outline" onClick={handleRebind} disabled={pushLoading}>
              {pushLoading ? <Spinner className="size-4" /> : t('profile.notifications.rebind')}
            </Button>
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDisable} disabled={pushLoading}>
              {pushLoading ? <Spinner className="size-4" /> : t('profile.notifications.disable')}
            </Button>
          </>
        )}
      </div>

      {/* Topic toggles — only when permission granted */}
      {permission === 'granted' && (
        <>
          <Separator />
          {orderedEntries.map(([scopeType, groupTopics], groupIndex) => {
            const cat = CATEGORY_LABELS[scopeType] ?? { label: scopeType, icon: CATEGORY_ICON_MAP[scopeType] ?? Bell };
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
