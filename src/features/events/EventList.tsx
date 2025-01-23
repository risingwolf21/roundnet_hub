import AddIcon from '@mui/icons-material/Add';
import { Chip, Fab, List, ListSubheader } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClient } from 'react-supabase';
import { useAppDispatch } from '../../redux/store';
import { EventItem } from './components/EventItem';
import {
  editEvent,
  fetchPastEventsAsync,
  fetchSingleEventAsync,
  fetchUpcomingEventsAsync,
  onEventDelete,
  onEventErrorRead,
  onEventUpdate,
  SliceEvent,
} from 'src/features/events/slices/eventsSlice';
import { updateAttendanceAsync } from 'src/features/events/slices/eventAttendanceSlice';
import { can } from '../../utils/PermissionService';
import { TablesInsert, TablesUpdate } from '../../types/supabase-generated.types';
import { t } from 'i18next';
import { AlertMessage, AlertSnackbar } from '../../components/AlertSnackbar';
import { Check, EventRepeat, FilterAlt } from '@mui/icons-material';
import Grid from '@mui/material/Grid2';
import Layout from '../../components/Layout';
import { Box } from '@mui/system';
import { LoadingEventItem } from './components/LoadingEventItem';
import { SwipeableDialog } from 'src/components/SwipeableDialog';
import { UserWithRolesAndPermissions } from 'src/types/supabaseTypes';

export type EventScreenProps = {
  events: SliceEvent[];
  loading: boolean;
  error: AlertMessage | null;
  user: UserWithRolesAndPermissions;
};

const EventScreen = ({ events, loading, error, user }: EventScreenProps) => {
  const client = useClient();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [fetchEventMode, setFetchEventMode] = useState<'upcoming' | 'past'>(
    (localStorage.getItem('fetchMode') as 'upcoming' | 'past') ?? 'upcoming'
  );
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
    if (fetchEventMode === 'upcoming') dispatch(fetchUpcomingEventsAsync({ user }));
    else dispatch(fetchPastEventsAsync({ user }));
  }, [dispatch, user, fetchEventMode]);

  const switchEventFetching = (mode: 'upcoming' | 'past') => {
    localStorage.setItem('fetchMode', mode);
    setFetchEventMode(mode);
  };

  const updateAttendance = async (eventId: string, state: EventAttendance, oldState: EventAttendance) => {
    dispatch(updateAttendanceAsync({ user, eventId, state, oldState }));
  };

  return (
    <Layout>
      <List
        sx={(theme) => ({
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
                  variant={fetchEventMode === 'upcoming' ? 'filled' : 'outlined'}
                  label={t('events.upcoming')}
                  color={fetchEventMode === 'upcoming' ? 'primary' : 'default'}
                  onClick={() => switchEventFetching('upcoming')}
                />
              </Grid>
              <Grid>
                <Chip
                  variant={fetchEventMode === 'past' ? 'filled' : 'outlined'}
                  label={t('events.past')}
                  color={fetchEventMode === 'past' ? 'primary' : 'default'}
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
