import AddIcon from '@mui/icons-material/Add';
import { Chip, Fab, List } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClient } from 'react-supabase';
import { useAppDispatch } from '../../redux/store';
import { EventItem } from './components/EventItem';
import {
  editEvent,
  fetchPastEventsAsync,
  fetchUpcomingEventsAsync,
  onEventDelete,
  onEventErrorRead,
  onEventUpdate,
  SliceEvent,
} from 'src/features/events/slices/eventsSlice';
import { updateAttendanceAsync } from 'src/features/events/slices/eventAttendanceSlice';
import { can } from '../../utils/PermissionService';
import { TablesUpdate } from '../../types/supabase-generated.types';
import { t } from 'i18next';
import { AlertMessage, AlertSnackbar } from '../../components/AlertSnackbar';
import { EventRepeat } from '@mui/icons-material';
import Grid from '@mui/material/Grid2';
import Layout from '../../components/Layout';
import { Box } from '@mui/system';
import { LoadingEventItem } from './components/LoadingEventItem';

export type EventScreenProps = {
  events: SliceEvent[];
  loading: boolean;
  error: AlertMessage | null;
  user: User;
};

const EventScreen = ({ events, loading, error, user }: EventScreenProps) => {
  const client = useClient();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [fetchEventMode, setFetchEventMode] = useState<'upcoming' | 'past'>(
    (localStorage.getItem('fetchMode') as 'upcoming' | 'past') ?? 'upcoming'
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
      // .on<EventInsert>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, payload => dispatch(onEventInsert(payload.new)))
      .subscribe();
    return () => {
      subscription.unsubscribe();
    };
  }, [client, dispatch]);

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
      <List sx={{ overflowY: 'auto', pt: 0, pb: 10 }}>
        <Grid container p={2} alignItems={'start'} justifyContent="start" direction={'row'} width={'100%'}>
          <Chip
            variant={fetchEventMode === 'upcoming' ? 'filled' : 'outlined'}
            label={t('nextMonth')}
            color={fetchEventMode === 'upcoming' ? 'primary' : 'default'}
            onClick={() => switchEventFetching('upcoming')}
          />
          <Chip
            sx={{ ml: 2 }}
            variant={fetchEventMode === 'past' ? 'filled' : 'outlined'}
            label={t('pastMonth')}
            color={fetchEventMode === 'past' ? 'primary' : 'default'}
            onClick={() => switchEventFetching('past')}
          />
        </Grid>
        <Box sx={{ pb: 10 }}>
          {loading
            ? Array.from({ length: 10 }, (v, k) => k + 1).map(() => <LoadingEventItem />)
            : events.map((event) => (
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
        {can('insert', 'event') && (
          <Fab
            sx={{
              position: 'fixed',
              right: '16px',
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
              mb: '16px',
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
            sx={{
              position: 'fixed',
              right: '88px',
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
              mb: '16px',
            }}
            color={'secondary'}
            onClick={() => navigate('/training/recurringEvents')}
          >
            {<EventRepeat sx={{ color: 'white' }} />}
          </Fab>
        )}

        <AlertSnackbar alertInfo={error} close={() => dispatch(onEventErrorRead(null))} />
      </List>
    </Layout>
  );
};

export default EventScreen;
