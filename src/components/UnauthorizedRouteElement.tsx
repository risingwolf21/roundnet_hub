import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const UnauthorizedRouteElement = () => {
  const { t } = useTranslation();
  return (
    <div className='grid min-h-screen grid-cols-1 lg:grid-cols-2'>
      <div className='flex flex-col items-center justify-center px-4 py-8 text-center'>
        <h2 className='mb-6 text-5xl font-semibold'>{t('errors.unauthorized.title')}</h2>
        <h3 className='mb-1.5 text-3xl font-semibold'>{t('errors.unauthorized.subtitle')}</h3>
        <p className='text-muted-foreground mb-6 max-w-sm'>
          {t('errors.unauthorized.description')}
        </p>
        <Button size='lg' className='rounded-lg text-base'>
          <a href='/'>{t('errors.route.backHome')}</a>
        </Button>
      </div>

      {/* Right Section: Illustration */}
      <div className='relative max-h-screen w-full p-2 max-lg:hidden'>
        {/* Dunklerer Hintergrund für den "Sicherheits"-Vibe */}
        <div className='h-full w-full rounded-2xl bg-zinc-950'></div>
        <img
          // Tipp: Hier passt eine Illustration von einem Schloss oder einem Tresor
          src='https://cdnstudio.com/ss-assets/blocks/marketing/error/image-1.png'
          alt={t('errors.unauthorized.illustrationAlt')}
          className='absolute top-1/2 left-1/2 h-[clamp(260px,25vw,406px)] -translate-x-1/2 -translate-y-1/2 opacity-80'
        />
      </div>
    </div>
  )
}

export default UnauthorizedRouteElement;