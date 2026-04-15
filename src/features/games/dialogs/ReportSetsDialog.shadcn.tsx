import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Item, ItemContent } from '@/components/ui/item';
import { DialogProps } from '@/contexts/DialogsProvider';
import { useUpsertSetsToMatch } from '@/tanstack/games';
import { formatDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuid } from 'uuid';

type ReportSetsDialogProps = {
  matchId: string;
  team_a_name: string;
  team_b_name: string;
  sets: MatchSet[] | null;
};

export const ReportSetsDialogShadcn = ({ payload, open, onClose }: DialogProps<ReportSetsDialogProps, MatchSet[] | null>) => {
  const [sets, setSets] = useState<MatchSet[]>(
    () => payload.sets?.map((x, i) => ({ ...x, set_number: i + 1 })) ?? [{ id: uuid(), created_at: formatDateToDatabase(new Date()), set_number: 1, match: payload.matchId, team_a_score: 0, team_b_score: 0 }]
  );

  const upsertSetsToMatch = useUpsertSetsToMatch(payload.matchId);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={"drawer"} showCloseButton={false}>
        <DialogHeader className='p-4'>
          <DialogTitle className={"font-semibold "}>Sätze bearbeiten</DialogTitle>
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
          {sets.map((x) => (
            <div key={x.id} className="border-b">
              <Item>
                <ItemContent className='flex flex-row'>
                  <div className='flex-1'>
                    <Input
                      type='number'
                      value={x.team_a_score.toString()}
                      onChange={(e) =>
                        setSets(sets.map((y) => (y.id === x.id ? { ...x, team_a_score: Number(e.target.value) } : y)))
                      }
                    />
                  </div>
                  <div className='flex-1'>
                    <Input
                      type='number'
                      value={x.team_b_score.toString()}
                      onChange={(e) =>
                        setSets(sets.map((y) => (y.id === x.id ? { ...x, team_b_score: Number(e.target.value) } : y)))
                      }
                    />
                  </div>
                  <div className='flex-shrink'>
                    <Button variant={"ghost"} onClick={() => setSets([
                      ...sets
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
                setSets([
                  ...sets,
                  {
                    id: uuid(),
                    created_at: formatDateToDatabase(new Date()),
                    set_number: sets.length + 1,
                    match: payload.matchId,
                    team_a_score: 0,
                    team_b_score: 0,
                  },
                ])
              }
            >
              <Plus />
            </Button>
          </div>
        </div>
        <DialogFooter className="p-4 m-0 border-t">
          <div className='flex w-full justify-even gap-4'>
            <Button variant="outline" className="flex-1" onClick={() => onClose(null)}>
              Abbrechen
            </Button>
            <Button className="flex-1" onClick={async () => {
              upsertSetsToMatch.mutate(
                { sets },
                {
                  onSuccess: (result) => onClose(result.result),
                  onError: (error) => {
                    captureException(error);
                    toast.error('Die Sätze konnten nicht gespeichert werden.');
                  },
                }
              );
            }}>
              Speichern
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
