import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TabsContent } from '@/components/ui/tabs';
import { useGrants } from '@/features/auth/GrantsContext';
import { useBringOverview, useBringPledges, useUpsetBringPledges } from '@/tanstack/events';
import { Tables } from '@/types/supabase-generated.types';
import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type PledgeMap = Record<string, number>;

const BringItemsTab = ({ eventId }: { eventId: string }) => {
  const { t } = useTranslation();
  const { user } = useGrants();

  const { data: overview = [], isLoading: overviewLoading } = useBringOverview(eventId);
  const { data: pledges = [], isLoading: pledgesLoading } = useBringPledges(eventId);
  const upsertPledges = useUpsetBringPledges();

  const [pledgeMap, setPledgeMap] = useState<PledgeMap>({});

  useEffect(() => {
    if (pledgesLoading) return;
    const myPledges = pledges.filter((p) => p.user?.id === user?.id);
    const initial: PledgeMap = {};
    myPledges.forEach((p) => {
      if (p.item?.id) initial[p.item.id] = p.qty ?? 0;
    });
    setPledgeMap(initial);
  }, [pledgesLoading, pledges, user?.id]);

  const handleSave = () => {
    const items = overview
      .filter((x) => x.item_id !== null)
      .map((x) => ({
        item_id: x.item_id!,
        quantity: pledgeMap[x.item_id!] ?? 0,
        status: 'pledged',
      }));

    upsertPledges.mutate(
      { event: eventId, user: user!.id, items },
      {
        onSuccess: () => toast.success(t('events.bringItems.saveSuccess')),
        onError: () => toast.error(t('events.bringItems.saveError')),
      },
    );
  };

  return (
    <TabsContent value="bring-items" className="m-0">
      <Card className="pt-0 pb-0">
        <CardContent className="p-0">
          {(overviewLoading || pledgesLoading) ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : overview.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">{t('events.bringItems.empty')}</p>
          ) : (
            <div className="divide-y">
              {overview.map((item: Tables<'event_bring_overview'>) => {
                const itemId = item.item_id ?? '';
                const pledged = item.pledged_qty ?? 0;
                const required = item.required_qty ?? 0;
                const myQty = pledgeMap[itemId] ?? 0;
                const unit = item.unit ?? '';

                const itemPledges = pledges.filter((p) => p.item?.id === itemId && (p.qty ?? 0) > 0);
                const otherPledges = itemPledges.filter((p) => p.user?.id !== user?.id);

                return (
                  <div key={itemId} className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {required > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {t('events.bringItems.pledged', { pledged, required, unit })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Input
                          type="number"
                          min={0}
                          value={myQty}
                          onChange={(e) =>
                            setPledgeMap((prev) => ({
                              ...prev,
                              [itemId]: Math.max(0, parseInt(e.target.value, 10) || 0),
                            }))
                          }
                          className="w-20 text-right"
                        />
                        {unit && (
                          <span className="text-sm text-muted-foreground w-8 truncate">{unit}</span>
                        )}
                      </div>
                    </div>

                    {otherPledges.length > 0 && (
                      <div className="space-y-0.5">
                        {otherPledges.map((p) => {
                          const name = p.user?.name ?? p.user?.displayName ?? '?';
                          return (
                            <p key={p.user?.id} className="text-md text-muted-foreground">
                              {name}: {p.qty} {unit}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="p-4">
                <Button
                  className="w-full gap-2"
                  onClick={handleSave}
                  disabled={upsertPledges.isPending}
                >
                  <Save className="size-4" />
                  {t('events.bringItems.save')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default BringItemsTab;
