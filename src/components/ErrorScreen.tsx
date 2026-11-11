import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown, House, RefreshCw } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse } from 'react-router';

const ANIMATE_IN = 'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500 motion-reduce:animate-none';
const FLASH = 'motion-reduce:animate-none';
const GLOW = 'absolute -top-[15px] size-30 rounded-full motion-reduce:opacity-50';
const MONO = 'font-mono text-xs break-words';

const Wheel = ({ cx }: { cx: number }) => (
  <g className='origin-center [transform-box:fill-box] animate-[error-spin_0.6s_linear_infinite] motion-reduce:animate-none'>
    <circle cx={cx} cy={63} r={11} fill='var(--foreground)' />
    <circle cx={cx} cy={63} r={5} fill='var(--card)' />
    <path d={`M${cx} 58V68M${cx - 5} 63H${cx + 5}`} stroke='var(--foreground)' strokeWidth={1.5} />
  </g>
);

// A police car driving along a road with its light bar flashing. Purely decorative.
const PoliceCar = () => (
  <div aria-hidden className={cn('relative h-[150px] w-[240px] shrink-0', ANIMATE_IN)}>
    <span
      className={cn(GLOW, 'left-10 animate-[error-flash-a_0.8s_linear_infinite] bg-[radial-gradient(circle,color-mix(in_oklab,var(--info)_55%,transparent),transparent_68%)]', FLASH)}
    />
    <span
      className={cn(GLOW, 'left-20 animate-[error-flash-b_0.8s_linear_infinite] bg-[radial-gradient(circle,color-mix(in_oklab,var(--error)_50%,transparent),transparent_68%)]', FLASH)}
    />

    <div className='absolute inset-x-0 top-[103px] h-6 [mask-image:linear-gradient(90deg,transparent,#000_20%,#000_80%,transparent)]'>
      <div className='border-border border-t-2' />
      <div className='absolute inset-x-0 top-4 h-[3px] animate-[error-road_0.6s_linear_infinite] bg-[linear-gradient(90deg,var(--ring)_24px,transparent_24px)] bg-[length:48px_3px] bg-repeat-x motion-reduce:animate-none' />
    </div>

    <div className='absolute top-[30px] left-10 h-20 w-40 animate-[error-bump_0.45s_ease-in-out_infinite] motion-reduce:animate-none'>
      <svg width={160} height={80} viewBox='0 0 160 80' fill='none' className='block'>
        <rect x={6} y={38} width={148} height={25} rx={9} fill='var(--card)' stroke='var(--foreground)' strokeWidth={3} />
        <path d='M44 38L57 19H101L120 38Z' fill='var(--card)' stroke='var(--foreground)' strokeWidth={3} strokeLinejoin='round' />
        <path d='M52 36L62 23H78V36ZM84 23H98L110 36H84Z' fill='var(--muted)' stroke='var(--foreground)' strokeWidth={1.5} strokeLinejoin='round' />
        <rect x={9} y={47} width={142} height={6} fill='var(--primary)' />
        <rect x={66} y={11} width={14} height={8} rx={2} fill='var(--info)' className={cn('animate-[error-flash-a_0.8s_linear_infinite]', FLASH)} />
        <rect x={80} y={11} width={14} height={8} rx={2} fill='var(--error)' className={cn('animate-[error-flash-b_0.8s_linear_infinite]', FLASH)} />
        <rect x={148} y={41} width={6} height={5} rx={1.5} fill='var(--warning-500)' />
        <rect x={6} y={41} width={5} height={5} rx={1.5} fill='var(--error)' />
        <Wheel cx={36} />
        <Wheel cx={124} />
      </svg>
    </div>
  </div>
);

const errorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error) return error.message;
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`.trim();
  return undefined;
};

/**
 * Full-screen error page for route errors and the root error boundary. Offers a safe way out (home page,
 * reload) and keeps the technical details behind a switch. Looks like the PWA update page.
 * Must work without providers: it is rendered outside the router, dialogs and theme.
 */
const ErrorScreen = ({ error, eventId }: { error?: unknown; eventId?: string }) => {
  const { t } = useTranslation();
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const message = errorMessage(error);
  const hasDetails = Boolean(message || eventId);

  return (
    <div className='flex min-h-dvh flex-col items-center justify-center gap-8 bg-background bg-[radial-gradient(circle_at_50%_38%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_62%)] px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] text-center'>
      <PoliceCar />

      <div role='alert' className={cn('flex max-w-sm flex-col gap-2', ANIMATE_IN)} style={{ animationDelay: '100ms' }}>
        <h1 className='text-2xl font-semibold'>{t('errors.route.title')}</h1>
        <p className='text-muted-foreground'>{t('errors.route.description')}</p>
      </div>

      <div
        className={cn('flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center', ANIMATE_IN)}
        style={{ animationDelay: '200ms' }}
      >
        <a href='/' className={cn(buttonVariants(), 'h-11 px-6 text-base')}>
          <House />
          {t('errors.route.backHome')}
        </a>
        <Button variant='outline' className='h-11 px-6 text-base' onClick={() => window.location.reload()}>
          <RefreshCw />
          {t('errors.route.retry')}
        </Button>
      </div>

      {hasDetails && (
        <div
          className={cn('flex w-full max-w-xs flex-col items-center gap-1 sm:max-w-md', ANIMATE_IN)}
          style={{ animationDelay: '300ms' }}
        >
          <button
            type='button'
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((o) => !o)}
            className='text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium outline-none focus-visible:ring-3'
          >
            {t('errors.route.details')}
            <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <div id={detailsId} className='bg-card flex w-full flex-col gap-3 rounded-xl border p-4 text-left'>
              {message && (
                <div className='flex min-w-0 flex-col gap-1'>
                  <span className='text-muted-foreground text-xs'>{t('errors.route.message')}</span>
                  <code className={MONO}>{message}</code>
                </div>
              )}
              {eventId && (
                <div className='flex min-w-0 flex-col gap-1'>
                  <span className='text-muted-foreground text-xs'>{t('errors.route.eventId')}</span>
                  <code className={cn(MONO, 'text-muted-foreground')}>{eventId}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorScreen;
