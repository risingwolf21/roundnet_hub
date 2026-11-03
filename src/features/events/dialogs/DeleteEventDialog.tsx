import { useTranslation } from 'react-i18next';
import { EventsUserView } from '@/types/supabaseTypes';
import { DeleteEventType } from '../types';

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import { DialogProps } from '@/contexts/DialogsProvider';

export const DeleteEventDialog = ({ open, onClose }: DialogProps<EventsUserView, DeleteEventType | null>) => {
  const { t } = useTranslation();

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"drawer"}>
      <DialogHeader>
        <DialogTitle>{t('events.deleteDialog.title')}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className='flex flex-col gap-2 p-4'>
          <Item variant={"outline"} onClick={() => onClose('This Event')}>
            <ItemContent>
              <ItemTitle>{t('events.deleteDialog.onlyThis')}</ItemTitle>
            </ItemContent>
          </Item>

          <Item variant={"outline"} onClick={() => onClose('This and following events')}>
            <ItemContent>
              <ItemTitle>{t('events.deleteDialog.thisAndFollowing')}</ItemTitle>
            </ItemContent>
          </Item>
        </div>
      </DialogBody>
    </DialogContent>
  </Dialog>
};
