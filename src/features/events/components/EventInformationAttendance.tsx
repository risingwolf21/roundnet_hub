import { useGrants } from '@/features/auth/GrantsContext';
import { Has } from '@/hooks/useGrants';
import { useAttendance, useUpdateAttendanceMutation } from '@/tanstack/events';
import { answerDeadlineExpired, eventInThePast, EventsUserView, maxAttendeesExceeded } from '@/types/supabaseTypes';
import Box from '@mui/material/Box';
import { useNotifications } from '@toolpad/core';
import { isBefore } from 'date-fns';
import { t } from 'i18next';
import { useMemo, useState } from 'react';
import EventAttendanceDialog from '../dialogs/EventAttendanceDialog';
import { EventInformationConstellations } from './EventInformationConstellations';

import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import HourglassBottom from '@mui/icons-material/HourglassBottom';
import Key from '@mui/icons-material/Key';
import Pending from '@mui/icons-material/Pending';
import PendingOutlined from '@mui/icons-material/PendingOutlined';
import RecordVoiceOver from '@mui/icons-material/RecordVoiceOver';
import RecordVoiceOverOutlined from '@mui/icons-material/RecordVoiceOverOutlined';
import RemoveCircleOutline from '@mui/icons-material/RemoveCircleOutline';
import ThumbDownAlt from '@mui/icons-material/ThumbDownAlt';
import ThumbDownOffAlt from '@mui/icons-material/ThumbDownOffAlt';
import ThumbUpAlt from '@mui/icons-material/ThumbUpAlt';
import ThumbUpOffAlt from '@mui/icons-material/ThumbUpOffAlt';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

type EventInformationAttendanceProps = {
  fetchMode: 'past' | 'upcoming';
  selectedEvent: EventsUserView;
  keyHolders: FullItemHolder[];
};

