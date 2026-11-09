import { ListError, ListSectionHeader, ListSkeleton, sideBar } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useAllNotifications, useDismissNotification, useMarkNotificationsAsRead } from '@/tanstack/notifications';
import { useGrants } from '../auth/GrantsContext';

import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { useDialogs } from '@/contexts/DialogsProvider';
import { cn } from '@/lib/utils';
import { Json } from '@/types/supabase-generated.types';
import { Bell, BellOff, ChevronRight, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

function hasStringUrl(value: Json): value is { url: string } {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'url' in value && typeof value.url === 'string';
}

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const NotificationScreen = () => {
  const { t, i18n } = useTranslation();
  const { user } = useGrants();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const { data: notifications = [], isLoading, isError, refetch } = useAllNotifications(user);
  // eslint-disable-next-line @eslint-react/naming-convention/use-state
  const [now] = useState(() => new Date());

  const dismissNotification = useDismissNotification();
  const clearAll = useMarkNotificationsAsRead(user);

  const days = useMemo(() => {
    const groups = new Map<string, typeof notifications>();
    for (const notification of notifications) {
      const key = dayKey(new Date(notification.created_at));
      groups.set(key, [...(groups.get(key) ?? []), notification]);
    }
    return [...groups.entries()];
  }, [notifications]);

  const unread = notifications.filter((x) => !x.dismissed_at).length;

  const language = i18n.resolvedLanguage;
  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  const dayLabel = (key: string) => {
    if (key === dayKey(now)) return relative.format(0, 'day');
    if (key === dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return relative.format(-1, 'day');
    return new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long' }).format(
      new Date(`${key}T12:00:00`)
    );
  };
  const timeFormat = new Intl.DateTimeFormat(language, { timeStyle: 'short' });

  const confirmClearAll = async () => {
    const confirmed = await dialogs.confirm(t('notifications.screen.clearTitle'), {
      message: t('notifications.screen.clearDescription'),
      okText: t('notifications.screen.clearConfirm'),
    });
    if (confirmed) clearAll.mutate();
  };

  const open = (notification: (typeof notifications)[number]) =>
    dismissNotification.mutate(
      { notficationId: notification.id },
      {
        onSettled: () => {
          if (notification.data && hasStringUrl(notification.data)) navigate(notification.data.url);
        },
      }
    );

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={t('notifications.screen.title')}
        user={user}
        actions={
          <Button
            disabled={notifications.length === 0 || clearAll.isPending}
            variant="ghost"
            size="icon-lg"
            aria-label={t('notifications.screen.clear')}
            onClick={confirmClearAll}
          >
            <Trash2 />
          </Button>
        }
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh onRefresh={() => refetch()}>
          <div className='flex flex-col gap-2 p-4'>
            {isLoading && <ListSkeleton rows={6} />}

            {!isLoading && isError && (
              <ListError
                title={t('notifications.screen.loadError')}
                retryLabel={t('challenge.list.retry')}
                onRetry={() => refetch()}
              />
            )}

            {!isLoading && !isError && notifications.length === 0 && (
              <Empty className="mt-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BellOff />
                  </EmptyMedia>
                  <EmptyTitle>{t('notifications.screen.empty')}</EmptyTitle>
                  <EmptyDescription>{t('notifications.screen.emptyDescription')}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {!isLoading && !isError && days.map(([key, list], index) => (
              <section key={key} className="flex flex-col gap-2">
                <ListSectionHeader
                  title={dayLabel(key)}
                  count={index === 0 && unread > 0 ? unread : undefined}
                  className={index === 0 ? undefined : 'pt-4'}
                />
                {list.map((notification) => {
                  const isUnread = !notification.dismissed_at;
                  const hasLink = !!notification.data && hasStringUrl(notification.data);
                  return (
                    <Item
                      key={notification.id}
                      variant="outline"
                      role="button"
                      tabIndex={0}
                      className={cn('cursor-pointer', sideBar(isUnread ? 'primary' : 'neutral'))}
                      onClick={() => open(notification)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          open(notification);
                        }
                      }}
                    >
                      <ItemMedia variant="icon">
                        <Bell className={cn(!isUnread && 'text-muted-foreground')} />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className={cn(!isUnread && 'font-normal text-muted-foreground')}>
                          {notification.title}
                        </ItemTitle>
                        {notification.body && <ItemDescription className="line-clamp-3">{notification.body}</ItemDescription>}
                        <span className="text-xs text-muted-foreground">
                          {timeFormat.format(new Date(notification.created_at))}
                        </span>
                      </ItemContent>
                      {hasLink && (
                        <ItemActions>
                          <ChevronRight className='size-5 text-muted-foreground' />
                        </ItemActions>
                      )}
                    </Item>
                  );
                })}
              </section>
            ))}
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default NotificationScreen;
