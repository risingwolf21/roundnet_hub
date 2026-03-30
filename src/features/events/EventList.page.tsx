import EventScreen from './EventList';
import EventListShadcn from './EventList.shadcn';

const EventScreenProvider = ({ isShadcn = false }: { isShadcn?: boolean }) => {
  if (isShadcn) {
    return <EventListShadcn />;
  } else {
    return <EventScreen />
  }
};

export default EventScreenProvider;
