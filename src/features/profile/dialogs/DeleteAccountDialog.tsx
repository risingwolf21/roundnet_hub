import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { DialogProps } from '@/contexts/DialogsProvider';
import { useDeleteAccount } from '@/tanstack/user';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Resolves with `true` once the account has been deleted. */
const DeleteAccountDialog = ({ open, onClose }: DialogProps<void, boolean>) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const deleteAccount = useDeleteAccount();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await deleteAccount.mutateAsync(password);
      onClose(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !deleteAccount.isPending && onClose(null)}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t('profile.account.deleteAccountTitle')}</DialogTitle>
            <DialogDescription>{t('profile.account.deleteAccountDescription')}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="delete-account-password">{t('profile.account.deleteAccountPassword')}</FieldLabel>
            <Input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleteAccount.isPending} onClick={() => onClose(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="destructive" disabled={!password || deleteAccount.isPending}>
              {deleteAccount.isPending && <Spinner />}
              {t('profile.account.deleteAccountConfirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteAccountDialog;
