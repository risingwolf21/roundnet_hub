import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TabsContent } from '@/components/ui/tabs';
import { useGrants } from '@/features/auth/GrantsContext';
import { cn } from '@/lib/utils';
import { useBringOverview, useBringPledges, useUpsetBringPledges } from '@/tanstack/events';
import { Tables } from '@/types/supabase-generated.types';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Stepper } from '../../dialogs/EventFormParts';

type PledgeMap = Record<string, number>;

const BringItemsTab = ({ eventId }: { eventId: string }) => {
  const { t } = useTranslation();
  const { user } = useGrants();

  const { data: overview = [], isLoading: overviewLoading } = useBringOverview(eventId);
  const { data: pledges = [], isLoading: pledgesLoading } = useBringPledges(eventId);
  const upsertPledges = useUpsetBringPledges();

  // Saved pledges of the user, and the changes made here since; only differing values count as changes.
  const saved: PledgeMap = {};
  pledges.filter((p) => p.user?.id === user?.id).forEach((p) => {
    if (p.item?.id) saved[p.item.id] = p.qty ?? 0;
  });
  const [edits, setEdits] = useState<PledgeMap>({});
  const myQty = (itemId: string) => edits[itemId] ?? saved[itemId] ?? 0;
  const changed = Object.keys(edits).filter((id) => edits[id] !== (saved[id] ?? 0));

  const handleSave = () => {
    const items = overview
      .filter((x) => x.item_id !== null)
      .map((x) => ({
        item_id: x.item_id!,
        quantity: myQty(x.item_id!),
        status: 'pledged',
      }));

    upsertPledges.mutate(
      { event: eventId, user: user!.id, items },
      {
        onSuccess: () => {
          setEdits({});
          toast.success(t('events.bringItems.saveSuccess'));
        },
        onError: () => toast.error(t('events.bringItems.saveError')),
      },
    );
  };

  const total = (item: Tables<'event_bring_overview'>) =>
    (item.pledged_qty ?? 0) - (saved[item.item_id ?? ''] ?? 0) + myQty(item.item_id ?? '');
  const withNeed = overview.filter((x) => (x.required_qty ?? 0) > 0);
  const covered = withNeed.filter((x) => total(x) >= (x.required_qty ?? 0)).length;

  return (
    <TabsContent value="bring-items" className="m-0 flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-col gap-1">
          {(overviewLoading || pledgesLoading) ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : overview.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('events.bringItems.empty')}</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 pb-2">
                <h3 className="text-sm font-semibold">{t('events.bringItems.title')}</h3>
                {withNeed.length > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t('events.bringItems.covered', { count: covered, total: withNeed.length })}
                  </span>
                )}
              </div>
              {overview.map((item: Tables<'event_bring_overview'>, i) => {
                const itemId = item.item_id ?? '';
                const pledged = total(item);
                const required = item.required_qty ?? 0;
                const unit = item.unit ?? '';
                const done = required > 0 && pledged >= required;
                const who = [
                  ...pledges
                    .filter((p) => p.item?.id === itemId && p.user?.id !== user?.id && (p.qty ?? 0) > 0)
                    .map((p) => `${(p.user?.name ?? p.user?.displayName ?? '?').split(' ')[0]} ${p.qty}`),
                  ...(myQty(itemId) > 0 ? [`${t('events.bringItems.me')} ${myQty(itemId)}`] : []),
                ];

                return (
                  <div
                    key={itemId}
                    className={cn(
                      '-mx-2 flex flex-col gap-2.5 rounded-lg p-2',
                      i > 0 && 'mt-1',
                      changed.includes(itemId) && 'bg-primary/5'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {required > 0
                            ? t('events.bringItems.pledged', { pledged, required, unit })
                            : t('events.bringItems.pledgedNoNeed', { pledged, unit })}
                        </p>
                      </div>
                      {required > 0 && (done
                        ? <Badge variant="success">{t('events.bringItems.isCovered')}</Badge>
                        : <span className="shrink-0 text-xs font-semibold tabular-nums">{t('events.bringItems.missing', { count: required - pledged, unit })}</span>)}
                    </div>
                    {required > 0 && (
                      <div
                        role="progressbar"
                        aria-label={t('events.bringItems.pledged', { pledged, required, unit })}
                        aria-valuemin={0}
                        aria-valuemax={required}
                        aria-valuenow={Math.min(pledged, required)}
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                      >
                        <div className={cn('h-full rounded-full', done ? 'bg-success' : 'bg-primary')} style={{ width: `${Math.min(pledged / required, 1) * 100}%` }} />
                      </div>
                    )}
                    {who.length > 0 && <p className="line-clamp-2 text-xs text-muted-foreground">{who.join(' · ')}</p>}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium">{t('events.bringItems.iBring')}</span>
                      <Stepper
                        label={t('events.bringItems.myPledgeFor', { item: item.name, unit })}
                        value={myQty(itemId)}
                        onChange={(value) => setEdits((prev) => ({ ...prev, [itemId]: value }))}
                      />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      {overview.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Button size="lg" className="w-full" onClick={handleSave} disabled={changed.length === 0 || upsertPledges.isPending}>
            <Save className="size-4" />
            {t('events.bringItems.save')}
          </Button>
          {changed.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">{t('events.bringItems.unsaved', { count: changed.length })}</p>
          )}
        </div>
      )}
    </TabsContent>
  );
};

export default BringItemsTab;
