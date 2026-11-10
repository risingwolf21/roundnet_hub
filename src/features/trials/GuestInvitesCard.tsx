import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { Spinner } from '@/components/ui/spinner';
import { useDialogs } from '@/contexts/DialogsProvider';
import { FormSection, Stepper, ToggleRow } from '@/features/events/dialogs/EventFormParts';
import { trialInviteUrl, TrialInvite } from '@/repository/TrialRepository';
import { useCreateTrialInvite, useDeactivateTrialInvite, useTrialInvites } from '@/tanstack/trials';
import { formatDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { addDays, endOfDay } from 'date-fns';
import { t as translate } from 'i18next';
import { Link2, Plus, Share2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type Draft = { event_limit: number; limited: boolean; days: number; max_uses: number };
const DEFAULT_DRAFT: Draft = { event_limit: 3, limited: false, days: 14, max_uses: 10 };

const shareInvite = async (invite: TrialInvite, groupName: string) => {
  const url = trialInviteUrl(invite.token);
  try {
    if (navigator.share) {
      await navigator.share({ title: translate('trials.links.shareTitle', { group: groupName }), url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success(translate('trials.links.copied'));
  } catch (error) {
    // Closing the share sheet is not an error.
    if (error instanceof DOMException && error.name === 'AbortError') return;
    captureException(error);
    toast.error(translate('trials.links.shareFailed'));
  }
};

/** Group admins create and manage the invite links guests use to start a trial. */
export const GuestInvitesCard = ({ group }: { group: Group }) => {
  const { t, i18n } = useTranslation();
  const dialogs = useDialogs();
  const { data: invites = [], isLoading, isError, refetch } = useTrialInvites(group.id);
  const createInvite = useCreateTrialInvite();
  const deactivate = useDeactivateTrialInvite(group.id);
  const [draft, setDraft] = useState<Draft | null>(null);
  const patch = (changes: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...changes } : d));
  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { day: 'numeric', month: 'short' });

  const create = () => {
    if (!draft) return;
    createInvite.mutate(
      {
        group: group.id,
        event_limit: draft.event_limit,
        expires_at: draft.limited ? formatDateToDatabase(endOfDay(addDays(new Date(), draft.days))) : null,
        max_uses: draft.limited ? draft.max_uses : null,
      },
      {
        onSuccess: (invite) => {
          setDraft(null);
          toast.success(t('trials.links.created'));
          void shareInvite(invite, group.name);
        },
        onError: (error) => {
          captureException(error);
          toast.error(t('trials.links.createFailed'));
        },
      }
    );
  };

  const turnOff = async (invite: TrialInvite) => {
    const ok = await dialogs.confirm(t('trials.links.deactivateConfirm'), {
      okText: t('trials.links.deactivate'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;
    deactivate.mutate(invite.id, {
      onSuccess: () => toast.success(t('trials.links.deactivated')),
      onError: (error) => {
        captureException(error);
        toast.error(t('trials.links.deactivateFailed'));
      },
    });
  };

  return (
    <FormSection icon={Link2} title={t('trials.links.title')}>
      <p className="-mt-2 text-xs text-muted-foreground">{t('trials.links.description')}</p>

      {draft ? (
        <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('trials.links.eventLimit')}</div>
              <div className="text-xs text-muted-foreground">{t('trials.links.eventLimitHint')}</div>
            </div>
          </div>
          <Stepper label={t('trials.links.eventLimit')} min={1} value={draft.event_limit} onChange={(v) => patch({ event_limit: v })} />
          <ToggleRow
            id="trial-link-limited"
            title={t('trials.links.limit')}
            description={t('trials.links.limitHint')}
            checked={draft.limited}
            onCheckedChange={(limited) => patch({ limited })}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">{t('trials.links.validDays')}</div>
                <Stepper label={t('trials.links.validDays')} min={1} value={draft.days} onChange={(v) => patch({ days: v })} />
                <div className="text-xs text-muted-foreground">
                  {t('trials.links.validUntil', { date: dateFormat.format(addDays(new Date(), draft.days)) })}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">{t('trials.links.maxUses')}</div>
                <Stepper label={t('trials.links.maxUses')} min={1} value={draft.max_uses} onChange={(v) => patch({ max_uses: v })} />
              </div>
            </div>
          </ToggleRow>
          <p className="text-xs text-muted-foreground">{t('trials.links.endsHint', { count: draft.event_limit })}</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDraft(null)}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" disabled={createInvite.isPending} onClick={create}>
              {createInvite.isPending && <Spinner />}
              {t('trials.links.create')}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setDraft(DEFAULT_DRAFT)}>
          <Plus />
          {t('trials.links.new')}
        </Button>
      )}

      {isLoading && (
        <div className="flex justify-center py-2">
          <Spinner />
        </div>
      )}
      {isError && (
        <div className="flex items-center justify-between gap-3 text-sm text-destructive">
          {t('trials.links.loadFailed')}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      )}
      {!isLoading && !isError && invites.length === 0 && !draft && (
        <p className="text-center text-xs text-muted-foreground">{t('trials.links.empty')}</p>
      )}

      {invites.length > 0 && (
        <div className="flex flex-col gap-2">
          {invites.map((invite) => {
            const expired = !!invite.expires_at && new Date(invite.expires_at) < new Date();
            const full = invite.max_uses !== null && invite.uses >= invite.max_uses;
            return (
              <Item key={invite.id} variant="outline" size="sm">
                <ItemContent>
                  <ItemTitle className="min-w-0">
                    <span className="truncate font-mono text-xs">…/probe/{invite.token.slice(0, 6)}</span>
                    {(expired || full) && <Badge variant="warning">{expired ? t('trials.links.expired') : t('trials.links.full')}</Badge>}
                  </ItemTitle>
                  <ItemDescription>
                    {[
                      t('trials.links.trainings', { count: invite.event_limit }),
                      invite.max_uses !== null
                        ? t('trials.links.usesOf', { uses: invite.uses, max: invite.max_uses })
                        : t('trials.links.uses', { count: invite.uses }),
                      invite.expires_at && t('trials.links.until', { date: dateFormat.format(new Date(invite.expires_at)) }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="ghost" size="icon-lg" aria-label={t('trials.links.share')} onClick={() => shareInvite(invite, group.name)}>
                    <Share2 />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={t('trials.links.deactivate')}
                    disabled={deactivate.isPending && deactivate.variables === invite.id}
                    onClick={() => turnOff(invite)}
                  >
                    <X />
                  </Button>
                </ItemActions>
              </Item>
            );
          })}
        </div>
      )}
    </FormSection>
  );
};
