import { useState } from 'react';

import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useDirectUserGrants, useGrantGroupPermissions, useGrantUserPermissions, useGroupFeatures, useGroupPermissions, useRevokeGroupPermissions, useRevokeUserPermissions, useUserFeatures, useUserPermissions } from '@/tanstack/grants';
import { useGroups } from '@/tanstack/groups';
import { ChevronRight, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import { GrantsEditorDialog, GroupResult } from './GrantsEditorDialog';

const GroupTab = ({ searchValue }: { searchValue: string }) => {
  const { t } = useTranslation();
  const { data = [], refetch } = useGroups();
  const dialogs = useDialogs();

  const grant = useGrantGroupPermissions();
  const revoke = useRevokeGroupPermissions();

  const updateGrantsWith = (result: GroupResult, group: Group) => {
    grant.mutate(
      {
        group: group.id,
        perms: result.grantPerm,
        feats: result.grantFeat,
      },
      {
        onError: () =>
          toast.error(t('grants.updateError')),
        // onSuccess, not onSettled: a failed save must not also report success.
        onSuccess: () =>
          toast.success(t('grants.updateSuccess')),
      }
    );
    revoke.mutate(
      {
        group: group.id,
        perms: result.revokePerm,
        feats: result.revokeFeat,
      },
      {
        onError: () =>
          toast.error(t('grants.updateError')),
        // onSuccess, not onSettled: a failed save must not also report success.
        onSuccess: () =>
          toast.success(t('grants.updateSuccess')),
      }
    );
  };

  return <TabsContent value="groups" className="m-0">
    <PullToRefresh onRefresh={refetch}>
      <div className='flex flex-col gap-2 px-2'>
        {
          data
            .filter((x) => searchValue === '' || x.name.toLowerCase().includes(searchValue.toLowerCase()))
            .map(group => (
              <Item variant={"outline"} key={group.id} onClick={async () => {
                const result = await dialogs.open(GrantsEditorDialog, {
                  title: t('groups.edit'),
                  id: group.id,
                  currentPermissions: useGroupPermissions,
                  currentFeatures: useGroupFeatures,
                });
                if (result) {
                  updateGrantsWith(result, group);
                }
              }}>
                <ItemContent>
                  <ItemTitle className='truncate'>{group.name}</ItemTitle>
                  <ItemDescription className='truncate'>{group.description}</ItemDescription>
                </ItemContent>
              </Item>
            ))
        }
      </div>
    </PullToRefresh>
  </TabsContent>
}

const UserTab = ({ searchValue }: { searchValue: string }) => {

  const { t } = useTranslation();
  const { data = [], refetch } = useDirectUserGrants();
  const dialogs = useDialogs();

  const grant = useGrantUserPermissions();
  const revoke = useRevokeUserPermissions();

  const updateGrantsWith = (result: GroupResult, user: User) => {
    grant.mutate(
      {
        user: user.id,
        perms: result.grantPerm,
        feats: result.grantFeat,
      },
      {
        onError: () =>
          toast.error(t('grants.updateError')),
        // onSuccess, not onSettled: a failed save must not also report success.
        onSuccess: () =>
          toast.success(t('grants.updateSuccess')),
      }
    );
    revoke.mutate(
      {
        user: user.id,
        perms: result.revokePerm,
        feats: result.revokeFeat,
      },
      {
        onError: () =>
          toast.error(t('grants.updateError')),
        // onSuccess, not onSettled: a failed save must not also report success.
        onSuccess: () =>
          toast.success(t('grants.updateSuccess')),
      }
    );
  };

  return <TabsContent value="user" className="m-0">
    <PullToRefresh onRefresh={refetch}>
      <div className='flex flex-col gap-2 px-2'>
        {
          data
            .filter((x) => searchValue === '' || x.name.toLowerCase().includes(searchValue.toLowerCase()))
            .map(user => (
              <Item variant={"outline"} key={user.id} onClick={async () => {
                const result = await dialogs.open(GrantsEditorDialog, {
                  title: t('grants.editUser', { name: user.name }),
                  id: user.id,
                  currentPermissions: useUserPermissions,
                  currentFeatures: useUserFeatures,
                });
                if (result) {
                  updateGrantsWith(result, user);
                }
              }}>
                <ItemMedia>
                  <Avatar className={"mr-2"}>
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.name || undefined} />
                    <AvatarFallback>{user.name ? user.name[0] : 'U'}</AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className='truncate'>{user.name}</ItemTitle>
                  <ItemDescription className='truncate'>{user.email}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronRight />
                </ItemActions>
              </Item>
            ))
        }
      </div>
      <div
        className="fixed right-6 z-50"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-primary text-primary-foreground transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-md"
          onClick={async () => {
            const userResult = await dialogs.selectSingleUser(data.map(x => x.id));

            if (!userResult) return;

            const result = await dialogs.open(GrantsEditorDialog, {
              title: t('grants.editUser', { name: userResult.name }),
              id: userResult.id,
              currentPermissions: useUserPermissions,
              currentFeatures: useUserFeatures,
            });
            if (result) {
              updateGrantsWith(result, userResult);
            }
          }}>
          <Plus className="size-6" />
        </Button>
      </div>
    </PullToRefresh>
  </TabsContent>
}

const GrantsManager = () => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState('');
  const { user } = useGrants();

  return <div>
    <AppBar
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      showSearch
      user={user}
    />
    <main className='flex-1 size-full pb-safe-bottom'>
      <Tabs defaultValue={"groups"} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white border !h-12 rounded-none shadow-sm border-b">
          <TabsTrigger value="groups" className="h-10 data-[state=active]:bg-primary/5">{t('navigation.groups')}</TabsTrigger>
          <TabsTrigger value="user" className="h-10 data-[state=active]:bg-primary/5">{t('browse.user')}</TabsTrigger>
        </TabsList>
        <div>
          <GroupTab searchValue={searchValue} />
          <UserTab searchValue={searchValue} />
        </div>
      </Tabs>
    </main>
  </div>
};

export default GrantsManager;
