import { Check, EventRepeat, FilterAlt } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import { Button, Chip, Fab, List, ListSubheader, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Box, Stack } from '@mui/system';
import { useNotifications } from '@toolpad/core/useNotifications';
import { format, parse } from 'date-fns';
import { t } from 'i18next';
import { groupBy } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { SwipeableDialog } from 'src/components/SwipeableDialog';
import { updateAttendanceAsync } from 'src/features/events/slices/eventAttendanceSlice';
import {
  editEvent,
  fetchEventsAsync,
  onEventErrorRead,
  SliceEvent,
  updateFetchMode
} from 'src/features/events/slices/eventsSlice';
import { UserWithRolesAndPermissions } from 'src/types/supabaseTypes';
import { Event } from 'types/supabase';
import { AlertMessage } from '../../components/AlertSnackbar';
import Layout from '../../components/Layout';
import { useAppDispatch } from '../../redux/store';
import { can } from '../../utils/PermissionService';
import { useApplication } from '../auth/ApplicationContext';
import { EventItem } from './components/EventItem';
import { LoadingEventItem } from './components/LoadingEventItem';
import { withProfiler } from '@sentry/react';

type EventScreenProps = {
  events: SliceEvent[];
  loading: boolean;
  error: AlertMessage | null;
  user: UserWithRolesAndPermissions;
  fetchMode: 'upcoming' | 'past';
};

