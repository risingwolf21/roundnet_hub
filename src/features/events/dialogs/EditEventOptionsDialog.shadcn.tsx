import { CreateEventOption } from '../types';

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import { DialogProps } from '@/contexts/DialogsProvider';

export const EditEventOptionsDialogShadcn = ({
  open,
  onClose,
}: DialogProps<undefined, null | CreateEventOption>) => {

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"drawer"}>
      <DialogHeader className='px-4'>
        <DialogTitle>Event aktualisieren</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className='flex flex-col gap-2'>
          <Item variant={"outline"} onClick={() => onClose("UpdateSingle")}>
            <ItemContent>
              <ItemTitle>Nur dieses Event aktualisieren</ItemTitle>
            </ItemContent>
          </Item>

          <Item variant={"outline"} onClick={() => onClose("UpdateRecurrence")}>
            <ItemContent>
              <ItemTitle>Dieses und alle folgenden Events aktualisieren</ItemTitle>
            </ItemContent>
          </Item>
        </div>
      </DialogBody>
    </DialogContent>
  </Dialog>
};
