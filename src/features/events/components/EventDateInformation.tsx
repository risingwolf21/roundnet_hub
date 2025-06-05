import { ListItemText } from '@mui/material';
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

  if (meetingDateTime) {
    return (
      <ListItemText
        sx={{ m: 0, mt: 2 }}
        primary={t('events.information.meetTime', {
          meetTime: new Date(meetingDateTime),
        })}
        secondary={startTimeTranslation}
      />
    );
  }

  return <ListItemText sx={{ m: 0, mt: 2 }} primary={startTimeTranslation} />;
};

export default EventDateInformation;