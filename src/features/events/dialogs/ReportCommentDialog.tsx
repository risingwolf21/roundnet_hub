import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { DialogProps } from '@/contexts/DialogsProvider';
import { REPORT_REASONS, ReportReason } from '@/repository/ModerationRepository';
import { useReportComment } from '@/tanstack/moderation';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type Payload = { commentId: string; authorName: string; userId: string };

/** Resolves with `true` once the report is saved. */
const ReportCommentDialog = ({ open, onClose, payload }: DialogProps<Payload, boolean>) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const report = useReportComment(payload!.userId);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reason) return;
    try {
      await report.mutateAsync({ commentId: payload!.commentId, reason, details });
      toast.success(t('moderation.report.success'));
      onClose(true);
    } catch {
      toast.error(t('moderation.report.error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !report.isPending && onClose(null)}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <div className="flex flex-col gap-2">
              <DialogTitle>{t('moderation.report.title')}</DialogTitle>
              <DialogDescription>{t('moderation.report.description', { name: payload!.authorName })}</DialogDescription>
            </div>
          </DialogHeader>
          <div role="radiogroup" aria-label={t('moderation.report.title')} className="flex flex-col gap-2 p-4">
            {REPORT_REASONS.map((r) => (
              <Button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                variant={reason === r ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => setReason(r)}
              >
                {t(`moderation.reasons.${r}`)}
              </Button>
            ))}
          </div>
          <div className="px-4">
            <Textarea
              value={details}
              maxLength={500}
              placeholder={t('moderation.report.details')}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={report.isPending} onClick={() => onClose(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!reason || report.isPending}>
              {t('moderation.report.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportCommentDialog;
