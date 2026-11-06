import { DangerZone } from "@/components/DangerZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useDialogs } from "@/contexts/DialogsProvider";
import { useUpdateLanguage, useUpdateUserProfile } from "@/tanstack/user";
import { UserWithGroups } from "@/types/supabaseTypes";
import { readFile } from "@/utils";
import BlockedUsersList from '../BlockedUsersList';
import { LegalLinks } from '@/features/legal/LegalPage';
import { Camera, Image, LogOut, Trash } from "lucide-react";
import { lazy, ReactNode, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const CropImageDialog = lazy(() => import('@/components/CropImageDialog'));
const DeleteAccountDialog = lazy(() => import('../dialogs/DeleteAccountDialog'));

const LANGUAGES = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
];

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
    <h2 className="text-sm font-semibold">{title}</h2>
    {children}
  </section>
);

export const AccountTab = ({ user, handleSignOut }: { user: UserWithGroups; handleSignOut: () => void }) => {
  const { t, i18n } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [name, setName] = useState(user.name.split(' ')[0] ?? '');
  const [surname, setSurname] = useState(user.name.split(' ')[1] ?? '');
  const [language, setLanguage] = useState<'de' | 'en'>((i18n.resolvedLanguage ?? 'de') as 'de' | 'en');
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(user);
  const [loadingSave, setLoadingSave] = useState(false);
  const dialogs = useDialogs();

  const updateUserMutation = useUpdateUserProfile(user);
  const updateLanguage = useUpdateLanguage(user);

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

  const deleteAccount = async () => {
    const deleted = await dialogs.open(DeleteAccountDialog);
    if (!deleted) return;
    toast.success(t('profile.account.deleteAccountSuccess'));
    handleSignOut();
  };

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
      const previous = i18n.resolvedLanguage;
      i18n.changeLanguage(language);
      await updateLanguage.mutateAsync(language, { onError: () => i18n.changeLanguage(previous) });

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
    <div className="flex flex-col gap-3">
      <Section title={t('profile.account.sectionProfile')}>
        <div className='flex items-center gap-4'>
          <button
            type='button'
            aria-label={t('profile.account.uploadAvatar')}
            onClick={openPicker}
            className='relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed bg-muted'
          >
            {croppedImage ? (
              <img src={croppedImage} alt={t('profile.account.avatarPreview')} className='size-full object-cover' />
            ) : currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={t('profile.account.avatar')} className='size-full object-cover' />
            ) : (
              <Image className="text-muted-foreground" />
            )}
            <span className="absolute inset-x-0 bottom-0 flex justify-center bg-foreground/60 py-0.5 text-background">
              <Camera className="size-3.5" />
            </span>
          </button>
          <div className='flex items-center gap-2'>
            <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={onSelect} />
            <Button type='button' variant='outline' onClick={openPicker}>
              {t('profile.account.uploadAvatar')}
            </Button>
            {(croppedImage || currentUser.avatarUrl) && (
              <Button
                type='button'
                variant='ghost'
                size="icon-lg"
                aria-label={t('profile.account.removeAvatar')}
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
            )}
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div className='flex flex-col items-start gap-2 sm:col-span-2'>
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
          <div className='flex flex-col items-start gap-2 sm:col-span-2'>
            <Label htmlFor='multi-step-personal-info-language'>{t('profile.account.language')}</Label>
            {/* Languages are shown by their own name so everyone can find theirs. */}
            <Select
              id='multi-step-personal-info-language'
              items={LANGUAGES}
              value={language}
              onValueChange={(value) => value && setLanguage(value as 'de' | 'en')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {LANGUAGES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type='submit' className='max-sm:w-full sm:self-end' disabled={loadingSave} onClick={submit}>
          {loadingSave && <Spinner />}
          {t('profile.account.saveChanges')}
        </Button>
      </Section>

      <BlockedUsersList userId={user.id} />

      <Button variant="outline" className='max-sm:w-full' onClick={handleSignOut}>
        <LogOut />
        {t('profile.account.logout')}
      </Button>

      <LegalLinks className="py-2" />

      <DangerZone
        description={t('profile.account.dangerZoneDescription')}
        actionLabel={t('profile.account.deleteAccount')}
        onAction={deleteAccount}
      />
    </div>
  );
};
