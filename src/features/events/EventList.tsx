import { ListError, ListSectionHeader, ListSkeleton, SegmentedControl } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useFetchMode } from '@/hooks/useFetchMode';
import { Has } from '@/hooks/useGrants';
import { sendMetricsToSentry } from '@/instrument';
import { useEvents, useOtherEvents, useUpdateAttendanceMutation } from '@/tanstack/events';
import { answerDeadlineExpired, answerNotOpenYet, eventHasStarted, EventsUserView } from '@/types/supabaseTypes';
import { withProfiler } from '@sentry/react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import groupBy from 'lodash.groupby';
import { CalendarCheck, CalendarSearch, CalendarSync, CalendarX, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useGrants } from '../auth/GrantsContext';
import { EventItem } from './components/EventItem';
import { CreateOrUpdateEventDialog } from './dialogs/CreateOrUpdateEventDialog';

type EventView = 'upcoming' | 'open' | 'past' | 'other';

const needsAnswer = (x: EventsUserView) =>
  x.user_state === null && !x.isCancelled && !answerNotOpenYet(x) && !answerDeadlineExpired(x) && !eventHasStarted(x);

const EventScreen = () => {
  const { t, i18n } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const navigate = useNavigate();
  const [fetchMode, setFetchMode] = useFetchMode();
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [showOther, setShowOther] = useState(false);
  // eslint-disable-next-line @eslint-react/naming-convention/use-state
  const [today] = useState(() => new Date());

  const myEvents = useEvents(fetchMode);
  const otherEvents = useOtherEvents(showOther);
  const { data: events = [], isLoading, error, refetch } = showOther ? otherEvents : myEvents;
  const updateAttendance = useUpdateAttendanceMutation();

  const view: EventView = showOther ? 'other' : fetchMode === 'past' ? 'past' : onlyOpen ? 'open' : 'upcoming';
  const openCount = fetchMode === 'upcoming' ? (myEvents.data ?? []).filter(needsAnswer).length : 0;
  const visibleEvents = view === 'open' ? events.filter(needsAnswer) : events;

  const changeView = (next: EventView) => {
    setShowOther(next === 'other');
    if (next === 'other') return;
    setOnlyOpen(next === 'open');
    setFetchMode(next === 'past' ? 'past' : 'upcoming');
  };

  const eventsByDay = useMemo(
    () => Object.entries(groupBy(visibleEvents, (x) => format(x.startingDateTime, 'yyyy-MM-dd'))),
    [visibleEvents]
  );

  // "Today" / "Tomorrow" in the user's language, then the full date, e.g. "Today · Thursday, 5 June".
  const dayTitle = (key: string) => {
    const day = parseISO(key);
    const full = new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'long', day: 'numeric', month: 'long' }).format(day);
    const offset = differenceInCalendarDays(day, today);
    if (Math.abs(offset) > 1) return full;
    const relative = new Intl.RelativeTimeFormat(i18n.resolvedLanguage, { numeric: 'auto' }).format(offset, 'day');
    return `${relative.charAt(0).toLocaleUpperCase(i18n.resolvedLanguage)}${relative.slice(1)} · ${full}`;
  };

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={t('events.list.title')}
        user={user}
        actions={
          <>
            <Has perm={"event.edit"}>
              <Button variant={"ghost"} size={"icon-lg"} aria-label={t('events.list.create')} onClick={() => dialogs.open(CreateOrUpdateEventDialog, { option: 'InsertEvent' })}>
                <Plus />
              </Button>
            </Has>
            <Has perm={"event.edit"}>
              <Button variant={"ghost"} size={"icon-lg"} aria-label={t('events.list.recurring')} onClick={() => navigate("/training/recurringEvents")}>
                <CalendarSync />
              </Button>
            </Has>
          </>
        }
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <div className="mx-auto max-w-5xl px-4 pt-3">
          <SegmentedControl<EventView>
            ariaLabel={t('events.list.title')}
            value={view}
            onChange={changeView}
            options={[
              { value: 'upcoming', label: t('events.list.tabUpcoming') },
              { value: 'open', label: t('events.list.tabOpen'), count: openCount },
              { value: 'past', label: t('events.list.tabPast') },
              { value: 'other', label: t('events.list.tabOther') },
            ]}
          />
        </div>
        <PullToRefresh onRefresh={() => refetch()}>
          <div className="mx-auto flex max-w-5xl flex-col gap-2 p-4 pt-2">
            {isLoading && <ListSkeleton rows={5} />}

            {!isLoading && error && (
              <ListError
                title={t('events.list.loadError')}
                description={error.message}
                retryLabel={t('events.list.reload')}
                onRetry={() => refetch()}
              />
            )}

            {!isLoading && !error && visibleEvents.length === 0 && (
              <Empty className="mt-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    {view === 'open' ? <CalendarCheck /> : view === 'other' ? <CalendarSearch /> : <CalendarX />}
                  </EmptyMedia>
                  <EmptyTitle>
                    {view === 'open' ? t('events.list.allAnswered') : view === 'other' ? t('events.list.emptyOther') : t('events.list.empty')}
                  </EmptyTitle>
                  <EmptyDescription>
                    {view === 'open'
                      ? t('events.list.allAnsweredDescription')
                      : view === 'past'
                        ? t('events.list.emptyPast')
                        : view === 'other'
                          ? t('events.list.emptyOtherDescription')
                          : t('events.list.emptyDescription')}
                  </EmptyDescription>
                  {view === 'upcoming' && <EmptyDescription>{t('events.list.joinGroupHint')}</EmptyDescription>}
                </EmptyHeader>
                {view === 'upcoming' && (
                  <Button onClick={() => navigate('/groups/list')}>{t('events.list.joinGroup')}</Button>
                )}
              </Empty>
            )}

            {!isLoading && !error && eventsByDay.map(([key, value]: [string, EventsUserView[]]) => (
              <section key={key} className="flex w-full flex-col gap-2">
                <ListSectionHeader title={dayTitle(key)} count={value.length} />
                {value.map((event) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    readOnly={view === 'other'}
                    attendanceUpdating={updateAttendance.isPending && updateAttendance.context?.event.id === event.id}
                    attendEvent={() => {
                      updateAttendance.mutate({ event, user, newState: 'Attending' });
                      sendMetricsToSentry('event_attend_from_list', 1);
                    }}
                    declineEvent={() => {
                      updateAttendance.mutate({ event, user, newState: 'Declined' });
                      sendMetricsToSentry('event_decline_from_list', 1);
                    }}
                    onClick={() => navigate('/training/event/' + event.id)}
                  />
                ))}
              </section>
            ))}
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default withProfiler(EventScreen);