const EventInformationAttendance = ({ selectedEvent, fetchMode, keyHolders }: EventInformationAttendanceProps) => {
  const { user } = useGrants();
  const notifications = useNotifications();
  const [eventAttendanceState, setEventAttendanceState] = useState({ open: false, index: 0 });

  const { data: attendance = [], isLoading } = useAttendance(selectedEvent.id);

  const attending = useMemo(() => attendance.filter(x => x.state === "Attending" || x.state === "AttendingAsTrainer"), [attendance]);
  const declined = useMemo(() => attendance.filter(x => x.state === "Declined"), [attendance]);
  const attendingAsTrial = useMemo(() => attendance.filter(x => x.state === "AttendingAsTrial"), [attendance]);
  const waiting = useMemo(() => attendance.filter(x => x.state === "Waiting"), [attendance]);
  const waitingAsTrial = useMemo(() => attendance.filter(x => x.state === "WaitingAsTrial"), [attendance]);

  const updateAttendance = useUpdateAttendanceMutation(fetchMode);

  const changeAttendance = ({
    user,
    event,
    newState,
  }: {
    user: User;
    event: EventsUserView;
    newState: EventAttendance;
  }) => {
    updateAttendance.mutate(
      { user, event, newState },
      {
        onError: () => {
          notifications.show('An/Abweseneheit konnte nicht aktualisiert werden.', { severity: 'error' });
        },
      }
    );
  };

  return (
    <Box sx={{ p: 0, alignSelf: 'center' }}>
      {(selectedEvent.user_state === 'Waiting') && (
        <Alert
          sx={{ mt: 2 }}
          severity="warning"
          action={
            <Button
              variant="contained"
              size="small"
              sx={{ backgroundColor: '#934b00' }}
              onClick={() => changeAttendance({ user, event: selectedEvent, newState: 'Declined' })}
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

      <Has feat={"events.trials"}>
        {(selectedEvent.user_state === 'WaitingAsTrial') && (
          <Alert
            sx={{ mt: 2 }}
            severity="warning"
            action={
              <Button
                variant="contained"
                size="small"
                sx={{ backgroundColor: '#934b00' }}
                onClick={() => changeAttendance({ user, event: selectedEvent, newState: 'Declined' })}
              >
                Verlassen
              </Button>
            }
          >
            {t('events.information.waitingListAccepted', {
              place:
                attendance
                  .filter((x) => x.state === 'WaitingAsTrial')
                  .sort((a, b) => (isBefore(a.lastUpdate, b.lastUpdate) ? 1 : 0))
                  .findIndex((x) => x.user.userId === user.userId) + 1,
              waitingListLength: attendance.filter((x) => x.state === 'WaitingAsTrial').length,
            })}
          </Alert>
        )}
      </Has>

      {selectedEvent.constellations_enabled && (
        <Has perm={'event.create.constellations'}>
          <EventInformationConstellations attendance={attendance} event={selectedEvent} />
        </Has>
      )}

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
        {selectedEvent.maxAttendees && selectedEvent.maxAttendees >= 0 && (
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
        )}
        <Has feat={"events.trials"}>
          {selectedEvent.max_trial_attendees && selectedEvent.max_trial_attendees >= 0 && (
            <ListItem key={'spotsTakenTrial'} sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }} divider>
              <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex' }}>
                <CircularProgress
                  size={'24px'}
                  thickness={8}
                  sx={{ borderRadius: '100%', p: '2px', position: 'relative', zIndex: 2 }}
                  variant="determinate"
                  value={(attendance.filter((x) => x.state === 'AttendingAsTrial').length / selectedEvent.max_trial_attendees) * 100}
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
                primary={t('events.information.eventTrialSpotsTaken', {
                  taken: attendance.filter((x) => x.state === 'AttendingAsTrial').length,
                  waitingListLength: selectedEvent.max_trial_attendees,
                })}
              />
            </ListItem>
          )}
        </Has>
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
          {
          ...(attendingAsTrial.length > 0 && { disablePadding: true })
          }
          secondaryAction={
            <Has perm={'event.signup'}>
              <>
                <IconButton
                  onClick={(event) => {
                    changeAttendance({ event: selectedEvent, newState: 'Attending', user });
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
                {(maxAttendeesExceeded(selectedEvent, attendance) || answerDeadlineExpired(selectedEvent)) &&
                  !eventInThePast(selectedEvent) &&
                  (selectedEvent.user_state === 'Unanswered' ||
                    selectedEvent.user_state === 'Declined' ||
                    selectedEvent.user_state === 'RequestedAttendance') && (
                    <IconButton
                      onClick={(event) => {
                        event.stopPropagation();
                        changeAttendance({ event: selectedEvent, newState: 'RequestedAttendance', user });
                      }}
                      disabled={
                        selectedEvent.isCancelled ||
                        eventInThePast(selectedEvent) ||
                        selectedEvent.user_state === 'RequestedAttendance'
                      }
                    >
                      {selectedEvent.user_state === 'RequestedAttendance' ? (
                        <Pending fontSize="inherit" sx={{ fontSize: '28px', color: '#125db2' }} />
                      ) : (
                        <PendingOutlined fontSize="inherit" sx={{ fontSize: '28px' }} />
                      )}
                    </IconButton>
                  )}
                <Has perm={'event.signup.trainer'}>
                  <IconButton
                    onClick={(event) => {
                      event.stopPropagation();
                      changeAttendance({ event: selectedEvent, newState: 'AttendingAsTrainer', user });
                    }}
                    disabled={selectedEvent.isCancelled || eventInThePast(selectedEvent)}
                  >
                    {selectedEvent.user_state === 'AttendingAsTrainer' ? (
                      <RecordVoiceOver fontSize="inherit" sx={{ fontSize: '28px', color: 'green' }} />
                    ) : (
                      <RecordVoiceOverOutlined fontSize="inherit" sx={{ fontSize: '28px' }} />
                    )}
                  </IconButton>
                </Has>
              </>
            </Has>
          }
        >
          <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex' }}>
            {isLoading ? <CircularProgress size={'20px'} /> : <CheckCircleOutline color="success" />}
          </ListItemAvatar>
          <ListItemText
            primary={t('events.information.attending', {
              count: attending.length,
            })}
            {
            ...(attendingAsTrial.length > 0 && {
              secondary: t('events.information.attending_trial', {
                count: attendingAsTrial.length,
              })
            })
            }
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
            <Has perm={'event.signup'}>
              <IconButton
                onClick={(event) => {
                  event.stopPropagation();
                  changeAttendance({ event: selectedEvent, newState: 'Declined', user });
                }}
                disabled={selectedEvent.isCancelled || eventInThePast(selectedEvent)}
              >
                {selectedEvent.user_state === 'Declined' ? (
                  <ThumbDownAlt fontSize="inherit" sx={{ fontSize: '28px', color: 'red' }} />
                ) : (
                  <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
                )}
              </IconButton>
            </Has>
          }
        >
          <ListItemAvatar sx={{ justifyContent: 'left', alignItems: 'center', display: 'flex' }}>
            {isLoading ? <CircularProgress size={'20px'} /> : <RemoveCircleOutline color="error" />}
          </ListItemAvatar>
          <ListItemText
            primary={t('events.information.declined', {
              count: declined.length,
            })}
          />
        </ListItem>
        {
          (waiting.length > 0 || waitingAsTrial.length > 0) && (
            <>
              <Divider />
              <ListItem
                key={'waitingEvent'}
                sx={{ '&.MuiListItem-root': { paddingLeft: 0 } }}
                {
                ...(waitingAsTrial.length > 0 && { disablePadding: true })
                }
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
                <ListItemText primary={waiting.length + ' warten'}
                  {
                  ...(waitingAsTrial.length > 0 && {
                    secondary: t('events.information.waiting_trial', {
                      count: waitingAsTrial.length,
                    })
                  })
                  } />
              </ListItem>
            </>
          )
        }
      </List>
      <Divider />

      <EventAttendanceDialog
        open={eventAttendanceState.open}
        index={eventAttendanceState.index}
        setOpen={(value) => setEventAttendanceState({ open: value, index: eventAttendanceState.index })}
        attendance={attendance}
        usersWithRequiredItem={keyHolders
          .filter((x) => x.type === selectedEvent.required_item)
          .filter((x) => x.full_current_holder !== null)
          .map((x) => ({
            user: x.full_current_holder!.userId,
            item: x,
          }))}
        acceptAttendance={(attendance) => {
          changeAttendance({ event: selectedEvent, newState: 'Attending', user: attendance.user });
        }}
      />
    </Box>
  );
};

export default EventInformationAttendance;
