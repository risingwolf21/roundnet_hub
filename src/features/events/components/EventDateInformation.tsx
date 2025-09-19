import { LOCALE_DE } from '@/translation/i18n';
import { EventsUserView } from '@/types/supabaseTypes';
import { CalendarMonth } from '@mui/icons-material';
import { ListItem, ListItemAvatar, ListItemIcon, ListItemText } from '@mui/material';
import { formatRelative } from 'date-fns';
import { TFunction } from 'i18next';

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
            meetTime: formatRelative(meetingDateTime, Date.now(), { locale: LOCALE_DE, weekStartsOn: 1 }),
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
