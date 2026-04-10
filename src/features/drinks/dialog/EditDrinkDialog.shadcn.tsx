import { supabase } from '@/lib/supabase';
import { FormEvent, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { dataURLtoFile } from '../../../utils';

import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import Button from '@mui/material/Button';
import { DialogProps, useDialogs } from '@toolpad/core';

type EditDrinkDialogProps = {
  drink: Drink;
  drinkHistory: Drink[];
};

const EditDrinkDialogShadcn = ({ payload: { drink, drinkHistory }, open, onClose }: DialogProps<EditDrinkDialogProps, Drink | null>) => {
  const dialogs = useDialogs();

  const [croppedImage, setCroppedImage] = useState<string | null>(null);

  const [activeDrink, setActiveDrink] = useState<boolean>(drink.active);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const price = data.get('price')?.toString();
    const stock = data.get('stock')?.toString();
    const name = data.get('name')?.toString();

    if (name && price && stock) {
      const newDrink = {
        id: drink.id,
        name,
        price: Number.parseFloat(price),
        imageUrl: '',
        active: activeDrink,
        stock: Number.parseFloat(stock),
        type: drink.type,
      };

      if (croppedImage) {
        const fileName = uuid() + '.jpg';

        const { data: uploadData, error } = await supabase.storage
          .from('drink')
          .upload(`avatars/${fileName}`, dataURLtoFile(croppedImage, fileName), {
            cacheControl: '3600',
            upsert: true,
          });

        if (!error && uploadData && uploadData.path) {
          const { data } = supabase.storage.from('drink').getPublicUrl(uploadData.path);
          newDrink.imageUrl = data.publicUrl;
        }
      }

      setCroppedImage(null);
      onClose(newDrink as Drink);
    }
  };

  return <Drawer
    repositionInputs={false}
    open={open}
    onOpenChange={(isOpen) => {
      if (!isOpen) onClose(null);
    }}>
    <DrawerContent className='flex flex-col max-h-[95dvh]'>
      <DrawerHeader className="p-4 pb-2 border-b text-left">
        <DrawerTitle>
          Getränk {drink?.id ? 'bearbeiten' : 'erstellen'}
        </DrawerTitle>
      </DrawerHeader>
      <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-4 gap-4 flex flex-col no-scrollbar">
      </div>
    </DrawerContent>
    <DrawerFooter>
      <Button>
        Speichern
      </Button>
    </DrawerFooter>
  </Drawer>

  // return (
  //   <Box>
  //     <Dialog fullScreen open={open} onClose={handleClose}>
  //       <Box component="form" onSubmit={handleSubmit} noValidate>
  //         <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
  //           <Toolbar>
  //             <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
  //               <CloseIcon />
  //             </IconButton>
  //             <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
  //               Getränk {drink?.id ? 'bearbeiten' : 'erstellen'}
  //             </Typography>
  //             <Button autoFocus color="inherit" type="submit">
  //               Speichern
  //             </Button>
  //           </Toolbar>
  //         </AppBar>
  //         <List>
  //           <ListItem sx={{ pt: 0, pb: 0 }}>
  //             <ListItemAvatar>
  //               <Avatar>
  //                 <FormatSizeIcon />
  //               </Avatar>
  //             </ListItemAvatar>
  //             <ListItemText>
  //               <TextField
  //                 margin="normal"
  //                 required
  //                 fullWidth
  //                 id="name"
  //                 label="Name"
  //                 name="name"
  //                 defaultValue={drink?.name ? drink.name : ''}
  //               />
  //             </ListItemText>
  //           </ListItem>
  //           <ListItem sx={{ pt: 0, pb: 0 }}>
  //             <ListItemAvatar>
  //               <Avatar>
  //                 <EuroIcon />
  //               </Avatar>
  //             </ListItemAvatar>
  //             <ListItemText>
  //               <TextField
  //                 margin="normal"
  //                 required
  //                 fullWidth
  //                 id="price"
  //                 label="Preis"
  //                 name="price"
  //                 type={'number'}
  //                 defaultValue={drink?.price ? drink.price : 0}
  //               />
  //             </ListItemText>
  //           </ListItem>
  //           <ListItem sx={{ pt: 0, pb: 0 }}>
  //             <ListItemAvatar>
  //               <Avatar>
  //                 <InventoryIcon />
  //               </Avatar>
  //             </ListItemAvatar>
  //             <ListItemText>
  //               <TextField
  //                 margin="normal"
  //                 required
  //                 fullWidth
  //                 id="stock"
  //                 label="Anzahl"
  //                 name="stock"
  //                 type={'number'}
  //                 defaultValue={drink?.stock ? drink.stock : 0}
  //               />
  //             </ListItemText>
  //           </ListItem>
  //           <ListItem
  //             secondaryAction={
  //               <Button variant="contained" component="label">
  //                 Upload
  //                 <input
  //                   accept="image/*"
  //                   type="file"
  //                   hidden
  //                   onChange={async (event) => {
  //                     if (!event.target.files || event.target.files.length === 0) return;
  //                     const imageDataUrl = await readFile(event.target.files[0]);
  //                     const result = await dialogs.open(CropImageDialog, { selectedImage: imageDataUrl as string });
  //                     setCroppedImage(result);
  //                   }}
  //                 />
  //               </Button>
  //             }
  //           >
  //             <ListItemAvatar>
  //               <Avatar sx={{ borderRadius: 2 }}>
  //                 {croppedImage ? (
  //                   <img src={croppedImage} alt="logo" width={40} height={40} />
  //                 ) : drink?.imageUrl ? (
  //                   <img src={drink.imageUrl} alt="logo" width={40} height={40} />
  //                 ) : (
  //                   <LocalDrinkIcon />
  //                 )}
  //               </Avatar>
  //             </ListItemAvatar>
  //           </ListItem>
  //           <ListItem onClick={() => setActiveDrink(!activeDrink)}>
  //             <ListItemAvatar>
  //               <Checkbox checked={activeDrink} />
  //             </ListItemAvatar>
  //             <ListItemText>
  //               <Typography>Aktiv</Typography>
  //             </ListItemText>
  //           </ListItem>
  //           <List
  //             subheader={
  //               <ListSubheader component="div" id="nested-list-subheader">
  //                 Verlauf
  //               </ListSubheader>
  //             }
  //           >
  //             {drinkHistory &&
  //               drink &&
  //               [drink, ...drinkHistory]
  //                 .sort((a, b) => b.id - a.id)
  //                 .map((x, index) => {
  //                   return (
  //                     <ListItem key={'drinkHistory' + x.id}>
  //                       <ListItemAvatar>{index === 0 && <Check />}</ListItemAvatar>
  //                       <ListItemText primary={x.name} secondary={x.price + ' €'} />
  //                     </ListItem>
  //                   );
  //                 })}
  //           </List>
  //         </List>
  //       </Box>
  //     </Dialog>
  //   </Box>
  // );
};
export default EditDrinkDialogShadcn;
