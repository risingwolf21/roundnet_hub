import { groupSideBar, ListSkeleton } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { TrialHomeSection } from '@/features/trials/TrialHomeSection';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Feature } from '@/generated/supabase-types';
import { Has } from '@/hooks/useGrants';
import { queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useDrinks, useInsertHistoryEntryMutation } from '@/tanstack/drinks';
import { useEvents, useUpdateAttendanceMutation } from '@/tanstack/events';
import { useAllItems } from '@/tanstack/items';
import { useAllNotifications } from '@/tanstack/notifications';
import { answerDeadlineExpired, answerNotOpenYet, eventHasStarted, eventInThePast, EventsUserView } from '@/types/supabaseTypes';
import { withProfiler } from '@sentry/react';
import { differenceInCalendarDays, format } from 'date-fns';
import {
  AlertCircle,
  Bell,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  Euro,
  Hourglass,
  Image,
  Key,
  MapPin,
  Megaphone,
  Plus,
  Receipt,
  Search,
  Swords,
  Target,
  Trophy,
  Users,
  Volleyball,
  X,
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import { EventItem } from '../events/components/EventItem';
import { PlaceType } from '../events/types';

const UPCOMING_LIMIT = 5;

const parsePlace = (place: string | null): Partial<PlaceType> => {
  try {
    return JSON.parse(place ?? '{}') as PlaceType;
  } catch {
    return {};
  }
};

const nextAttendance = (event: EventsUserView): EventAttendance =>
  event.user_group_role === 'trial' ? 'AttendingAsTrial' : 'Attending';

const SectionHeader = ({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) => (
  <div className="flex items-center justify-between px-2">
    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
    {actionLabel && onAction && (
      <Button variant="ghost" size="sm" onClick={onAction}>
        {actionLabel}
        <ChevronRight />
      </Button>
    )}
  </div>
);

const SectionMessage = ({ message, error, onRetry }: { message: string; error?: boolean; onRetry?: () => void }) => {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm',
        error ? 'border-destructive/50 text-destructive' : 'text-muted-foreground'
      )}
    >
      {error && <AlertCircle className="size-4 shrink-0" />}
      <span className="flex-1">{message}</span>
      {error && onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('challenge.list.retry')}
        </Button>
      )}
    </div>
  );
};

