import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { DialogProps } from '@/contexts/DialogsProvider';
import { Stepper, ToggleRow } from '@/features/events/dialogs/EventFormParts';
import { useSetTrialEventLimit, useTrialStatus } from '@/tanstack/trials';
import { captureException } from '@sentry/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/** In the member list (for group admins): "Gast" and how many trainings a trial member has used. */
export const TrialMemberBadges = ({ groupId, userId }: { groupId: string; userId: string }) => {
  const { t } = useTranslation();
  const { data: status } = useTrialStatus(groupId, userId);
  if (!status) return null;

  return (
    <>
      {status.is_guest && <Badge variant="info">{t('trials.member.guest')}</Badge>}
      <Badge variant={status.event_limit !== null && status.events_used >= status.event_limit ? 'warning' : 'outline'}>
        {status.event_limit === null
          ? t('trials.member.trainingsNoLimit', { count: status.events_used })
          : t('trials.member.trainings', { used: status.events_used, total: status.event_limit })}
      </Badge>
    </>
  );
};

type LimitPayload = { groupId: string; userId: string; name: string };

/** Admins limit (or unlimit) how many trainings a trial member may sign up for. */
export const TrialLimitDialog = ({ open, onClose, payload }: DialogProps<LimitPayload, boolean>) => {
  const { t } = useTranslation();
  const { groupId, userId, name } = payload;
  const { data: status, isLoading } = useTrialStatus(groupId, userId);
  const setLimit = useSetTrialEventLimit(groupId);
  // null = not touched yet: show the stored value.
  const [draft, setDraft] = useState<{ limited: boolean; limit: number } | null>(null);
  const current = draft ?? { limited: status?.event_limit != null, limit: status?.event_limit ?? Math.max(3, status?.events_used ?? 0) };
  const used = status?.events_used ?? 0;
  const changed = !!status && (current.limited ? current.limit : null) !== status.event_limit;

  const save = () =>
    setLimit.mutate(
      { userId, limit: current.limited ? current.limit : null },
      {
        onSuccess: () => {
          toast.success(t('trials.member.limitSaved'));
          onClose(true);
        },
        onError: (error) => {
          captureException(error);
          toast.error(t('trials.member.limitFailed'));
        },
      }
    );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant="drawer">
        <DialogHeader variant="default">
          <div className="flex flex-col gap-1 px-4">
            <DialogTitle>{t('trials.member.limitTitle', { name })}</DialogTitle>
            <p className="text-xs text-muted-foreground">{t('trials.member.usedSoFar', { count: used })}</p>
          </div>
        </DialogHeader>
        <DialogBody>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-4">
              <ToggleRow
                id="trial-limit-enabled"
                title={t('trials.member.limit')}
                description={t('trials.member.limitHint')}
                checked={current.limited}
                onCheckedChange={(limited) => setDraft({ ...current, limited })}
              >
                <Stepper label={t('trials.member.limitTotal')} min={1} value={current.limit} onChange={(limit) => setDraft({ ...current, limit })} />
                <p className="text-xs text-muted-foreground">
                  {current.limit > used
                    ? t('trials.member.canStillSignUp', { count: current.limit - used })
                    : t('trials.member.noMoreSignUps')}
                </p>
              </ToggleRow>
            </div>
          )}
        </DialogBody>
        <DialogFooter className="m-0 flex-shrink border-t p-4">
          <div className="flex w-full gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onClose(null)}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" disabled={!changed || setLimit.isPending} onClick={save}>
              {setLimit.isPending && <Spinner />}
              {t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
