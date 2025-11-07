import { EventsUserView } from '@/types/supabaseTypes';
import { isBefore, toDate } from 'date-fns';
import { TFunction } from 'i18next';

import { formatDateFromDatabase } from '@/utils';
import HourglassBottom from '@mui/icons-material/HourglassBottom';
import RecordVoiceOver from '@mui/icons-material/RecordVoiceOver';
import ThumbDownAlt from '@mui/icons-material/ThumbDownAlt';
import ThumbDownOffAlt from '@mui/icons-material/ThumbDownOffAlt';
import ThumbUpAlt from '@mui/icons-material/ThumbUpAlt';
import ThumbUpOffAlt from '@mui/icons-material/ThumbUpOffAlt';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

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

const EventItemSecondaryActions = ({ event, attendEvent, declineEvent, attendanceUpdating }: Pick<EventItemProps, 'event' | 'attendEvent' | 'declineEvent' | 'attendanceUpdating'>) => {
  if (attendanceUpdating) {
    return <CircularProgress size={'22px'} />
  }
  if (event.user_state === 'Waiting') {
    return <IconButton disabled={event.isCancelled || eventInThePast(event)}>
      <HourglassBottom fontSize="inherit" sx={{ fontSize: '28px', color: '#125db2' }} />
    </IconButton>
  }
  return <>
    <IconButton
      edge="end"
      onClick={(event) => {
        declineEvent();
        event.stopPropagation();
      }}
      disabled={event.isCancelled || eventInThePast(event)}
    >
      {event.user_state === 'Declined' ? (
        <ThumbDownAlt fontSize="inherit" sx={{ fontSize: '28px', color: 'red' }} />
      ) : (
        <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
      )}
    </IconButton>
    {
      event.user_state === 'AttendingAsTrainer'
        ? <IconButton disabled={event.isCancelled || answerDeadlineExpired(event) || eventInThePast(event)}>
          <RecordVoiceOver fontSize="inherit" sx={{ fontSize: '28px', color: 'green' }} />
        </IconButton>
        : <IconButton
          edge="end"
          onClick={(event) => {
            attendEvent();
            event.stopPropagation();
          }}
          disabled={event.isCancelled || answerDeadlineExpired(event) || eventInThePast(event)}
        >
          {event.user_state === 'Attending' ? (
            <ThumbUpAlt fontSize="inherit" sx={{ fontSize: '28px', color: 'green' }} />
          ) : (
            <ThumbUpOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
          )}
        </IconButton>
    }
  </>
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
            }
          }}
        />

        <Stack direction="row" spacing={0.1} sx={{ flexShrink: 0, alignItems: 'center' }}>
          <EventItemSecondaryActions
            event={event}
            attendEvent={attendEvent}
            declineEvent={declineEvent}
            attendanceUpdating={attendanceUpdating}
          />
        </Stack>
      </Stack>
    </ListItem>
  );
};
