import CropImageDialog from "@/components/CropImageDialog";
import { AppBar } from "@/components/ui/appbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useFeatureFlags } from "@/contexts/FeatureToggleContext";
import { supabase } from "@/lib/supabase";
import { useNotificationTags, useNotificationTopics, useUpdateNotificationPreferences } from "@/tanstack/notifications";
import { useEloHistory, usePlayer, useUpdateIndexHidden, useUpdatePlayer } from "@/tanstack/player_data";
import { useUpdateUserProfile } from "@/tanstack/user";
import { GamesTableUpdate, UserWithGroups } from "@/types/supabaseTypes";
import { readFile } from "@/utils";
import { captureException } from "@sentry/react";
import { useDialogs } from "@toolpad/core";
import { addDays, isAfter } from "date-fns";
import { Bell, Calendar, Eye, EyeOff, FlaskConical, Image, MoveRight, RectangleEllipsis, Trash, TrendingDown, TrendingUp, UploadCloud, User, Volleyball } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";


type UserScreenProps = {
  user: UserWithGroups;
  handleSignOut: () => void;
};

const tabs = {
  account: {
    title: "Account",
    icon: <User />
  },
  changePassword: {
    title: "Passwort ändern",
    icon: <RectangleEllipsis />
  },
  playerzone: {
    title: "Playerzone Profil",
    icon: <Volleyball />
  },
  calendar: {
    title: "Kalender",
    icon: <Calendar />
  },
  notifications: {
    title: "Notifications",
    icon: <Bell />
  },
  testlab: {
    title: "Test-Labor",
    icon: <FlaskConical />
  }
}

type Tab = keyof typeof tabs

const CalendarCard = () => {
  return <>
    <CardTitle className="px-4 font-semibold">Kalender</CardTitle>
    <CardContent>
      <p className="mb-4">Abonniere deinen persönlichen Kalender, um immer über anstehende Turniere informiert zu sein.</p>
    </CardContent>
  </>
}

