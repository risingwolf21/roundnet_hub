import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useEloHistory, usePlayer, useUpdateIndexHidden, useUpdatePlayer } from "@/tanstack/player_data";
import { useUpdateAvatarFromPlayerMutation } from "@/tanstack/user";
import { GamesTableUpdate, UserWithGroups } from "@/types/supabaseTypes";
import { addDays, isAfter } from "date-fns";
import { Image, MoveRight, TrendingDown, TrendingUp, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type PlayerPublic = NonNullable<ReturnType<typeof usePlayer>['data']>;

export const PlayerzoneTab = ({ user, player_data }: { user: UserWithGroups; player_data: PlayerPublic | null }) => {
  const { data: elo_history } = useEloHistory(user);

  const [rgLink, setRgLink] = useState(player_data?.rg_link ?? '');
  const [gender, setGender] = useState(player_data?.gender ?? '');
  const [loading, setLoading] = useState(false);

  const updateHideRatingMutation = useUpdateIndexHidden(user);
  const updatePlayer = useUpdatePlayer(user);
  const updateAvatarFromPlayer = useUpdateAvatarFromPlayerMutation(user);

  const elo_change_last_30_days = useMemo(() => {
    return (
      elo_history?.filter((x) => isAfter(x.created_at, addDays(new Date(), -30))).reduce((p, c) => p + c.delta, 0) ?? 0
    );
  }, [elo_history]);

  const onSafeRgLinkClick = async () => {
    if (!rgLink.startsWith('https://playerzone.roundnetgermany.de/players/') && rgLink !== '') {
      toast.warning('Bitte vergewissere dich, dass die URL stimmt. Kopiere die URL aus deinem Playerzone Profil.');
      return;
    }
    if (gender === "") {
      toast.error('Du musst ein Geschlecht auswählen, damit dein Profil korrekt angezeigt wird.');
      return;
    }
    const updates: GamesTableUpdate<'players'> = {
      rg_link: rgLink ?? null,
      rg_avatar_url: null,
      rg_index: null,
      gender: gender,
    };
    updatePlayer.mutate(
      { updates },
      {
        onError: (error) => toast.error('Playerzone Profil konnte nicht aktualisiert werden. ' + error.message),
        onSuccess: () => toast.success('Profil erfolgreich aktualisiert'),
      }
    );
  };

  const handleChangeProfilePicture = () => {
    setLoading(true);
    updateAvatarFromPlayer.mutate(
      { avatarUrl: player_data?.rg_avatar_url },
      {
        onSuccess: () => toast.success('Profilbild erfolgreich aktualisiert'),
        onError: (error) => toast.error('Fehler beim Laden des Profilbildes: ' + error.message),
        onSettled: () => setLoading(false),
      }
    );
  };

  const genders = [
    { label: "Open", value: "m" },
    { label: "Women", value: "w" },
  ];

  return (
    <>
      <CardContent>
        <div className='space-y-6 lg:col-span-2'>
          <div className='mb-6 w-full space-y-2'>
            <div className='flex items-center gap-4'>
              <div className='flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed hover:opacity-95'>
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
            <Button
              type='submit'
              className='max-sm:w-full'
              disabled={loading || (rgLink === player_data?.rg_link && gender === player_data?.gender)}
              onClick={onSafeRgLinkClick}
            >
              {loading && <Spinner />}
              Änderungen Speichern
            </Button>
          </div>
        </div>
        <Separator className="my-6" />
        <div className="space-y-6">
          {player_data?.rg_id && (
            <Field orientation="horizontal" className="max-w-sm">
              <FieldContent>
                <FieldLabel htmlFor="rg-id">{player_data.rg_id}</FieldLabel>
                <FieldDescription>Roundnet Germany ID</FieldDescription>
              </FieldContent>
            </Field>
          )}
          {player_data?.rg_index && (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="rg-index">{player_data.rg_index}</FieldLabel>
                <FieldDescription>Roundnet Germany Index</FieldDescription>
              </FieldContent>
            </Field>
          )}
          {player_data?.effective_rating_cached && (
            <Field orientation={"horizontal"} className="flex !items-center">
              <FieldContent>
                <FieldLabel htmlFor="elo-trend">{player_data.effective_rating_cached.toFixed()}</FieldLabel>
                <FieldDescription>Interner Index</FieldDescription>
              </FieldContent>
              {elo_change_last_30_days > 0 ? (
                <TrendingUp className="text-success" />
              ) : elo_change_last_30_days < 0 ? (
                <TrendingDown className="text-error" />
              ) : (
                <MoveRight className="text-info" />
              )}
            </Field>
          )}
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="switch-hide-rating">Index verbergen?</FieldLabel>
              <FieldDescription>
                Dein Index wird anderen Spielern verborgen. Für die Berechnung wird er aber weiterhin verwendet
              </FieldDescription>
            </FieldContent>
            <Switch
              id="switch-hide-rating"
              disabled={updateHideRatingMutation.isPending}
              checked={player_data?.hide_rating ?? false}
              onCheckedChange={(e) => updateHideRatingMutation.mutate({ hide_rating: e })}
            />
          </Field>
        </div>
      </CardContent>
    </>
  );
};
