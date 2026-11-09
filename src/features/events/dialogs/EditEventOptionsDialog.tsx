import { useTranslation } from 'react-i18next';
import { CreateEventOption } from '../types';

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import { DialogProps } from '@/contexts/DialogsProvider';

export const EditEventOptionsDialog = ({
  open,
  onClose,
}: DialogProps<undefined, null | CreateEventOption>) => {
  const { t } = useTranslation();

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"drawer"}>
      <DialogHeader className='px-4'>
        <DialogTitle>{t('events.editOptionsDialog.title')}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className='flex flex-col gap-2'>
          <Item variant={"outline"} onClick={() => onClose("UpdateSingle")}>
            <ItemContent>
              <ItemTitle>{t('events.editOptionsDialog.onlyThis')}</ItemTitle>
            </ItemContent>
          </Item>

          <Item variant={"outline"} onClick={() => onClose("UpdateRecurrence")}>
            <ItemContent>
              <ItemTitle>{t('events.editOptionsDialog.thisAndFollowing')}</ItemTitle>
            </ItemContent>
          </Item>
        </div>
      </DialogBody>
    </DialogContent>
  </Dialog>
};
