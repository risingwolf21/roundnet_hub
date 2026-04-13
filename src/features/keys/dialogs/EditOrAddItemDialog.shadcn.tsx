import { useInsertItemMutation, useUpdateItemMutation } from '@/tanstack/items';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
      <div className={"pt-safe-top sticky top-0 flex h-14 w-full items-center gap-4 bg-background/95 px-4 supports-[backdrop-filter]:bg-background md:px-4 transition-shadow border-b shadow-sm"}>

        <div className="flex items-center gap-2 md:gap-4 lg:w-1/3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onClose(null)}
            className="shrink-0 rounded-full -ml-1"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className='flex-grow'>
          {`Schlüssel ${(currentItem.id ?? 0) > 0 ? 'bearbeiten' : 'erstellen'}`}
        </div>

        <div className="flex items-center justify-end gap-2 lg:w-1/3">
          <Button className="ml-1" onClick={handleSubmit}>
            Speichern
          </Button>
        </div>
      </div>
      <div className='flex-1 min-h-0 overflow-y-auto flex flex-col p-2 gap-2'>
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
      </div>
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