const Playerzone = ({ user }: { user: UserWithGroups }) => {
  const { data: player_data } = usePlayer(user);
  const { data: elo_history } = useEloHistory(user);

  const [rgLink, setRgLink] = useState(player_data?.rg_link ?? '');
  const [gender, setGender] = useState(player_data?.gender ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (player_data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
      setRgLink(player_data.rg_link ?? '');
      // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
      setGender(player_data.gender ?? '');
    }
  }, [player_data]);

  const updateHideRatingMutation = useUpdateIndexHidden(user);
  const updatePlayer = useUpdatePlayer(user);

  const elo_change_last_30_days = useMemo(() => {
    return (
      elo_history?.filter((x) => isAfter(x.created_at, addDays(new Date(), -30))).reduce((p, c) => p + c.delta, 0) ?? 0
    );
  }, [elo_history]);

  const onSafeRgLinkClick = async () => {
    if (!rgLink.startsWith('https://playerzone.roundnetgermany.de/players/') && rgLink !== '') {
      toast.warning(
        'Bitte vergewissere dich, dass die URL stimmt. Kopiere die URL aus deinem Playerzone Profil.');
      return;
    }
    if (gender === "") {
      toast.error(
        'Du musst ein Geschlecht auswählen, damit dein Profil korrekt angezeigt wird.');
      return;
    }
    const updates: GamesTableUpdate<'players'> = {
      rg_link: rgLink ?? null,
      rg_avatar_url: null,
      rg_index: null,
      gender: gender
    };

    updatePlayer.mutate(
      { updates },
      {
        onError: (error) =>
          toast.error('Playerzone Profil konnte nicht aktualisiert werden. ' + error.message),
        onSuccess: () => toast.success('Profil erfolgreich aktualisiert'),
      }
    );
  };

  const handleChangeProfilePicture = async () => {
    setLoading(false);
    const { data: list, error } = await supabase.storage.from('user').list(`${user.id}`);
    if (error || !list) {
      toast.error('Fehler beim Laden des Profilbildes');
      captureException(error);
      return;
    }
    const filesToRemove = list.map((x) => `${user.id}/${x.name}`);

    await supabase.storage.from('user').remove(filesToRemove);

    await supabase.from('user').update({ avatarUrl: player_data?.rg_avatar_url }).eq('id', user.id);
    setLoading(false);
  };

  const genders = [
    { label: "Open", value: "m" },
    { label: "Women", value: "w" }
  ]

  return <>
    <CardTitle className="px-4 font-semibold">Playerzone Profil</CardTitle>
    <CardContent>
      <div className='space-y-6 lg:col-span-2'>
        <div className='mb-6 w-full space-y-2'>
          <div className='flex items-center gap-4'>
            <div
              className='flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed hover:opacity-95'
            >
              {player_data?.rg_avatar_url ? (
                <img src={player_data.rg_avatar_url} alt='avatar preview' className='h-full w-full object-cover' />
              ) : (
                <Image />
              )}
            </div>

            <div className='flex items-center gap-2'>
              <Button type='button' variant='outline' disabled={!player_data?.rg_avatar_url} onClick={handleChangeProfilePicture} className='flex items-center gap-2'>
                <UploadCloud />
                Dieses Bild als Profilbild verwenden
              </Button>
            </div>
          </div>
          <div className='w-full space-y-4'>
            <div className='w-full space-y-1'>
              <Label className='leading-5' htmlFor='pzUrl'>
                Playerzone URL
              </Label>
              <div className='relative'>
                <Input
                  id='pzUrl'
                  type='text'
                  placeholder='https://playerzone.de/user/123'
                  value={rgLink}
                  onChange={(e) => setRgLink(e.target.value)}
                />
              </div>
            </div>

            <div className='w-full space-y-1'>
              <Label className='leading-5' htmlFor='gender'>
                Geschlecht
              </Label>
              <div className='relative'>
                <Select items={genders} value={gender} onValueChange={(value) => value && setGender(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Geschlecht auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {genders.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <div className='flex justify-end'>
          <Button type='submit' className='max-sm:w-full' disabled={loading || rgLink === player_data?.rg_link || gender === player_data?.gender} onClick={onSafeRgLinkClick}>
            {
              loading && <Spinner />
            }
            Änderungen Speichern
          </Button>
        </div>
      </div>
      <Separator className="my-6" />
      <div className="space-y-6">
        {
          player_data?.rg_id && <Field orientation="horizontal" className="max-w-sm">
            <FieldContent>
              <FieldLabel htmlFor="switch-focus-mode">
                {player_data.rg_id}
              </FieldLabel>
              <FieldDescription>
                Roundent Germany ID
              </FieldDescription>
            </FieldContent>
          </Field>
        }
        {
          player_data?.rg_index && <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="switch-focus-mode">
                {player_data.rg_index}
              </FieldLabel>
              <FieldDescription>
                Roundent Germany Index
              </FieldDescription>
            </FieldContent>
          </Field>
        }
        {
          player_data?.effective_rating_cached && <Field orientation={"horizontal"} className="flex !items-center">
            <FieldContent>
              <FieldLabel htmlFor="elo-trend">
                {player_data.effective_rating_cached.toFixed()}
              </FieldLabel>
              <FieldDescription>
                Interner Index
              </FieldDescription>
            </FieldContent>
            {
              elo_change_last_30_days > 0 ? (
                <TrendingUp className="text-success" />
              ) : elo_change_last_30_days < 0 ? (
                <TrendingDown className="text-error" />
              ) : (
                <MoveRight className="text-info" />
              )
            }
          </Field>
        }
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="switch-mode">
              Index verbergen?
            </FieldLabel>
            <FieldDescription>
              Dein Index wird anderen Spielern verborgen. Für die Berechnung wird er aber weiterhin verwendet
            </FieldDescription>
          </FieldContent>
          <Switch id="switch-mode"
            disabled={updateHideRatingMutation.isPending}
            checked={player_data?.hide_rating ?? false}
            onCheckedChange={(e) => updateHideRatingMutation.mutate({ hide_rating: e })} />
        </Field>
      </div>

    </CardContent>
  </>
}

const ChangePassword = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const password = data.get('password')?.toString();
    const password1 = data.get('confirmPassword')?.toString();

    if (password !== password1 || !password || !password1) {
      toast.error("Die Passwörter stimmen nicht überein.")
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      captureException(error);
      toast.error(error.message);
    }
    setLoading(false);
  }

  return <>
    <CardTitle className="px-4 font-semibold">Passwort ändern</CardTitle>
    <CardContent className="px-4">
      <form className='space-y-6' onSubmit={submit}>
        <div className='w-full space-y-1'>
          <Label className='leading-5' htmlFor='password'>
            New Password*
          </Label>
          <div className='relative'>
            <Input
              id='password'
              type={isPasswordVisible ? 'text' : 'password'}
              placeholder='••••••••••••••••'
              className='pr-9'
            />
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsPasswordVisible(prevState => !prevState)}
              className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
            >
              {isPasswordVisible ? <EyeOff /> : <Eye />}
              <span className='sr-only'>{isPasswordVisible ? 'Hide password' : 'Show password'}</span>
            </Button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className='w-full space-y-1'>
          <Label className='leading-5' htmlFor='confirmPassword'>
            Confirm Password*
          </Label>
          <div className='relative'>
            <Input
              id='confirmPassword'
              type={isConfirmPasswordVisible ? 'text' : 'password'}
              placeholder='••••••••••••••••'
              className='pr-9'
            />
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsConfirmPasswordVisible(prevState => !prevState)}
              className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
            >
              {isConfirmPasswordVisible ? <EyeOff /> : <Eye />}
              <span className='sr-only'>{isConfirmPasswordVisible ? 'Hide password' : 'Show password'}</span>
            </Button>
          </div>
        </div>

        <Button className='w-full' type='submit' disabled={loading}>
          {
            loading && <Spinner />
          }
          Neues Passwort setzen
        </Button>
      </form>
    </CardContent>
  </>
}

