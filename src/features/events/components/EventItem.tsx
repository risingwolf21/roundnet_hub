import { EventsUserView } from '@/types/supabaseTypes';
import { format, isBefore } from 'date-fns';
import { TFunction } from 'i18next';

import { Button as Button } from '@/components/ui/button';
import { Item } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { Calendar, Check, Hourglass, MapPin, Megaphone, X } from 'lucide-react';
import { PlaceType } from '../types';

type EventItemProps = {
  attendanceUpdating: boolean;
  event: EventsUserView;
  t: TFunction;
  onClick: () => void;
  attendEvent: () => void;
  declineEvent: () => void;
};

function answerDeadlineExpired(x: EventsUserView) {
  if (!x.answerDeadline) return false;
  return isBefore(x.answerDeadline, Date.now());
}

function eventInThePast(x: EventsUserView) {
  return isBefore(x.endDateTime !== null ? x.endDateTime : x.startingDateTime!, Date.now());
}

function eventHasStarted(x: EventsUserView) {
  return isBefore(x.startingDateTime!, Date.now());
}

const EventItemSecondaryActions = ({
  event,
  attendEvent,
  declineEvent,
  attendanceUpdating,
}: Pick<EventItemProps, 'event' | 'attendEvent' | 'declineEvent' | 'attendanceUpdating'>) => {

  if (event.user_state === 'Waiting') {
    return (
      <Button
        variant={"ghost"}
        size="icon-lg"
        className={`size-8 bg-info text-info-foreground`}
        disabled={event.isCancelled || eventInThePast(event)}
      >
        {
          attendanceUpdating ? <Spinner /> : <Hourglass className="size-5" />
        }
      </Button>
    );
  }

  return (
    <div className="flex gap-1">
      {/* --- DECLINE BUTTON --- */}
      <Button
        variant={event.user_state === "Declined" ? "ghost" : "outline"}
        size="icon-lg"
        className={`size-8 ${event.user_state === "Declined" && "bg-error text-error-foreground"}`}
        onClick={(e) => {
          declineEvent();
          e.stopPropagation();
        }}
        disabled={event.isCancelled || eventHasStarted(event)}
      >
        {
          attendanceUpdating ? <Spinner /> : <X className='size-5' />
        }
      </Button>

      {/* --- ATTEND / TRAINER BUTTON --- */}
      {event.user_state === 'AttendingAsTrainer' ? (
        <Button
          variant={"ghost"}
          size="icon-lg"
          className={`size-8 bg-success text-success-foreground`}
          disabled={event.isCancelled || answerDeadlineExpired(event) || eventHasStarted(event)}
        >
          {
            attendanceUpdating ? <Spinner /> : <Megaphone className="size-5" />
          }
        </Button>
      ) : (
        <Button
          variant={event.user_state === "Attending" ? "ghost" : "outline"}
          size="icon-lg"
          className={`size-8 ${event.user_state === "Attending" && "bg-success text-success-foreground"}`}
          onClick={(e) => {
            attendEvent();
            e.stopPropagation();
          }}
          disabled={event.isCancelled || answerDeadlineExpired(event) || eventHasStarted(event)}
        >
          {
            attendanceUpdating ? <Spinner /> : <Check className='size-5' />
          }
        </Button>
      )}
    </div>
  );
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

export const EventItem = ({ event, onClick, attendEvent, declineEvent, attendanceUpdating, t }: EventItemProps) => {

  const place = JSON.parse(event?.place ?? '{}') as PlaceType;

  return <Item key={event.id} onClick={onClick} variant={"outline"}>
    <div
      className={cn('w-full flex flex-row justify-between gap-4 relative rounded-md p-2 pl-4 text-sm after:absolute after:inset-y-2 after:left-0 after:w-1 after:rounded-full', {
        'after:bg-warning/70': event.user_state === null,
        'after:bg-success/70': event.user_state === 'Attending' || event.user_state === 'AttendingAsTrainer',
        'after:bg-error/70': event.user_state === 'Declined',
        'cursor-not-allowed opacity-50': event.isCancelled || eventInThePast(event),
      })}
    >
      <div className='flex-1 min-w-0'>
        <div className='font-semibold text-medium truncate'>
          {event.title}
        </div>

        <div className='text-muted-foreground leading-7 flex items-center gap-2 min-w-0'>
          <MapPin className='size-4 shrink-0' />
          <span className='truncate'>
            {place.name ?? t('events.item.noLocation')}
          </span>
        </div>

        <div className='text-muted-foreground leading-7 flex items-center gap-2 min-w-0'>
          <Calendar className='size-4 shrink-0' />
          <span className='truncate'>
            {formatDateRange(new Date(event.startingDateTime), new Date(event.endDateTime))}
          </span>
        </div>
      </div>

      <div className='flex items-center gap-2 shrink-0'>
        <EventItemSecondaryActions
          event={event}
          attendEvent={attendEvent}
          declineEvent={declineEvent}
          attendanceUpdating={attendanceUpdating}
        />
      </div>
    </div>
  </Item>
}