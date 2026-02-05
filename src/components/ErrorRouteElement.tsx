import { captureException } from '@sentry/react';
import React from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AuthLayout from './layout/AuthLayout';

const ErrorRouteElement = () => {
  const error = useRouteError();

  React.useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <AuthLayout>
      <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
        <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>⚠️404⚠️</Typography>
        <Typography sx={{ fontSize: '18pt', fontWeight: 'bold', textAlign: 'center' }}>
          Es ist ein Fehler aufgetreten
        </Typography>
        <Typography sx={{ fontSize: '14pt', fontWeight: 'bold', textAlign: 'center' }}>
          {isRouteErrorResponse(error) ? error.data || error.statusText : 'Unknown error message'}
        </Typography>
      </Box>
    </AuthLayout>
  );
};
export default ErrorRouteElement;