const EventScreen = ({ events, loading, error, user, fetchMode }: EventScreenProps) => {
  const { provider_token } = useApplication();
  const dispatch = useAppDispatch();
  const notifications = useNotifications();
  const navigate = useNavigate();
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    (localStorage.getItem('selectedGroups')?.split(';') as string[]) || user.groups.map((x) => x.id)
  );

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: error.severity, onAction: () => dispatch(onEventErrorRead(null)) })
  }, [error, notifications, dispatch])

  useEffect(() => {
    dispatch(fetchEventsAsync({ user, fetchMode }))
  }, [dispatch, user, fetchMode]);

  const switchEventFetching = (mode: 'upcoming' | 'past') => {
    localStorage.setItem('fetchMode', mode);
    dispatch(updateFetchMode(mode))
  };

  const updateAttendance = async (event: Event, state: EventAttendance, oldState: EventAttendance) => {
    dispatch(updateAttendanceAsync({ user, event, state, oldState, provider_token }));
  };

  return (
    <Layout>
      <Box
        sx={(theme) => ({
          overscrollBehavior: "none",
          [theme.breakpoints.down('xl')]: { pb: 12 },
          [theme.breakpoints.up('xl')]: { pb: 0 },
        })}
      >
        {loading
          ? Array.from({ length: 10 }, (v, k) => k + 1).map((x) => <LoadingEventItem key={x} />)
          : events.length <= 0
            ? <Stack spacing={2} direction={"column"} sx={{ height: 300, alignItems: "center", justifyContent: "center" }}>
              <Typography>Es sieht so aus als ob du keine Events siehts</Typography>
              <Typography>Versuch einer Gruppe beizutreten um die Events dieser einzusehen</Typography>
              <Button variant='contained' onClick={() => navigate("/groups/list")}>Gruppe beitreten</Button>
            </Stack>
            : Object.entries(groupBy(events
              .filter((x) => selectedGroups.includes(x.group)), x => format(x.startingDateTime, "dd-MM-yyyy")))
              .map(([key, value]) => <table style={{ width: "100%", borderSpacing: 0 }} key={key}>
                <tbody style={{ width: "100%" }}>
                  {
                    value.map((event, index) => <tr style={{ height: "1px" }} key={index + event.id}>
                      {
                        index === 0 ? <td style={{ position: "sticky", top: 0, padding: 0, height: "inherit" }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', height: "100%", justifyContent: 'center', mx: 3, py: 1, width: 20 }}>
                            <Typography fontSize={10} textAlign={'center'}>
                              {t('events.startDateDayString', { date: parse(key, "dd-MM-yyyy", new Date()) }).toUpperCase()}
                            </Typography>
                            <Typography variant="h6" fontWeight={'bold'} textAlign={'center'}>
                              {t('events.startDateDay', { date: parse(key, "dd-MM-yyyy", new Date()) }).toUpperCase()}
                            </Typography>
                          </Box>
                        </td> : <td style={{ padding: 0 }}></td>
                      }
                      <td style={{ width: "100%", padding: 0 }}>
                        <EventItem
                          key={event.id}
                          event={event}
                          t={t}
                          attendanceUpdating={event.attendanceUpdating}
                          attendEvent={() => updateAttendance(event, 'Attending', event.userAttendance)}
                          declineEvent={() => updateAttendance(event, 'Declined', event.userAttendance)}
                          onClick={() => {
                            navigate('/training/event/' + event.id);
                          }}
                        />
                      </td>
                    </tr>)
                  }
                </tbody>
              </table>
              )}
      </Box>
      {can('select', 'event') && (
        <Fab
          key="filter"
          sx={{
            position: 'fixed',
            right: '16px',
            bottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
          color={'secondary'}
          onClick={() => setFilterDialogOpen(true)}
        >
          {<FilterAlt sx={{ color: 'white' }} />}
        </Fab>
      )}
      {can('insert', 'event') && (
        <Fab
          key="insertEvent"
          sx={{
            position: 'fixed',
            right: '88px',
            bottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
          color={'secondary'}
          onClick={() => {
            dispatch(editEvent(null));
            navigate('/training/createOrUpdate/InsertEvent');
          }}
        >
          {<AddIcon sx={{ color: 'white' }} />}
        </Fab>
      )}
      {can('update', 'event') && (
        <Fab
          key="updateEvent"
          sx={{
            position: 'fixed',
            right: '160px',
            bottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
          color={'secondary'}
          onClick={() => navigate('/training/recurringEvents')}
        >
          {<EventRepeat sx={{ color: 'white' }} />}
        </Fab>
      )}

      <SwipeableDialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        setOpen={() => setFilterDialogOpen(true)}
        title={t('filter')}
      >
        <>
          <List
            sx={{ mx: 2 }}
            subheader={
              <ListSubheader
                sx={{
                  fontWeight: 'bold',
                  lineHeight: 'normal',
                  color: 'black',
                  mb: 2,
                  pl: 0,
                }}
              >
                Events
              </ListSubheader>
            }
          >
            <Grid container spacing={2}>
              <Grid>
                <Chip
                  variant={fetchMode === 'upcoming' ? 'filled' : 'outlined'}
                  label={t('events.upcoming')}
                  color={fetchMode === 'upcoming' ? 'primary' : 'default'}
                  onClick={() => switchEventFetching('upcoming')}
                />
              </Grid>
              <Grid>
                <Chip
                  variant={fetchMode === 'past' ? 'filled' : 'outlined'}
                  label={t('events.past')}
                  color={fetchMode === 'past' ? 'primary' : 'default'}
                  onClick={() => switchEventFetching('past')}
                />
              </Grid>
            </Grid>
          </List>
          <List
            sx={{ mx: 2 }}
            subheader={
              <ListSubheader
                sx={{
                  fontWeight: 'bold',
                  lineHeight: 'normal',
                  color: 'black',
                  mb: 2,
                  pl: 0,
                }}
              >
                Gruppen
              </ListSubheader>
            }
          >
            <Grid container spacing={2}>
              {user.groups.map((x) => (
                <Grid key={x.id}>
                  <Chip
                    variant={selectedGroups.includes(x.id) ? 'filled' : 'outlined'}
                    color={'secondary'}
                    onClick={() => {
                      let newGroups = selectedGroups.includes(x.id)
                        ? [...selectedGroups.filter((y) => y !== x.id)]
                        : [...selectedGroups, x.id];
                      setSelectedGroups(newGroups);
                      localStorage.setItem('selectedGroups', newGroups.join(';'));
                    }}
                    icon={<Check fontSize="small" />}
                    label={x.name}
                  />
                </Grid>
              ))}
            </Grid>
          </List>
        </>
      </SwipeableDialog>
    </Layout >
  );
};

export default withProfiler(EventScreen);
