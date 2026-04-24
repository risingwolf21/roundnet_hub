import pzLogo from '../images/pz_logo.svg';

import { DialogProps } from '@/contexts/DialogsProvider';
import { useProfile } from '@/tanstack/user';
import { Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogHeader } from './ui/dialog';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from './ui/item';

type ProfilePayload = {
  userId: string;
};

export const ProfileDialogShadcn = ({ payload: { userId }, onClose }: DialogProps<ProfilePayload, null>) => {

  const { data: profile } = useProfile(userId);

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose(null)}>
      <DialogContent variant={"fullscreen"}>
        <DialogHeader variant={"appbar"}>
          <DialogClose render={<Button variant={"ghost"} size={"icon-lg"}><X /></Button>} />
        </DialogHeader>
        <DialogBody>
          <div className='flex flex-col items-center'>
            <Avatar className={"size-30"}>
              <AvatarImage src={profile?.avatarUrl ?? undefined} />
              <AvatarFallback>{profile?.displayName ? profile.displayName[0] : 'U'}</AvatarFallback>
            </Avatar>
            <div className='text-2xl mt-4'>
              {profile?.displayName}
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4 mt-4'>
            {
              profile?.player?.effective_rating_cached && <Item variant={"outline"}>
                <ItemContent>
                  <ItemTitle>
                    {profile.player.effective_rating_cached.toFixed()}
                  </ItemTitle>
                  <ItemDescription>
                    Effektiver Index
                  </ItemDescription>
                </ItemContent>
              </Item>
            }
            {
              profile?.player?.matches_played && <Item variant={"outline"}>
                <ItemContent>
                  <ItemTitle>
                    {profile.player.matches_played.toFixed()}
                  </ItemTitle>
                  <ItemDescription>
                    Gespielte Matches
                  </ItemDescription>
                </ItemContent>
              </Item>
            }

            {
              profile?.player?.rg_id && <Item variant={"outline"}>
                <ItemMedia className='flex flex-row h-full align-center justify-center'>
                  <img src={pzLogo} alt={'pz logo'} width="20" height="20" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>
                    {profile.player.rg_id}
                  </ItemTitle>
                  <ItemDescription>
                    RG ID
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant={"outline"} size={"icon-lg"} onClick={() => {
                    navigator.clipboard.writeText(profile?.player?.rg_id ?? '');
                    toast.success('RG ID in die Zwischenablage kopiert');
                  }}>
                    <Copy />
                  </Button>
                </ItemActions>
              </Item>
            }
            {
              profile?.player?.rg_index && <Item variant={"outline"}>
                <ItemMedia className='flex flex-row h-full align-center justify-center'>
                  <img src={pzLogo} alt={'pz logo'} width="20" height="20" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>
                    {profile.player.rg_index}
                  </ItemTitle>
                  <ItemDescription>
                    RG Index
                  </ItemDescription>

                </ItemContent>
                <ItemActions>
                  {
                    profile.player.pro_status && <Badge variant="outline" className='border-2 border-black bg-black text-white'>
                      Pro
                    </Badge>
                  }
                </ItemActions>
              </Item>
            }
          </div>

          <div className='flex flex-col gap-4 mt-4'>
            <div className="text-sm font-semibold ml-2">
              Challenges
            </div>
          </div>

        </DialogBody>
      </DialogContent>
    </Dialog >
  );
};