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

  // Like the admin user table: the table takes the room, the event page keeps its phone width in the panel.
  return (
    <div className="flex h-svh">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <EventScreen selectedEventId={selectedEventId} />
      </div>
      <aside className="flex w-[25rem] shrink-0 flex-col overflow-y-auto border-l bg-muted/30">
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
