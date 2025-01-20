import React from 'react';
import { useSelector } from 'react-redux';
import { eventsSelector } from 'src/features/events/slices/eventsSlice';
import { useAuth } from '../features/auth/AuthContext';
import EventScreen from '../features/events/EventList';
import { RootState } from '../redux/store';

const EventScreenProvider = () => {
  const { loading, error } = useSelector((state: RootState) => state.events);
  const events = useSelector(eventsSelector.selectAll);
  const { user } = useAuth();

  return (
    <EventScreen
      events={events}
      loading={loading}
      error={error ? { message: error, severity: 'error' } : null}
      user={user}
    />
  );
};

export default EventScreenProvider;
