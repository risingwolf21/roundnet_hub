import { lazy } from "react";
import { Button } from "@/components/ui/button";

const CropImageDialog = lazy(() => import('@/components/CropImageDialog'));
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
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const AccountTab = ({ user, handleSignOut }: { user: UserWithGroups; handleSignOut: () => void }) => {
  const { t } = useTranslation();
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
        toast.warning(t('profile.account.nameTooShort'));
        return;
      }
      if (fullName.split(' ').length < 2) {
        toast.warning(t('profile.account.nameIncomplete'));
        return;
      }
      await updateUserMutation.mutateAsync(
        { displayName, fullName, croppedImage, avatarUrl: currentUser.avatarUrl },
        {
          onSuccess: (data) => {
            toast.success(t('profile.account.updateSuccess'));
            setCurrentUser({ ...currentUser, avatarUrl: data?.avatarUrl ?? null });
            setCroppedImage(null);
          },
          onError: (error) => {
            toast.error(t('profile.account.updateError', { error: error.message }));
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
            <Label className="mb-4">{t('profile.account.avatar')}</Label>
            <div className='flex items-center gap-4'>
              <div
                role='button'
                tabIndex={0}
                aria-label={t('profile.account.uploadAvatar')}
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
                  {t('profile.account.uploadAvatar')}
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
              <Label htmlFor='multi-step-personal-info-display-name'>{t('profile.account.displayName')}</Label>
              <Input id='multi-step-personal-info-display-name' value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className='flex flex-col items-start gap-2'>
              <Label htmlFor='multi-step-personal-info-first-name'>{t('profile.account.firstName')}</Label>
              <Input id='multi-step-personal-info-first-name' placeholder={t('profile.account.firstNamePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className='flex flex-col items-start gap-2'>
              <Label htmlFor='multi-step-personal-info-last-name'>{t('profile.account.lastName')}</Label>
              <Input id='multi-step-personal-info-last-name' placeholder={t('profile.account.lastNamePlaceholder')} value={surname} onChange={(e) => setSurname(e.target.value)} />
            </div>
          </div>
          <div className='flex justify-end'>
            <Button type='submit' className='max-sm:w-full' disabled={loadingSave} onClick={submit}>
              {loadingSave && <Spinner />}
              {t('profile.account.saveChanges')}
            </Button>
          </div>
          <Separator />
          <Button variant={"destructive"} className='max-sm:w-full' onClick={handleSignOut}>
            {t('profile.account.logout')}
          </Button>
        </div>
      </CardContent>
    </>
  );
};
