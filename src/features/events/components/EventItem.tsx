import { sideBar } from '@/components/list/ListParts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { Has } from '@/hooks/useGrants';
import { cn } from '@/lib/utils';
import { answerDeadlineExpired, answerNotOpenYet, eventHasStarted, eventInThePast, EventsUserView } from '@/types/supabaseTypes';
import { format, isBefore, isSameDay } from 'date-fns';
import { Ban, Check, Clock, Hourglass, MapPin, Megaphone, UserCheck, Users, UserX, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlaceType } from '../types';

type EventItemProps = {
  attendanceUpdating: boolean;
  event: EventsUserView;
  onClick: () => void;
  attendEvent: () => void;
  declineEvent: () => void;
};

export const formatDateRange = (start: Date, end: Date) => {
  const sameDay = start.toDateString() === end.toDateString();
  const sameTime = start.getHours() === end.getHours() && start.getMinutes() === end.getMinutes();

  if (sameDay && sameTime) {
    return format(start, "dd.MM.yyyy, HH:mm");
  }

  if (sameDay) {
    return `${format(start, "ccc, dd.MM, HH:mm")} - ${format(end, "HH:mm")}`;
  }

  return `${format(start, "ccc, dd.MM, HH:mm")} - ${format(end, "ccc dd.MM, HH:mm")}`;
}

const parsePlace = (place: string | null): PlaceType => {
  try {
    return JSON.parse(place ?? '{}') as PlaceType;
  } catch {
    return {} as PlaceType;
  }
};

/** The time as shown on the row: "18:00 – 20:00" for a single day, with dates when the event spans days. */
const formatTimeRange = (start: Date, end: Date, dateFormat: Intl.DateTimeFormat) =>
  isSameDay(start, end)
    ? start.getTime() === end.getTime()
      ? format(start, 'HH:mm')
      : `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`
    : `${dateFormat.format(start)} ${format(start, 'HH:mm')} – ${dateFormat.format(end)} ${format(end, 'HH:mm')}`;

const AttendanceButtons = ({
  event,
  attendEvent,
  declineEvent,
  attendanceUpdating,
}: Pick<EventItemProps, 'event' | 'attendEvent' | 'declineEvent' | 'attendanceUpdating'>) => {
  const { t } = useTranslation();

  if (event.user_state === 'Waiting') {
    return (
      <Badge variant="info">
        <Hourglass />
        {t('events.item.waiting')}
      </Badge>
    );
  }

  if (event.user_state === 'AttendingAsTrainer') {
    return (
      <Badge variant="success">
        <Megaphone />
        {t('events.item.trainer')}
      </Badge>
    );
  }

  const notOpenYet = answerNotOpenYet(event);
  const cannotDecline = eventHasStarted(event) || notOpenYet;
  const cannotAttend = answerDeadlineExpired(event) || eventHasStarted(event) || notOpenYet;

  return (
    <div className="flex gap-2">
      <Button
        variant={event.user_state === 'Declined' ? 'ghost' : 'outline'}
        size="icon-lg"
        className={cn('size-10', event.user_state === 'Declined' && 'bg-error text-error-foreground')}
        aria-label={t('events.item.declineAria')}
        aria-pressed={event.user_state === 'Declined'}
        disabled={cannotDecline}
        onClick={(e) => {
          declineEvent();
          e.stopPropagation();
        }}
      >
        {attendanceUpdating ? <Spinner /> : <X className="size-5" />}
      </Button>
      <Button
        variant={event.user_state === 'Attending' ? 'ghost' : 'outline'}
        size="icon-lg"
        className={cn('size-10', event.user_state === 'Attending' && 'bg-success text-success-foreground')}
        aria-label={t('events.item.attendAria')}
        aria-pressed={event.user_state === 'Attending'}
        disabled={cannotAttend}
        onClick={(e) => {
          attendEvent();
          e.stopPropagation();
        }}
      >
        {attendanceUpdating ? <Spinner /> : <Check className="size-5" />}
      </Button>
    </div>
  );
};

