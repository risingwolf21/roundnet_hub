import { getDeviceId } from "@/hooks/useDeviceId";
import { PUSH_OPTED_OUT_KEY } from "@/features/push/WebPushKeeper";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { useNotificationTags, useNotificationTopics, useUpdateNotificationPreferences } from "@/tanstack/notifications";
import { UserWithGroups } from "@/types/supabaseTypes";
import { iOS } from "@/utils";
import { AlertTriangle, Bell, BellOff, BellRing, CalendarIcon, Info, LucideIcon, RefreshCw, Swords, Trophy, Users } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
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

// The browser can still hold a subscription the server has revoked; only an active server row receives pushes.
async function isActiveOnServer(endpoint: string) {
  const { data } = await supabase
    .schema('notifications')
    .from('web_push_subscriptions')
    .select('id')
    .eq('endpoint', endpoint)
    .is('revoked_at', null)
    .maybeSingle();
  return !!data;
}

// ---------------------------------------------------------------------------

const isNotificationSupported =
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

// item and payment share the "Other" card.
const CATEGORIES: { key: string; scopes: string[]; label: string; icon: LucideIcon }[] = [
  { key: 'event',     scopes: ['event'],           label: 'profile.notifications.categoryEvents',     icon: CalendarIcon },
  { key: 'challenge', scopes: ['challenge'],       label: 'profile.notifications.categoryChallenges', icon: Trophy },
  { key: 'game',      scopes: ['game'],            label: 'profile.notifications.categoryGames',      icon: Swords },
  { key: 'group',     scopes: ['group'],           label: 'profile.notifications.categoryGroups',     icon: Users },
  { key: 'other',     scopes: ['item', 'payment'], label: 'profile.notifications.categoryOther',      icon: Bell },
];

const Section = ({ icon: Icon, title, badge, children }: { icon: LucideIcon; title: string; badge?: ReactNode; children: ReactNode }) => (
  <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
    <header className="flex items-center gap-2 text-sm font-semibold">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {badge}
    </header>
    {children}
  </section>
);

