import { EventsUserView } from '@/types/supabaseTypes';
import { format, isBefore, toDate } from 'date-fns';
import { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { Has } from '@/hooks/useGrants';
import { cn } from '@/lib/utils';
import { formatDateFromDatabase } from '@/utils';
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
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
        disabled={event.isCancelled || eventInThePast(event)}
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
          disabled={event.isCancelled || answerDeadlineExpired(event) || eventInThePast(event)}
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
          disabled={event.isCancelled || answerDeadlineExpired(event) || eventInThePast(event)}
        >
          {
            attendanceUpdating ? <Spinner /> : <Check className='size-5' />
          }
        </Button>
      )}
    </div>
  );
};

const formatDateRange = (start: Date, end: Date) => {
  const sameDay = start.toDateString() === end.toDateString();
  const sameTime = start.getHours() === end.getHours() && start.getMinutes() === end.getMinutes();

  if (sameDay && sameTime) {
    return format(start, "dd.MM.yyyy, HH:mm");
  }

  if (sameDay) {
    return `${format(start, "dd.MM.yyyy, HH:mm")} - ${format(end, "HH:mm")}`;
  }

  return `${format(start, "dd.MM.yyyy, HH:mm")} - ${format(end, "dd.MM.yyyy, HH:mm")}`;
}

export const EventItemShadcn = ({ event, onClick, attendEvent, declineEvent, attendanceUpdating, t }: EventItemProps) => {

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
            {place.name ?? 'Kein Ort angegeben'}
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
  return <Item onClick={onClick} variant={"outline"}>
    <ItemMedia variant={"default"}>
      <div className="flex h-full w-10 flex-col justify-center py-2">
        <p className="text-center text-[10px]">
          {t('events.startDateDayString', { date: formatDateFromDatabase(event.startingDateTime) }).toUpperCase()}
        </p>
        <h6 className="text-center text-xl font-bold tracking-tight">
          {t('events.startDateDay', { date: formatDateFromDatabase(event.startingDateTime) }).toUpperCase()}
        </h6>
      </div>
    </ItemMedia>
    <ItemContent>
      <ItemTitle>{event.title}</ItemTitle>
      <ItemDescription>
        {
          event.isCancelled
            ? 'Event abgesagt'
            : [
              t('events.secondaryTextStart', { start: toDate(event.startingDateTime!) }),
              event.endDateTime && t('events.secondaryTextWithEnd', { end: toDate(event.endDateTime) }),
            ].join(' ')
        }
      </ItemDescription>
    </ItemContent>
    <ItemActions>
      <EventItemSecondaryActions
        event={event}
        attendEvent={attendEvent}
        declineEvent={declineEvent}
        attendanceUpdating={attendanceUpdating}
      />
    </ItemActions>
  </Item>
}

export const EventItem = ({ event, onClick, attendEvent, declineEvent, attendanceUpdating, t }: EventItemProps) => {
  return (
    <ListItem
      key={event.id}
      onClick={onClick}
      divider
      disablePadding
      sx={{
        p: 1,
        pl: 'env(safe-area-inset-left)',
        cursor: 'pointer',
      }}
    >
      <ListItemAvatar>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'center',
            mx: 3,
            py: 1,
            width: 20,
          }}
        >
          <Typography fontSize={10} textAlign={'center'}>
            {t('events.startDateDayString', { date: formatDateFromDatabase(event.startingDateTime) }).toUpperCase()}
          </Typography>
          <Typography variant="h6" fontWeight={'bold'} textAlign={'center'}>
            {t('events.startDateDay', { date: formatDateFromDatabase(event.startingDateTime) }).toUpperCase()}
          </Typography>
        </Box>
      </ListItemAvatar>
      <Stack
        component="div"
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          columnGap: 1,
        }}
      >
        <ListItemText
          sx={{ minWidth: 0 }}
          primary={event.title}
          secondary={
            event.isCancelled
              ? 'Event abgesagt'
              : [
                t('events.secondaryTextStart', { start: toDate(event.startingDateTime!) }),
                event.endDateTime && t('events.secondaryTextWithEnd', { end: toDate(event.endDateTime) }),
              ].join(' ')
          }
          slotProps={{
            primary: {
              noWrap: true,
              sx: { overflow: 'hidden', textOverflow: 'ellipsis' },
            },
            secondary: {
              noWrap: true,
              sx: { overflow: 'hidden', textOverflow: 'ellipsis' },
            },
          }}
        />

        <Has perm={'event.signup'}>
          <Stack direction="row" spacing={0.1} sx={{ flexShrink: 0, alignItems: 'center' }}>
            <EventItemSecondaryActions
              event={event}
              attendEvent={attendEvent}
              declineEvent={declineEvent}
              attendanceUpdating={attendanceUpdating}
            />
          </Stack>
        </Has>
      </Stack>
    </ListItem>
  );
};
