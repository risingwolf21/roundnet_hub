import { Has } from '@/hooks/useGrants';
import { useCreateGroupMutation, useUpdateGroupMutation } from '@/tanstack/groups';
import { Tables } from '@/types/supabase-generated.types';
import { GroupWithUserRole, UserWithGroups } from '@/types/supabaseTypes';
import { useRef, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DialogProps } from '@/contexts/DialogsProvider';

type CreateOrUpdateGroupDialogProps = {
  group?: Group;
  user: UserWithGroups;
};

export const CreateOrUpdateGroupDialogShadcn = ({
  payload,
  open,
  onClose,
}: DialogProps<CreateOrUpdateGroupDialogProps, GroupWithUserRole | null | 'closed'>) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const usersParentGroups = payload.user.groups.filter((x) => x.parent_group === null);
  const [data, setData] = useState<Tables<'event_group'>>(
    payload.group ?? {
      name: '',
      description: '',
      id: '',
      created_at: '',
      color: '#000',
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
        <DialogHeader>
          <DialogTitle className={"p-4"}>
            {
              data.id === '' ? "Gruppe erstellen" : "Gruppe bearbeiten"
            }
          </DialogTitle>
        </DialogHeader>
        <div className="no-scrollbar overflow-y-auto px-4 flex flex-col gap-4 ">
          <Has perm={'groups.manage.admin'}>
            {usersParentGroups.length > 0 && (
              <Field className="w-full">
                <FieldLabel>Hauptgruppe</FieldLabel>
                <Select
                  items={usersParentGroups.map(x => ({ label: x.name, value: x.id }))}
                  value={data.parent_group ?? 'none'}
                  onValueChange={(val) => setData({
                    ...data,
                    parent_group: val === 'none' ? null : val
                  })}
                  disabled={usersParentGroups.length === 1}>
                  <SelectTrigger className={"w-full"}>
                    <SelectValue placeholder="Gruppe" />
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
                      <SelectItem value={"none"}>Neue Hauptgruppe</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </Has>
          <Field>
            <FieldLabel>Gruppen-Name</FieldLabel>
            <Input
              className='w-full'
              placeholder='Name'
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })} />
          </Field>

          <Field>
            <FieldLabel>Gruppen-Beschreibung</FieldLabel>
            <Input
              className='w-full'
              placeholder='Beschreibung'
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })} />
          </Field>

          <Field>
            <FieldLabel>Gruppen-Beschreibung</FieldLabel>
            <Input
              className='w-full'
              placeholder='Beschreibung'
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })} />
          </Field>

          <Field>
            <FieldLabel>Gruppen-Farbe</FieldLabel>
            <Input
              className='w-full'
              placeholder='Farbe'
              type='color'
              value={data.color}
              onChange={(e) => setData({ ...data, color: e.target.value })} />
          </Field>

          <Has perm={'groups.manage.admin'}>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="switch-is-public">Öffentlichkeit</FieldLabel>
                <FieldDescription>
                  Soll die Gruppe öffentlich sichtbar sein?
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
              <FieldLabel htmlFor="switch-confirm">Bestätigung</FieldLabel>
              <FieldDescription>
                Sollen Benutzer bestätigt werden müssen?
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
        </div>
        {/* <List sx={{ pl: 2, pr: 2, pb: 10 }}>

          <ListItem sx={{ pt: 0, pb: 0 }} key={'title'}>
            <ListItemAvatar>
              <Avatar sx={{ borderRadius: 2 }}>
                <Title />
              </Avatar>
            </ListItemAvatar>
            <TextField
              fullWidth
              variant="outlined"
              label="Gruppen Titel"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              margin="normal"
            />
          </ListItem>
          <ListItem sx={{ pt: 0, pb: 0 }} key={'description'}>
            <ListItemAvatar>
              <Avatar sx={{ borderRadius: 2 }}>
                <Article />
              </Avatar>
            </ListItemAvatar>
            <TextField
              fullWidth
              variant="outlined"
              label="Gruppen Beschreibung"
              value={data.description}
              onChange={(e) => setData({ ...data, description: e.target.value })}
              margin="normal"
            />
          </ListItem>
          <ListItem
            secondaryAction={
              <IconButton
                LinkComponent={'span'}
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.click();
                  }
                }}
              >
                <input
                  ref={inputRef}
                  hidden
                  type="color"
                  value={data.color}
                  onChange={(e) => setData({ ...data, color: e.target.value })}
                />
                <ColorLens />
              </IconButton>
            }
          >
            <ListItemAvatar>
              <Avatar sx={{ background: data.color, width: 40, height: 40, borderRadius: 2 }}>
                <Group />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              sx={{ mr: 2 }}
              slotProps={{
                primary: {
                  whiteSpace: 'nowrap',
                  overflow: 'clip',
                  textOverflow: 'ellipsis',
                },
              }}
              primary={
                <TextField
                  fullWidth
                  variant="outlined"
                  value={data.color}
                  onChange={(e) => setData({ ...data, color: e.target.value })}
                  label="Farbe"
                  margin="normal"
                />
              }
            />
          </ListItem>
          <Has perm={'groups.manage.admin'}>
            <ListItem sx={{ pt: 0, pb: 0 }} key={'public'}>
              <ListItemAvatar>
                <Checkbox
                  sx={{ pl: 0 }}
                  checked={data.is_public}
                  onChange={(e) =>
                    setData({
                      ...data,
                      is_public: e.target.checked,
                    })
                  }
                />
              </ListItemAvatar>
              <ListItemText primary={'Öffentliche Gruppe'} />
            </ListItem>
          </Has>
          <ListItem sx={{ pt: 0, pb: 0 }} key={'endDate'}>
            <ListItemAvatar>
              <Checkbox
                sx={{ pl: 0 }}
                checked={data.need_request_to_join}
                onChange={(e) =>
                  setData({
                    ...data,
                    need_request_to_join: e.target.checked,
                  })
                }
              />
            </ListItemAvatar>
            <ListItemText primary={'Benutzer müssen bestätigt werden?'} />
          </ListItem>
        </List> */}
      </DialogContent>
    </Dialog>
  );
};