const Account = ({ user, handleSignOut }: { user: UserWithGroups, handleSignOut: () => void }) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [displayName, setDisplayName] = useState(user.displayName);
  const [name, setName] = useState(user.name.split(' ')[0] ?? '');
  const [surname, setSurname] = useState(user.name.split(' ')[1] ?? '');
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(user);
  const [loadingSave, setLoadingSave] = useState(false);
  const dialogs = useDialogs();

  const updateUserMutation = useUpdateUserProfile(user);

  const onSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]

    if (!f) return

    if (!f.type.startsWith('image/')) {
      e.currentTarget.value = ''
      return
    }

    const imageDataUrl = await readFile(f);
    e.target.files = null;
    e.target.value = '';

    const result = await dialogs.open(CropImageDialog, { selectedImage: imageDataUrl as string, isShadcn: true });
    setCroppedImage(result);
  }

  const openPicker = () => inputRef.current?.click()

  const submit = async () => {
    try {
      setLoadingSave(true);
      const fullName = `${name} ${surname}`;
      if (fullName.length < 6 || displayName.length < 4) {
        toast.warning('Name oder Anzeigename müssen 6 bzw. 4 Zeichen lang sein')
        return;
      }
      if (fullName.split(' ').length < 2) {
        toast.warning('Du musst dein vollen Name, mit Vor und Nachname angeben')
        return;
      }

      updateUserMutation.mutate({
        displayName,
        fullName,
        croppedImage,
        avatarUrl: currentUser.avatarUrl
      }, {
        onSuccess: (data) => {
          toast.success('Successfully updated your profile!');
          setCurrentUser({ ...currentUser, avatarUrl: data?.avatarUrl ?? null });
          setCroppedImage(null);
        },
        onError: (error) => {
          toast.error('There was an error while updating your profile! ' + error.message);
        }
      })
    } finally {
      setLoadingSave(false)
    }
  }

  return <>
    <CardTitle className="px-4 font-semibold">Account</CardTitle>
    <CardContent className="px-4">
      <div className='space-y-6 lg:col-span-2'>
        <div className='mb-6 w-full space-y-2'>
          <div className='flex items-center gap-4'>
            <div
              role='button'
              tabIndex={0}
              aria-label='Upload your avatar'
              onClick={openPicker}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openPicker()
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
                    setCroppedImage(null)
                  } else {
                    setCurrentUser({ ...currentUser, avatarUrl: null })
                  }
                }}
                className='text-destructive'>
                <Trash />
              </Button>
            </div>
          </div>
        </div>
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
          <div className='flex flex-col items-start gap-2'>
            <Label htmlFor='multi-step-personal-info-first-name'>Anzeigename</Label>
            <Input id='multi-step-personal-info-first-name' value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
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
            {
              loadingSave && <Spinner />
            }
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
}

