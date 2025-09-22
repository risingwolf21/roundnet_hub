import { supabase } from '@/lib/supabase';
import SearchIcon from '@mui/icons-material/Search';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, SearchIconWrapper, StyledInputBase } from '../../../components/SearchBar';
import { SlideUpTransition } from '../../../utils';

import ArrowBack from '@mui/icons-material/ArrowBack';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';

export const SearchUserDialog = ({
  onUserSelected,
  user,
  open,
  handleClose,
}: {
  onUserSelected: (user: User) => void;
  user: User;
  open: boolean;
  handleClose: () => void;
}) => {
  const [loading, setLoading] = useState(true);
  const [searchString, setSearchString] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    supabase
      .from('user')
      .select('*')
      .eq('verified', true)
      .returns<User[]>()
      .then((result) => {
        setUsers(result.data ?? []);
        setLoading(false);
      });
  }, [supabase]);

  return (
    <Dialog fullScreen open={open} onClose={handleClose} TransitionComponent={SlideUpTransition}>
      <Box
        sx={{
          width: '100%',
          direction: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
          <Toolbar>
            <IconButton size="large" edge="start" color="inherit" onClick={handleClose}>
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
        {loading && <LinearProgress style={{ position: 'fixed', left: 0, right: 0, top: 56 }} />}

        <List sx={{ width: '100%' }}>
          {users &&
            users
              .filter((x: User) => x.userId !== user.userId)
              .filter(
                (x: User) =>
                  searchString === '' || (x.displayName ?? '').toLowerCase().includes(searchString.toLowerCase())
              )
              .map((user: User) => (
                <ListItemButton key={user.userId} onClick={() => onUserSelected(user)}>
                  <ListItemText primary={user.displayName} secondary={t('userName')} />
                </ListItemButton>
              ))}
        </List>
      </Box>
    </Dialog>
  );
};
