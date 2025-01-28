import { Check, EventRepeat, FilterAlt } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import { Chip, Fab, List, ListSubheader } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Box } from '@mui/system';
import { t } from 'i18next';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClient } from 'react-supabase';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { SwipeableDialog } from 'src/components/SwipeableDialog';
import { updateAttendanceAsync } from 'src/features/events/slices/eventAttendanceSlice';
import {
  editEvent,
  fetchEventsAsync,
  fetchSingleEventAsync,
  onEventDelete,
  onEventErrorRead,
  onEventUpdate,
  SliceEvent,
  updateFetchMode
} from 'src/features/events/slices/eventsSlice';
import { UserWithRolesAndPermissions } from 'src/types/supabaseTypes';
import { AlertMessage, AlertSnackbar } from '../../components/AlertSnackbar';
import Layout from '../../components/Layout';
import { useAppDispatch } from '../../redux/store';
import { TablesInsert, TablesUpdate } from '../../types/supabase-generated.types';
import { can } from '../../utils/PermissionService';
import { EventItem } from './components/EventItem';
import { LoadingEventItem } from './components/LoadingEventItem';
import { logEvent } from 'firebase/analytics';
import { analytics } from 'src/firebase/firebaseConfig';

export type EventScreenProps = {
  events: SliceEvent[];
  loading: boolean;
  error: AlertMessage | null;
  user: UserWithRolesAndPermissions;
  fetchMode: 'upcoming' | 'past';
};

const EventScreen = ({ events, loading, error, user, fetchMode }: EventScreenProps) => {
  const client = useClient();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    (localStorage.getItem('selectedGroups')?.split(';') as string[]) || user.groups.map((x) => x.id)
  );

  useEffect(() => {
    let subscription = client
      .channel('public:events')
      .on<TablesUpdate<'events'>>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
        },
        (payload) => dispatch(onEventUpdate(payload.new))
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'events',
        },
        (payload) => dispatch(onEventDelete(payload.old.id))
      )
      .on<TablesInsert<'events'>>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload) => {
          dispatch(fetchSingleEventAsync({ eventId: payload.new.id ?? '', userId: user.userId }));
        }
      )
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [client, dispatch, user]);

  useEffect(() => {
    dispatch(fetchEventsAsync({ user, fetchMode }))
  }, [dispatch, user, fetchMode]);

  const switchEventFetching = (mode: 'upcoming' | 'past') => {
    localStorage.setItem('fetchMode', mode);
    dispatch(updateFetchMode(mode))
  };

  const updateAttendance = async (eventId: string, state: EventAttendance, oldState: EventAttendance) => {
    logEvent(analytics, "event_attendance_update", { user: user.userId, name: user.name, eventId, state, oldState });
    dispatch(updateAttendanceAsync({ user, eventId, state, oldState }));
  };

  return (
    <Layout>
      <PullToRefresh onRefresh={() => dispatch(fetchEventsAsync({ user, fetchMode }))}>
        <List
          sx={(theme) => ({
            overscrollBehavior: "none",
            [theme.breakpoints.down('xl')]: { pb: 12 },
            [theme.breakpoints.up('xl')]: { pb: 0 },
          })}
        >
          <Box
          >
            {loading
              ? Array.from({ length: 10 }, (v, k) => k + 1).map((x) => <LoadingEventItem key={x} />)
              : events
                .filter((x) => selectedGroups.includes(x.group))
                .map((event) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    t={t}
                    attendanceUpdating={event.attendanceUpdating}
                    attendEvent={() => updateAttendance(event.id, 'Attending', event.userAttendance)}
                    declineEvent={() => updateAttendance(event.id, 'Declined', event.userAttendance)}
                    onClick={() => {
                      navigate('/training/event/' + event.id);
                    }}
                  />
                ))}
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
          <AlertSnackbar alertInfo={error} close={() => dispatch(onEventErrorRead(null))} />
        </List>
      </PullToRefresh>
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

export default EventScreen;
