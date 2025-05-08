import { Delete, DoNotDisturb, DoNotDisturbOff, Edit, Key, MoreVert } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  Typography,
} from '@mui/material';
import { captureException } from '@sentry/react';
import { useNotifications } from '@toolpad/core/useNotifications';
import { isBefore } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { useNavigate } from 'react-router';
import { fetchEventAttendanceAsync, updateAttendanceAsync } from 'src/features/events/slices/eventAttendanceSlice';
import { fetchEventCommentsAsync, upsertCommentToEventAsync } from 'src/features/events/slices/eventCommentsSlice';
import { editEvent, fetchSingleEventAsync } from 'src/features/events/slices/eventsSlice';
import { formatDateToDatabase } from 'src/utils';
import { can } from 'src/utils/PermissionService';
import Layout from '../../components/Layout';
import { SupabaseEventRepository } from '../../repository/EventRepository';
import { answerDeadlineExpired, eventInThePast } from '../../types/supabaseTypes';
import EventInformationAttendance from './components/EventInformationAttendance';
import EventInformationComments from './components/EventInformationComments';
import { LoadingEventInformation } from './components/LoadingEventInformation';
import { CancelTrainingDialog } from './dialogs/CancelTrainingDialog';
import { DeleteEventDialog } from './dialogs/DeleteEventDialog';
import { EditEventOptionsDialog } from './dialogs/EditEventOptionsDialog';
import { DeleteEventType, EventInformationProps } from './types';

