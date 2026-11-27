import { SplitView } from '@/components/layout/SplitView';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { useIsWide } from '@/hooks/use-mobile';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Outlet, useMatch } from 'react-router';
import EventScreen from './EventList';

/** /training/list and /training/event/:id: on wide screens the list stays on the left and the event opens on the right. */
const EventsSplitView = () => {
  const { t } = useTranslation();
  const isWide = useIsWide();
  const selectedEventId = useMatch('/training/event/:selectedEventId')?.params.selectedEventId;

  if (!isWide) return <Outlet />;

  return (
    <SplitView
      list={<EventScreen selectedEventId={selectedEventId} />}
      detail={selectedEventId ? <Outlet /> : (
        <Empty className="m-auto">
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
            <EmptyTitle>{t('events.list.noneSelected')}</EmptyTitle>
            <EmptyDescription>{t('events.list.noneSelectedDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    />
  );
};

export default EventsSplitView;
