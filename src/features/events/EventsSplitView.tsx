import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { useIsWide } from '@/hooks/use-mobile';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet, useMatch } from 'react-router';
import EventScreen from './EventList';

/** /training/list and /training/event/:id: on wide screens the event table stays and the event opens in a panel on the right. */
const EventsSplitView = () => {
  const { t } = useTranslation();
  const isWide = useIsWide();
  const selectedEventId = useMatch('/training/event/:selectedEventId')?.params.selectedEventId;

  if (!isWide) return <Outlet />;

  // Like the admin user table: the table grows up to about its natural width,
  // the event panel takes all the rest and never gets narrower than a phone (360 px).
  return (
    <div className="flex h-svh">
      <div className="w-full min-w-0 max-w-[52rem] overflow-y-auto">
        <EventScreen selectedEventId={selectedEventId} />
      </div>
      <aside className="flex min-w-[22.5rem] flex-1 flex-col overflow-y-auto border-l bg-muted/30">
        {selectedEventId ? <Outlet /> : (
          <Empty className="m-auto">
            <EmptyHeader>
              <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
              <EmptyTitle>{t('events.list.noneSelected')}</EmptyTitle>
              <EmptyDescription>{t('events.list.noneSelectedDescription')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </aside>
    </div>
  );
};

export default EventsSplitView;
