import { AddPhotoAlternateOutlined, Close, ContentCopy, FiberManualRecord, Launch } from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Chip,
  Container,
  Dialog,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListSubheader,
  Toolbar,
  Typography,
} from '@mui/material';
import { DialogProps } from '@toolpad/core';
import React, { useCallback, useEffect, useState } from 'react';
import pzLogo from '../images/pz_logo.svg';
import { SupabaseUserRepository } from '../repository/UserRepository';

type ProfilePayload = {
  user: User
  userId: string
}

const Content = ({ payload, onClose }: DialogProps<ProfilePayload, null>) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserWithGroupsAndPlayerData | null>(null);
  const [overlappingGroups, setOverlappingGroups] = useState<Group[]>([]);

  const loadUserData = useCallback(async (userId: string) => {

    const userResult = await SupabaseUserRepository.fetchUserWithGroups(payload.user.userId);
    const result = await SupabaseUserRepository.fetchUserWithGroups(userId);

    return { result, userResult }
  }, [payload.user]);

  useEffect(() => {
    setLoading(true);
    loadUserData(payload.userId).then(({ result, userResult }) => {
      setOverlappingGroups(
        result.data?.groups?.filter((x: Group) => userResult.data?.groups.some((y: Group) => y?.id === x?.id)) ?? []
      );
      setCurrentUser(result.data);
      setLoading(false);
    });
  }, [payload.userId, loadUserData]);

  return (<>
    <AppBar sx={{ position: 'static', pt: "env(safe-area-inset-top)" }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => onClose(null)}>
          <Close />
        </IconButton>
      </Toolbar>
    </AppBar>
    <List sx={{ pl: 2, pr: 2, pb: 8 }}>
      <Container
        key={'avatar'}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          m: 2,
          p: 0,
          width: 'auto',
        }}
      >
        <Avatar sx={{ borderRadius: 2, width: '150px', height: '150px' }}>
          {currentUser?.avatarUrl ? (
            <img src={currentUser?.avatarUrl} alt="logo" width={'150px'} height={'150px'} />
          ) : (
            <AddPhotoAlternateOutlined sx={{ fontSize: '50px' }} />
          )}
        </Avatar>
        <Typography variant={'h5'} sx={{ mt: 4 }}>
          {currentUser?.displayName}
        </Typography>
      </Container>
      {
        currentUser?.player_data?.rg_id && currentUser.player_data?.rg_link && <>
          <ListItem
            key={'rg_id'}
            disableGutters
            sx={{
              '&.MuiListItem-root': { p: 0 },
            }}
            secondaryAction={<>
              <IconButton
                onClick={() =>
                  window.open(currentUser.player_data?.rg_link ?? undefined, '_blank', 'noopener,noreferrer')
                }
              >
                <Launch />
              </IconButton>
              <IconButton onClick={() => navigator.clipboard.writeText(currentUser.player_data?.rg_id ?? "")}><ContentCopy /></IconButton>
            </>
            }
          >
            <ListItemAvatar>
              <img src={pzLogo} alt={'pz logo'} width="25" height="25" />
            </ListItemAvatar>
            <ListItemText primary={currentUser.player_data.rg_id} secondary={'Roundnet Germany ID'} />
          </ListItem>
          <ListItem
            key={'rgx'}
            disableGutters
            sx={{
              '&.MuiListItem-root': { p: 0 },
            }}
            secondaryAction={currentUser.player_data?.pro_status ? <Chip variant='outlined' label="Pro Status" sx={{ mx: 2, borderRadius: 3, background: "black", color: "white" }} /> : undefined}>
            <ListItemAvatar>
              <img src={pzLogo} alt={'pz logo'} width="25" height="25" />
            </ListItemAvatar>
            <ListItemText primary={currentUser.player_data.rg_index} secondary={'Roundnet Germany Index'} />
          </ListItem>
        </>
      }
      <List
        key={'groups'}
        subheader={
          <ListSubheader sx={{ fontWeight: 'bold', lineHeight: 'normal', my: 2, pl: 0 }}>
            Gemeinsame Gruppen
          </ListSubheader>
        }
      >
        {overlappingGroups.map((group, index) => (
          <ListItem
            key={`${group.name} ${index}`}
            sx={{ '&.MuiListItem-root': { p: 0 } }}
            divider={index !== overlappingGroups.length - 1}
          >
            <ListItemAvatar>
              <FiberManualRecord sx={{ color: group.color }} />
            </ListItemAvatar>
            <ListItemText primary={group.name} secondary={group.description} />
          </ListItem>
        ))}
      </List>
    </List>
  </>
  );
};
export const ProfileDialog = ({ payload, open, onClose }: DialogProps<ProfilePayload, null>) => {
  return <Dialog fullScreen open={open} onClose={() => onClose(null)}>
    <Content onClose={onClose} open={open} payload={payload} />
  </Dialog>
}
