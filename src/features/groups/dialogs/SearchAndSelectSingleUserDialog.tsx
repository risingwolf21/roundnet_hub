import { supabase } from '@/lib/supabase';
import { ArrowBack } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { AppBar, Box, Dialog, IconButton, LinearProgress, List, ListItem, ListItemText, Toolbar } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { DialogProps } from '@toolpad/core';
import { useState } from 'react';
import { Search, SearchIconWrapper, StyledInputBase } from '../../../components/SearchBar';

type SearchAndSelectUserDialogProps = {
  usersToFilter: string[];
};

const SearchAndSelectUserDialog = ({
  payload: { usersToFilter },
  onClose,
  open,
}: DialogProps<SearchAndSelectUserDialogProps, User | null>) => {
  const [searchString, setSearchString] = useState<string>('');

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users', 'searchAndSelectDialog', ...usersToFilter],
    queryFn: async () => {
      const result = await supabase
        .schema('public')
        .from('user')
        .select('*')
        .not('userId', 'in', `(${usersToFilter.join(',')})`)
        .returns<User[]>()
        .throwOnError();

      return result.data ?? [];
    },
  });

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
          </Toolbar>
        </AppBar>
        {isLoading && <LinearProgress style={{ position: 'fixed', left: 0, right: 0, top: 56 }} />}

        <List sx={{ width: '100%' }}>
          {users &&
            users
              .filter((user) => user.displayName.toLowerCase().includes(searchString.toLowerCase()))
              .map((user: User, index: number) => (
                <ListItem key={index} onClick={() => onClose(user)}>
                  <ListItemText primary={user.name} />
                </ListItem>
              ))}
        </List>
      </Box>
    </Dialog>
  );
};

export default SearchAndSelectUserDialog;
