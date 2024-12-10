import AddIcon from '@mui/icons-material/Add';
import { Chip, Fab, LinearProgress, List } from '@mui/material';
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
  const [fetchEventMode, setFetchEventMode] = useState<'upcoming' | 'past'>('upcoming');

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
    dispatch(fetchUpcomingEventsAsync({ user }));
  }, [dispatch, user]);

  const fetchEvents = (mode: 'upcoming' | 'past') => {
    if (mode === 'upcoming') dispatch(fetchUpcomingEventsAsync({ user }));
    else dispatch(fetchPastEventsAsync({ user }));
  };

  const switchEventFetching = (mode: 'upcoming' | 'past') => {
    setFetchEventMode(mode);
    fetchEvents(mode);
  };

  const updateAttendance = async (eventId: string, state: EventAttendance, oldState: EventAttendance) => {
    dispatch(updateAttendanceAsync({ user, eventId, state, oldState }));
  };

  return (
    <Layout>
      {loading && <LinearProgress sx={{ position: 'fixed', top: 56, left: 0, right: 0 }} />}
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
      <List sx={{ pb: 10, overflowX: 'hidden' }}>
        {events.map((event) => (
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
      </List>
      {can('insert', 'event') && (
        <Fab
          sx={{ background: '#66bb6a', position: 'fixed', right: '16px', bottom: '56px', mb: '16px' }}
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
          sx={{ background: '#66bb6a', position: 'fixed', right: '88px', bottom: '56px', mb: '16px' }}
          onClick={() => navigate('/training/recurringEvents')}
        >
          {<EventRepeat sx={{ color: 'white' }} />}
        </Fab>
      )}

      <AlertSnackbar alertInfo={error} close={() => dispatch(onEventErrorRead(null))} />
    </Layout>
  );
};

export default EventScreen;
