import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Item, ItemContent } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { DialogProps } from '@/contexts/DialogsProvider';
import { useUpsertSetsToMatch } from '@/tanstack/games';
import { formatDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { v4 as uuid } from 'uuid';

type ReportSetsDialogProps = {
  matchId: string;
  team_a_name: string;
  team_b_name: string;
  sets: MatchSet[] | null;
};

export const ReportSetsDialog = ({ payload, open, onClose }: DialogProps<ReportSetsDialogProps, MatchSet[] | null>) => {
  const { t } = useTranslation();
  const [normalSets, setNormalSets] = useState<MatchSet[]>(() => {
    const ns = payload.sets?.filter(x => x.type !== 'spezi') ?? [];
    return ns.length > 0
      ? ns.map((x, i) => ({ ...x, set_number: i + 1 }))
      : [{ id: uuid(), created_at: formatDateToDatabase(new Date()), set_number: 1, match: payload.matchId, team_a_score: 0, team_b_score: 0, type: 'normal', set_awarded: null }];
  });
  const [speziEnabled, setSpeziEnabled] = useState<boolean>(
    () => !!payload.sets?.find(x => x.type === 'spezi')
  );
  const [speziSet, setSpeziSet] = useState<MatchSet | null>(
    () => payload.sets?.find(x => x.type === 'spezi') ?? null
  );
  const [speziSetAwarded, setSpeziSetAwarded] = useState<boolean>(
    () => payload.sets?.find(x => x.type === 'spezi')?.set_awarded ?? false
  );

  const upsertSetsToMatch = useUpsertSetsToMatch(payload.matchId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={"drawer"} showCloseButton={false}>
        <DialogHeader className='p-4'>
          <DialogTitle className={"font-semibold "}>{t('games.editSets')}</DialogTitle>
        </DialogHeader>
        <div>
          <div className='w-full flex flex-row px-2'>
            <div className='flex-1 px-2'>
              <div className='text-base font-semibold'>{payload.team_a_name}</div>
            </div>
            <div className='flex-1 px-2'>
              <div className='text-base font-semibold'>{payload.team_b_name}</div>
            </div>
            <div className='w-[36px] flex-shrink' />
          </div>
          {normalSets.map((x) => (
            <div key={x.id} className="border-b">
              <Item>
                <ItemContent className='flex flex-row'>
                  <div className='flex-1'>
                    <Input
                      type='number'
                      value={x.team_a_score.toString()}
                      onChange={(e) =>
                        setNormalSets(normalSets.map((y) => (y.id === x.id ? { ...x, team_a_score: Number(e.target.value) } : y)))
                      }
                    />
                  </div>
                  <div className='flex-1'>
                    <Input
                      type='number'
                      value={x.team_b_score.toString()}
                      onChange={(e) =>
                        setNormalSets(normalSets.map((y) => (y.id === x.id ? { ...x, team_b_score: Number(e.target.value) } : y)))
                      }
                    />
                  </div>
                  <div className='flex-shrink'>
                    <Button variant={"ghost"} onClick={() => setNormalSets([
                      ...normalSets
                        .filter((y) => y.set_number !== x.set_number)
                        .map((y, i) => ({ ...y, set_number: i + 1 }))
                    ])}>
                      <Trash2 />
                    </Button>
                  </div>
                </ItemContent>
              </Item>
            </div>
          ))}
          <div className='w-full flex justify-center p-2'>
            <Button
              onClick={() =>
                setNormalSets([
                  ...normalSets,
                  {
                    id: uuid(),
                    created_at: formatDateToDatabase(new Date()),
                    set_number: normalSets.length + 1,
                    match: payload.matchId,
                    team_a_score: 0,
                    team_b_score: 0,
                    type: 'normal',
                    set_awarded: null,
                  },
                ])
              }
            >
              <Plus />
            </Button>
          </div>
          <Separator />
          <div className='px-4 py-3 flex flex-col gap-2'>
            <div className='flex items-center gap-2'>
              <Checkbox
                id='dialog-spezi-enabled'
                checked={speziEnabled}
                onCheckedChange={(v) => {
                  setSpeziEnabled(!!v);
                  if (!v) {
                    setSpeziSet(null);
                    setSpeziSetAwarded(false);
                  }
                }}
              />
              <label htmlFor='dialog-spezi-enabled' className='text-sm font-medium cursor-pointer'>
                {t('matches.spezi.enable')}
              </label>
            </div>
            {speziEnabled && (
              <>
                <div className='flex flex-row gap-2'>
                  <div className='flex-1 flex flex-col gap-1'>
                    <span className='text-xs text-muted-foreground'>{payload.team_a_name}</span>
                    <Input
                      type='number'
                      min={0}
                      value={speziSet?.team_a_score?.toString() ?? ''}
                      placeholder='0'
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') { setSpeziSet(null); return; }
                        const val = Number(raw);
                        setSpeziSet(prev => prev
                          ? { ...prev, team_a_score: val }
                          : { id: uuid(), created_at: formatDateToDatabase(new Date()), set_number: normalSets.length + 1, match: payload.matchId, team_a_score: val, team_b_score: 0, type: 'spezi', set_awarded: speziSetAwarded }
                        );
                      }}
                    />
                  </div>
                  <div className='flex-1 flex flex-col gap-1'>
                    <span className='text-xs text-muted-foreground'>{payload.team_b_name}</span>
                    <Input
                      type='number'
                      min={0}
                      value={speziSet?.team_b_score?.toString() ?? ''}
                      placeholder='0'
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') { setSpeziSet(null); return; }
                        const val = Number(raw);
                        setSpeziSet(prev => prev
                          ? { ...prev, team_b_score: val }
                          : { id: uuid(), created_at: formatDateToDatabase(new Date()), set_number: normalSets.length + 1, match: payload.matchId, team_a_score: 0, team_b_score: val, type: 'spezi', set_awarded: speziSetAwarded }
                        );
                      }}
                    />
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Checkbox
                    id='dialog-spezi-awarded'
                    checked={speziSetAwarded}
                    onCheckedChange={(v) => {
                      setSpeziSetAwarded(!!v);
                      setSpeziSet(prev => prev ? { ...prev, set_awarded: !!v } : null);
                    }}
                  />
                  <label htmlFor='dialog-spezi-awarded' className='text-sm cursor-pointer'>
                    {t('matches.spezi.setAwarded')}
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
        <DialogFooter className="p-4 m-0 border-t">
          <div className='flex w-full justify-even gap-4'>
            <Button variant="outline" className="flex-1" onClick={() => onClose(null)}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" onClick={async () => {
              const allSets = [
                ...normalSets,
                ...(speziEnabled && speziSet ? [{ ...speziSet, set_awarded: speziSetAwarded }] : []),
              ];
              upsertSetsToMatch.mutate(
                { sets: allSets },
                {
                  onSuccess: (result) => onClose(result),
                  onError: (error) => {
                    captureException(error);
                    toast.error(t('games.setsSaveError'));
                  },
                }
              );
            }}>
              {t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
