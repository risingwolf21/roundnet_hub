import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useAllNotifications, useDismissNotification, useMarkNotificationsAsRead } from '@/tanstack/notifications';
import Layout from '../../components/layout/Layout';
import { useGrants } from '../auth/GrantsContext';

import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { Json } from '@/types/supabase-generated.types';
import { ChevronRight, Mail, MailOpen, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { NotificationScreen } from './NotificationScreen';

const NotificationsPage = ({ isShadcn }: { isShadcn: boolean }) => {
  if (isShadcn) {
    return <NotificationScreenShadcn />
  }
  return (
    <Layout>
      <NotificationScreen />
    </Layout>
  );
};

function hasStringUrl(value: Json): value is { url: string } {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'url' in value && typeof value.url === 'string';
}

const NotificationScreenShadcn = () => {
  const { user } = useGrants();
  const navigate = useNavigate();
  const { data: notifications = [], isLoading, refetch } = useAllNotifications(user);

  const dismissNotification = useDismissNotification();
  const markNotificationsAsRead = useMarkNotificationsAsRead(user);

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title="Benachrichtigungen"
        user={user}
        actions={
          <Button disabled={notifications.length === 0} variant={"ghost"} size={"icon-lg"} onClick={() => {
            markNotificationsAsRead.mutate();
          }}>
            <Trash2 />
          </Button>
        }
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh onRefresh={() => refetch()}>
          <div className='flex gap-2 p-2 flex-col'>

            {isLoading && (
              Array.from({ length: 6 }).map((_, index) => (
                <Item variant="outline" key={`skeleton-${index}`}>
                  <ItemMedia variant="icon">
                    <Skeleton className="size-6 rounded-full" />
                  </ItemMedia>
                  <ItemContent className="flex flex-col gap-1.5 w-full">
                    {/* Titel Platzhalter */}
                    <Skeleton className="h-5 w-2/3" />
                    {/* Body Platzhalter (2 Zeilen) */}
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  </ItemContent>
                  <ItemActions>
                    <Skeleton className="size-5 rounded" />
                  </ItemActions>
                </Item>
              ))
            )}

            {!isLoading && notifications.length === 0 && (
              <div className='flex h-[50vh] flex-col justify-center'>
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <MailOpen className="size-12 mb-4 opacity-20" />
                  <p>Du hast keine neuen Benachrichtigungen.</p>
                </div>
              </div>
            )}

            {!isLoading && notifications.length > 0 && notifications.map((notification) => (
              <Item variant={"outline"} key={notification.id} onClick={() => {
                dismissNotification.mutate({ notficationId: notification.id }, {
                  onSettled: () => {
                    if (notification.data && hasStringUrl(notification.data))
                      navigate(notification.data.url)
                  }
                })
              }}>
                <ItemMedia variant={"icon"}>
                  {
                    notification.dismissed_at ? <MailOpen /> : <Mail />
                  }
                </ItemMedia>
                <ItemContent>

                  <ItemTitle>
                    {notification.title}
                  </ItemTitle>
                  <ItemDescription>
                    {notification.body}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight className='size-5' />
                </ItemActions>
              </Item>
            ))}
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default NotificationsPage;
