import ErrorScreen from '@/components/ErrorScreen';
import { captureException } from '@sentry/react';
import React from 'react';
import { useRouteError } from 'react-router';


const ErrorRouteElement = () => {
  const error = useRouteError();
  const [eventId, setEventId] = React.useState<string>();

  React.useEffect(() => {
    // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
    setEventId(captureException(error));
  }, [error]);

  return <ErrorScreen error={error} eventId={eventId} />;
}

export default ErrorRouteElement;
