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
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type PlayerPublic = NonNullable<ReturnType<typeof usePlayer>['data']>;

export const PlayerzoneTab = ({ user, player_data }: { user: UserWithGroups; player_data: PlayerPublic | null }) => {
  const { t } = useTranslation();
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
      toast.warning(t('profile.playerzone.invalidUrl'));
      return;
    }
    if (gender === "") {
      toast.error(t('profile.playerzone.noGender'));
      return;
    }
    // rg_index / rg_avatar_url are reset server-side when rg_link changes
    const updates: GamesTableUpdate<'players'> = {
      rg_link: rgLink ?? null,
      gender: gender,
    };
    updatePlayer.mutate(
      { updates },
      {
        onError: (error) => toast.error(t('profile.playerzone.updateError', { error: error.message })),
        onSuccess: () => toast.success(t('profile.playerzone.updateSuccess')),
      }
    );
  };

  const handleChangeProfilePicture = () => {
    setLoading(true);
    updateAvatarFromPlayer.mutate(
      { avatarUrl: player_data?.rg_avatar_url },
      {
        onSuccess: () => toast.success(t('profile.playerzone.avatarSuccess')),
        onError: (error) => toast.error(t('profile.playerzone.avatarError', { error: error.message })),
        onSettled: () => setLoading(false),
      }
    );
  };

  const genders = [
    { label: t('profile.playerzone.genderOpen'), value: "m" },
    { label: t('profile.playerzone.genderWomen'), value: "w" },
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
                  {t('profile.playerzone.useAsAvatar')}
                </Button>
              </div>
            </div>
            <div className='w-full space-y-4'>
              <div className='w-full space-y-1'>
                <Label className='leading-5' htmlFor='pzUrl'>
                  {t('profile.playerzone.urlLabel')}
                </Label>
                <div className='relative'>
                  <Input
                    id='pzUrl'
                    type='text'
                    placeholder={t('profile.playerzone.urlPlaceholder')}
                    value={rgLink}
                    onChange={(e) => setRgLink(e.target.value)}
                  />
                </div>
              </div>
              <div className='w-full space-y-1'>
                <Label className='leading-5' htmlFor='gender'>
                  {t('profile.playerzone.gender')}
                </Label>
                <div className='relative'>
                  <Select items={genders} value={gender} onValueChange={(value) => value && setGender(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('profile.playerzone.genderPlaceholder')} />
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
              {t('profile.playerzone.saveChanges')}
            </Button>
          </div>
        </div>
        <Separator className="my-6" />
        {
          player_data !== null && (
            <div className="space-y-6">
              {player_data.rg_id !== null && (
                <Field orientation="horizontal" className="max-w-sm">
                  <FieldContent>
                    <FieldLabel htmlFor="rg-id">{player_data.rg_id}</FieldLabel>
                    <FieldDescription>{t('profile.playerzone.rgId')}</FieldDescription>
                  </FieldContent>
                </Field>
              )}
              {
                (player_data.rg_index !== null && player_data.rg_index > 0) && (
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="rg-index">{player_data.rg_index}</FieldLabel>
                      <FieldDescription>{t('profile.playerzone.rgIndex')}</FieldDescription>
                    </FieldContent>
                  </Field>
                )
              }
              {(player_data?.effective_rating_cached !== null && player_data?.effective_rating_cached > 0) && (
                <Field orientation={"horizontal"} className="flex !items-center">
                  <FieldContent>
                    <FieldLabel htmlFor="elo-trend">{player_data.effective_rating_cached.toFixed()}</FieldLabel>
                    <FieldDescription>{t('profile.playerzone.internalIndex')}</FieldDescription>
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
                  <FieldLabel htmlFor="switch-hide-rating">{t('profile.playerzone.hideIndex')}</FieldLabel>
                  <FieldDescription>
                    {t('profile.playerzone.hideIndexDescription')}
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
          )
        }
      </CardContent>
    </>
  );
};
