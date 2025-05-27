import { ArrowBack } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import {
  AppBar,
  Box,
  Button,
  Checkbox,
  Dialog,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
} from '@mui/material';
import { Search, SearchIconWrapper, StyledInputBase } from '../../../components/SearchBar';
import React, { useState } from 'react';
import { SlideUpTransition } from '../../../utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { DialogProps } from '@toolpad/core';

type SearchAndSelectUserDialogProps = {
  usersToFilter: string[];
};

const SearchAndSelectUserDialog = ({ payload: { usersToFilter }, onClose, open }: DialogProps<SearchAndSelectUserDialogProps, User[] | null>) => {
  const [selectedUsers, setSelectedUsers] = useState<User[]>(Array.from<User>([]));
  const [searchString, setSearchString] = useState<string>('');

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users', 'searchAndSelectDialog', ...usersToFilter],
    queryFn: async () => {
      const result = await supabase
        .schema("public")
        .from("user")
        .select("*")
        .not("userId", 'in', `(${usersToFilter.join(",")})`)
        .returns<User[]>()
        .throwOnError();

      return result.data ?? [];
    }
  });


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, user: User) => {
    if (selectedUsers.some((x: User) => x.userId === user.userId)) {
      setSelectedUsers(selectedUsers.filter((y) => y.userId !== user.userId));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)} TransitionComponent={SlideUpTransition}>
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
                      checked={selectedUsers.some((x: User) => x.userId === user.userId)}
                      onChange={(e) => handleChange(e, user)}
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
