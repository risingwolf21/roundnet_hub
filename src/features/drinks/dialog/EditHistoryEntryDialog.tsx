import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { DialogProps } from '@/contexts/DialogsProvider';
import { useCurrency } from '@/hooks/useCurrency';
import { ImageIcon, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FullHistoryUpdate } from '../types';

const EditHistoryEntryDialog = ({ open, onClose, payload: entry }: DialogProps<FullHistory, FullHistoryUpdate | null>) => {
  const { t } = useTranslation();
  const formatCurrency = useCurrency();
  const [newCount, setNewCount] = useState<number>(entry.count);

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"drawer"}>
      <DialogHeader variant={"default"}>
        <DialogTitle className={"px-4"}>{t('drinks.editDrink')}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Item>
            <ItemMedia>
              <Avatar className="size-10">
                <AvatarImage src={entry.drink.imageUrl ?? undefined} />
                <AvatarFallback>
                  <ImageIcon className="text-muted-foreground/50" />
                </AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{entry.drink.name}</ItemTitle>
              <ItemDescription>
                {formatCurrency(entry.drink.price)} · {t('drinks.history.dayTotal', { total: formatCurrency(newCount * (entry.drink.price ?? 0)) })}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <div className='flex flex-row items-center gap-2'>
                {/* The database rejects 0: an entry can only be removed by an admin. */}
                <Button variant={"outline"} size="icon" disabled={newCount <= 1}
                  onClick={() => setNewCount(newCount - 1)}>
                  <Minus className="size-4" />
                </Button>
                <span className="text-xl font-semibold w-8 text-center">{newCount}</span>
                <Button
                  variant={"outline"} size="icon"
                  onClick={() => setNewCount(newCount + 1)}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </ItemActions>
          </Item>
        </div>
      </DialogBody>
      <DialogFooter className="p-4 border-t flex-shrink m-0">
        <div className='flex w-full justify-even gap-4'>
          <Button variant="outline" className="flex-1" onClick={() => onClose(null)}>
            {t('common.cancel')}
          </Button>
          <Button className="flex-1" onClick={() => onClose({
            ...entry,
            count: newCount, newCount,
            amount: newCount * (entry.drink.price ?? 0)
          })}>
            {t('common.save')}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};
export default EditHistoryEntryDialog;
