import { ChevronRight, Plus, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDialogs } from '@/contexts/DialogsProvider';
import {
  useDirectGrantSummary,
  useGrantGroupPermissions,
  useGrantUserPermissions,
  useGroupFeatures,
  useGroupGrantCounts,
  useGroupPermissions,
  useRevokeGroupPermissions,
  useRevokeUserPermissions,
  useUserFeatures,
  useUserPermissions,
} from '@/tanstack/grants';
import { useGroups } from '@/tanstack/groups';
import { useGrants } from '../auth/GrantsContext';
import { GrantsEditorDialog, GroupResult } from './GrantsEditorDialog';

const CountBadges = ({ perms, feats }: { perms: number; feats: number }) => {
  const { t } = useTranslation();
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      <Badge variant={perms ? 'default' : 'secondary'}>{t('grants.permissionCount', { count: perms })}</Badge>
      <Badge variant={feats ? 'default' : 'secondary'}>{t('grants.featureCount', { count: feats })}</Badge>
    </div>
  );
};

const matches = (search: string, ...values: (string | null | undefined)[]) =>
  !search || values.some((v) => v?.toLowerCase().includes(search.toLowerCase()));

const useSaveGrants = () => {
  const { t } = useTranslation();
  const grantGroup = useGrantGroupPermissions();
  const revokeGroup = useRevokeGroupPermissions();
  const grantUser = useGrantUserPermissions();
  const revokeUser = useRevokeUserPermissions();

  const run = async (jobs: Promise<unknown>[]) => {
    try {
      await Promise.all(jobs);
      toast.success(t('grants.updateSuccess'));
    } catch {
      toast.error(t('grants.updateError'));
    }
  };

  const hasGrants = (r: GroupResult) => r.grantPerm.length + r.grantFeat.length > 0;
  const hasRevokes = (r: GroupResult) => r.revokePerm.length + r.revokeFeat.length > 0;

  return {
    saveGroup: (r: GroupResult, group: string) =>
      run([
        ...(hasGrants(r) ? [grantGroup.mutateAsync({ group, perms: r.grantPerm, feats: r.grantFeat })] : []),
        ...(hasRevokes(r) ? [revokeGroup.mutateAsync({ group, perms: r.revokePerm, feats: r.revokeFeat })] : []),
      ]),
    saveUser: (r: GroupResult, user: string) =>
      run([
        ...(hasGrants(r) ? [grantUser.mutateAsync({ user, perms: r.grantPerm, feats: r.grantFeat })] : []),
        ...(hasRevokes(r) ? [revokeUser.mutateAsync({ user, perms: r.revokePerm, feats: r.revokeFeat })] : []),
      ]),
  };
};

const GroupTab = ({ search }: { search: string }) => {
  const { t } = useTranslation();
  const { data: groups = [], refetch } = useGroups();
  const { data: counts } = useGroupGrantCounts();
  const dialogs = useDialogs();
  const { saveGroup } = useSaveGrants();

  const edit = async (group: Group) => {
    const result = await dialogs.open(GrantsEditorDialog, {
      title: group.name,
      id: group.id,
      kind: 'group',
      currentPermissions: useGroupPermissions,
      currentFeatures: useGroupFeatures,
    });
    if (result) await saveGroup(result, group.id);
  };

  return (
    <TabsContent value="groups" className="m-0">
      <PullToRefresh onRefresh={refetch}>
        <div className="flex flex-col gap-2 px-2 pb-24">
          {groups
            .filter((g) => matches(search, g.name, g.description))
            .map((group) => {
              const c = counts?.get(group.id) ?? { perms: 0, feats: 0 };
              return (
                <Item variant="outline" key={group.id} onClick={() => edit(group)}>
                  <ItemMedia variant="icon">
                    <Users />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="truncate">{group.name}</ItemTitle>
                    {group.description && <ItemDescription className="truncate">{group.description}</ItemDescription>}
                    <CountBadges perms={c.perms} feats={c.feats} />
                  </ItemContent>
                  <ItemActions>
                    <ChevronRight />
                  </ItemActions>
                </Item>
              );
            })}
        </div>
      </PullToRefresh>
      <p className="px-4 pb-4 text-center text-xs text-muted-foreground">{t('grants.groupHint')}</p>
    </TabsContent>
  );
};

const UserTab = ({ search }: { search: string }) => {
  const { t } = useTranslation();
  const { data: users = [], refetch } = useDirectGrantSummary();
  const dialogs = useDialogs();
  const { saveUser } = useSaveGrants();

  const edit = async (user: User) => {
    const result = await dialogs.open(GrantsEditorDialog, {
      title: user.name ?? t('grants.editUser', { name: '' }),
      id: user.id,
      kind: 'user',
      currentPermissions: useUserPermissions,
      currentFeatures: useUserFeatures,
    });
    if (result) await saveUser(result, user.id);
  };

  return (
    <TabsContent value="user" className="m-0">
      <PullToRefresh onRefresh={refetch}>
        <div className="flex flex-col gap-2 px-2 pb-24">
          {users
            .filter((x) => matches(search, x.user.name, x.user.email))
            .map(({ user, perms, feats }) => (
              <Item variant="outline" key={user.id} onClick={() => edit(user)}>
                <ItemMedia>
                  <Avatar className="mr-2">
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.name || undefined} />
                    <AvatarFallback>{user.name ? user.name[0] : 'U'}</AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="truncate">{user.name}</ItemTitle>
                  <ItemDescription className="truncate">{user.email}</ItemDescription>
                  <CountBadges perms={perms} feats={feats} />
                </ItemContent>
                <ItemActions>
                  <ChevronRight />
                </ItemActions>
              </Item>
            ))}
          {users.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <ShieldCheck className="size-8" />
              <p className="text-sm">{t('grants.noDirectUsers')}</p>
            </div>
          )}
        </div>
        <p className="px-4 pb-4 text-center text-xs text-muted-foreground">{t('grants.userHint')}</p>
        <div className="fixed right-6 z-50" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:shadow-md"
            onClick={async () => {
              const picked = await dialogs.selectSingleUser(users.map((x) => x.user.id));
              if (picked) await edit(picked);
            }}
          >
            <Plus className="size-6" />
          </Button>
        </div>
      </PullToRefresh>
    </TabsContent>
  );
};

const GrantsManager = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { user } = useGrants();

  return (
    <div>
      <AppBar searchValue={search} onSearchChange={setSearch} showSearch user={user} />
      <main className="pb-safe-bottom size-full flex-1">
        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="grid !h-12 w-full grid-cols-2 rounded-none border-b bg-white shadow-sm">
            <TabsTrigger value="groups" className="h-10 data-[state=active]:bg-primary/5">
              {t('navigation.groups')}
            </TabsTrigger>
            <TabsTrigger value="user" className="h-10 data-[state=active]:bg-primary/5">
              {t('browse.user')}
            </TabsTrigger>
          </TabsList>
          <p className="px-4 py-3 text-sm text-muted-foreground">{t('grants.intro')}</p>
          <GroupTab search={search} />
          <UserTab search={search} />
        </Tabs>
      </main>
    </div>
  );
};

export default GrantsManager;
