import { supabase } from '@/lib/supabase';
import { FormEvent, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { dataURLtoFile, readFile } from '../../../utils';

import CropImageDialogShadcn from '@/components/CropImageDialog.shadcn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Switch } from '@/components/ui/switch';
import { DialogProps, useDialogs } from '@/contexts/DialogsProvider';
import { EuroIcon, Image, Trash2, UploadCloud } from 'lucide-react';

type EditDrinkDialogProps = {
  drink: Drink;
};

const EditDrinkDialogShadcn = ({ payload: { drink }, open, onClose }: DialogProps<EditDrinkDialogProps, Drink | null>) => {
  const dialogs = useDialogs();
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [croppedImage, setCroppedImage] = useState<string | null>(null);

  const [isCropping, setIsCropping] = useState<boolean>(false);

  const [activeDrink, setActiveDrink] = useState<boolean>(drink.active);
  const [drinkImage, setDrinkImage] = useState<string | null>(drink.imageUrl);

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
        imageUrl: drinkImage,
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

  return <Dialog
    open={open}
    onOpenChange={(isOpen) => {
      if (!isOpen) onClose(null);
    }}>
    <DialogContent variant={"drawer"}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b text-left">
          <DialogTitle>
            Getränk {drink?.id ? 'bearbeiten' : 'erstellen'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 p-4 gap-6 flex flex-col no-scrollbar">
          <div className='flex flex-row gap-4'>
            <Avatar className="size-12">
              <AvatarImage src={croppedImage ?? drinkImage ?? undefined} />
              <AvatarFallback>
                <Image />
              </AvatarFallback>
            </Avatar>
            <div className='flex items-center gap-2'>
              <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={async (event) => {
                if (!event.target.files || event.target.files.length === 0) return;
                setIsCropping(true);
                try {
                  const imageDataUrl = await readFile(event.target.files[0]);

                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                  document.body.focus();
                  await new Promise(resolve => setTimeout(resolve, 10));

                  const result = await dialogs.open(CropImageDialogShadcn, { imageUrl: imageDataUrl as string });
                  setCroppedImage(result);
                } finally {
                  setTimeout(() => {
                    setIsCropping(false);
                    if (inputRef.current) {
                      inputRef.current.value = '';
                    }
                  }, 350);
                }
              }} />
              <Button type='button' disabled={isCropping} variant='outline' onClick={() => inputRef.current?.click()} className='flex items-center gap-2'>
                <UploadCloud />
                Bild hochladen
              </Button>
              <Button
                type='button'
                variant='ghost'
                disabled={isCropping}
                hidden={!croppedImage && !drinkImage}
                onClick={() => {
                  if (croppedImage) {
                    setCroppedImage(null)
                  } else if (drinkImage) {
                    setDrinkImage(null);
                  }
                }}
                className='text-destructive'>
                <Trash2 />
              </Button>
            </div>
          </div>


          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              name='name'
              placeholder="Name"
              defaultValue={drink.name ?? ''} />
          </Field>

          <Field>
            <FieldLabel htmlFor="name">Preis</FieldLabel>
            <InputGroup>
              <InputGroupInput id="price"
                name='price'
                type='number'
                placeholder="Preis"
                defaultValue={drink.price ?? ''} />
              <InputGroupAddon align="inline-end">
                <EuroIcon />
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="name">Anzahl</FieldLabel>
            <Input
              id="stock"
              name='stock'
              type="number"
              placeholder="Anzahl"
              defaultValue={drink.stock ?? ''} />
          </Field>

          <Field orientation="horizontal" className="max-w-sm">
            <FieldContent>
              <FieldLabel htmlFor="switch-active">
                Aktiv
              </FieldLabel>
              <FieldDescription>
                Wenn dieses Getränk nicht aktiv ist, wird es den Nutzern nicht angezeigt.
              </FieldDescription>
            </FieldContent>
            <Switch id="switch-active" checked={activeDrink} onCheckedChange={(val) => setActiveDrink(val)} />
          </Field>

        </div>
        <DialogFooter className="p-4 border-t shrink-0 m-0">
          <Button type='submit'>
            Speichern
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog >
};
export default EditDrinkDialogShadcn;
