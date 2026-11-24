import { Button } from '@/components/ui/button';
import { captureException } from '@sentry/react';
import { Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/** App bar button: opens the phone's share sheet for the current page, or copies its link where there is none. */
export const ShareButton = ({ title, text }: { title: string; text?: string }) => {
  const { t } = useTranslation();

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t('share.copied'));
    } catch (error) {
      // Closing the share sheet is not an error.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      captureException(error);
      toast.error(t('share.failed'));
    }
  };

  return (
    <Button variant="ghost" size="icon-lg" aria-label={t('share.button')} onClick={share}>
      <Share2 />
    </Button>
  );
};
