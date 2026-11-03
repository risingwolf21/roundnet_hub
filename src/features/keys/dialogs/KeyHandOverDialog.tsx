import { t } from 'i18next';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DialogProps } from '@/contexts/DialogsProvider';
import { getInitials } from '@/utils';

type KeyHandOverDialogProps = {
  itemHolder: FullItemHolder;
  selectedUser: User | null;
};

export const KeyHandOverDialog = ({
  payload: {
    selectedUser,
    itemHolder
  },
  open,
  onClose
}: DialogProps<KeyHandOverDialogProps, boolean>) => {

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
    <DialogContent variant={"drawer"} showCloseButton={false}>
      <DialogHeader className='my-2 mx-4'>
        <DialogTitle className={"font-bold text-lg"}>
          {t('keyHandOver')}
        </DialogTitle>
      </DialogHeader>
      {
        selectedUser && <div className='flex flex-row justify-center'>
          <Avatar className="size-20">
            {
              selectedUser.avatarUrl
                ? <AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.name ?? t('browse.user')} />
                : <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(selectedUser.name ?? t('browse.user'))}</AvatarFallback>
            }
          </Avatar>
        </div>
      }
      <div className='text-base m-4'>
        {
          selectedUser ?
            selectedUser?.id === itemHolder.full_current_holder?.id
              ? t('confirmKeyTaken', {
                keyName: itemHolder.name,
                userName: itemHolder?.full_current_holder?.displayName ?? '',
              })
              : t('confirmKeyHandover', {
                keyName: itemHolder.name,
                userName: selectedUser.name ?? '',
              })
            : t('confirmKeyTakenFromNull', { keyName: itemHolder.name })
        }
      </div>
      <DialogFooter>
        <div className='px-4 pb-4 flex justify-between'>
          <Button variant={"outline"} onClick={() => onClose(false)}>{t('cancel')}</Button>
          <Button onClick={() => onClose(true)} autoFocus>
            {t('confirm')}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
};
