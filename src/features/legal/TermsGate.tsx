import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { CURRENT_TERMS_VERSION } from '@/repository/ModerationRepository';
import { useAcceptTerms } from '@/tanstack/moderation';
import { Capacitor } from '@capacitor/core';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/** Blocks the app until existing accounts accepted the current terms of use. */
const TermsGate = ({ user }: { user: User | null }) => {
  const { t } = useTranslation();
  const accept = useAcceptTerms(user?.id ?? '');

  if (!user || user.terms_version === CURRENT_TERMS_VERSION) return null;
  // The legal pages must stay readable, otherwise the gate covers the text it asks you to accept.
  if (window.location.pathname.startsWith(`${import.meta.env.BASE_URL}legal/`)) return null;

  const linkTarget = Capacitor.isNativePlatform() ? undefined : '_blank';

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader showCloseButton={false}>
          <div className="flex flex-col gap-2">
            <DialogTitle>{t('legal.termsGate.title')}</DialogTitle>
            <DialogDescription>{t('legal.termsGate.description')}</DialogDescription>
          </div>
        </DialogHeader>
        <p className="text-sm px-4 pb-4">
          <Trans
            i18nKey="legal.termsGate.links"
            components={{
              terms: <a className="underline" href={`${import.meta.env.BASE_URL}legal/terms`} target={linkTarget} rel="noreferrer" />,
              privacy: <a className="underline" href={`${import.meta.env.BASE_URL}legal/privacy`} target={linkTarget} rel="noreferrer" />,
            }}
          />
        </p>
        <DialogFooter>
          <Button
            disabled={accept.isPending}
            onClick={() => accept.mutate(undefined, { onError: () => toast.error(t('legal.termsGate.error')) })}
          >
            {accept.isPending && <Spinner />}
            {t('legal.termsGate.accept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsGate;
