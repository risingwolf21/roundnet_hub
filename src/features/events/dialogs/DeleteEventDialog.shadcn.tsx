import { EventsUserView } from '@/types/supabaseTypes';
import { DeleteEventType } from '../types';

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import { DialogProps } from '@/contexts/DialogsProvider';

export const DeleteEventDialog = ({ open, onClose }: DialogProps<EventsUserView, DeleteEventType | null>) => {

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"drawer"}>
      <DialogHeader>
        <DialogTitle>Event aktualisieren</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className='flex flex-col gap-2 p-4'>
          <Item variant={"outline"} onClick={() => onClose('This Event')}>
            <ItemContent>
              <ItemTitle>Nur dieses Event</ItemTitle>
            </ItemContent>
          </Item>

          <Item variant={"outline"} onClick={() => onClose('This and following events')}>
            <ItemContent>
              <ItemTitle>Dieses und alle folgenden Events löschen</ItemTitle>
            </ItemContent>
          </Item>
        </div>
      </DialogBody>
    </DialogContent>
  </Dialog>
};