const NextEventCard = ({
  event,
  now,
  pending,
  onOpen,
  onAnswer,
}: {
  event: EventsUserView;
  now: Date;
  pending: boolean;
  onOpen: () => void;
  onAnswer: (state: EventAttendance) => void;
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage;
  const start = new Date(event.startingDateTime);
  const end = new Date(event.endDateTime);
  const place = parsePlace(event.place);

  const days = differenceInCalendarDays(start, now);
  const when = new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(Math.max(days, 0), 'day');
  const dateText = new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long' }).format(start);
  const time = new Intl.DateTimeFormat(language, { timeStyle: 'short' });
  const timeText = `${time.format(start)} – ${time.format(end)}`;

  const attending = event.user_state === 'Attending' || event.user_state === 'AttendingAsTrial';
  const declined = event.user_state === 'Declined';
  const waiting =
    event.user_state === 'Waiting' || event.user_state === 'WaitingAsTrial' || event.user_state === 'RequestedAttendance';
  const trainer = event.user_state === 'AttendingAsTrainer';
  const notOpenYet = answerNotOpenYet(event);
  const opensLater = event.user_state === null && notOpenYet;
  const needsAnswer = event.user_state === null && !notOpenYet && !answerDeadlineExpired(event) && !eventHasStarted(event);
  const cannotDecline = eventHasStarted(event) || notOpenYet;
  const cannotAttend = answerDeadlineExpired(event) || eventHasStarted(event) || notOpenYet;
  const count = event.attending_count ?? 0;

  return (
    <section
      className={cn('flex flex-col gap-3 rounded-xl border bg-card p-4', groupSideBar(event.group?.color).className)}
      style={groupSideBar(event.group?.color).style}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('home.nextEvent')}</span>
        <Badge variant={days <= 0 ? 'warning' : 'secondary'}>
          <span className="inline-block first-letter:uppercase">{when}</span>
        </Badge>
      </div>

      <button type="button" onClick={onOpen} className="flex flex-col gap-2 text-left">
        <span className="text-lg font-semibold leading-tight">{event.title}</span>
        <span className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <CalendarClock className="size-4 shrink-0" />
            {dateText}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" />
            {timeText}
          </span>
          {place.name && (
            <span className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">{place.name}</span>
            </span>
          )}
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-1.5">
        {event.group && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: event.group.color }} />
            {event.group.name}
          </span>
        )}
        <Badge variant="secondary">
          <Users />
          {event.maxAttendees ? t('events.item.attendingOfMax', { count, max: event.maxAttendees }) : count}
        </Badge>
        {needsAnswer && <Badge variant="warning">{t('events.item.answerNeeded')}</Badge>}
        {opensLater && event.answerStart && (
          <Badge variant="outline">
            <Clock />
            {t('events.item.opensOn', { date: format(event.answerStart, 'dd.MM. HH:mm') })}
          </Badge>
        )}
      </div>

      {trainer ? (
        <Badge variant="success" className="self-start">
          <Megaphone />
          {t('events.item.trainer')}
        </Badge>
      ) : waiting ? (
        <Badge variant="info" className="self-start">
          <Hourglass />
          {t('events.item.waiting')}
        </Badge>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={declined ? 'ghost' : 'outline'}
            className={cn(declined && 'bg-error text-error-foreground')}
            aria-pressed={declined}
            disabled={cannotDecline || pending}
            onClick={() => onAnswer('Declined')}
          >
            {pending ? <Spinner /> : <X />}
            {t('home.decline')}
          </Button>
          <Button
            // Only filled once you attend: the primary colour (green in Karlsruhe) would read as "attending".
            variant={attending ? 'ghost' : 'outline'}
            className={cn(attending && 'bg-success text-success-foreground')}
            aria-pressed={attending}
            disabled={cannotAttend || pending}
            onClick={() => onAnswer(nextAttendance(event))}
          >
            {pending ? <Spinner /> : <Check />}
            {t('home.attend')}
          </Button>
        </div>
      )}
    </section>
  );
};

const DrinksSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useGrants();
  const { data: drinks = [], isLoading, error, refetch } = useDrinks();
  const updateHistory = useInsertHistoryEntryMutation(user);

  const available = drinks.filter((x: Drink) => !x.deleted && x.active && x.type === 'Drink');

  return (
    <section className="flex flex-col gap-2">
      <SectionHeader title={t('home.drinks')} actionLabel={t('home.seeAll')} onAction={() => navigate('/drinks/list')} />
      {isLoading ? (
        <Skeleton className="h-14 w-full rounded-xl" />
      ) : error ? (
        <SectionMessage error message={t('home.drinksLoadError')} onRetry={() => refetch()} />
      ) : available.length === 0 ? (
        <SectionMessage message={t('home.noDrinksAvailable')} />
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1">
          {available.map((drink: Drink) => {
            const pending = updateHistory.isPending && updateHistory.variables?.drinks.some((x) => x.id === drink.id);
            return (
              <button
                key={drink.id}
                type="button"
                disabled={updateHistory.isPending}
                aria-label={`${t('home.order')}: ${drink.name}`}
                className="flex min-w-44 shrink-0 snap-start items-center gap-3 rounded-xl border bg-card p-2 pr-3 text-left disabled:opacity-60"
                onClick={() =>
                  updateHistory.mutate(
                    { drinks: [{ ...drink, count: 1 }] },
                    {
                      onSuccess: () => toast.info(t('home.drinkBooked')),
                      onError: (error) => toast.error(t('home.drinkBookError', { error: error.message })),
                    }
                  )
                }
              >
                <Avatar className="size-10">
                  <AvatarImage src={drink.imageUrl ?? undefined} />
                  <AvatarFallback>
                    <Image className="size-4 text-muted-foreground/50" />
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate font-medium">{drink.name}</span>
                {pending ? <Spinner /> : <Plus className="size-4 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

const KeysSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useGrants();
  const { data: items = [], isLoading, error, refetch } = useAllItems();

  return (
    <section className="flex flex-col gap-2">
      <SectionHeader title={t('home.keys')} actionLabel={t('home.seeAll')} onAction={() => navigate('/keys')} />
      {isLoading ? (
        <ListSkeleton rows={1} />
      ) : error ? (
        <SectionMessage error message={t('home.keysLoadError')} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <SectionMessage message={t('home.noKeys')} />
      ) : (
        items.map((item) => {
          const mine = item.current_holder === user.id;
          const query = `type=${mine ? 'handover' : 'take'}&key=${encodeURIComponent(item.id)}`;
          return (
            <Item key={item.id} variant="outline">
              <ItemMedia variant="icon">
                <Key style={{ color: item.color }} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{item.name}</ItemTitle>
                <ItemDescription>
                  {mine ? t('home.youHoldKey') : (item.full_current_holder?.name ?? t('keys.screen.noHolder'))}
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button variant={mine ? 'default' : 'outline'} size="sm" onClick={() => navigate(`/keys?${query}`)}>
                  {mine ? t('handover_key') : t('take_key')}
                </Button>
              </ItemActions>
            </Item>
          );
        })
      )}
    </section>
  );
};

type Tile = { key: string; label: string; path: string; icon: ReactNode; feat?: Feature };

const AttentionRow = ({ icon, text, onClick }: { icon: ReactNode; text: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-left text-sm font-medium"
  >
    <span className="text-warning [&>svg]:size-5">{icon}</span>
    <span className="flex-1">{text}</span>
    <ChevronRight className="size-4 text-muted-foreground" />
  </button>
);

const HomePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useGrants();
  // eslint-disable-next-line @eslint-react/naming-convention/use-state
  const [now] = useState(() => new Date());

  // The home page always shows what is coming up, whatever the events list is set to.
  const { data: events = [], isLoading: isEventsLoading, error: eventsError, refetch: refetchEvents } = useEvents('upcoming');
  const { data: notifications = [] } = useAllNotifications(user);
  const updateAttendance = useUpdateAttendanceMutation();

  const upcoming = events
    .filter((x) => !eventInThePast(x))
    .sort((a, b) => new Date(a.startingDateTime).getTime() - new Date(b.startingDateTime).getTime());
  const next = upcoming.find((x) => !x.isCancelled);
  const following = upcoming.filter((x) => x.id !== next?.id).slice(0, UPCOMING_LIMIT);
  const unanswered = upcoming.filter(
    (x) =>
      x.user_state === null && !x.isCancelled && !answerNotOpenYet(x) && !answerDeadlineExpired(x) && !eventHasStarted(x)
  ).length;
  const unreadNotifications = notifications.filter((x) => !x.dismissed_at).length;

  const language = i18n.resolvedLanguage;
  const hour = now.getHours();
  const greeting = hour < 11 ? t('home.greetingMorning') : hour < 18 ? t('home.greetingDay') : t('home.greetingEvening');
  const today = new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'long' }).format(now);

  const pendingFor = (event: EventsUserView) =>
    updateAttendance.isPending && updateAttendance.variables?.event.id === event.id;
  const answer = (event: EventsUserView, newState: EventAttendance) => updateAttendance.mutate({ user, event, newState });

  const tiles: Tile[] = [
    { key: 'events', label: t('navigation.training'), path: '/training/list', icon: <Volleyball />, feat: 'events' },
    { key: 'groups', label: t('navigation.groups'), path: '/groups/list', icon: <Users /> },
    { key: 'games', label: t('navigation.matches'), path: '/matches/list', icon: <Swords />, feat: 'games' },
    { key: 'leaderboard', label: t('navigation.leaderboard'), path: '/matches/leaderboard', icon: <Trophy />, feat: 'games' },
    { key: 'challenges', label: t('navigation.challenges'), path: '/challenges/list', icon: <Target />, feat: 'challenges' },
    { key: 'drinks-payments', label: t('browse.payment'), path: '/drinks/payments', icon: <Euro />, feat: 'drinks' },
    { key: 'costs', label: t('navigation.costs'), path: '/costs', icon: <Receipt />, feat: 'costs' },
    { key: 'bundesliga', label: t('navigation.bundesliga'), path: '/bundesliga', icon: <Trophy />, feat: 'bundesliga' },
    { key: 'search', label: t('navigation.search'), path: '/search', icon: <Search /> },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <AppBar className='!border-b !shadow-sm' title={t('home.title')} user={user} />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh onRefresh={() => queryClient.invalidateQueries({ type: 'active' })}>
          <div className='flex flex-col gap-5 p-4'>
            <header className="flex flex-col gap-0.5 px-2">
              <h1 className="text-2xl font-semibold leading-tight">
                {greeting}, {user.displayName}
              </h1>
              <p className="text-sm text-muted-foreground first-letter:uppercase">{today}</p>
            </header>

            <TrialHomeSection />

            {(unanswered > 0 || unreadNotifications > 0) && (
              <div className="flex flex-col gap-2">
                <Has feat="events">
                  {unanswered > 0 && (
                    <AttentionRow
                      icon={<CalendarClock />}
                      text={t('home.unanswered', { count: unanswered })}
                      onClick={() => navigate('/training/list')}
                    />
                  )}
                </Has>
                {unreadNotifications > 0 && (
                  <AttentionRow
                    icon={<Bell />}
                    text={t('home.unreadNotifications', { count: unreadNotifications })}
                    onClick={() => navigate('/notifications')}
                  />
                )}
              </div>
            )}

            <Has feat="events">
              {isEventsLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-52 w-full rounded-xl" />
                  <ListSkeleton rows={2} />
                </div>
              ) : eventsError ? (
                <SectionMessage error message={t('home.eventsLoadError')} onRetry={() => refetchEvents()} />
              ) : (
                <>
                  {next ? (
                    <NextEventCard
                      event={next}
                      now={now}
                      pending={pendingFor(next)}
                      onOpen={() => navigate(`/training/event/${next.id}`)}
                      onAnswer={(state) => answer(next, state)}
                    />
                  ) : (
                    <SectionMessage message={t('home.noUpcomingEvents')} />
                  )}

                  {following.length > 0 && (
                    <section className="flex flex-col gap-2">
                      <SectionHeader
                        title={t('home.upcoming')}
                        actionLabel={t('home.seeAll')}
                        onAction={() => navigate('/training/list')}
                      />
                      {following.map((event) => (
                        <EventItem
                          key={event.id}
                          event={event}
                          attendanceUpdating={pendingFor(event)}
                          onClick={() => navigate(`/training/event/${event.id}`)}
                          attendEvent={() => answer(event, nextAttendance(event))}
                          declineEvent={() => answer(event, 'Declined')}
                        />
                      ))}
                    </section>
                  )}
                </>
              )}
            </Has>

            <Has feat="drinks" perm="drinks.select">
              <DrinksSection />
            </Has>

            <Has feat="items">
              <KeysSection />
            </Has>

            <section className="flex flex-col gap-2">
              <SectionHeader title={t('home.explore')} />
              <div className="grid grid-cols-2 gap-2">
                {tiles.map((tile) => (
                  <Has key={tile.key} feat={tile.feat}>
                    <button
                      type="button"
                      onClick={() => navigate(tile.path)}
                      className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left text-sm font-medium"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:size-5">
                        {tile.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{tile.label}</span>
                    </button>
                  </Has>
                ))}
              </div>
            </section>
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};
export default withProfiler(HomePage);
