import { PersonOff } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { Badge, Chip, InputAdornment, LinearProgress, List, TextFieldProps } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchAdminUsersAsync } from './slices/adminUserSlice';
import { RootState, useAppDispatch } from '../../redux/store';
import { UserWithGroupsAndRoles } from '../../types/supabaseTypes';
import { AlertMessage, AlertSnackbar } from '../../components/AlertSnackbar';
import { Error } from '../../components/Error';
import EditUserDialog, { UserEdited } from './dialogs/EditUserDialog';
import { captureException } from '@sentry/react';
import { AdminUsersRepository } from '../../repository/AdminUsersRepository';
import { AdminUserItem } from './components/AdminUserItem';
import Layout from '../../components/Layout';
import TextField from '@mui/material/TextField';
import { styled } from '@mui/system';

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

const AdminUserList = () => {
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserWithGroupsAndRoles | null>();
  const [searchString, setSearchString] = useState('');
  const [showNotVerifiedUsers, setShowNotVerifiedUsers] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

  useEffect(() => {
    dispatch(fetchAdminUsersAsync());
  }, [dispatch]);

  const { users, loading, error } = useSelector((state: RootState) => state.adminUsers);

  const editUser = (user: UserWithGroupsAndRoles) => {
    setCurrentUser(user);
    setEditUserOpen(true);
  };

  const deleteUser = async (user: User) => {
    AdminUsersRepository.deactivateUser(user)
      .then(() => {
        setAlertInfo({ message: `Successfully deactivated user ${user.email}`, severity: 'success' });
      })
      .catch((error) => {
        captureException(error);
        setAlertInfo({ message: error, severity: 'error' });
      });
  };

  const onUserEditFinished = async (result: UserEdited) => {
    await AdminUsersRepository.updateUser(result);
    setEditUserOpen(false);
    dispatch(fetchAdminUsersAsync());
  };

  if (error) return <Error message={error} />;

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
      {loading && <LinearProgress style={{ position: 'fixed', left: 0, right: 0, top: 56 }} />}

      <Badge
        sx={{ m: 2 }}
        color="info"
        badgeContent={
          users
            .filter((x) => searchString === '' || x.displayName?.toLowerCase().includes(searchString.toLowerCase()))
            .filter((x) => !x.verified).length
        }
      >
        <Chip
          icon={<PersonOff aria-hidden={'false'} />}
          label="Not verified"
          onClick={() => setShowNotVerifiedUsers(!showNotVerifiedUsers)}
          variant={showNotVerifiedUsers ? 'filled' : 'outlined'}
        />
      </Badge>

      <List sx={{ width: '100%', pb: 'calc(56px + env(safe-area-inset-bottom))' }}>
        {users &&
          users
            .filter(
              (x: UserWithGroupsAndRoles) =>
                searchString === '' || x.displayName?.toLowerCase().includes(searchString.toLowerCase())
            )
            .filter((x) => (showNotVerifiedUsers && !x.verified) || (!showNotVerifiedUsers && x.verified))
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
      <AlertSnackbar alertInfo={alertInfo} autoHideDuration={1500} close={() => setAlertInfo(null)} />
    </Layout>
  );
};

export default AdminUserList;
