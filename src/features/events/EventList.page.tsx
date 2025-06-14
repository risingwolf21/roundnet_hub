import React from 'react';
import EventScreen from './EventList';
import Layout from 'src/components/layout/Layout';

const EventScreenProvider = () => {

  return (<Layout>
    <EventScreen
    />
  </Layout>
  );
};

export default EventScreenProvider;