export const NotificationsTab = ({ user }: { user: UserWithGroups }) => {
  const { t } = useTranslation();
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
        setRegistered(!!sub && (await isActiveOnServer(sub.endpoint)));
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
      if (!VAPID) throw new Error(t('profile.notifications.vapidMissing'));
      const reg = await getSW();
      const old = await reg.pushManager.getSubscription();
      await old?.unsubscribe().catch(() => { });
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });
      await registerOnServer(sub);
      localStorage.removeItem(PUSH_OPTED_OUT_KEY);
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
      localStorage.removeItem(PUSH_OPTED_OUT_KEY);
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
      localStorage.setItem(PUSH_OPTED_OUT_KEY, '1');
      setRegistered(false);
    } catch (e) {
      setPushError(e instanceof Error ? e.message : String(e));
    } finally {
      setPushLoading(false);
    }
  };

  if (!isNotificationSupported) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-4 py-8 text-center">
        <BellOff className="size-10 text-muted-foreground" />
        <div>
          <div className="text-sm font-medium">{t('profile.notifications.notSupported')}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t('profile.notifications.notSupportedDescription')}
          </div>
        </div>
      </div>
    );
  }

  const active = permission === 'granted' && registered;
  const status = active
    ? { badge: 'success' as const, label: t('profile.notifications.statusOn'), text: t('profile.notifications.statusOnDescription') }
    : permission === 'denied'
    ? { badge: 'warning' as const, label: t('profile.notifications.statusBlocked'), text: t('profile.notifications.statusBlockedDescription') }
    : { badge: 'secondary' as const, label: t('profile.notifications.statusOff'), text: t('profile.notifications.statusOffDescription') };

  const installingHint = !isPWA && !active
    ? iOS
      ? t('profile.notifications.installHintIos')
      : t('profile.notifications.installHintAndroid')
    : undefined;

  // The optimistic update appends, so the newest entry for a topic wins.
  const isEnabled = (topic: (typeof topics)[number]) =>
    notificationTags.findLast(tag => tag.topic === topic.topic)?.enabled ?? topic.default_enabled ?? true;

  const categories = [
    ...CATEGORIES,
    ...[...new Set(topics.map(topic => topic.scope_type ?? 'other'))]
      .filter(scope => !CATEGORIES.some(c => c.scopes.includes(scope)))
      .map(scope => ({ key: scope, scopes: [scope], label: scope, icon: Bell })),
  ]
    .map(c => ({ ...c, topics: topics.filter(topic => c.scopes.includes(topic.scope_type ?? 'other')) }))
    .filter(c => c.topics.length > 0);

  return (
    <div className="flex flex-col gap-3">
      <Section
        icon={active ? BellRing : BellOff}
        title={t('profile.notifications.thisDevice')}
        badge={<Badge variant={status.badge}>{status.label}</Badge>}
      >
        <label htmlFor="push-this-device" className="flex cursor-pointer items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{t('profile.notifications.pushOnThisDevice')}</div>
            <div className="text-xs text-muted-foreground">{status.text}</div>
          </div>
          {pushLoading ? <Spinner /> : (
            <Switch
              id="push-this-device"
              checked={active}
              disabled={permission === 'denied'}
              onCheckedChange={(on) => (on ? handleEnable() : handleDisable())}
            />
          )}
        </label>

        {installingHint && (
          <Alert variant="info">
            <Info />
            <AlertDescription>{installingHint}</AlertDescription>
          </Alert>
        )}

        {permission === 'denied' && (
          <Alert variant="warning">
            <AlertTriangle />
            <AlertDescription>{t('profile.notifications.deniedAlert')}</AlertDescription>
          </Alert>
        )}

        {pushError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertDescription>{pushError}</AlertDescription>
          </Alert>
        )}

        {active && (
          <div className="flex items-center gap-3 border-t pt-4">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{t('profile.notifications.noPushesArriving')}</div>
              <div className="text-xs text-muted-foreground">{t('profile.notifications.rebindDescription')}</div>
            </div>
            <Button variant="outline" size="sm" onClick={handleRebind} disabled={pushLoading}>
              <RefreshCw />
              {t('profile.notifications.rebind')}
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {t('profile.notifications.device')} <code className="rounded bg-muted px-1.5 py-0.5">{getDeviceId().slice(0, 8)}</code>
        </div>
      </Section>

      {permission === 'granted' && categories.length > 0 && (
        <>
          <p className="px-1 pt-2 text-xs text-muted-foreground">{t('profile.notifications.topicsHint')}</p>
          {categories.map(category => {
            const enabledCount = category.topics.filter(isEnabled).length;
            return (
              <Section
                key={category.key}
                icon={category.icon}
                title={t(category.label)}
                badge={
                  <Badge variant={enabledCount === 0 ? 'secondary' : 'outline'}>
                    {t('profile.notifications.enabledCount', { count: enabledCount, total: category.topics.length })}
                  </Badge>
                }
              >
                {category.topics.map(topic => (
                  <label key={topic.topic} htmlFor={`switch-${topic.topic}`} className="flex cursor-pointer items-center gap-3">
                    <div className="min-w-0 flex-1 text-sm font-medium">
                      {t(`profile.notifications.topics.${topic.topic.replaceAll('.', '_')}`, { defaultValue: topic.description ?? topic.topic })}
                    </div>
                    {isLoading ? <Spinner /> : (
                      <Switch
                        id={`switch-${topic.topic}`}
                        checked={isEnabled(topic)}
                        onCheckedChange={(newValue) =>
                          updateNotificationPreferences.mutate({ topic: topic.topic, enabled: newValue, scopeType: topic.scope_type })
                        }
                      />
                    )}
                  </label>
                ))}
              </Section>
            );
          })}
        </>
      )}
    </div>
  );
};
