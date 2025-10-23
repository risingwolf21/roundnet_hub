import { LOCALE_DE } from '@/translation/i18n';
import { EventsUserView } from '@/types/supabaseTypes';
import { formatRelative } from 'date-fns';
import { TFunction } from 'i18next';

import CalendarMonth from '@mui/icons-material/CalendarMonth';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

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

  return (
    <ListItem sx={{ py: 0 }} dense>
      <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex', minWidth: '40px' }}>
        <ListItemIcon>
          <CalendarMonth />
        </ListItemIcon>
      </ListItemAvatar>
      {meetingDateTime ? (
        <ListItemText
          primary={t('events.information.meetTime', {
            meetTime: formatRelative(meetingDateTime, new Date(), { locale: LOCALE_DE }),
          })}
          secondary={startTimeTranslation}
        />
      ) : (
        <ListItemText primary={startTimeTranslation} />
      )}
    </ListItem>
  );
};

export default EventDateInformation;
