import { formatSafeDateFromDatabase } from '@/utils';
import { withProfiler } from '@sentry/react';
import { TFunction } from 'i18next';
import { eventInThePast, EventsUserView } from '../../types/supabaseTypes';
import EventAlerts from './components/EventAlerts';
import EventDateInformation from './components/EventDateInformation';
import EventInformationAttendance from './components/EventInformationAttendance';
import EventInformationBringItems from './components/EventInformationBringItems';
import EventInformationComments from './components/EventInformationComments';
import EventInformationGames from './components/EventInformationGames';
import EventMapPreview from './components/EventMapPreview';
import EventWeatherForecast from './components/EventWeatherForecast';
import { PlaceType } from './types';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type EventInformationProps = {
  event: EventsUserView;
  selectedEventPlace: PlaceType | null;
  keyHolders: FullItemHolder[];
  t: TFunction;
  fetchMode: 'past' | 'upcoming';
};

const EventInformation = ({ event, selectedEventPlace, t, keyHolders, fetchMode }: EventInformationProps) => {
  return (
    <Container sx={{ p: 0 }}>
      <List sx={{ p: 0, pt: 1, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
        <Stack direction={'column'}>
          <EventAlerts event={event} t={t} />
          <EventDateInformation event={event} t={t} />
          {selectedEventPlace && <EventMapPreview place={selectedEventPlace} />}
          {selectedEventPlace && (
            <EventWeatherForecast
              place={selectedEventPlace}
              date={formatSafeDateFromDatabase(event?.startingDateTime)}
            />
          )}
        </Stack>
        <Box sx={{ px: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 'bold' }} color="text.secondary" gutterBottom>
            Beschreibung
          </Typography>
          <Typography pb={1}>{event?.description}</Typography>
          <Divider />

          <EventInformationAttendance keyHolders={keyHolders} selectedEvent={event} fetchMode={fetchMode} />

          <EventInformationBringItems selectedEvent={event} />

          <EventInformationGames eventId={event.id} />

          <EventInformationComments event={event} eventInThePast={eventInThePast(event)} />
        </Box>
      </List>
    </Container>
  );
};

export default withProfiler(EventInformation);
