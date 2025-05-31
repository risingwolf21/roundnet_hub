import {
  Alert,
  Box,
  Divider,
  List,
  ListItemText,
  Typography
} from '@mui/material';
import { withProfiler } from '@sentry/react';
import { TFunction } from 'i18next';
import React from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { answerDeadlineExpired, eventInThePast, EventsUserView, UserWithRolesAndPermissions } from '../../types/supabaseTypes';
import EventInformationAttendance from './components/EventInformationAttendance';
import EventInformationComments from './components/EventInformationComments';
import EventInformationGames from './components/EventInformationGames';
import { PlaceType } from './types';


type EventInformationProps = {
  user: UserWithRolesAndPermissions;
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

  const createCardSubHeader = () => {
    const { meetingDateTime, startingDateTime, endDateTime } = event;

    let startTimeTranslation = t('events.information.startTime', { startTime: new Date(startingDateTime) });
    if (endDateTime) {
      startTimeTranslation = t('events.information.startTimeAndEndTime', {
        startTime: new Date(startingDateTime),
        endTime: new Date(endDateTime),
      });
    }

    if (meetingDateTime) {
      return (
        <ListItemText
          sx={{ m: 0, mt: 2 }}
          primary={t('events.information.meetTime', { meetTime: new Date(meetingDateTime) })}
          secondary={startTimeTranslation}
        />
      );
    } else {
      return <ListItemText sx={{ m: 0, mt: 2 }} primary={startTimeTranslation} />;
    }
  };

  return <List sx={{ p: 0, pb: "calc(16px + env(safe-area-inset-bottom))" }}>
    {selectedEventPlace && (
      <Box sx={{ p: 0, width: '100%', maxHeight: '10%' }}>
        <Box
          component="button"
          onClick={() => {
            window.open(`https://www.google.com/maps/dir/?api=1&travelmode=bicycling&destination=${selectedEventPlace.lat},${selectedEventPlace.lon}`, '_blank');
          }}
          sx={{
            position: 'absolute',
            zIndex: 999,
            width: '100%',
            height: '150px',
            border: 'none',
            background: 'transparent',
          }}
        ></Box>
        <MapContainer
          style={{ width: '100%', height: '150px' }}
          center={[selectedEventPlace.lat, selectedEventPlace.lon]}
          zoom={15}
          dragging={false}
          doubleClickZoom={false}
          scrollWheelZoom={false}
          attributionControl={false}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[selectedEventPlace.lat, selectedEventPlace.lon]} interactive={false} />
        </MapContainer>
      </Box>
    )
    }
    <Box sx={{ px: 2 }}>
      {event.isCancelled && (
        <Alert sx={{ mt: 2 }} severity="error">
          Dieses Event wurde <strong>abgesagt</strong>
        </Alert>
      )}
      {answerDeadlineExpired(event) && event.answerDeadline && (
        <Alert sx={{ mt: 2 }} severity="info">
          {t('events.information.answerDeadlineExceeded', {
            answerDeadline: new Date(event.answerDeadline),
          })}
        </Alert>
      )}
      {createCardSubHeader()}
    </Box>
    <Box sx={{ px: 2 }}>
      <Box sx={{ p: 0, alignSelf: 'center' }}>
        <Typography sx={{ fontSize: 16, fontWeight: 'bold' }} color="text.secondary" gutterBottom>
          Beschreibung
        </Typography>
        <Typography pb={1}>{event?.description}</Typography>
        <Divider />
      </Box>

      <EventInformationAttendance
        user={user}
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
};

export default withProfiler(EventInformation);
