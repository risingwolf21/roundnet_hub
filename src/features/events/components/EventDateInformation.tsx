import { CalendarMonth } from '@mui/icons-material';
import { ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import { TFunction } from 'i18next';
import React from 'react';
import { EventsUserView } from 'src/types/supabaseTypes';

type Props = {
  event: EventsUserView;
  t: TFunction;
};

const EventDateInformation = ({ event, t }: Props) => {
  const { meetingDateTime, startingDateTime, endDateTime } = event;

  const startTimeTranslation = endDateTime
    ? t('events.information.startTimeAndEndTime', {
      startTime: new Date(startingDateTime),
      endTime: new Date(endDateTime),
    })
    : t('events.information.startTime', {
      startTime: new Date(startingDateTime),
    });

  return <ListItem sx={{ py: 0, '&.MuiListItem-root': { paddingLeft: 0 } }}>
    <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex', minWidth: "40px" }}>
      <CalendarMonth />
    </ListItemAvatar>
    {
      meetingDateTime
        ? <ListItemText
          primary={t('events.information.meetTime', {
            meetTime: new Date(meetingDateTime),
          })}
          secondary={startTimeTranslation}
        />
        : <ListItemText primary={startTimeTranslation} />
    }
  </ListItem>
};

export default EventDateInformation;