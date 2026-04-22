import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useFetchMode } from '@/hooks/useFetchMode';
import { Has } from '@/hooks/useGrants';
import { sendMetricsToSentry } from '@/instrument';
import { useEvents, useUpdateAttendanceMutation } from '@/tanstack/events';
import { EventsUserView } from '@/types/supabaseTypes';
import AddIcon from '@mui/icons-material/Add';
import { withProfiler } from '@sentry/react';
import { endOfISOWeek, format, getISOWeek, startOfISOWeek } from 'date-fns';
import { t } from 'i18next';
import groupBy from 'lodash.groupby';
import { CalendarArrowDown, CalendarArrowUp, CalendarSync, CalendarX, Filter } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import { EventItemShadcn } from './components/EventItem';
import { CreateOrUpdateEventDialogShadcn } from './dialogs/CreateOrUpdateEventDialog.shadcn';

const EventScreen = () => {
  const { user } = useGrants();
  const dialogs = useDialogs();
  const navigate = useNavigate();
  const [fetchMode, setFetchMode] = useFetchMode();

  const { data: events = [], isLoading, error, refetch } = useEvents(fetchMode);

  useEffect(() => {
    if (error)
      toast.error(error.message, {
        action: {
          label: "Neu laden",
          onClick: () => refetch()
        }
      });
  }, [error, refetch]);

  const updateAttendance = useUpdateAttendanceMutation(fetchMode);

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title="Events Übersicht"
        user={user}
        actions={
          <>
            <Has perm={"event.edit"}>
              <Button variant={"ghost"} size={"icon-lg"} onClick={() => dialogs.open(CreateOrUpdateEventDialogShadcn, { option: 'InsertEvent' })}>
                <AddIcon />
              </Button>
            </Has>
            <Button variant={"ghost"} size={"icon-lg"} onClick={async () => {
              const result = await dialogs.selectSingleOption<'past' | 'upcoming'>([
                { value: 'past', label: 'Vergangene Events', icon: <CalendarArrowDown /> },
                { value: 'upcoming', label: 'Kommende Events', icon: <CalendarArrowUp /> }
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
                <h3 className="font-semibold text-lg mb-1 text-foreground/70">Keine Events</h3>
                <p className="text-sm mb-1">Aktuell stehen keine Termine an.</p>
                <p className='text-sm mb-1'>Versuche einer Gruppe beizutreten um Events einzusehen</p>
                <Button onClick={() => navigate('/groups/list')}>Gruppe beitreten</Button>
              </div>
            )}

            {!isLoading && events.length > 0 && Object.entries(groupBy(events, (x) => startOfISOWeek(x.startingDateTime))).map(
              ([key, value]: [string, EventsUserView[]]) => (
                <div key={key} className="flex w-full gap-2 flex-col">
                  <div className="text-sm font-semibold ml-2">
                    {getISOWeek(key) === getISOWeek(new Date())
                      ? 'Diese Woche'
                      : getISOWeek(key) === getISOWeek(new Date()) + 1
                        ? 'Nächste Woche'
                        : format(key, 'dd.MM.yyyy') + ' - ' + format(endOfISOWeek(key), 'dd.MM.yyyy')}
                  </div>
                  {value.map((event: EventsUserView) => (
                    <EventItemShadcn
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
