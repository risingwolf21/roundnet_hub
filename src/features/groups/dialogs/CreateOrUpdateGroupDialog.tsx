import { Has } from '@/hooks/useGrants';
import { pickDistinctColor } from '@/features/groups/groupColor';
import { useCreateGroupMutation, useUpdateGroupMutation } from '@/tanstack/groups';
import { Tables } from '@/types/supabase-generated.types';
import { GroupWithUserRole, UserWithGroups } from '@/types/supabaseTypes';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DialogProps } from '@/contexts/DialogsProvider';
import { formatDateToDatabase } from '@/utils';
import { captureException } from '@sentry/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type CreateOrUpdateGroupDialogProps = {
  group?: Group;
  user: UserWithGroups;
};

export const CreateOrUpdateGroupDialog = ({
  payload,
  open,
  onClose,
}: DialogProps<CreateOrUpdateGroupDialogProps, GroupWithUserRole | null | 'closed'>) => {
  const { t } = useTranslation();
  const usersParentGroups = payload.user.groups.filter((x) => x.parent_group === null);
  // Colours already in use (across the groups this user can see) so a new group gets a distinct one.
  const existingColors = payload.user.groups.map((g) => (g as { color?: string }).color);
  const [data, setData] = useState<Tables<'event_group'>>(() =>
    payload.group ?? {
      name: '',
      description: '',
      id: '',
      created_at: '',
      color: pickDistinctColor(existingColors),
      is_public: true,
      need_request_to_join: false,
      parent_group: usersParentGroups.length === 1 ? usersParentGroups[0].id : null,
      visible: true,
    }
  );
  const createGroup = useCreateGroupMutation();
  const updateGroup = useUpdateGroupMutation(payload.group?.id);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose('closed')}>
      <DialogContent variant={"fullscreen"}>
        <DialogHeader variant={"appbar"}>
          <DialogTitle className={"flex-1"}>
            {
              data.id === '' ? t('groups.create') : t('groups.edit')
            }
          </DialogTitle>
          <DialogClose />
        </DialogHeader>
        <DialogBody className='gap-4'>

          <Has perm={'groups.manage.admin'}>
            {usersParentGroups.length > 0 && (
              <Field className="w-full">
                <FieldLabel>{t('groups.parentGroup')}</FieldLabel>
                <Select
                  items={usersParentGroups.map(x => ({ label: x.name, value: x.id }))}
                  value={data.parent_group ?? 'none'}
                  onValueChange={(val) => setData({
                    ...data,
                    parent_group: val === 'none' ? null : val
                  })}
                  disabled={usersParentGroups.length === 1}>
                  <SelectTrigger className={"w-full"}>
                    <SelectValue placeholder={t('groups.group')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {
                        usersParentGroups.map(x => (
                          <SelectItem key={x.id} value={x.id}>
                            {x.name}
                          </SelectItem>
                        ))
                      }
                      <SelectItem value={"none"}>{t('groups.newParentGroup')}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </Has>
          <Field>
            <FieldLabel>{t('groups.nameLabel')}</FieldLabel>
            <Input
              className='w-full'
              placeholder={t('groups.namePlaceholder')}
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })} />
          </Field>

          <Field>
            <FieldLabel>{t('groups.descriptionLabel')}</FieldLabel>
            <Input
              className='w-full'
              placeholder={t('costs.description')}
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })} />
          </Field>


          <Field>
            <FieldLabel>{t('groups.colorLabel')}</FieldLabel>
            <div className='flex w-full items-center gap-2'>
              <Input
                className='w-full'
                placeholder={t('common.color')}
                type='color'
                value={data.color}
                onChange={(e) => setData({ ...data, color: e.target.value })} />
              <Button
                type='button'
                variant='outline'
                onClick={() =>
                  setData((d) => ({ ...d, color: pickDistinctColor([...existingColors, d.color]) }))
                }>
                {t('groups.newColor')}
              </Button>
            </div>
            <FieldDescription>
              {t('groups.colorHint')}
            </FieldDescription>
          </Field>

          <Has perm={'groups.manage.admin'}>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="switch-is-public">{t('groups.publicLabel')}</FieldLabel>
                <FieldDescription>
                  {t('groups.publicHint')}
                </FieldDescription>
              </FieldContent>
              <Switch
                id="switch-is-public"
                checked={data.is_public}
                onCheckedChange={(e) =>
                  setData({
                    ...data,
                    is_public: e
                  })
                } />
            </Field>
          </Has>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="switch-confirm">{t('groups.confirmLabel')}</FieldLabel>
              <FieldDescription>
                {t('groups.confirmHint')}
              </FieldDescription>
            </FieldContent>
            <Switch
              id="switch-confirm"
              checked={data.need_request_to_join}
              onCheckedChange={(e) =>
                setData({
                  ...data,
                  need_request_to_join: e
                })
              } />
          </Field>
        </DialogBody>
        <DialogFooter variant={"fullscreen"}>
          <Button onClick={async () => {
            if (data.name.length < 6) {
              toast.warning(t('groups.nameTooShort'));
              return;
            }
            if (data.description.length < 6) {
              toast.warning(t('groups.descriptionTooShort'));
              return;
            }

            if (data.id === '') {
              createGroup.mutate(
                {
                  group: {
                    name: data.name,
                    description: data.description,
                    is_public: data.is_public,
                    color: data.color,
                    need_request_to_join: data.need_request_to_join,
                    created_at: formatDateToDatabase(new Date()),
                    parent_group: data.parent_group,
                    visible: true,
                  },
                  user: payload.user,
                },
                {
                  onSuccess: (data) => onClose({ ...data, user_role: 'admin' }),
                }
              );
            } else {
              updateGroup.mutate(
                { group: data },
                {
                  onError: (e) => {
                    captureException(e);
                    onClose(null);
                  },
                  onSuccess: (data) => {
                    onClose({ ...data, user_role: 'admin' });
                  },
                }
              );
            }
          }}>
            {data.id === '' ? t('groups.create') : t('groups.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
