import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserWithGroups } from '../../types/supabaseTypes';

import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Item, ItemActions, ItemContent, ItemMedia } from '@/components/ui/item';
import { useDialogs } from '@/contexts/DialogsProvider';
import { useAllUsersAsAdmin, useUpdateUserMutation } from '@/tanstack/admin';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import EditUserDialog from './dialogs/EditUserDialog';

const AdminUserList = () => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const [searchString, setSearchString] = useState('');

  const { data: users = [], isLoading, refetch } = useAllUsersAsAdmin();
  const updateUserMutation = useUpdateUserMutation();


  return <div className="min-h-screen bg-background text-foreground">
    <AppBar
      className='!border-b !shadow-sm'
      showSearch
      searchValue={searchString}
      onSearchChange={setSearchString}
      user={user}
    />
    <main className='flex-1 size-full pb-safe-bottom'>
      <PullToRefresh onRefresh={() => refetch()}>

        <div>
          {
            users &&
            users
              .filter(
                (x: UserWithGroups) =>
                  searchString === '' ||
                  x.displayName?.toLowerCase().includes(searchString.toLowerCase()) ||
                  x.email?.toLowerCase().includes(searchString.toLowerCase()) ||
                  x.name?.toLowerCase().includes(searchString.toLowerCase())
              )
              .map((user) => <Item key={user.id} onClick={async () => {
                const result = await dialogs.open(EditUserDialog, { user: user });
                if (result) {
                  updateUserMutation.mutate({ update: result }, {
                    onSuccess: () => toast.success("Benutzer erfolgreich aktualisiert!"),
                    onError: (error) => toast.error("Beim Aktualisieren des Benutzers ist ein Fehler aufgetreten. " + error.message)
                  });
                }
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
  </div>

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
