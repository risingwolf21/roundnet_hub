import { FormEvent, useState } from 'react';
import { UserWithGroups } from '../../../types/supabaseTypes';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { DialogProps } from '@/contexts/DialogsProvider';
import { supabase } from '@/lib/supabase';
import { captureException } from '@sentry/react';
import { ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';

type EditUserDialogProps = {
  user: UserWithGroups;
};

export type UserEdited = {
  displayName: string;
  verified: boolean;
  userId: string;
  role: UserRole;
};

async function resetUserPassword(userId: string, newPassword: string) {
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated');

  const resp = await fetch(
    `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/reset-user-password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId, newPassword }),
    }
  );
  if (!resp.ok) throw new Error(await resp.text());
  return await resp.json();
}

const EditUserDialog = ({ open, onClose, payload: { user } }: DialogProps<EditUserDialogProps, UserEdited | null>) => {
  const [verified, setVerified] = useState(user.verified);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user.role);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    onClose({
      userId: user.id,
      displayName: data.get('displayName'),
      verified,
      role: role,
    } as UserEdited);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={"fullscreen"} showCloseButton={false}>
        <DialogHeader variant={"appbar"}>
          <DialogTitle className="flex-1">Benutzer bearbeiten</DialogTitle>
          <DialogClose render={
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full -mr-2">
              <X className="h-5 w-5" />
            </Button>
          } />
        </DialogHeader>
        <DialogBody>
          <form noValidate onSubmit={handleSubmit}>
            <div className="no-scrollbar overflow-y-auto flex flex-col gap-4">

              <Field key={"displayName"}>
                <FieldLabel htmlFor="displayName">
                  Anzeigename
                </FieldLabel>
                <Input
                  id="displayName"
                  name="displayName"
                  defaultValue={user?.displayName ? user.displayName : ''}
                  required
                />
              </Field>

              <Field key={"email"}>
                <FieldLabel htmlFor="email">
                  Email
                </FieldLabel>
                <Input
                  id="email"
                  name="email"
                  defaultValue={user?.email}
                  disabled
                />
              </Field>

              <Field key={"password"}>
                <FieldLabel htmlFor="password">
                  Passwort
                </FieldLabel>
                <div className='flex flex-row gap-2'>
                  <Input
                    className='flex-1'
                    id="password"
                    name="password"
                    placeholder='Passwort ändern'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button className={"flex-shrink"} variant={"outline"} onClick={async () => {
                    try {
                      await resetUserPassword(user.id, password);
                      toast.success('Passwort erfolgreich zurückgesetzt');
                      setPassword('');
                    } catch (error: any) {
                      captureException(error);
                      toast.error(`Fehler beim Zurücksetzen des Passworts: ${error.message}`);
                    }
                  }}>
                    Speichern
                  </Button>
                </div>
              </Field>

              <div className='flex flex-col gap-4'>
                <div className='text-base font-semibold'>Gruppen</div>
                {
                  user.groups.map(x => (
                    <Item key={x.id} variant={"outline"} className='pl-2'>
                      <div className='w-full h-full flex flex-row justify-between gap-4 relative rounded-md py-1 px-2 pl-6 text-sm after:absolute after:inset-y-0 after:left-0 after:w-2 after:rounded-full after:bg-[var(--after-bg)]'
                        style={{ '--after-bg': x.color } as React.CSSProperties}>
                        <ItemContent>
                          <ItemTitle>{x.name}</ItemTitle>

                        </ItemContent>
                        <ItemActions>
                          <ChevronRight />
                        </ItemActions>
                      </div>
                    </Item>
                  ))
                }
              </div>
            </div>

          </form>
        </DialogBody>
      </DialogContent>
    </Dialog >
  );
};

export default EditUserDialog;
