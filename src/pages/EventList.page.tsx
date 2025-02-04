import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { eventsSelector, updateFetchMode } from 'src/features/events/slices/eventsSlice';
import { useAuth } from '../features/auth/AuthContext';
import EventScreen from '../features/events/EventList';
import { RootState, useAppDispatch } from '../redux/store';

const EventScreenProvider = () => {
  const { loading, error, fetchMode } = useSelector((state: RootState) => state.events);
  const events = useSelector(eventsSelector.selectAll);
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    let storageFetchMode = (localStorage.getItem('fetchMode') as 'upcoming' | 'past') ?? 'upcoming';
    dispatch(updateFetchMode(storageFetchMode));
  }, [dispatch])

  return (
    <EventScreen
      events={events}
      loading={loading}
      error={error ? { message: error, severity: 'error' } : null}
      user={user!}
      fetchMode={fetchMode}
    />
  );
};

export default EventScreenProvider;
