import { Button } from '@/components/ui/button';
import { captureException } from '@sentry/react';
import React from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import AuthLayout from './layout/AuthLayout';

const ErrorRouteElementProvider = ({ isShadcn = false }: { isShadcn?: boolean }) => {
  if (isShadcn) {
    return <ErrorRouteElementShadcn />
  } else {
    return <ErrorRouteElement />
  }
}

const ErrorRouteElementShadcn = () => {
  const error = useRouteError();

  React.useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <div className='grid min-h-screen grid-cols-1 lg:grid-cols-2'>
      <div className='flex flex-col items-center justify-center px-4 py-8 text-center'>
        <h2 className='mb-6 text-5xl font-semibold'>Whoops!</h2>
        <h3 className='mb-1.5 text-3xl font-semibold'>Something went wrong</h3>
        <p className='text-muted-foreground mb-6 max-w-sm'>
          The page you&apos;re looking for isn&apos;t found, we suggest you back to home.
        </p>
        <Button size='lg' className='rounded-lg text-base'>
          <a href='/'>Back to home page</a>
        </Button>
      </div>

      {/* Right Section: Illustration */}
      <div className='relative max-h-screen w-full p-2 max-lg:hidden'>
        <div className='h-full w-full rounded-2xl bg-black'></div>
        <img
          src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/error/image-1.png'
          alt='404 illustration'
          className='absolute top-1/2 left-1/2 h-[clamp(260px,25vw,406px)] -translate-x-1/2 -translate-y-1/2'
        />
      </div>
    </div>
  )
}

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
export default ErrorRouteElementProvider;
