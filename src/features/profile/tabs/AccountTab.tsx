import CropImageDialog from "@/components/CropImageDialog";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useDialogs } from "@/contexts/DialogsProvider";
import { useUpdateUserProfile } from "@/tanstack/user";
import { UserWithGroups } from "@/types/supabaseTypes";
import { readFile } from "@/utils";
import { Image, Trash, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const AccountTab = ({ user, handleSignOut }: { user: UserWithGroups; handleSignOut: () => void }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [name, setName] = useState(user.name.split(' ')[0] ?? '');
  const [surname, setSurname] = useState(user.name.split(' ')[1] ?? '');
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(user);
  const [loadingSave, setLoadingSave] = useState(false);
  const dialogs = useDialogs();

  const updateUserMutation = useUpdateUserProfile(user);

  const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      e.currentTarget.value = '';
      return;
    }
    const imageDataUrl = await readFile(f);
    e.target.files = null;
    e.target.value = '';
    const result = await dialogs.open(CropImageDialog, { imageUrl: imageDataUrl as string });
    setCroppedImage(result);
  };

  const openPicker = () => inputRef.current?.click();

  const submit = async () => {
    try {
      setLoadingSave(true);
      const fullName = `${name} ${surname}`;
      if (fullName.length < 6 || displayName.length < 4) {
        toast.warning('Name oder Anzeigename müssen 6 bzw. 4 Zeichen lang sein');
        return;
      }
      if (fullName.split(' ').length < 2) {
        toast.warning('Du musst dein vollen Name, mit Vor und Nachname angeben');
        return;
      }
      await updateUserMutation.mutateAsync(
        { displayName, fullName, croppedImage, avatarUrl: currentUser.avatarUrl },
        {
          onSuccess: (data) => {
            toast.success('Successfully updated your profile!');
            setCurrentUser({ ...currentUser, avatarUrl: data?.avatarUrl ?? null });
            setCroppedImage(null);
          },
          onError: (error) => {
            toast.error('There was an error while updating your profile! ' + error.message);
          },
        }
      );
    } finally {
      setLoadingSave(false);
    }
  };

  return (
    <>
      <CardContent className="px-4">
        <div className='space-y-6 lg:col-span-2'>
          <div className='mb-6 w-full space-y-2'>
            <Label className="mb-4">Profilbild</Label>
            <div className='flex items-center gap-4'>
              <div
                role='button'
                tabIndex={0}
                aria-label='Upload your avatar'
                onClick={openPicker}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openPicker();
                  }
                }}
                className='flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed hover:opacity-95'
              >
                {croppedImage ? (
                  <img src={croppedImage} alt='avatar preview' className='h-full w-full object-cover' />
                ) : currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="avatar logo" className='h-full w-full object-cover' />
                ) : (
                  <Image />
                )}
              </div>
              <div className='flex items-center gap-2'>
                <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={onSelect} />
                <Button type='button' variant='outline' onClick={openPicker} className='flex items-center gap-2'>
                  <UploadCloud />
                  Upload avatar
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  hidden={!croppedImage && !currentUser.avatarUrl}
                  onClick={() => {
                    if (croppedImage) {
                      setCroppedImage(null);
                    } else {
                      setCurrentUser({ ...currentUser, avatarUrl: null });
                    }
                  }}
                  className='text-destructive'
                >
                  <Trash />
                </Button>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
            <div className='flex flex-col items-start gap-2'>
              <Label htmlFor='multi-step-personal-info-display-name'>Anzeigename</Label>
              <Input id='multi-step-personal-info-display-name' value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className='flex flex-col items-start gap-2'>
              <Label htmlFor='multi-step-personal-info-first-name'>First Name</Label>
              <Input id='multi-step-personal-info-first-name' placeholder='John' value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className='flex flex-col items-start gap-2'>
              <Label htmlFor='multi-step-personal-info-last-name'>Last Name</Label>
              <Input id='multi-step-personal-info-last-name' placeholder='Doe' value={surname} onChange={(e) => setSurname(e.target.value)} />
            </div>
          </div>
          <div className='flex justify-end'>
            <Button type='submit' className='max-sm:w-full' disabled={loadingSave} onClick={submit}>
              {loadingSave && <Spinner />}
              Änderungen Speichern
            </Button>
          </div>
          <Separator />
          <Button variant={"destructive"} className='max-sm:w-full' onClick={handleSignOut}>
            Logout
          </Button>
        </div>
      </CardContent>
    </>
  );
};
