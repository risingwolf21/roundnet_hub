import { useInsertItemMutation, useUpdateItemMutation } from '@/tanstack/items';
import { useGroup } from '@/tanstack/groups';
import { ChevronRight, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogProps, useDialogs } from '@/contexts/DialogsProvider';
import { ToggleRow } from '@/features/events/dialogs/EventFormParts';
import { toast } from 'sonner';

type EditOrAddItemDialogProps = {
  itemToEdit: ItemUpdate | null;
};

export const EditOrAddItemDialog = ({ open, onClose, payload: { itemToEdit } }: DialogProps<EditOrAddItemDialogProps>) => {
  const { t } = useTranslation();
  const [currentItem, setCurrentItem] = useState<ItemUpdate>({
    id: itemToEdit?.id,
    name: itemToEdit?.name,
    color: itemToEdit?.color,
    current_holder: itemToEdit?.current_holder,
    type: itemToEdit?.type,
    group: itemToEdit?.group ?? null,
  });

  const dialogs = useDialogs();
  // Name of the key's current group; a newly picked group is kept in pickedGroup.
  const { data: savedGroup, isLoading: savedGroupLoading } = useGroup(itemToEdit?.group ?? undefined);
  const [pickedGroup, setPickedGroup] = useState<Group | null>(null);
  const groupName = pickedGroup?.id === currentItem.group ? pickedGroup?.name : savedGroup?.name;

  const pickGroup = async () => {
    const group = await dialogs.selectGroup([], currentItem.group);
    if (group) {
      setPickedGroup(group);
      setCurrentItem((item) => ({ ...item, group: group.id }));
    }
  };

  const updateItemMutation = useUpdateItemMutation();
  const insertItemMutation = useInsertItemMutation();

  if (itemToEdit?.id !== currentItem.id) {
    setCurrentItem({
      id: itemToEdit?.id,
      name: itemToEdit?.name,
      color: itemToEdit?.color,
      current_holder: itemToEdit?.current_holder,
      type: itemToEdit?.type,
      group: itemToEdit?.group ?? null,
    });
  }

  const handleSubmit = async () => {
    if (!currentItem.name || currentItem.name.length < 6) {
      toast.warning(t('keys.dialog.nameTooShort'));
      return;
    }
    if (!currentItem.type) {
      toast.warning(t('keys.dialog.typeRequired'));
      return;
    }
    console.log(currentItem)
    if (currentItem.id) {
      updateItemMutation.mutate(
        {
          item: {
            ...currentItem,
            id: currentItem.id,
            // Only send the group when it changed: setting it requires membership in that group.
            group: currentItem.group === (itemToEdit?.group ?? null) ? undefined : currentItem.group,
          },
        },
        {
          onError: (e) => toast.error(e.message),
          onSuccess: () => onClose(),
        }
      );
    } else {
      insertItemMutation.mutate(
        {
          item: {
            name: currentItem.name,
            color: currentItem.color,
            type: currentItem.type,
            current_holder: currentItem.current_holder,
            group: currentItem.group,
          },
        },
        {
          onError: (e) => toast.error(e.message),
          onSuccess: () => onClose(),
        }
      );
    }
  };

  const KEY_TYPES: { label: string, value: "mtvStorage" | "mtvGym" | "mtvGymPalazzo" | "goethe" | 'none' }[] = [
    { label: t('itemType.mtvStorage'), value: "mtvStorage" },
    { label: t('itemType.mtvGym'), value: "mtvGym" },
    { label: "MTV Palazzo", value: "mtvGymPalazzo" },
    { label: t('keys.dialog.noType'), value: 'none' }
  ]

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"fullscreen"}>
      <DialogHeader variant={"appbar"}>
        <DialogClose />
        <DialogTitle className="flex-1">
          {(currentItem.id ?? 0) > 0 ? t('keys.dialog.edit') : t('keys.dialog.create')}
        </DialogTitle>
        <Button className="ml-1" onClick={handleSubmit}>
          {t('common.save')}
        </Button>
      </DialogHeader>
      <DialogBody className='gap-4'>
        <Field>
          <FieldLabel htmlFor="item-name">
            {t('keys.dialog.name')}
          </FieldLabel>
          <Input
            id="item-name"
            value={currentItem?.name ?? ''}
            onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="item-name">
            {t('common.color')}
          </FieldLabel>
          <Input
            id="item-name"
            value={currentItem?.color ?? ''}
            type='color'
            onChange={(e) => setCurrentItem({ ...currentItem, color: e.target.value })}
          />
        </Field>

        <Field className="w-full">
          <FieldLabel>{t('keys.dialog.type')}</FieldLabel>
          <Select
            items={KEY_TYPES}
            value={currentItem.type ?? 'none'}
            onValueChange={(val) => setCurrentItem({
              ...currentItem,
              type: val === 'none' ? undefined : (val as ItemType)
            })}>
            <SelectTrigger className={"w-full"}>
              <SelectValue placeholder={t('keys.dialog.typePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {
                  KEY_TYPES.map(x => (
                    <SelectItem key={x.value} value={x.value}>
                      {x.label}
                    </SelectItem>
                  ))
                }
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <ToggleRow
          id="item-group"
          title={t('keys.dialog.groupOnly')}
          description={t('keys.dialog.groupOnlyDescription')}
          checked={!!currentItem.group}
          onCheckedChange={async (on) => {
            if (on) await pickGroup();
            else setCurrentItem((item) => ({ ...item, group: null }));
          }}
        >
          <button
            type="button"
            className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-left"
            onClick={pickGroup}
          >
            <Users className="size-4 text-muted-foreground" />
            <span className="flex-1 truncate text-sm">{groupName ?? t(savedGroupLoading ? 'keys.dialog.groupLoading' : 'keys.dialog.groupUnknown')}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </ToggleRow>
      </DialogBody>
    </DialogContent>
  </Dialog>

  // return (
  //   <Dialog fullScreen open={open} onClose={onClose}>
  //     <Box component="form" noValidate>

  //       <Box sx={{ pt: 'env(safe-area-inset-top)' }}>
  //         <List>
  //           <ListItem>
  //             <TextField
  //               fullWidth
  //               variant="outlined"
  //               value={currentItem?.name ?? ''}
  //               onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
  //               label="Schlüsselname"
  //               margin="normal"
  //             />
  //           </ListItem>
  //           <ListItem>
  //             <ListItemAvatar>
  //               <Avatar sx={{ background: currentItem?.color ?? '#000', width: 40, height: 40, borderRadius: 2 }}>
  //                 <KeyIcon />
  //               </Avatar>
  //             </ListItemAvatar>
  //             <TextField
  //               fullWidth
  //               variant="outlined"
  //               value={currentItem?.color ?? '#000'}
  //               onChange={(e) => setCurrentItem({ ...currentItem, color: e.target.value })}
  //               label="Farbe"
  //               margin="normal"
  //             />
  //           </ListItem>
  //           <ListItem>
  //             <ListItemAvatar></ListItemAvatar>
  //             <Select
  //               fullWidth
  //               value={currentItem?.type ?? 'nothing'}
  //               onChange={(e) =>
  //                 setCurrentItem({
  //                   ...currentItem,
  //                   type: e.target.value === 'nothing' ? undefined : (e.target.value as ItemType),
  //                 })
  //               }
  //             >
  //               <MenuItem value={'mtvStorage'}>MTV Kellerschlüssel</MenuItem>
  //               <MenuItem value={'mtvGym'}>MTV Gymschlüssel</MenuItem>
  //               <MenuItem value={'mtvGymPalazzo'}>MTV Gym/Palazzoschlüssel</MenuItem>
  //               <MenuItem value={'nothing'}>Nichts</MenuItem>
  //             </Select>
  //           </ListItem>
  //         </List>
  //       </Box>
  //     </Box>
  //   </Dialog>
  // );
};
