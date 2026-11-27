import { FormEvent, useState } from 'react';
import { groupSideBar } from "@/components/list/ListParts";
import { UserWithGroups } from '../../../types/supabaseTypes';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { DialogProps } from '@/contexts/DialogsProvider';
import { PushDevice } from '@/repository/AdminUsersRepository';
import { supabase } from '@/lib/supabase';
import { captureException } from '@sentry/react';
import i18n from 'i18next';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type EditUserDialogProps = {
  user: UserWithGroups;
  pushDevices?: PushDevice[];
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
  if (!accessToken) throw new Error(i18n.t('admin.users.notAuthenticated'));

  const resp = await fetch(
    `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/reset-user-password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Accept-Language': i18n.resolvedLanguage ?? 'de', // the function answers errors in this language
      },
      body: JSON.stringify({ userId, newPassword }),
    }
  );
  if (!resp.ok) throw new Error(await resp.text());
  return await resp.json();
}

/** The edit form: inside the dialog on phones, in the side panel of the user list on wide screens. */
export const EditUserForm = ({ user, pushDevices, onSave }: EditUserDialogProps & { onSave: (result: UserEdited) => void }) => {
  const { t } = useTranslation();
  const [verified, setVerified] = useState(user.verified);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user.role);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    onSave({
      userId: user.id,
      displayName: data.get('displayName'),
      verified,
      role: role,
    } as UserEdited);
  };

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="no-scrollbar overflow-y-auto flex flex-col gap-4">

        <Field key={"displayName"}>
          <FieldLabel htmlFor="displayName">
            {t('profile.account.displayName')}
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
            {t('admin.users.email')}
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
            {t('admin.users.password')}
          </FieldLabel>
          <div className='flex flex-row gap-2'>
            <Input
              className='flex-1'
              id="password"
              name="password"
              placeholder={t('profile.password.title')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button className={"flex-shrink"} variant={"outline"} onClick={async () => {
              try {
                await resetUserPassword(user.id, password);
                toast.success(t('admin.users.passwordResetSuccess'));
                setPassword('');
              } catch (error: any) {
                captureException(error);
                toast.error(t('admin.users.passwordResetError', { error: error.message }));
              }
            }}>
              {t('common.save')}
            </Button>
          </div>
        </Field>

        <div className='flex flex-col gap-4'>
          <div className='text-base font-semibold'>{t('navigation.groups')}</div>
          {
            user.groups.map(x => (
              <Item key={x.id} variant={"outline"} className={groupSideBar(x.color).className} style={groupSideBar(x.color).style}>
                <div className='w-full h-full flex flex-row justify-between gap-4 py-1 text-sm'>
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

        {pushDevices && (
          <div className='flex flex-col gap-4'>
            <div className='text-base font-semibold'>{t('admin.users.pushSection')}</div>
            {pushDevices.length === 0 && (
              <div className='text-sm text-muted-foreground'>{t('admin.users.pushNone')}</div>
            )}
            {pushDevices.map((device) => (
              <Item key={`${device.platform}-${device.last_seen}`} variant={"outline"}>
                <ItemContent>
                  <ItemTitle>{t(`admin.users.platform.${device.platform ?? 'unknown'}`, { defaultValue: t('admin.users.platform.unknown') })}</ItemTitle>
                  <ItemDescription>{t('admin.users.deviceLastSeen', { date: new Date(device.last_seen) })}</ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </div>
        )}
      </div>

      {/* The form had an onSubmit handler but no submit button (the password "Speichern" is
          type="button" and with several inputs Enter does not submit), so name changes could
          never be saved. */}
      <Button type="submit" className="w-full mt-4">
        {t('admin.users.saveChanges')}
      </Button>
    </form>
  );
};

const EditUserDialog = ({ open, onClose, payload: { user, pushDevices } }: DialogProps<EditUserDialogProps, UserEdited | null>) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={"fullscreen"}>
        <DialogHeader variant={"appbar"}>
          <DialogTitle className="flex-1">{t('admin.users.edit')}</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <DialogBody>
          <EditUserForm user={user} pushDevices={pushDevices} onSave={onClose} />
        </DialogBody>
      </DialogContent>
    </Dialog >
  );
};

export default EditUserDialog;
