import { Button } from '@/components/ui/button';
import { captureException } from '@sentry/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router';


const ErrorRouteElement = () => {
  const { t } = useTranslation();
  const error = useRouteError();

  React.useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <div className='grid min-h-screen grid-cols-1 lg:grid-cols-2'>
      <div className='flex flex-col items-center justify-center px-4 py-8 text-center'>
        <h2 className='mb-6 text-5xl font-semibold'>{t('errors.route.whoops')}</h2>
        <h3 className='mb-1.5 text-3xl font-semibold'>{t('errors.route.title')}</h3>
        <p className='text-muted-foreground mb-6 max-w-sm'>
          {t('errors.route.description')}
        </p>
        <Button size='lg' className='rounded-lg text-base'>
          <a href='/'>{t('errors.route.backHome')}</a>
        </Button>
      </div>

      {/* Right Section: Illustration */}
      <div className='relative max-h-screen w-full p-2 max-lg:hidden'>
        <div className='h-full w-full rounded-2xl bg-black'></div>
        <img
          src='https://cdnstudio.com/ss-assets/blocks/marketing/error/image-1.png'
          alt={t('errors.route.illustrationAlt')}
          className='absolute top-1/2 left-1/2 h-[clamp(260px,25vw,406px)] -translate-x-1/2 -translate-y-1/2'
        />
      </div>
    </div>
  )
}

export default ErrorRouteElement;
