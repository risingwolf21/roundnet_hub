import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const FeatureLockedRouteElement = () => {
  const { t } = useTranslation();
  return (
    <div className='grid min-h-screen grid-cols-1 lg:grid-cols-2'>
      <div className='flex flex-col items-center justify-center px-4 py-8 text-center'>
        <h2 className='mb-6 text-5xl font-semibold'>{t('errors.featureLocked.title')}</h2>
        <h3 className='mb-1.5 text-3xl font-semibold'>{t('errors.featureLocked.subtitle')}</h3>
        <p className='text-muted-foreground mb-6 max-w-sm'>
          {t('errors.featureLocked.description')}
        </p>
        <div className='flex flex-col sm:flex-row gap-3'>
          <Button size='lg' className='rounded-lg text-base'>
            <a href='/pricing'>{t('errors.featureLocked.upgrade')}</a>
          </Button>
          <Button size='lg' variant='outline' className='rounded-lg text-base'>
            <a href='/'>{t('errors.featureLocked.later')}</a>
          </Button>
        </div>
      </div>

      {/* Right Section: Illustration */}
      <div className='relative max-h-screen w-full p-2 max-lg:hidden'>
        {/* Hellerer/Farbiger Hintergrund für einen "Marketing/Sales"-Vibe */}
        <div className='h-full w-full rounded-2xl bg-primary/5'></div>
        <img
          // Tipp: Hier passt eine Rakete, ein Stern oder eine Upgrade-Illustration
          src='https://cdnstudio.com/ss-assets/blocks/marketing/error/image-1.png'
          alt={t('errors.featureLocked.illustrationAlt')}
          className='absolute top-1/2 left-1/2 h-[clamp(260px,25vw,406px)] -translate-x-1/2 -translate-y-1/2'
        />
      </div>
    </div>
  )
}

export default FeatureLockedRouteElement;