import { EventsUserView } from '@/types/supabaseTypes';
import { isBefore, toDate } from 'date-fns';
import { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { Has } from '@/hooks/useGrants';
import { formatDateFromDatabase } from '@/utils';
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Check, Hourglass, Megaphone, X } from 'lucide-react';

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

export const EventItem = ({ event, onClick, attendEvent, declineEvent, attendanceUpdating, t }: EventItemProps) => {

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
