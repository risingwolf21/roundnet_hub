import { Button } from '@/components/ui/button';
import { SidebarFooter } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateDownload } from './updateDownload';

// Set by "Jetzt aktualisieren", read once after the reload to show the success animation.
const UPDATED_FLAG = 'pwa-update-applied';
const SUCCESS_VISIBLE_MS = 3200; // keep in sync with the update-badge keyframes

// Full-screen, blocking page once a new version is installed and activates: the old app must not keep
// running against an already migrated database. The download itself runs in the background (SidebarUpdateDownload).
// `progress` is 0..1, or null while the number of files is not known yet. `onUpdate` is set once the new version is
// installed: activation runs automatically, the button is a manual fallback.
export const UpdatePage = ({ progress, onUpdate }: { progress: number | null; onUpdate?: () => void }) => {
  const { t } = useTranslation();

  return (
    <div
      role='alertdialog'
      aria-modal='true'
      aria-labelledby='update-title'
      className='animate-in fade-in fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 bg-[radial-gradient(circle_at_50%_38%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_62%)] bg-background px-6 pt-safe-top pb-safe-bottom text-center duration-300'
    >
      <div className='relative grid size-36 place-items-center'>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            className='border-primary/40 absolute inset-0 rounded-full border-2 animate-[update-ring_2.4s_ease-out_infinite] motion-reduce:animate-none'
            style={{ animationDelay: `${i * 0.8}s` }}
          />
        ))}
        <div className='bg-primary text-primary-foreground relative grid size-20 place-items-center rounded-full shadow-lg motion-reduce:animate-none'>
          <Rocket className='size-9' />
        </div>
      </div>

      <div className='max-w-sm space-y-2'>
        <h1 id='update-title' className='text-2xl font-semibold'>
          {t('pwa.updateReady.title')}
        </h1>
        <p className='text-muted-foreground'>
          {t('pwa.updateReady.description')}
        </p>
      </div>

      <div className='w-full max-w-xs'>
        <DownloadProgress progress={progress} />
      </div>

      {onUpdate && (
        <Button className='h-11 px-6 text-base' onClick={onUpdate}>
          {t('pwa.updateReady.updateNow')}
        </Button>
      )}
    </div>
  );
};

// Label, percentage and bar of a running download. `progress` is 0..1, or null while the number of files is not known yet.
export const DownloadProgress = ({ progress }: { progress: number | null }) => {
  const { t } = useTranslation();
  const percent = progress === null ? null : Math.round(progress * 100);

  return (
    <div className='w-full space-y-2'>
      <div className='flex items-center justify-between gap-3 text-sm font-medium'>
        <span className='flex items-center gap-2'>
          <Spinner />
          {t('pwa.downloading')}
        </span>
        {percent !== null && <span className='text-muted-foreground tabular-nums'>{percent} %</span>}
      </div>
      <div
        role='progressbar'
        aria-label={t('pwa.downloading')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        className='bg-muted h-1.5 overflow-hidden rounded-full'
      >
        <div
          className={`bg-primary h-full rounded-full ${percent === null ? 'w-1/3 animate-pulse' : 'transition-[width] duration-300'}`}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

// In the sidebar while a new version downloads in the background; the app stays usable until it is installed.
export const SidebarUpdateDownload = () => {
  const { t } = useTranslation();
  const progress = useUpdateDownload();
  if (progress === undefined) return null;

  return (
    <SidebarFooter className='border-t pb-safe-bottom'>
      <div className='space-y-1.5 p-2'>
        <DownloadProgress progress={progress} />
        <p className='text-muted-foreground text-xs'>{t('pwa.downloadingHint')}</p>
      </div>
    </SidebarFooter>
  );
};

// Small badge after the reload that the update is running. Disappears on its own after the
// animation, or immediately when tapped.
export const UpdateSuccess = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => {
    try {
      return sessionStorage.getItem(UPDATED_FLAG) === '1';
    } catch {
      return false; // storage unavailable: no success animation
    }
  });

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.removeItem(UPDATED_FLAG);
    } catch {
      // nothing to clear
    }
    const timer = setTimeout(() => setVisible(false), SUCCESS_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div role='status' className='fixed top-safe-top right-0 left-0 z-[150] mx-auto mt-4 w-fit animate-[update-badge_3.2s_ease-in-out_forwards]'>
      <button
        type='button'
        onClick={() => setVisible(false)}
        className='bg-card text-card-foreground border-border flex items-center gap-3 rounded-full border py-2 pr-5 pl-2 shadow-lg'
      >
        <span className='bg-primary text-primary-foreground grid size-9 place-items-center rounded-full'>
          <svg viewBox='0 0 24 24' className='size-5' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' aria-hidden>
            <path d='M5 12.5l4.5 4.5L19 7.5' strokeDasharray='24' className='animate-[update-draw_0.5s_0.35s_ease-out_both]' />
          </svg>
        </span>
        <span className='text-left leading-tight'>
          <span className='block text-sm font-semibold'>{t('pwa.updateSuccess.title')}</span>
          <span className='text-muted-foreground block text-xs'>{t('pwa.updateSuccess.description')}</span>
        </span>
      </button>
    </div>
  );
};
