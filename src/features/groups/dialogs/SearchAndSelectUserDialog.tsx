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

type SearchAndSelectUserDialogProps = {
  open: boolean;
  handleClose: () => void;
  handleSubmit: (users: User[]) => void;
  users: User[];
  loading: boolean;
};

const SearchAndSelectUserDialog = ({
  open,
  handleClose,
  users,
  loading,
  handleSubmit,
}: SearchAndSelectUserDialogProps) => {
  const [selectedUsers, setSelectedUsers] = useState<User[]>(Array.from<User>([]));
  const [searchString, setSearchString] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, user: User) => {
    if (selectedUsers.some((x: User) => x.userId === user.userId)) {
      setSelectedUsers(selectedUsers.filter((y) => y.userId !== user.userId));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  return (
    <Dialog fullScreen open={open} onClose={handleClose} TransitionComponent={SlideUpTransition}>
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
        <AppBar position="sticky">
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
            <Button autoFocus color="inherit" onClick={() => handleSubmit(selectedUsers)}>
              Speichern
            </Button>
          </Toolbar>
        </AppBar>
        {loading && <LinearProgress style={{ position: 'fixed', left: 0, right: 0, top: 56 }} />}

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
                  <ListItemText>{user.displayName}</ListItemText>
                </ListItem>
              ))}
        </List>
      </Box>
    </Dialog>
  );
};

export default SearchAndSelectUserDialog;
