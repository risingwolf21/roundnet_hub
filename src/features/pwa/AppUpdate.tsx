import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Set by "Jetzt aktualisieren", read once after the reload to show the success animation.
const UPDATED_FLAG = 'pwa-update-applied';
const SUCCESS_VISIBLE_MS = 3200; // keep in sync with the update-badge keyframes

// Full-screen page shown while a new version waits in the service worker. It stays until the
// user taps the button: the old app must not keep running against an already migrated database.
export const UpdateReadyPage = ({ onRefresh }: { onRefresh: () => Promise<void> }) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      await onRefresh(); // posts SKIP_WAITING; the reload only follows in a later task
      sessionStorage.setItem(UPDATED_FLAG, '1');
    } catch {
      setBusy(false);
    }
  };

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

      <Button className='h-11 px-6 text-base' disabled={busy} onClick={refresh}>
        {busy ? <Spinner /> : null}
        {busy ? t('pwa.updateReady.updating') : t('pwa.updateReady.updateNow')}
      </Button>
    </div>
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
