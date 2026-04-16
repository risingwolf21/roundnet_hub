import { useInsertItemMutation, useUpdateItemMutation } from '@/tanstack/items';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogProps } from '@/contexts/DialogsProvider';
import { X } from 'lucide-react';
import { toast } from 'sonner';

type EditOrAddItemDialogProps = {
  itemToEdit: ItemUpdate | null;
};

export const EditOrAddItemDialogShadcn = ({ open, onClose, payload: { itemToEdit } }: DialogProps<EditOrAddItemDialogProps>) => {
  const [currentItem, setCurrentItem] = useState<ItemUpdate>({
    id: itemToEdit?.id,
    name: itemToEdit?.name,
    color: itemToEdit?.color,
    current_holder: itemToEdit?.current_holder,
    type: itemToEdit?.type,
  });

  const updateItemMutation = useUpdateItemMutation();
  const insertItemMutation = useInsertItemMutation();

  if (itemToEdit?.id !== currentItem.id) {
    setCurrentItem({
      id: itemToEdit?.id,
      name: itemToEdit?.name,
      color: itemToEdit?.color,
      current_holder: itemToEdit?.current_holder,
      type: itemToEdit?.type,
    });
  }

  const handleSubmit = async () => {
    if (!currentItem.name || currentItem.name.length < 6) {
      toast.warning('Der Schlüsselname ist zu kurz!');
      return;
    }
    if (!currentItem.type) {
      toast.warning('Der Schlüssel braucht einen Typ');
      return;
    }
    console.log(currentItem)
    if (currentItem.id) {
      updateItemMutation.mutate(
        {
          item: {
            ...currentItem,
            id: currentItem.id,
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
    { label: "MTV Keller", value: "mtvStorage" },
    { label: "MTV Gym", value: "mtvGym" },
    { label: "MTV Palazzo", value: "mtvGymPalazzo" },
    { label: "Nichts", value: 'none' }
  ]

  return <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose(null)}>
    <DialogContent variant={"fullscreen"} showCloseButton={false}>
      <DialogHeader variant={"appbar"}>
        <DialogClose render={
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full -mr-2">
            <X className="h-5 w-5" />
          </Button>
        } />
        <DialogTitle className="flex-1">
          {`Schlüssel ${(currentItem.id ?? 0) > 0 ? 'bearbeiten' : 'erstellen'}`}
        </DialogTitle>
        <Button className="ml-1" onClick={handleSubmit}>
          Speichern
        </Button>
      </DialogHeader>
      <DialogBody className='gap-4'>
        <Field>
          <FieldLabel htmlFor="item-name">
            Schlüsselname
          </FieldLabel>
          <Input
            id="item-name"
            value={currentItem?.name ?? ''}
            onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="item-name">
            Farbe
          </FieldLabel>
          <Input
            id="item-name"
            value={currentItem?.color ?? ''}
            type='color'
            onChange={(e) => setCurrentItem({ ...currentItem, color: e.target.value })}
          />
        </Field>

        <Field className="w-full">
          <FieldLabel>Schlüsseltyp</FieldLabel>
          <Select
            items={KEY_TYPES}
            value={currentItem.type ?? 'none'}
            onValueChange={(val) => setCurrentItem({
              ...currentItem,
              type: val === 'none' ? undefined : (val as ItemType)
            })}>
            <SelectTrigger className={"w-full"}>
              <SelectValue placeholder="Typ" />
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
