import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DialogProps } from '@/contexts/DialogsProvider';
import { FullPayment } from '@/types/supabaseTypes';
import { History } from 'types/supabase';

export const ConfirmPaymentDialog = ({ payload, open, onClose }: DialogProps<FullPayment, boolean>) => {

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(false)}>
    <DialogContent variant={"drawer"}>
      <DialogHeader className='px-4 py-2'>
        <DialogTitle>Zahlung bestätigen</DialogTitle>
      </DialogHeader>

      <DialogBody>
        <div className='justify-center flex flex-col items-center'>
          <div>Hiermit bestätigst du, dass</div>
          <div className='font-bold'>{`${payload.user?.displayName}`}</div>
          <div className='font-bold'>{`${payload.user?.email}`}</div>
          <div>eine Zahlung in Höhe von</div>
          <div className='font-bold'>
            {`${payload.history.reduce((prev: number, curr: History) => prev + (curr.amount ?? 0), 0)} €`}
          </div>
          <div>getätigt hat.</div>
        </div>
      </DialogBody>

      <DialogFooter className="p-4 border-t flex-shrink m-0">
        <div className='flex w-full justify-even gap-4'>
          <Button variant="outline" className="flex-1" onClick={() => onClose(false)}>
            Abbrechen
          </Button>
          <Button className="flex-1" onClick={() => onClose(true)}>
            Speichern
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
};