const EventInformation = ({
  dispatch,
  selectedEvent,
  attendanceLoading,
  error,
  user,
  selectedEventPlace,
  t,
  loading,
  attendance,
  comments,
  keyHolders,
}: EventInformationProps) => {
  const [cancelTrainingOpen, setCancelTrainingOpen] = useState(false);
  const [deleteTrainingOpen, setDeleteTrainingOpen] = useState(false);
  const [editEventOptionOpen, setEditEventOptionOpen] = useState(false);
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [anchorEl, setAnchorEl] = useState<(EventTarget & HTMLButtonElement) | null>(null);

  useEffect(() => {
    if (error)
      notifications.show(error, { severity: "error" });
  }, [error, notifications]);

  useEffect(() => {
    dispatch(fetchEventAttendanceAsync({ eventId: selectedEvent.id }));
    dispatch(fetchEventCommentsAsync({ eventId: selectedEvent.id }));
  }, [dispatch, selectedEvent.id]);

  const cancelTraining = async () => {
    await SupabaseEventRepository.updateCancellationForEvent(selectedEvent.id, !selectedEvent.isCancelled);
    dispatch(fetchSingleEventAsync({ eventId: selectedEvent.id, userId: user.userId }));
    setCancelTrainingOpen(false);
  };

  const deleteEvent = async (value: DeleteEventType | null) => {
    if (!value) {
      return;
    } else if (value === 'This Event') {
      SupabaseEventRepository.deleteEvent(selectedEvent.id)
        .then(() => {
          navigate('/training/list', { replace: true });
        })
        .catch((e) => {
          captureException(e);
          notifications.show(e.message, { severity: 'error' });
        });
    } else if (value === 'This and following events') {
      SupabaseEventRepository.deleteEventAndUpcomingEvents(
        selectedEvent.id,
        selectedEvent.key,
        selectedEvent.startingDateTime
      )
        .then(() => {
          navigate('/training/list', { replace: true });
        })
        .catch((e) => {
          captureException(e);
          notifications.show(e.message, { severity: 'error' });
        });
    }
  };

  const updateAttendance = async (state: EventAttendance, oldState: EventAttendance) => {
    dispatch(updateAttendanceAsync({ user, event: selectedEvent, state, oldState }));
  };

  const handleCommentSubmit = (value: { comment: string; reply_to: string | null }) => {
    dispatch(
      upsertCommentToEventAsync({
        user,
        eventId: selectedEvent.id,
        comment: value.comment,
        created_at: formatDateToDatabase(new Date()),
        reply_to: value.reply_to,
      })
    );
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const createCardSubHeader = () => {
    const { meetingDateTime, startingDateTime, endDateTime } = selectedEvent;

    let startTimeTranslation = t('events.information.startTime', { startTime: new Date(startingDateTime) });
    if (endDateTime) {
      startTimeTranslation = t('events.information.startTimeAndEndTime', {
        startTime: new Date(startingDateTime),
        endTime: new Date(endDateTime),
      });
    }

    if (loading)
      return (
        <ListItemText
          sx={{ m: 0, mt: 2 }}
          primary={<Skeleton variant={'rectangular'} />}
          secondary={<Skeleton sx={{ mt: 1 }} variant={'rectangular'} />}
        />
      );

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

  return (
    <Layout
      appBarConfig={{
        navigateBackPath: "/training/list",
        title: selectedEvent.title,
        showProfile: false,
      }}
      appBarActions={
        (can('update', 'event') || can('delete', 'event')) &&
        !loading && (
          <>
            <Typography component="div">{selectedEvent.id.substring(0, 8)}</Typography>
            <IconButton sx={{ color: '#fff', pr: 0 }} onClick={handleClick}>
              <MoreVert />
            </IconButton>
            <Menu id="simple-menu" anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleClose}>
              <MenuItem>
                <ListItemIcon>
                  <Key />
                </ListItemIcon>
                <ListItemText primary={`ID: ${selectedEvent.id.substring(0, 8)}`} />
              </MenuItem>
              <MenuItem
                hidden={!can('update', 'event')}
                onClick={() => {
                  setEditEventOptionOpen(true);
                  handleClose();
                }}
              >
                <ListItemIcon>
                  <Edit />
                </ListItemIcon>
                <ListItemText primary="Bearbeiten" />
              </MenuItem>
              <MenuItem
                hidden={!can('update', 'event')}
                onClick={() => {
                  setCancelTrainingOpen(true);
                  handleClose();
                }}
              >
                <ListItemIcon>{selectedEvent.isCancelled ? <DoNotDisturbOff /> : <DoNotDisturb />}</ListItemIcon>
                <ListItemText primary={selectedEvent.isCancelled ? 'Stattfinden' : 'Absagen'} />
              </MenuItem>
              <MenuItem
                hidden={!can('delete', 'event')}
                onClick={() => {
                  setDeleteTrainingOpen(true);
                  handleClose();
                }}
              >
                <ListItemIcon>
                  <Delete />
                </ListItemIcon>
                <ListItemText primary="Löschen" />
              </MenuItem>
            </Menu>
          </>
        )
      }
    >
      <List sx={{ p: 0, pb: "calc(16px + env(safe-area-inset-bottom))" }}>
        {loading ? (
          <Skeleton variant={'rectangular'} width={'100%'} height={'150px'} />
        ) : (
          selectedEventPlace && (
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
        )}
        <Box sx={{ px: 2 }}>
          {selectedEvent.isCancelled && !loading && (
            <Alert sx={{ mt: 2 }} severity="error">
              Dieses Event wurde <strong>abgesagt</strong>
            </Alert>
          )}
          {answerDeadlineExpired(selectedEvent) && selectedEvent.answerDeadline && !loading && (
            <Alert sx={{ mt: 2 }} severity="info">
              {t('events.information.answerDeadlineExceeded', {
                answerDeadline: new Date(selectedEvent.answerDeadline),
              })}
            </Alert>
          )}
          {createCardSubHeader()}
        </Box>
        {loading ? (
          <LoadingEventInformation />
        ) : (
          <Box sx={{ px: 2 }}>
            <Box sx={{ p: 0, alignSelf: 'center' }}>
              <Typography sx={{ fontSize: 16, fontWeight: 'bold' }} color="text.secondary" gutterBottom>
                Beschreibung
              </Typography>
              <Typography pb={1}>{selectedEvent?.description}</Typography>
              <Divider />

              {selectedEvent.maxAttendees &&
                selectedEvent.maxAttendees >= 0 &&
                selectedEvent.maxAttendees <= attendance.filter((x) => x.state === 'Attending').length &&
                selectedEvent.userAttendance !== 'Waiting' &&
                selectedEvent.userAttendance !== 'Attending' && (
                  <Alert
                    sx={{ mt: 2 }}
                    severity="info"
                    action={
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => updateAttendance('Waiting', selectedEvent.userAttendance)}
                      >
                        Beitreten
                      </Button>
                    }
                  >
                    Die maximale Anzahl der Teilnehmer ist erreicht. Du kannst trotzdem der Warteliste beitreten.
                  </Alert>
                )}

              {selectedEvent.userAttendance === 'Waiting' && (
                <Alert
                  sx={{ mt: 2 }}
                  severity="warning"
                  action={
                    <Button
                      variant="contained"
                      size="small"
                      sx={{ backgroundColor: '#934b00' }}
                      onClick={() => updateAttendance('Declined', selectedEvent.userAttendance)}
                    >
                      Verlassen
                    </Button>
                  }
                >
                  {t('events.information.waitingListAccepted', {
                    place:
                      attendance
                        .filter((x) => x.state === 'Waiting')
                        .sort((a, b) => (isBefore(a.lastUpdate, b.lastUpdate) ? 1 : 0))
                        .findIndex((x) => x.user.userId === user.userId) + 1,
                    waitingListLength: attendance.filter((x) => x.state === 'Waiting').length,
                  })}
                </Alert>
              )}
            </Box>
            <EventInformationAttendance
              user={user}
              attendance={attendance}
              keyHolders={keyHolders}
              attendanceLoading={attendanceLoading}
              selectedEvent={selectedEvent}
              updateAttendance={updateAttendance}
            />

            <EventInformationComments
              eventId={selectedEvent.id}
              comments={comments}
              handleCommentSubmit={handleCommentSubmit}
              eventInThePast={eventInThePast(selectedEvent)}
            />
          </Box>
        )}

        <CancelTrainingDialog
          cancelTrainingOpen={cancelTrainingOpen}
          setCancelTrainingOpen={setCancelTrainingOpen}
          cancelTraining={cancelTraining}
          selectedEvent={selectedEvent}
        />

        <DeleteEventDialog
          selectedEvent={selectedEvent}
          setOpen={() => setDeleteTrainingOpen(true)}
          open={deleteTrainingOpen}
          handleClose={(e) => {
            deleteEvent(e);
            setDeleteTrainingOpen(false);
          }}
        />

        <EditEventOptionsDialog
          setOpen={() => setEditEventOptionOpen(true)}
          open={editEventOptionOpen}
          handleClose={(e) => {
            setEditEventOptionOpen(false);
            if (e != null) {
              dispatch(editEvent(selectedEvent));
              navigate('/training/createOrUpdate/' + e, { replace: true });
            }
          }}
        />
      </List>
    </Layout>
  );
};

export default EventInformation;
