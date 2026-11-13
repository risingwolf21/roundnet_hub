import { sideBar } from '@/components/list/ListParts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
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
  /** Event of a group the user is no member of: no answer, sign-up or hints, shows the group instead. */
  readOnly?: boolean;
};

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

/** ✕ / ✓ for an event without an answer yet. */
const AttendanceButtons = ({
  event,
  attendEvent,
  declineEvent,
  attendanceUpdating,
}: Pick<EventItemProps, 'event' | 'attendEvent' | 'declineEvent' | 'attendanceUpdating'>) => {
  const { t } = useTranslation();
  const notOpenYet = answerNotOpenYet(event);
  const cannotDecline = eventHasStarted(event) || notOpenYet;
  const cannotAttend = answerDeadlineExpired(event) || eventHasStarted(event) || notOpenYet;

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="icon-lg"
        className="size-10"
        aria-label={t('events.item.declineAria')}
        disabled={cannotDecline}
        onClick={(e) => {
          declineEvent();
          e.stopPropagation();
        }}
      >
        {attendanceUpdating ? <Spinner /> : <X className="size-5" />}
      </Button>
      <Button
        variant="outline"
        size="icon-lg"
        className="size-10"
        aria-label={t('events.item.attendAria')}
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

/** The answer of an upcoming event as a pill; the buttons appear only while there is no answer yet. */
const AnswerStatus = ({ state }: { state: EventsUserView['user_state'] }) => {
  const { t } = useTranslation();
  switch (state) {
    case 'Attending':
    case 'AttendingAsTrial':
      return (
        <Badge variant="success">
          <Check />
          {t('events.item.attending')}
        </Badge>
      );
    case 'AttendingAsTrainer':
      return (
        <Badge variant="success">
          <Megaphone />
          {t('events.item.trainer')}
        </Badge>
      );
    case 'Declined':
      return (
        <Badge variant="destructive">
          <X />
          {t('events.item.notAttending')}
        </Badge>
      );
    case 'Waiting':
    case 'WaitingAsTrial':
    case 'RequestedAttendance':
      return (
        <Badge variant="info">
          <Hourglass />
          {t('events.item.waiting')}
        </Badge>
      );
    default:
      return null;
  }
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

export const EventItem = ({ event, onClick, attendEvent, declineEvent, attendanceUpdating, readOnly = false }: EventItemProps) => {
  const { t, i18n } = useTranslation();

  const place = parsePlace(event.place);
  const start = new Date(event.startingDateTime);
  const end = new Date(event.endDateTime);
  const past = eventInThePast(event);
  const closed = event.isCancelled || past;
  const unanswered = !readOnly && (event.user_state === null || event.user_state === 'Unanswered');
  const opensLater = unanswered && !closed && answerNotOpenYet(event);
  const needsAnswer = unanswered && !closed && !opensLater && !answerDeadlineExpired(event) && !eventHasStarted(event);
  const deadlinePassed = unanswered && !closed && answerDeadlineExpired(event) && !eventHasStarted(event);

  // eslint-disable-next-line @eslint-react/naming-convention/use-state
  const [now] = useState(() => Date.now());
  const attending = event.attending_count ?? 0;
  const full = !!event.maxAttendees && attending >= event.maxAttendees;
  const deadlineSoon =
    needsAnswer && !!event.answerDeadline && isBefore(event.answerDeadline, now + 24 * 60 * 60 * 1000);

  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'short', day: 'numeric', month: 'numeric' });
  const locationName = place.name?.trim();

  // One hint line for an unanswered event, most important first.
  const hint =
    !unanswered || closed
      ? null
      : full
        ? { text: t('events.item.full'), warn: true }
        : needsAnswer && event.answerDeadline
          ? { text: t('events.item.answerUntil', { date: format(event.answerDeadline, 'dd.MM. HH:mm') }), warn: deadlineSoon }
          : opensLater && event.answerStart
            ? { text: t('events.item.opensOn', { date: format(event.answerStart, 'dd.MM. HH:mm') }), warn: false }
            : deadlinePassed
              ? { text: t('events.item.deadlinePassed'), warn: false }
              : null;

  return (
    <Item
      onClick={onClick}
      variant="outline"
      className={cn(
        'cursor-pointer flex-nowrap gap-3',
        sideBar(
          event.isCancelled
            ? 'neutral'
            : needsAnswer
              ? 'warning'
              : event.user_state === 'Attending' || event.user_state === 'AttendingAsTrial' || event.user_state === 'AttendingAsTrainer'
                ? 'success'
                : event.user_state === 'Declined'
                  ? 'error'
                  : event.user_state === 'Waiting' || event.user_state === 'WaitingAsTrial' || event.user_state === 'RequestedAttendance'
                    ? 'info'
                    : 'neutral'
        )
      )}
    >
      <DateTile date={start} color={event.group?.color} muted={closed} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
        <span className={cn('line-clamp-2 break-words font-semibold leading-snug', closed && 'text-muted-foreground')}>
          {event.title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
          <Clock className="size-3.5 shrink-0" />
          <span className={cn(isSameDay(start, end) && 'whitespace-nowrap')}>{formatTimeRange(start, end, dateFormat)}</span>
        </span>
        {readOnly && event.group?.name && (
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5 shrink-0" />
            <span className="truncate">{event.group.name}</span>
          </span>
        )}
        {locationName && (
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{locationName}</span>
          </span>
        )}
        {hint && (
          <span className={cn('text-xs', hint.warn ? 'font-medium text-warning' : 'text-muted-foreground')}>{hint.text}</span>
        )}
      </div>

      <div className="flex shrink-0 items-center">
        {event.isCancelled ? (
          <Badge variant="destructive">
            <Ban />
            {t('events.item.cancelled')}
          </Badge>
        ) : readOnly ? null : past ? (
          <PastAnswer state={event.user_state} />
        ) : unanswered ? (
          <AttendanceButtons event={event} attendEvent={attendEvent} declineEvent={declineEvent} attendanceUpdating={attendanceUpdating} />
        ) : (
          <AnswerStatus state={event.user_state} />
        )}
      </div>
    </Item>
  );
};
