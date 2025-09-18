import {
  HourglassBottom,
  RecordVoiceOver,
  ThumbDownAlt,
  ThumbDownOffAlt,
  ThumbUpAlt,
  ThumbUpOffAlt,
} from '@mui/icons-material';
import { Box, CircularProgress, IconButton, ListItem, ListItemText } from '@mui/material';
import { isBefore, toDate } from 'date-fns';
import { TFunction } from 'i18next';
import React from 'react';
import { EventsUserView } from '@/types/supabaseTypes';

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

export const EventItem = ({ event, onClick, attendEvent, declineEvent, attendanceUpdating, t }: EventItemProps) => {
  return (
    <ListItem
      key={event.id}
      disablePadding
      onClick={onClick}
      divider={true}
      sx={{
        p: 1,
        paddingLeft: 'env(safe-area-inset-left)',
        cursor: 'pointer',
      }}
      secondaryAction={
        attendanceUpdating ? (
          <CircularProgress size={'22px'} />
        ) : event.user_state === 'Waiting' ? (
          <IconButton disabled={event.isCancelled || eventInThePast(event)}>
            <HourglassBottom fontSize="inherit" sx={{ fontSize: '28px', color: '#125db2' }} />
          </IconButton>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
            <IconButton
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
            {event.user_state === 'AttendingAsTrainer' ? (
              <IconButton disabled={event.isCancelled || answerDeadlineExpired(event) || eventInThePast(event)}>
                <RecordVoiceOver fontSize="inherit" sx={{ fontSize: '28px', color: 'green' }} />
              </IconButton>
            ) : (
              <IconButton
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
            )}
          </Box>
        )
      }
    >
      <ListItemText
        primary={event.title}
        slotProps={{
          primary: {
            whiteSpace: 'nowrap',
            overflow: 'clip',
            textOverflow: 'ellipsis',
          },
          secondary: {
            whiteSpace: 'nowrap',
            overflow: 'clip',
            textOverflow: 'ellipsis',
          },
        }}
        secondary={
          event.isCancelled
            ? 'Event abgesagt'
            : [
                t('events.secondaryTextStart', { start: toDate(event.startingDateTime!) }),
                event.endDateTime && t('events.secondaryTextWithEnd', { end: toDate(event.endDateTime) }),
              ].join(' ')
        }
      />
    </ListItem>
  );
};
