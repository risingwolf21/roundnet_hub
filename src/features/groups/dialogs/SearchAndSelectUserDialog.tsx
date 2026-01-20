import { supabase } from '@/lib/supabase';
import SearchIcon from '@mui/icons-material/Search';
import { useQuery } from '@tanstack/react-query';
import { DialogProps } from '@toolpad/core';
import { useState } from 'react';
import { Search, SearchIconWrapper, StyledInputBase } from '../../../components/SearchBar';

import ArrowBack from '@mui/icons-material/ArrowBack';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';

type SearchAndSelectUserDialogProps = {
  usersToFilter: string[];
};

const SearchAndSelectUserDialog = ({
  payload: { usersToFilter },
  onClose,
  open,
}: DialogProps<SearchAndSelectUserDialogProps, User[] | null>) => {
  const [selectedUsers, setSelectedUsers] = useState<User[]>(Array.from<User>([]));
  const [searchString, setSearchString] = useState<string>('');

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users', 'searchAndSelectDialog', ...usersToFilter],
    queryFn: async () => {
      const result = await supabase
        .schema('public')
        .from('user')
        .select('*')
        .not('id', 'in', `(${usersToFilter.join(',')})`)
        .returns<User[]>()
        .throwOnError();

      return result.data ?? [];
    },
  });

  const handleChange = (user: User) => {
    if (selectedUsers.some((x: User) => x.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((y) => y.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)}>
      <Box
        component="form"
        noValidate
        sx={{
          width: '100%',
          direction: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
          <Toolbar>
            <IconButton size="large" edge="start" color="inherit" onClick={() => onClose(null)}>
              <ArrowBack />
            </IconButton>
            <Search sx={{ marginRight: 2 }}>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <StyledInputBase
                placeholder="Search…"
                onChange={(e) => setSearchString(e.target.value)}
                inputProps={{ 'aria-label': 'search' }}
              />
            </Search>
            <Button autoFocus color="inherit" onClick={() => onClose(selectedUsers)}>
              Speichern
            </Button>
          </Toolbar>
        </AppBar>
        {isLoading && <LinearProgress style={{ position: 'fixed', left: 0, right: 0, top: 56 }} />}

        <List sx={{ width: '100%' }}>
          {users &&
            users
              .filter((user) => user.displayName.toLowerCase().includes(searchString.toLowerCase()))
              .map((user: User, index: number) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Checkbox
                      checked={selectedUsers.some((x: User) => x.id === user.id)}
                      onChange={() => handleChange(user)}
                    />
                  </ListItemIcon>
                  <ListItemText primary={user.name} />
                </ListItem>
              ))}
        </List>
      </Box>
    </Dialog>
  );
};

export default SearchAndSelectUserDialog;