const TestLabContent = () => {

  const { toggleFeature, hasFeature } = useFeatureFlags();
  const isShadcn = hasFeature("enableShadcnUI");

  return <>
    <CardTitle className="px-4 font-semibold">Testlabor</CardTitle>
    <CardContent className="px-0">
      <Field className="px-4 py-2" orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor="switch-share">shadcn/ui</FieldLabel>
          <FieldDescription>
            Enable the new shadcn user interface for the whole application
          </FieldDescription>
        </FieldContent>
        <Switch id="switch-share" checked={isShadcn} onCheckedChange={() => toggleFeature("enableShadcnUI")} />
      </Field>
    </CardContent>
  </>
}

const isNotificationSupported =
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

const Notifications = ({ user }: { user: UserWithGroups }) => {
  const { data: notificationTags = [], isLoading } = useNotificationTags(user);
  const { data: topics = [] } = useNotificationTopics();
  const updateNotificationPreferences = useUpdateNotificationPreferences(user);

  return <>
    <CardTitle className="px-4 font-semibold">Benachrichtigungen</CardTitle>
    <CardContent className="px-0">
      {
        (isNotificationSupported && Notification.permission === 'granted') && topics.flatMap((x, i) => [
          <Field key={x.topic} className="px-4 py-2" orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={`switch-${x.topic}`}>{x.topic}</FieldLabel>
              <FieldDescription>
                {x.description}
              </FieldDescription>
            </FieldContent>
            {
              isLoading ? <Spinner /> : <Switch id={`switch-${x.topic}`}
                checked={notificationTags.find((y) => y.topic === x.topic)?.enabled ?? true}
                onCheckedChange={(newValue) => {
                  updateNotificationPreferences.mutate({
                    topic: x.topic,
                    enabled: newValue,
                    scopeType: x.scope_type,
                  });
                }} />
            }
          </Field>,
          <Separator key={x.topic + "-separator"} {...(i === topics.length - 1 && { className: "hidden" })} />
        ])
      }
    </CardContent>
  </>
};

export const UserShadcn = ({ user, handleSignOut }: UserScreenProps) => {

  const [tab, setTab] = useState<Tab>("account")

  return <div className="flex flex-col h-full w-full">
    <AppBar
      title="Profil"
    />
    <div className="flex flex-col gap-y-4 p-4">
      <Card>
        <CardContent>
          <SidebarMenu className='gap-y-2'>
            {
              Object.entries(tabs).map(([key, item]) => <SidebarMenuItem key={key}>
                <SidebarMenuButton isActive={tab === key} onClick={() => setTab(key as Tab)}>
                  {item.icon}
                  <div className='text-lg'>{item.title}</div>
                </SidebarMenuButton>
              </SidebarMenuItem>)
            }
          </SidebarMenu>
        </CardContent>
      </Card>
      <Card>
        {
          tab === "account" && <Account user={user} handleSignOut={handleSignOut} />
        }
        {
          tab === "changePassword" && <ChangePassword />
        }
        {
          tab === "playerzone" && <Playerzone user={user} />
        }
        {
          tab === "calendar" && <CalendarCard />
        }
        {
          tab === "notifications" && <Notifications user={user} />
        }
        {
          tab === "testlab" && <TestLabContent />
        }
      </Card>
    </div>
  </div>
}