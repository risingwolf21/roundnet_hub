import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useFetchMode } from '@/hooks/useFetchMode';
import { Has } from '@/hooks/useGrants';
import { sendMetricsToSentry } from '@/instrument';
import { useEvents, useUpdateAttendanceMutation } from '@/tanstack/events';
import { EventsUserView } from '@/types/supabaseTypes';
import { withProfiler } from '@sentry/react';
import { endOfISOWeek, format, getISOWeek, startOfISOWeek } from 'date-fns';
import { useTranslation } from 'react-i18next';
import groupBy from 'lodash.groupby';
import { CalendarArrowDown, CalendarArrowUp, CalendarSync, CalendarX, Filter, Plus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import { EventItem } from './components/EventItem';
import { CreateOrUpdateEventDialog } from './dialogs/CreateOrUpdateEventDialog';

const EventScreen = () => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const navigate = useNavigate();
  const [fetchMode, setFetchMode] = useFetchMode();

  const { data: events = [], isLoading, error, refetch } = useEvents(fetchMode);

  useEffect(() => {
    if (error)
      toast.error(error.message, {
        action: {
          label: t('events.list.reload'),
          onClick: () => refetch()
        }
      });
  }, [error, refetch, t]);

  const updateAttendance = useUpdateAttendanceMutation();

  const eventsByWeek = useMemo(
    () => Object.entries(groupBy(events, (x) => startOfISOWeek(x.startingDateTime))),
    [events]
  );

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={t('events.list.title')}
        user={user}
        actions={
          <>
            <Has perm={"event.edit"}>
              <Button variant={"ghost"} size={"icon-lg"} onClick={() => dialogs.open(CreateOrUpdateEventDialog, { option: 'InsertEvent' })}>
                <Plus />
              </Button>
            </Has>
            <Button variant={"ghost"} size={"icon-lg"} onClick={async () => {
              const result = await dialogs.selectSingleOption<'past' | 'upcoming'>([
                { value: 'past', label: t('events.list.past'), icon: <CalendarArrowDown /> },
                { value: 'upcoming', label: t('events.list.upcoming'), icon: <CalendarArrowUp /> }
              ], fetchMode);
              if (result) setFetchMode(result)
            }}>
              <Filter />
            </Button>
            <Has perm={"event.edit"}>
              <Button variant={"ghost"} size={"icon-lg"} onClick={() => navigate("/training/recurringEvents")}>
                <CalendarSync />
              </Button>
            </Has>
          </>
        }
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh onRefresh={() => refetch()}>
          <div className="flex p-4 flex-col space-y-2">

            {isLoading && (
              <div className="flex flex-col space-y-6">
                {/* Wir simulieren 2 Wochen-Gruppen */}
                {Array.from({ length: 2 }).map((_, groupIndex) => (
                  <div key={`skeleton-group-${groupIndex}`} className="flex w-full gap-2 flex-col">
                    {/* Wochen-Überschrift Skeleton */}
                    <Skeleton className="h-5 w-32 ml-2 mb-1" />

                    {/* 2-3 Event-Karten Skeletons pro Woche */}
                    {Array.from({ length: groupIndex === 0 ? 3 : 2 }).map((_, itemIndex) => (
                      <div key={`skeleton-item-${itemIndex}`} className="flex flex-col p-4 border rounded-xl shadow-sm bg-background gap-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2 w-2/3">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                          <Skeleton className="size-10 rounded-full" /> {/* Simuliertes Avatar/Icon */}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Skeleton className="h-9 flex-1 rounded-md" /> {/* Button Platzhalter */}
                          <Skeleton className="h-9 flex-1 rounded-md" /> {/* Button Platzhalter */}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Leerer Zustand (Empty State) */}
            {!isLoading && events.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 mt-12 text-center text-muted-foreground">
                <CalendarX className="size-16 mb-4 opacity-20" />
                <h3 className="font-semibold text-lg mb-1 text-foreground/70">{t('events.list.empty')}</h3>
                <p className="text-sm mb-1">{t('events.list.emptyDescription')}</p>
                <p className='text-sm mb-1'>{t('events.list.joinGroupHint')}</p>
                <Button onClick={() => navigate('/groups/list')}>{t('events.list.joinGroup')}</Button>
              </div>
            )}

            {!isLoading && events.length > 0 && eventsByWeek.map(
              ([key, value]: [string, EventsUserView[]]) => (
                <div key={key} className="flex w-full gap-2 flex-col">
                  <div className="text-sm font-semibold ml-2">
                    {getISOWeek(key) === getISOWeek(new Date())
                      ? t('events.list.thisWeek')
                      : getISOWeek(key) === getISOWeek(new Date()) + 1
                        ? t('events.list.nextWeek')
                        : format(key, 'dd.MM.yyyy') + ' - ' + format(endOfISOWeek(key), 'dd.MM.yyyy')}
                  </div>
                  {value.map((event: EventsUserView) => (
                    <EventItem
                      key={event.id}
                      event={event}
                      t={t}
                      attendanceUpdating={updateAttendance.isPending && updateAttendance.context?.event.id === event.id}
                      attendEvent={() => {
                        updateAttendance.mutate({ event, user, newState: 'Attending' });
                        sendMetricsToSentry('event_attend_from_list', 1);
                      }}
                      declineEvent={() => {
                        updateAttendance.mutate({ event, user, newState: 'Declined' });
                        sendMetricsToSentry('event_decline_from_list', 1);
                      }}
                      onClick={() => {
                        navigate('/training/event/' + event.id);
                      }}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default withProfiler(EventScreen);
