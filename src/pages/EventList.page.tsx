import React from 'react';
import Layout from 'src/components/Layout';
import EventScreen from '../features/events/EventList';

const EventScreenProvider = () => {

  return (<Layout>
    <EventScreen
    />
  </Layout>
  );
};

export default EventScreenProvider;
