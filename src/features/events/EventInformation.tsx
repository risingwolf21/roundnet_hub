import {
  Box,
  Container,
  Divider,
  List,
  Stack,
  Typography
} from '@mui/material';
import { withProfiler } from '@sentry/react';
import { TFunction } from 'i18next';
import React from 'react';
import { eventInThePast, EventsUserView, UserWithGroups } from '../../types/supabaseTypes';
import EventAlerts from './components/EventAlerts';
import EventDateInformation from './components/EventDateInformation';
import EventInformationAttendance from './components/EventInformationAttendance';
import EventInformationComments from './components/EventInformationComments';
import EventInformationGames from './components/EventInformationGames';
import EventMapPreview from './components/EventMapPreview';
import { PlaceType } from './types';
import EventWeatherForecast from './components/EventWeatherForecast';
import { formatDateFromDatabase } from 'src/utils';


type EventInformationProps = {
  user: UserWithGroups;
  event: EventsUserView;
  selectedEventPlace: PlaceType | null;
  keyHolders: FullItemHolder[];
  t: TFunction;
  fetchMode: "past" | "upcoming"
};

const EventInformation = ({
  event,
  user,
  selectedEventPlace,
  t,
  keyHolders,
  fetchMode
}: EventInformationProps) => {

  return <Container sx={{ p: 0 }}>
    <List sx={{ p: 0, pt: 1, pb: "calc(16px + env(safe-area-inset-bottom))" }}>
      <Stack direction={"column"}>
        <EventAlerts event={event} t={t} />
        <EventDateInformation event={event} t={t} />
        {
          selectedEventPlace && <EventMapPreview place={selectedEventPlace} />
        }
        {
          selectedEventPlace && <EventWeatherForecast place={selectedEventPlace} date={formatDateFromDatabase(event?.startingDateTime)} />
        }
      </Stack>
      <Box sx={{ px: 2 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 'bold' }} color="text.secondary" gutterBottom>
          Beschreibung
        </Typography>
        <Typography pb={1}>{event?.description}</Typography>
        <Divider />

        <EventInformationAttendance
          keyHolders={keyHolders}
          selectedEvent={event}
          fetchMode={fetchMode}
        />

        <EventInformationGames eventId={event.id} />

        <EventInformationComments
          eventId={event.id}
          eventInThePast={eventInThePast(event)}
        />
      </Box>
    </List>
  </Container>
};

export default withProfiler(EventInformation);
