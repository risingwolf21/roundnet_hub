import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserWithGroups } from '../../types/supabaseTypes';

import { SegmentedControl } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemMedia } from '@/components/ui/item';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useIsWide } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { PushDevice } from '@/repository/AdminUsersRepository';
import { useAdminPushDevices, useAllUsersAsAdmin, useUpdateUserMutation } from '@/tanstack/admin';
import { Bell, BellOff, ChevronRight, UserPen, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import EditUserDialog, { EditUserForm, UserEdited } from './dialogs/EditUserDialog';

type UserView = 'all' | 'noGroup' | 'noPush';

const AdminUserList = () => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const [searchString, setSearchString] = useState('');
  const [view, setView] = useState<UserView>('all');
  // Wide screens edit the user in a panel next to the list instead of a full-screen dialog.
  const isWide = useIsWide();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: users = [], isLoading, refetch } = useAllUsersAsAdmin();
  const { data: pushDevices, refetch: refetchPushDevices } = useAdminPushDevices();
  const updateUserMutation = useUpdateUserMutation();

  // Without push data (still loading or failed) we show no push badges and no "no push" view.
  const devicesByUser = pushDevices && pushDevices.reduce((map, device) => {
    map.set(device.user, [...(map.get(device.user) ?? []), device]);
    return map;
  }, new Map<string, PushDevice[]>());
  const noGroupUsers = users.filter((x) => x.groups.length === 0);
  const noPushUsers = devicesByUser ? users.filter((x) => !devicesByUser.has(x.id)) : [];
  const visibleUsers = (view === 'noGroup' ? noGroupUsers : view === 'noPush' ? noPushUsers : users).filter(
    (x: UserWithGroups) =>
      searchString === '' ||
      x.displayName?.toLowerCase().includes(searchString.toLowerCase()) ||
      x.email?.toLowerCase().includes(searchString.toLowerCase()) ||
      x.name?.toLowerCase().includes(searchString.toLowerCase())
  );
  const selectedUser = isWide ? users.find((x) => x.id === selectedUserId) : undefined;

  const save = (update: UserEdited) => updateUserMutation.mutate({ update }, {
    onSuccess: () => toast.success(t('admin.users.updateSuccess')),
    onError: (error) => toast.error(t('admin.users.updateError', { error: error.message }))
  });


  const list = <div className="min-h-screen bg-background text-foreground">
    <AppBar
      className='!border-b !shadow-sm'
      showSearch
      searchValue={searchString}
      onSearchChange={setSearchString}
      user={user}
    />
    <main className='flex-1 size-full pb-safe-bottom'>
      <div className="px-4 pt-3">
        <SegmentedControl<UserView>
          ariaLabel={t('admin.users.viewLabel')}
          value={view}
          onChange={setView}
          options={[
            { value: 'all', label: t('admin.users.viewAll') },
            { value: 'noGroup', label: t('admin.users.viewNoGroup'), count: noGroupUsers.length },
            ...(devicesByUser ? [{ value: 'noPush' as const, label: t('admin.users.viewNoPush'), count: noPushUsers.length }] : []),
          ]}
        />
      </div>
      <PullToRefresh onRefresh={() => Promise.all([refetch(), refetchPushDevices()])}>

        <div>
          {!isLoading && visibleUsers.length === 0 && (
            <Empty className="mt-8">
              <EmptyHeader>
                <EmptyTitle>{t('admin.users.viewEmpty')}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
          {isWide ? (
            <div className="p-4">
              <Table className="overflow-hidden rounded-xl border bg-card">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-4">{t('admin.users.columnName')}</TableHead>
                    <TableHead>{t('navigation.groups')}</TableHead>
                    <TableHead>{t('admin.users.columnActivity')}</TableHead>
                    {devicesByUser && <TableHead>{t('admin.users.pushSection')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleUsers.map((user) => {
                    const selected = user.id === selectedUser?.id;
                    return (
                      <TableRow key={user.id} aria-selected={selected} onClick={() => setSelectedUserId(user.id)}
                        className={cn('cursor-pointer', selected && 'bg-primary/5 shadow-[inset_4px_0_0_var(--primary)] hover:bg-primary/5')}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatarUrl || undefined} alt={user.name || undefined} />
                              <AvatarFallback>{user.name ? user.name[0] : 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              {/* The button makes the row reachable by keyboard; the row handles the click. */}
                              <button type="button" className="block max-w-64 truncate text-left font-medium">{user.name}</button>
                              <div className="max-w-64 truncate text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-80 flex-wrap gap-1">
                            {user.groups.length === 0
                              ? <Badge variant="warning"><Users />{t('admin.users.noGroup')}</Badge>
                              : user.groups.map((group) => (
                                <Badge key={group.id} variant="outline">
                                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                                  {group.name}
                                </Badge>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.last_seen_at && t('user.lastActive', { date: new Date(user.last_seen_at) })}
                        </TableCell>
                        {devicesByUser && (
                          <TableCell>
                            {devicesByUser.has(user.id)
                              ? <Badge variant="secondary"><Bell />{t('admin.users.pushDevices', { count: devicesByUser.get(user.id)!.length })}</Badge>
                              : <Badge variant="warning"><BellOff />{t('admin.users.noPush')}</Badge>}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) :
            visibleUsers
              .map((user) => <Item key={user.id} onClick={async () => {
                const result = await dialogs.open(EditUserDialog, { user: user, pushDevices: devicesByUser && (devicesByUser.get(user.id) ?? []) });
                if (result) save(result);
              }}>
                <ItemMedia>
                  <Avatar className={"mr-2"}>
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.name || undefined} />
                    <AvatarFallback>{user.name ? user.name[0] : 'U'}</AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent>
                  <div>
                    <div>{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                    {user.last_seen_at && (
                      <div className="text-xs text-muted-foreground">
                        {t('user.lastActive', { date: new Date(user.last_seen_at) })}
                      </div>
                    )}
                    {(devicesByUser || user.groups.length === 0) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {devicesByUser && (devicesByUser.has(user.id)
                          ? <Badge variant="secondary"><Bell />{t('admin.users.pushDevices', { count: devicesByUser.get(user.id)!.length })}</Badge>
                          : <Badge variant="warning"><BellOff />{t('admin.users.noPush')}</Badge>)}
                        {user.groups.length === 0 && <Badge variant="warning"><Users />{t('admin.users.noGroup')}</Badge>}
                      </div>
                    )}
                  </div>
                </ItemContent>
                <ItemActions>
                  <ChevronRight />
                </ItemActions>
              </Item>)
          }
        </div>

      </PullToRefresh>
    </main>
  </div>;

  if (!isWide) return list;

  // Wide screens: the table takes the room, the selected user is edited in a panel on the right.
  return <div className="flex h-svh">
    <div className="min-w-0 flex-1 overflow-y-auto">{list}</div>
    <aside className="flex w-[26rem] shrink-0 flex-col overflow-y-auto border-l bg-muted/30">{selectedUser ? (
      <div>
        <AppBar className='!border-b !shadow-sm' title={t('admin.users.edit')} primaryAction={null} />
        <div className="mx-auto w-full max-w-2xl p-4 pb-safe-bottom">
          <EditUserForm key={selectedUser.id} user={selectedUser} pushDevices={devicesByUser && (devicesByUser.get(selectedUser.id) ?? [])} onSave={save} />
        </div>
      </div>
    ) : (
      <Empty className="m-auto">
        <EmptyHeader>
          <EmptyMedia variant="icon"><UserPen /></EmptyMedia>
          <EmptyTitle>{t('admin.users.noneSelected')}</EmptyTitle>
          <EmptyDescription>{t('admin.users.noneSelectedDescription')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )}</aside>
  </div>;

  // return (
  //   <Layout
  //     appBarContent={
  //       <Search sx={{ flexGrow: 1 }}>
  //         <SearchIconWrapper>
  //           <SearchIcon />
  //         </SearchIconWrapper>
  //         <div>
  //           <StyledInputBase
  //             sx={{ width: '100% !important' }}
  //             placeholder="Suche nach einem Nutzer"
  //             inputProps={{ 'aria-label': 'search' }}
  //             value={searchString}
  //             onChange={(e: { target: { value: React.SetStateAction<string> } }) => setSearchString(e.target.value)}
  //           />
  //         </div>
  //       </Search>
  //     }
  //   >
  //     {isLoading && <LinearProgress style={{ position: 'fixed', left: 0, right: 0, top: 56 }} />}

  //     <List sx={{ width: '100%', pb: 'calc(56px + env(safe-area-inset-bottom))' }}>
  //       {users &&
  //         users
  //           .filter(
  //             (x: UserWithGroups) =>
  //               searchString === '' ||
  //               x.displayName?.toLowerCase().includes(searchString.toLowerCase()) ||
  //               x.email?.toLowerCase().includes(searchString.toLowerCase()) ||
  //               x.name?.toLowerCase().includes(searchString.toLowerCase())
  //           )
  //           .map((user) => <AdminUserItem key={'user' + user.id} user={user} onEditClick={() => editUser(user)} />)}
  //     </List>
  //     {currentUser && (
  //       <EditUserDialog
  //         open={editUserOpen}
  //         user={currentUser}
  //         handleClose={() => setEditUserOpen(false)}
  //         deleteUser={deleteUser}
  //         onUserEditFinished={onUserEditFinished}
  //       />
  //     )}
  //   </Layout>
  // );
};

export default AdminUserList;
