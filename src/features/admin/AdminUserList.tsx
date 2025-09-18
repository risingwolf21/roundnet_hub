import SearchIcon from '@mui/icons-material/Search';
import { InputAdornment, LinearProgress, List, TextFieldProps } from '@mui/material';
import TextField from '@mui/material/TextField';
import { styled } from '@mui/system';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNotifications } from '@toolpad/core/useNotifications';
import React, { useState } from 'react';
import { queryClient } from 'src/lib/queryClient';
import Layout from '../../components/layout/Layout';
import { AdminUsersRepository } from '../../repository/AdminUsersRepository';
import { UserWithGroups } from '../../types/supabaseTypes';
import { AdminUserItem } from './components/AdminUserItem';
import EditUserDialog, { UserEdited } from './dialogs/EditUserDialog';

const SearchBar = styled(TextField)<TextFieldProps>(({ theme }) => ({
  marginLeft: 16,
  marginRight: 16,
  marginTop: 16,
  width: 'calc(100% - 32px)',
  '& .MuiInputBase-root': {
    borderRadius: 28,
    border: 'none',
    height: 56,
    backgroundColor: 'rgba(202,196,208,0.4)',
    '&:before, :after, :hover:not(.Mui-disabled):before': {
      borderBottom: 0,
    },
    '& .MuiInputAdornment-root': {
      marginLeft: 16,
      marginRight: 16,
    },
  },
  '& .Mui-focused': {
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
  },
}));

export const useAllUsersAsAdmin = () => useQuery<UserWithGroups[]>({
  queryKey: ["users", "admin"],
  queryFn: () => AdminUsersRepository.fetchAllUsersWithGroups()
});

export const useUpdateUserMutation = () => useMutation({
  mutationFn: ({ update }: { update: UserEdited }) => {
    return AdminUsersRepository.updateUser(update)
  },
  onMutate: async ({ update }) => {
    await queryClient.cancelQueries({ queryKey: ["users", "admin"] });

    const previousUsers = queryClient.getQueryData<UserWithGroups[]>(["users", "admin"]);

    if (previousUsers) {
      const newUsers = previousUsers.map(x => {
        if (x.userId === update.userId) {
          return {
            ...x,
            displayName: update.displayName,
            verified: update.verified,
            role: update.role
          }
        }
        return x
      })
      queryClient.setQueryData(["events", "admin"], newUsers);
    }

    return { previousUsers }
  },
  onError: (err, _vars, context) => {
    if (context?.previousUsers) {
      queryClient.setQueryData(["users", "admin"], context.previousUsers);
    }
  },
  onSettled: (data, error, variables, context) => {
    queryClient.invalidateQueries({ queryKey: ["users", "admin"] });
  },
})

const AdminUserList = () => {
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserWithGroups | null>();
  const [searchString, setSearchString] = useState('');
  const notifications = useNotifications();

  const { data: users = [], isLoading } = useAllUsersAsAdmin();
  const updateUserMutation = useUpdateUserMutation();

  const editUser = (user: UserWithGroups) => {
    setCurrentUser(user);
    setEditUserOpen(true);
  };

  const deleteUser = async (user: User) => {
    AdminUsersRepository.deactivateUser(user)
      .then(() => {
        notifications.show(`Successfully deactivated user ${user.email}`, { severity: 'success' });
      })
      .catch((error) => {
        captureException(error);
        notifications.show(error, { severity: 'error' });
      });
  };

  const onUserEditFinished = async (result: UserEdited) => {
    updateUserMutation.mutate({ update: result })
    setEditUserOpen(false);
  };

  return (
    <Layout>
      <SearchBar
        variant={'standard'}
        placeholder={'Suche'}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
        onChange={(e) => setSearchString(e.target.value)}
        value={searchString}
      />
      {isLoading && <LinearProgress style={{ position: 'fixed', left: 0, right: 0, top: 56 }} />}

      <List sx={{ width: '100%', pb: 'calc(56px + env(safe-area-inset-bottom))' }}>
        {users &&
          users
            .filter(
              (x: UserWithGroups) =>
                searchString === '' || x.displayName?.toLowerCase().includes(searchString.toLowerCase())
            )
            .map((user, index) => (
              <AdminUserItem key={'user' + index} user={user} onEditClick={() => editUser(user)} />
            ))}
      </List>
      {currentUser && (
        <EditUserDialog
          open={editUserOpen}
          user={currentUser}
          handleClose={() => setEditUserOpen(false)}
          deleteUser={deleteUser}
          onUserEditFinished={onUserEditFinished}
        />
      )}
    </Layout>
  );
};

export default AdminUserList;
