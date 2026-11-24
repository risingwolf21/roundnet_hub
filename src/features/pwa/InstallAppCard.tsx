import { Button } from '@/components/ui/button';
import { iOS } from '@/utils';
import { Download, Share, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useLocalStorageState from 'use-local-storage-state';
import { isInstalled, promptInstall, useCanInstall } from './installPrompt';

/** Home page card that offers to install the app: the install dialog on Android, the share-menu steps on iOS. */
export const InstallAppCard = () => {
  const { t } = useTranslation();
  const canInstall = useCanInstall();
  const [dismissed, setDismissed] = useLocalStorageState('pwa:installCardDismissed', { defaultValue: false });

  if (dismissed || isInstalled() || (!canInstall && !iOS)) return null;

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <header className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {iOS ? <Share className="size-4" /> : <Download className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">{t('pwa.install.title')}</span>
        <Button
          variant="ghost"
          size="icon-lg"
          className="-my-2 -mr-2 shrink-0"
          aria-label={t('pwa.install.dismiss')}
          onClick={() => setDismissed(true)}
        >
          <X />
        </Button>
      </header>
      <p className="text-xs text-muted-foreground">{iOS ? t('pwa.install.iosHint') : t('pwa.install.description')}</p>
      {!iOS && (
        <Button variant="secondary" size="lg" className="w-full" onClick={promptInstall}>
          <Download />
          {t('pwa.install.action')}
        </Button>
      )}
    </section>
  );
};
