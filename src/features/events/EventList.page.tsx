import Layout from '@/components/layout/Layout';
import EventScreen from './EventList';

const EventScreenProvider = () => {
  return (
    <Layout>
      <EventScreen />
    </Layout>
  );
};

export default EventScreenProvider;
