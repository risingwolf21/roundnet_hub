import { Button } from '@/components/ui/button';

const FeatureLockedRouteElement = () => {
  return (
    <div className='grid min-h-screen grid-cols-1 lg:grid-cols-2'>
      <div className='flex flex-col items-center justify-center px-4 py-8 text-center'>
        <h2 className='mb-6 text-5xl font-semibold'>Schade!</h2>
        <h3 className='mb-1.5 text-3xl font-semibold'>Feature nicht freigeschaltet</h3>
        <p className='text-muted-foreground mb-6 max-w-sm'>
          Diese Funktion ist in deinem aktuellen Account nicht aktiviert. Führe ein Upgrade durch, um das volle Potenzial zu nutzen.
        </p>
        <div className='flex flex-col sm:flex-row gap-3'>
          <Button size='lg' className='rounded-lg text-base'>
            <a href='/pricing'>Jetzt upgraden</a>
          </Button>
          <Button size='lg' variant='outline' className='rounded-lg text-base'>
            <a href='/'>Später vielleicht</a>
          </Button>
        </div>
      </div>

      {/* Right Section: Illustration */}
      <div className='relative max-h-screen w-full p-2 max-lg:hidden'>
        {/* Hellerer/Farbiger Hintergrund für einen "Marketing/Sales"-Vibe */}
        <div className='h-full w-full rounded-2xl bg-primary/5'></div>
        <img
          // Tipp: Hier passt eine Rakete, ein Stern oder eine Upgrade-Illustration
          src='https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/error/image-1.png'
          alt='Feature locked illustration'
          className='absolute top-1/2 left-1/2 h-[clamp(260px,25vw,406px)] -translate-x-1/2 -translate-y-1/2'
        />
      </div>
    </div>
  )
}

export default FeatureLockedRouteElement;