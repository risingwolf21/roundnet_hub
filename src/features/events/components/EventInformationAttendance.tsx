import {
  CheckCircleOutline,
  HourglassBottom,
  Key,
  Pending,
  PendingOutlined,
  RecordVoiceOver,
  RecordVoiceOverOutlined,
  RemoveCircleOutline,
  ThumbDownAlt,
  ThumbDownOffAlt,
  ThumbUpAlt,
  ThumbUpOffAlt,
} from '@mui/icons-material';
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import Box from '@mui/material/Box';
import { isBefore } from 'date-fns';
import { t } from 'i18next';
import React, { useState } from 'react';
import { useAuthentication } from 'src/features/auth/AuthProvider';
import { useAttendance, useUpdateAttendanceMutation } from 'src/tanstack/events';
import {
  answerDeadlineExpired,
  eventInThePast,
  EventsUserView,
  maxAttendeesExceeded
} from 'src/types/supabaseTypes';
import EventAttendanceDialog from '../dialogs/EventAttendanceDialog';
import { EventInformationConstellations } from './EventInformationConstellations';

type EventInformationAttendanceProps = {
  fetchMode: "past" | "upcoming"
  selectedEvent: EventsUserView;
  keyHolders: FullItemHolder[];
};

const EventInformationAttendance = ({
  selectedEvent,
  fetchMode,
  keyHolders,
}: EventInformationAttendanceProps) => {
  const { user, isAuthorized } = useAuthentication();
  const [eventAttendanceState, setEventAttendanceState] = useState({ open: false, index: 0 });

  const { data: attendance = [], isLoading } = useAttendance(selectedEvent.id);

  const updateAttendance = useUpdateAttendanceMutation(fetchMode)

  return (
    <Box sx={{ p: 0, alignSelf: 'center' }}>
      {selectedEvent.user_state === 'Waiting' && (
        <Alert
          sx={{ mt: 2 }}
          severity="warning"
          action={
            <Button
              variant="contained"
              size="small"
              sx={{ backgroundColor: '#934b00' }}
              onClick={() => updateAttendance.mutate({ user, event: selectedEvent, newState: 'Declined' })}
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

      {
        isAuthorized("events.create.constellations") && <EventInformationConstellations attendance={attendance} event={selectedEvent} />
      }

      <Typography sx={{ fontSize: 16, fontWeight: 'bold', mt: 2 }} color="text.secondary" gutterBottom>
        {t('attendees')}
      </Typography>
      <List sx={{ p: 0 }}>
        {attendance
          .filter((x) => x.state === 'Attending')
          .map((y) => y.user.userId)
          .some((x) =>
            keyHolders
              .filter((y) => y.type === selectedEvent.required_item)
              .filter((y) => y.full_current_holder !== null)
              .map((y) => y.full_current_holder?.userId)
              .includes(x)
          ) && (
            <ListItem key={'keyAttendees'} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }} divider>
              <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex' }}>
                <Key sx={{ color: (theme) => theme.palette.success.main }} />
              </ListItemAvatar>
              <ListItemText primary={t('events.information.keyHolderAttending')} />
            </ListItem>
          )}
        {
          selectedEvent.maxAttendees && selectedEvent.maxAttendees >= 0 && (
            <ListItem key={'spotsTaken'} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }} divider>
              <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex' }}>
                <CircularProgress
                  size={'24px'}
                  thickness={8}
                  sx={{ borderRadius: '100%', p: '2px', position: 'relative', zIndex: 2 }}
                  variant="determinate"
                  value={(attendance.filter((x) => x.state === 'Attending').length / selectedEvent.maxAttendees) * 100}
                />
                <CircularProgress
                  variant="determinate"
                  size={'24px'}
                  value={100}
                  thickness={8}
                  sx={{ color: '#eee', p: '2px', position: 'absolute', zIndex: 1 }}
                />
              </ListItemAvatar>
              <ListItemText
                primary={t('events.information.eventSpotsTaken', {
                  taken: attendance.filter((x) => x.state === 'Attending').length,
                  waitingListLength: selectedEvent.maxAttendees,
                })}
              />
            </ListItem>
          )
        }
        <ListItem
          key={'attendEvent'}
          sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}
          onClick={() =>
            isLoading
              ? {}
              : setEventAttendanceState({
                open: true,
                index: 0,
              })
          }
          secondaryAction={
            isAuthorized("event.signup") && <>
              <IconButton
                onClick={(event) => {
                  updateAttendance.mutate({ event: selectedEvent, newState: 'Attending', user });
                  event.stopPropagation();
                }}
                disabled={
                  selectedEvent.isCancelled ||
                  maxAttendeesExceeded(selectedEvent, attendance) ||
                  answerDeadlineExpired(selectedEvent) ||
                  eventInThePast(selectedEvent)
                }
              >
                {selectedEvent.user_state === 'Attending' ? (
                  <ThumbUpAlt fontSize="inherit" sx={{ fontSize: '28px', color: 'green' }} />
                ) : (
                  <ThumbUpOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
                )}
              </IconButton>
              {
                (maxAttendeesExceeded(selectedEvent, attendance) ||
                  answerDeadlineExpired(selectedEvent))
                && !eventInThePast(selectedEvent)
                && (selectedEvent.user_state === "Unanswered" || selectedEvent.user_state === "Declined" || selectedEvent.user_state === "RequestedAttendance")
                && <IconButton
                  onClick={(event) => {
                    event.stopPropagation();
                    updateAttendance.mutate({ event: selectedEvent, newState: 'RequestedAttendance', user });
                  }}
                  disabled={selectedEvent.isCancelled || eventInThePast(selectedEvent) || selectedEvent.user_state === "RequestedAttendance"}
                >
                  {selectedEvent.user_state === 'RequestedAttendance' ? (
                    <Pending fontSize="inherit" sx={{ fontSize: '28px', color: '#125db2' }} />
                  ) : (
                    <PendingOutlined fontSize="inherit" sx={{ fontSize: '28px' }} />
                  )}
                </IconButton>
              }
              {isAuthorized("event.signup.trainer") && (
                <IconButton
                  onClick={(event) => {
                    event.stopPropagation();
                    updateAttendance.mutate({ event: selectedEvent, newState: 'AttendingAsTrainer', user });
                  }}
                  disabled={selectedEvent.isCancelled || eventInThePast(selectedEvent)}
                >
                  {selectedEvent.user_state === 'AttendingAsTrainer' ? (
                    <RecordVoiceOver fontSize="inherit" sx={{ fontSize: '28px', color: 'green' }} />
                  ) : (
                    <RecordVoiceOverOutlined fontSize="inherit" sx={{ fontSize: '28px' }} />
                  )}
                </IconButton>
              )}
            </>
          }
        >
          <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex' }}>
            {isLoading ? <CircularProgress size={'20px'} /> : <CheckCircleOutline color="success" />}
          </ListItemAvatar>
          <ListItemText
            primary={t('events.information.attending', {
              count: attendance.filter((x) => x.state === 'Attending' || x.state === 'AttendingAsTrainer').length,
            })}
          />
        </ListItem>
        <Divider />
        <ListItem
          key={'declineEvent'}
          sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}
          onClick={() =>
            isLoading
              ? {}
              : setEventAttendanceState({
                open: true,
                index: 1,
              })
          }
          secondaryAction={
            isAuthorized("event.signup") && <IconButton
              onClick={(event) => {
                event.stopPropagation();
                updateAttendance.mutate({ event: selectedEvent, newState: 'Declined', user });
              }}
              disabled={selectedEvent.isCancelled || eventInThePast(selectedEvent)}
            >
              {selectedEvent.user_state === 'Declined' ? (
                <ThumbDownAlt fontSize="inherit" sx={{ fontSize: '28px', color: 'red' }} />
              ) : (
                <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
              )}
            </IconButton>
          }
        >
          <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex' }}>
            {isLoading ? <CircularProgress size={'20px'} /> : <RemoveCircleOutline color="error" />}
          </ListItemAvatar>
          <ListItemText
            primary={t('events.information.declined', {
              count: attendance.filter((x) => x.state === 'Declined').length,
            })}
          />
        </ListItem>
        {(attendance.filter((x) => x.state === 'Waiting').length ?? 0) > 0 && (
          <>
            <Divider />
            <ListItem
              key={'waitingEvent'}
              sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}
              onClick={() =>
                isLoading
                  ? {}
                  : setEventAttendanceState({
                    open: true,
                    index: 2,
                  })
              }
            >
              <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex' }}>
                {isLoading ? <CircularProgress size={'20px'} /> : <HourglassBottom sx={{ color: '#125db2' }} />}
              </ListItemAvatar>
              <ListItemText primary={(attendance.filter((x) => x.state === 'Waiting').length ?? 0) + ' warten'} />
            </ListItem>
          </>
        )}
      </List>
      <Divider />

      <EventAttendanceDialog
        open={eventAttendanceState.open}
        index={eventAttendanceState.index}
        hasWaitingList={attendance.some((x) => x.state === 'Waiting')}
        setOpen={(value) => setEventAttendanceState({ open: value, index: eventAttendanceState.index })}
        attendance={attendance}
        usersWithRequiredItem={keyHolders
          .filter((x) => x.type === selectedEvent.required_item)
          .filter((x) => x.full_current_holder !== null)
          .map((x) => ({
            user: (x.full_current_holder)!.userId,
            item: x,
          }))}
        acceptAttendance={(attendance) => {
          updateAttendance.mutate({ event: selectedEvent, newState: "Attending", user: attendance.user })
        }}
      />
    </Box>
  );
};

export default EventInformationAttendance;
