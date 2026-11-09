import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DialogProps } from '@/contexts/DialogsProvider';
import { useTranslation } from 'react-i18next';
import { FullPayment } from '@/types/supabaseTypes';
import { History } from 'types/supabase';

export const ConfirmPaymentDialog = ({ payload, open, onClose }: DialogProps<FullPayment, boolean>) => {
  const { t } = useTranslation();

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
    <DialogContent variant={"drawer"}>
      <DialogHeader className='px-4 py-2'>
        <DialogTitle>{t('admin.payments.confirmDialog.title')}</DialogTitle>
      </DialogHeader>

      <DialogBody>
        <div className='justify-center flex flex-col items-center'>
          <div>{t('admin.payments.confirmDialog.intro')}</div>
          <div className='font-bold'>{`${payload.user?.displayName}`}</div>
          <div className='font-bold'>{`${payload.user?.email}`}</div>
          <div>{t('admin.payments.confirmDialog.amountIntro')}</div>
          <div className='font-bold'>
            {`${payload.history.reduce((prev: number, curr: History) => prev + (curr.amount ?? 0), 0)} €`}
          </div>
          <div>{t('admin.payments.confirmDialog.outro')}</div>
        </div>
      </DialogBody>

      <DialogFooter className="p-4 border-t flex-shrink m-0">
        <div className='flex w-full justify-even gap-4'>
          <Button variant="outline" className="flex-1" onClick={() => onClose(false)}>
            {t('common.cancel')}
          </Button>
          <Button className="flex-1" onClick={() => onClose(true)}>
            {t('common.save')}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
};