/** Weekday, day and month in the group's colour, like the date block on the event page. */
const DateTile = ({ date, color, muted }: { date: Date; color?: string; muted: boolean }) => {
  const { i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  return (
    <div
      className={cn(
        'flex size-12 shrink-0 flex-col items-center justify-center rounded-lg',
        muted ? 'bg-muted text-muted-foreground' : 'bg-[color:var(--group-color)]/10 text-[color:var(--group-color)]'
      )}
      style={{ '--group-color': color ?? 'var(--primary)' } as React.CSSProperties}
    >
      <span className="sr-only">{new Intl.DateTimeFormat(lang, { dateStyle: 'full' }).format(date)}</span>
      <span aria-hidden className="text-[10px] font-semibold uppercase leading-tight">
        {new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(date)}
      </span>
      <span aria-hidden className="text-lg font-bold leading-none tabular-nums">{date.getDate()}</span>
      <span aria-hidden className="text-[10px] uppercase leading-tight">
        {new Intl.DateTimeFormat(lang, { month: 'short' }).format(date)}
      </span>
    </div>
  );
};

/** After an event it is only a record: show the answer as text instead of buttons. */
const PastAnswer = ({ state }: { state: EventsUserView['user_state'] }) => {
  const { t } = useTranslation();
  if (state === 'Attending' || state === 'AttendingAsTrainer') {
    return (
      <Badge variant="success">
        <UserCheck />
        {t('events.item.attended')}
      </Badge>
    );
  }
  if (state === 'Declined') {
    return (
      <Badge variant="destructive">
        <UserX />
        {t('events.item.declined')}
      </Badge>
    );
  }
  return null;
};

export const EventItem = ({ event, onClick, attendEvent, declineEvent, attendanceUpdating }: EventItemProps) => {
  const { t, i18n } = useTranslation();

  const place = parsePlace(event.place);
  const start = new Date(event.startingDateTime);
  const end = new Date(event.endDateTime);
  const past = eventInThePast(event);
  const closed = event.isCancelled || past;
  const unanswered = event.user_state === null;
  const opensLater = unanswered && !closed && answerNotOpenYet(event);
  const needsAnswer = unanswered && !closed && !opensLater && !answerDeadlineExpired(event) && !eventHasStarted(event);
  const deadlinePassed = unanswered && !closed && answerDeadlineExpired(event) && !eventHasStarted(event);

  // eslint-disable-next-line @eslint-react/naming-convention/use-state
  const [now] = useState(() => Date.now());
  const attending = event.attending_count ?? 0;
  const declined = event.declined_count ?? 0;
  const full = !!event.maxAttendees && attending >= event.maxAttendees;
  const deadlineSoon =
    needsAnswer && !!event.answerDeadline && isBefore(event.answerDeadline, now + 24 * 60 * 60 * 1000);

  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'short', day: 'numeric', month: 'numeric' });
  const locationName = place.name?.trim();
  const hasMeta =
    !!event.group || (needsAnswer && !!event.answerDeadline) || deadlinePassed || opensLater || (full && !closed);

  // Phone: title and time next to the buttons, location and group use the full width below.
  // Wide container: one table-like row. Layout classes are placed so every cell can be missing without breaking it.
  return (
    <Item
      onClick={onClick}
      variant="outline"
      className={cn(
        '@container cursor-pointer',
        sideBar(
          event.isCancelled
            ? 'neutral'
            : needsAnswer
              ? 'warning'
              : event.user_state === 'Attending' || event.user_state === 'AttendingAsTrainer'
                ? 'success'
                : event.user_state === 'Declined'
                  ? 'error'
                  : event.user_state === 'Waiting'
                    ? 'info'
                    : 'neutral'
        )
      )}
    >
      <div className="flex w-full items-start gap-3 @3xl:items-center">
        <DateTile date={start} color={event.group?.color} muted={closed} />
        <div
          className={cn(
            'grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm',
            '@3xl:grid-cols-[8rem_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.6fr)_auto] @3xl:gap-x-4'
          )}
        >
          {/* Title */}
          <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 @3xl:col-start-2">
            <span
              className={cn(
                'line-clamp-2 min-w-0 break-words font-semibold leading-snug @3xl:line-clamp-1',
                closed && 'text-muted-foreground'
              )}
            >
              {event.title}
            </span>
            {event.isCancelled && (
              <Badge variant="destructive" className="shrink-0">
                <Ban />
                {t('events.item.cancelled')}
              </Badge>
            )}
          </div>

          {/* Time and attendee count */}
          <div className="col-start-1 row-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 @3xl:contents">
            <div
              className={cn(
                'flex min-w-0 items-center gap-1.5 font-medium tabular-nums @3xl:col-start-1 @3xl:row-start-1 @3xl:flex-col @3xl:items-start @3xl:gap-0',
                closed && 'text-muted-foreground'
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                <span className={cn(isSameDay(start, end) && 'whitespace-nowrap')}>{formatTimeRange(start, end, dateFormat)}</span>
              </span>
            </div>
            {!event.isCancelled && (
              <span
                className={cn(
                  'flex shrink-0 items-center gap-1 text-xs text-muted-foreground @3xl:hidden',
                  full && 'font-medium text-warning'
                )}
              >
                <Users className="size-3.5" />
                {event.maxAttendees ? t('events.item.attendingOfMax', { count: attending, max: event.maxAttendees }) : attending}
              </span>
            )}
          </div>

          {/* Buttons */}
          <div className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-center @3xl:col-start-5 @3xl:row-span-1">
            {event.isCancelled ? null : past ? (
              <PastAnswer state={event.user_state} />
            ) : (
              <AttendanceButtons
                event={event}
                attendEvent={attendEvent}
                declineEvent={declineEvent}
                attendanceUpdating={attendanceUpdating}
              />
            )}
          </div>

          {/* Location: its own line on a phone so the name can be read in full */}
          <div
            className={cn(
              'col-span-2 col-start-1 row-start-3 flex min-w-0 items-start gap-1.5 text-muted-foreground',
              '@3xl:col-span-1 @3xl:col-start-3 @3xl:row-start-1 @3xl:items-center'
            )}
          >
            <MapPin className="mt-0.5 size-3.5 shrink-0 @3xl:mt-0" />
            <span className={cn('line-clamp-2 min-w-0 break-words @3xl:line-clamp-1', !locationName && 'italic')}>
              {locationName || t('events.item.noLocation')}
            </span>
          </div>

          {/* Group, count (desktop) and answer hints */}
          {(hasMeta || !event.isCancelled) && (
            <div
              className={cn(
                'col-span-2 col-start-1 row-start-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1',
                '@3xl:col-span-1 @3xl:col-start-4 @3xl:row-start-1',
                !hasMeta && '@3xl:flex hidden'
              )}
            >
              {event.group && (
                <span className="flex min-w-0 max-w-full items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" style={{ color: event.group.color }} />
                  <span className="truncate line-clamp-2 min-w-0 break-words @3xl:line-clamp-1">{event.group.name}</span>
                </span>
              )}
              {!event.isCancelled && (
                <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground @3xl:flex">
                  <Users className="size-3.5" />
                  {event.maxAttendees ? t('events.item.attendingOfMax', { count: attending, max: event.maxAttendees }) : attending}
                </span>
              )}
              {!event.isCancelled && declined > 0 && (
                <Has perm="event.edit">
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <UserX className="size-3.5" />
                    {declined}
                  </span>
                </Has>
              )}
              {full && !closed && <Badge variant="warning" className="shrink-0">{t('events.item.full')}</Badge>}
              {needsAnswer && event.answerDeadline && (
                <Badge variant={deadlineSoon ? 'warning' : 'outline'} className="max-w-full shrink-0">
                  {t('events.item.answerUntil', { date: format(event.answerDeadline, 'dd.MM. HH:mm') })}
                </Badge>
              )}
              {opensLater && event.answerStart && (
                <Badge variant="outline" className="max-w-full shrink-0">
                  <Clock />
                  {t('events.item.opensOn', { date: format(event.answerStart, 'dd.MM. HH:mm') })}
                </Badge>
              )}
              {deadlinePassed && <Badge variant="outline" className="shrink-0">{t('events.item.deadlinePassed')}</Badge>}
            </div>
          )}
        </div>
      </div>
    </Item>
  );
};
